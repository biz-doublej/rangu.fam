import { NextRequest, NextResponse } from 'next/server'
import { MAX_TEMPLATES_PER_REQUEST, findTemplateUsages, loadTemplates } from '@/lib/wiki/templateStore'

export const dynamic = 'force-dynamic'

/**
 * 틀 API (읽기 전용, 공개 — 틀 문서도 누구나 보는 위키 문서다)
 *
 *  GET /api/wiki/templates?names=인사,선수     → { success, templates: { 인사: "본문", 선수: null } }  (null = 없는 틀)
 *  GET /api/wiki/templates?usages=인사         → { success, titles: ["강한울", …] }                   (이 틀을 쓰는 문서)
 *
 * 편집 미리보기와 관리 화면 미리보기가 저장 전 본문의 틀을 펼칠 때 쓴다.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)

    const usagesOf = searchParams.get('usages')
    if (usagesOf !== null) {
      const name = usagesOf.trim().slice(0, 60)
      if (!name) return NextResponse.json({ success: false, error: '틀 이름이 필요합니다.' }, { status: 400 })
      return NextResponse.json({ success: true, titles: await findTemplateUsages(name) })
    }

    const names = (searchParams.get('names') || '')
      .split(',')
      .map((name) => name.trim())
      .filter((name) => name && name.length <= 60)
      .slice(0, MAX_TEMPLATES_PER_REQUEST)
    return NextResponse.json({ success: true, templates: await loadTemplates(names) })
  } catch (error) {
    console.error('틀 조회 오류:', error)
    return NextResponse.json({ success: false, error: '틀을 불러오지 못했습니다.' }, { status: 500 })
  }
}
