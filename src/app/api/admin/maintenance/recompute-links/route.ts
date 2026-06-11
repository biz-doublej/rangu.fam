import { NextRequest, NextResponse } from 'next/server'
import { and, ne, eq } from 'drizzle-orm'
import { getDb } from '@/db/client'
import { wikiPages } from '@/db/schema/wiki'
import { checkAdminAuth } from '@/lib/adminAuth'

export const dynamic = 'force-dynamic'

/**
 * incomingLinks(백링크) 전체 재계산 — 고립문서 판정/관련문서 패널의 정확도 복구.
 *
 * 배경: 문서 편집(PUT)은 outgoingLinks 의 새 대상에 incomingLinks 를 "추가"만 하고
 * 링크가 제거돼도 정리하지 않아, 시간이 지나면 incomingLinks 가 실제와 어긋난다
 * (없어진 백링크가 남아 고립문서가 비고립으로 잘못 표시됨). 이 라우트는
 * 모든 문서의 outgoingLinks(권위 데이터)로부터 incomingLinks 를 처음부터 다시 만든다.
 *
 *   GET /api/admin/maintenance/recompute-links            → dry-run (변경 예정 수)
 *   GET /api/admin/maintenance/recompute-links?confirm=1  → 실제 반영
 */
export async function GET(request: NextRequest) {
  try {
    const admin = await checkAdminAuth(request)
    if (!admin) {
      return NextResponse.json({ success: false, error: '관리자 권한이 필요합니다.' }, { status: 403 })
    }

    const db = getDb()
    const pages = await db
      .select({
        id: wikiPages.id,
        title: wikiPages.title,
        outgoingLinks: wikiPages.outgoingLinks,
        incomingLinks: wikiPages.incomingLinks,
      })
      .from(wikiPages)
      .where(and(ne(wikiPages.isDeleted, true), eq(wikiPages.namespace, 'main')))

    const titleSet = new Set(pages.map((p) => p.title))
    // target title → 이 문서를 가리키는 source title 집합
    const backlinks = new Map<string, Set<string>>()
    for (const page of pages) {
      const out = Array.isArray(page.outgoingLinks) ? page.outgoingLinks : []
      for (const raw of out) {
        const target = String(raw || '').split('|')[0].split('#')[0].trim()
        if (!target || target === page.title || !titleSet.has(target)) continue
        if (!backlinks.has(target)) backlinks.set(target, new Set())
        backlinks.get(target)!.add(page.title)
      }
    }

    // 변경 필요한 문서만 추려서 업데이트
    const changes: Array<{ title: string; before: number; after: number }> = []
    for (const page of pages) {
      const next = Array.from(backlinks.get(page.title) || []).sort()
      const prev = Array.isArray(page.incomingLinks) ? [...page.incomingLinks].sort() : []
      const same = next.length === prev.length && next.every((v, i) => v === prev[i])
      if (!same) changes.push({ title: page.title, before: prev.length, after: next.length })
    }

    const { searchParams } = new URL(request.url)
    if (searchParams.get('confirm') !== '1') {
      return NextResponse.json({
        success: true,
        applied: false,
        message: `dry-run — ${changes.length}개 문서의 백링크가 갱신됩니다. ?confirm=1 로 반영하세요.`,
        totalPages: pages.length,
        changeCount: changes.length,
        sample: changes.slice(0, 20),
      })
    }

    for (const page of pages) {
      const next = Array.from(backlinks.get(page.title) || []).sort()
      const prev = Array.isArray(page.incomingLinks) ? [...page.incomingLinks].sort() : []
      const same = next.length === prev.length && next.every((v, i) => v === prev[i])
      if (same) continue
      await db.update(wikiPages).set({ incomingLinks: next }).where(eq(wikiPages.id, page.id))
    }

    const orphanCount = pages.filter(
      (p) =>
        (backlinks.get(p.title)?.size || 0) === 0 &&
        (Array.isArray(p.outgoingLinks) ? p.outgoingLinks : []).filter((l) =>
          titleSet.has(String(l || '').split('|')[0].split('#')[0].trim())
        ).length === 0
    ).length

    return NextResponse.json({
      success: true,
      applied: true,
      message: `백링크 재계산 완료 — ${changes.length}개 문서 갱신. 완전 고립 문서 ${orphanCount}개.`,
      changeCount: changes.length,
      orphanCount,
      appliedBy: admin.username,
    })
  } catch (error) {
    console.error('recompute-links 오류:', error)
    return NextResponse.json(
      {
        success: false,
        error: '백링크 재계산 중 오류가 발생했습니다.',
        detail: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    )
  }
}
