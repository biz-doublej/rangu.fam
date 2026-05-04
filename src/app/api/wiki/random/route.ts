import { NextRequest, NextResponse } from 'next/server'
import { sql } from 'drizzle-orm'
import { getDb } from '@/db/client'

export const dynamic = 'force-dynamic'

/**
 * GET /api/wiki/random
 * GET /api/wiki/random?namespace=main
 *
 * 위키 전체에서 진짜로 랜덤한 한 문서를 골라 반환한다.
 * (recent 피드 기반 샘플링과 달리 오래된 문서/조용한 문서도 동등하게 선택됨.)
 */
export async function GET(request: NextRequest) {
  try {
    const db = getDb()
    const namespace = request.nextUrl.searchParams.get('namespace')?.trim() || ''

    const result = await db.execute<{ title: string; slug: string; namespace: string }>(
      namespace
        ? sql`
            SELECT title, slug, namespace
            FROM wiki_pages
            WHERE is_deleted IS NOT TRUE AND namespace = ${namespace}
            ORDER BY RANDOM()
            LIMIT 1
          `
        : sql`
            SELECT title, slug, namespace
            FROM wiki_pages
            WHERE is_deleted IS NOT TRUE
            ORDER BY RANDOM()
            LIMIT 1
          `
    )

    const rows = ((result as any).rows ?? result) as Array<{ title: string; slug: string; namespace: string }>
    const pick = rows[0]
    if (!pick) {
      return NextResponse.json(
        { success: false, error: '표시할 문서가 없습니다.' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      title: pick.title,
      slug: pick.slug,
      namespace: pick.namespace,
    })
  } catch (error) {
    console.error('임의 문서 선택 오류:', error)
    return NextResponse.json(
      { success: false, error: '임의 문서를 불러오지 못했습니다.' },
      { status: 500 }
    )
  }
}
