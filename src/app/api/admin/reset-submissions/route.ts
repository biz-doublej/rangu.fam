import { NextRequest, NextResponse } from 'next/server'
import { sql } from 'drizzle-orm'
import { getDb } from '@/db/client'
import { wikiSubmissions } from '@/db/schema/wiki'
import { getAuthenticatedWikiUser } from '@/lib/doublejAuth'
import { isAdminOrAbove } from '@/app/api/wiki/_utils/policy'

export const dynamic = 'force-dynamic'

/**
 * 검수 큐 초기화 — admin 전용.
 *
 * `wiki_submissions` 의 모든 row 를 삭제. 위키 본문/리비전은 손대지 않음.
 *
 * Body 요구사항: { confirm: true, confirmText: '검수큐초기화' }
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

  if (!body?.confirm || body?.confirmText !== '검수큐초기화') {
    return NextResponse.json(
      {
        success: false,
        error:
          '확인 절차가 누락되었습니다. body 에 { confirm: true, confirmText: "검수큐초기화" } 를 보내세요.',
      },
      { status: 400 }
    )
  }

  try {
    const db = getDb()
    const result = await db.execute<{ count: number }>(sql`
      WITH deleted AS (
        DELETE FROM wiki_submissions RETURNING 1
      )
      SELECT COUNT(*)::int AS count FROM deleted
    `)

    const rows = ((result as any).rows ?? result) as Array<{ count: number }>
    const count = Number(rows?.[0]?.count ?? 0)

    return NextResponse.json({
      success: true,
      message: `${count}건의 검수 큐 항목이 삭제되었습니다.`,
      affected: count,
      executedBy: (user as any).username,
      timestamp: new Date().toISOString(),
    })
  } catch (e) {
    console.error('reset-submissions 실패:', e)
    return NextResponse.json(
      { success: false, error: '초기화 중 서버 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
