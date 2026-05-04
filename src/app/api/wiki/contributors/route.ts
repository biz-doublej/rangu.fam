import { NextResponse } from 'next/server'
import { inArray, sql } from 'drizzle-orm'
import { getDb } from '@/db/client'
import { wikiUsers } from '@/db/schema/wiki'

export const dynamic = 'force-dynamic'
export const revalidate = 600 // 10분 캐시

// GET /api/wiki/contributors?limit=20
export async function GET(request: Request) {
  try {
    const db = getDb()
    const { searchParams } = new URL(request.url)
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100)

    const result = await db.execute<{
      author: string
      edits: number
      pages: number
      total_size_change: number
      last_edit: string
      first_edit: string
    }>(sql`
      SELECT
        author,
        COUNT(*)::int AS edits,
        COUNT(DISTINCT page_id)::int AS pages,
        COALESCE(SUM(size_change), 0)::int AS total_size_change,
        MAX(timestamp_at) AS last_edit,
        MIN(timestamp_at) AS first_edit
      FROM wiki_revisions
      WHERE author IS NOT NULL AND author != ''
      GROUP BY author
      ORDER BY edits DESC
      LIMIT ${limit}
    `)

    const rows = ((result as any).rows ?? result) as any[]

    // wiki_users에서 매칭되는 메타 정보
    const usernames = rows.map((r) => r.author)
    const userMeta: Record<string, { avatar?: string; displayName?: string; role?: string; reputation?: number }> = {}
    if (usernames.length > 0) {
      const userRows = await db
        .select({
          username: wikiUsers.username,
          avatar: wikiUsers.avatar,
          displayName: wikiUsers.displayName,
          role: wikiUsers.role,
          reputation: wikiUsers.reputation,
        })
        .from(wikiUsers)
        .where(inArray(wikiUsers.username, usernames))

      for (const u of userRows) {
        userMeta[u.username] = {
          avatar: u.avatar || undefined,
          displayName: u.displayName || undefined,
          role: u.role || undefined,
          reputation: u.reputation || undefined,
        }
      }
    }

    const contributors = rows.map((r) => ({
      author: r.author,
      edits: Number(r.edits),
      pages: Number(r.pages),
      totalSizeChange: Number(r.total_size_change || 0),
      lastEdit: r.last_edit,
      firstEdit: r.first_edit,
      avatar: userMeta[r.author]?.avatar || null,
      displayName: userMeta[r.author]?.displayName || null,
      role: userMeta[r.author]?.role || null,
      reputation: userMeta[r.author]?.reputation || 0,
    }))

    return NextResponse.json({ success: true, contributors })
  } catch (error) {
    console.error('contributors 조회 오류:', error)
    return NextResponse.json(
      { success: false, error: '기여자 목록 조회 중 오류' },
      { status: 500 }
    )
  }
}
