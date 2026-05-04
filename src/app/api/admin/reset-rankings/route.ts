import { NextRequest, NextResponse } from 'next/server'
import { sql } from 'drizzle-orm'
import { getDb } from '@/db/client'
import { wikiUsers } from '@/db/schema/wiki'
import { getAuthenticatedWikiUser } from '@/lib/doublejAuth'
import { isAdminOrAbove } from '@/app/api/wiki/_utils/policy'

export const dynamic = 'force-dynamic'

/**
 * 랭킹/통계 초기화 — admin 전용.
 *
 * `wiki_users` 의 모든 통계 컬럼(edits / pagesCreated / discussionPosts / reputation)을
 * 0 으로 reset. `wiki_revisions` / `wiki_pages` 본문은 보존됨.
 *
 * Body 요구사항: { confirm: true, confirmText: '랭킹초기화' }
 *  — UI 에서 사용자가 명시적으로 정확한 문자열을 입력해야 통과 (실수 방지)
 */
export async function POST(request: NextRequest) {
  const user = await getAuthenticatedWikiUser(request)
  if (!user || !isAdminOrAbove(user as any)) {
    return NextResponse.json(
      { success: false, error: '관리자 권한이 필요합니다.' },
      { status: 403 }
    )
  }

  let body: any = null
  try {
    body = await request.json()
  } catch {
    body = null
  }

  if (!body?.confirm || body?.confirmText !== '랭킹초기화') {
    return NextResponse.json(
      {
        success: false,
        error: '확인 절차가 누락되었습니다. body 에 { confirm: true, confirmText: "랭킹초기화" } 를 보내세요.',
      },
      { status: 400 }
    )
  }

  try {
    const db = getDb()
    const result = await db.execute<{ count: number }>(sql`
      WITH updated AS (
        UPDATE wiki_users
        SET edits = 0,
            pages_created = 0,
            discussion_posts = 0,
            reputation = 0,
            updated_at = NOW()
        RETURNING 1
      )
      SELECT COUNT(*)::int AS count FROM updated
    `)

    const rows = ((result as any).rows ?? result) as Array<{ count: number }>
    const count = Number(rows?.[0]?.count ?? 0)

    return NextResponse.json({
      success: true,
      message: `${count}명의 통계가 초기화되었습니다.`,
      affected: count,
      executedBy: (user as any).username,
      timestamp: new Date().toISOString(),
    })
  } catch (e) {
    console.error('reset-rankings 실패:', e)
    return NextResponse.json(
      { success: false, error: '초기화 중 서버 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
