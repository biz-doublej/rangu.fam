import { getRequiredEnv } from '@/lib/env'
import { NextRequest, NextResponse } from 'next/server'
import { and, eq, ne, or } from 'drizzle-orm'
import jwt from 'jsonwebtoken'
import { getDb } from '@/db/client'
import { wikiPages, wikiUsers } from '@/db/schema/wiki'
import { canMovePage } from '@/app/api/wiki/_utils/policy'
import { enforceUserAccessPolicy } from '@/lib/doublejAuth'

export const dynamic = 'force-dynamic'

const JWT_SECRET = getRequiredEnv('JWT_SECRET')

async function getUserFromToken(request: NextRequest) {
  const token = request.cookies.get('wiki-token')?.value
  if (!token) return null
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any
    if (!decoded?.userId) return null
    const db = getDb()
    const [user] = await db
      .select()
      .from(wikiUsers)
      .where(eq(wikiUsers.id, decoded.userId))
      .limit(1)
    if (!user) return null
    return enforceUserAccessPolicy(user as any)
  } catch {
    return null
  }
}

function toSlug(text: string): string {
  // 하위문서 제목("강한울/생애")의 `/` 는 slug 에서 `-` 로 보존해 충돌을 막는다
  return text
    .toLowerCase()
    .replace(/[^\w\s가-힣/]/g, '')
    .replace(/[\s/]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

export async function POST(request: NextRequest) {
  try {
    const db = getDb()
    const user = await getUserFromToken(request)
    if (!user) {
      return NextResponse.json({ success: false, error: '로그인이 필요합니다.' }, { status: 401 })
    }
    if (!canMovePage(user as any)) {
      return NextResponse.json(
        { success: false, error: '문서 이동 권한이 없습니다.' },
        { status: 403 }
      )
    }

    const { fromTitle, toTitle, reason } = await request.json()
    if (!fromTitle || !toTitle) {
      return NextResponse.json({ success: false, error: 'fromTitle, toTitle 필요' }, { status: 400 })
    }

    const [page] = await db
      .select()
      .from(wikiPages)
      .where(
        and(
          ne(wikiPages.isDeleted, true),
          or(eq(wikiPages.title, fromTitle), eq(wikiPages.slug, fromTitle))
        )
      )
      .limit(1)

    if (!page) {
      return NextResponse.json(
        { success: false, error: '원본 문서를 찾을 수 없습니다.' },
        { status: 404 }
      )
    }

    const newSlug = toSlug(toTitle)
    const [existing] = await db
      .select({ id: wikiPages.id })
      .from(wikiPages)
      .where(
        and(
          ne(wikiPages.isDeleted, true),
          or(eq(wikiPages.title, toTitle), eq(wikiPages.slug, newSlug))
        )
      )
      .limit(1)

    if (existing) {
      return NextResponse.json(
        { success: false, error: '대상 제목이 이미 존재합니다.' },
        { status: 409 }
      )
    }

    const now = new Date()
    const editSummary = reason || `문서 이동: ${page.title} → ${toTitle}`
    const oldTitle = page.title

    // 원본 문서를 리다이렉트로 전환
    await db
      .update(wikiPages)
      .set({
        isRedirect: true,
        redirectTarget: toTitle,
        lastEditSummary: editSummary,
        lastEditDate: now,
        lastEditor: user.username,
        lastEditorId: user.id,
        updatedAt: now,
      })
      .where(eq(wikiPages.id, page.id))

    // 새 문서 생성 (내용 복사)
    await db.insert(wikiPages).values({
      title: toTitle,
      slug: newSlug,
      namespace: page.namespace,
      content: `#REDIRECT [[${oldTitle}]]\n\n${page.content || ''}`,
      summary: page.summary,
      categories: page.categories,
      tags: page.tags,
      creator: user.username,
      creatorId: user.id,
      lastEditor: user.username,
      lastEditorId: user.id,
      lastEditDate: now,
      lastEditSummary: editSummary,
      currentRevision: 1,
      protection: page.protection,
      isRedirect: false,
      isStub: page.isStub,
      isFeatured: page.isFeatured,
      edits: 1,
      watchers: page.watchers,
      incomingLinks: page.incomingLinks,
      outgoingLinks: page.outgoingLinks,
      tableOfContents: page.tableOfContents,
    })

    return NextResponse.json({
      success: true,
      message: '문서 이동 완료',
      from: oldTitle,
      to: toTitle,
    })
  } catch (e) {
    console.error('문서 이동 오류:', e)
    return NextResponse.json(
      { success: false, error: '문서 이동 중 오류' },
      { status: 500 }
    )
  }
}
