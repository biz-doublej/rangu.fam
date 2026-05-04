import { NextResponse } from 'next/server'
import { and, desc, gte, ne, sql } from 'drizzle-orm'
import { getDb } from '@/db/client'
import { wikiPages } from '@/db/schema/wiki'

export const dynamic = 'force-dynamic'

// GET /api/wiki/trending?limit=10 — 최근 24시간 조회수 기준
export async function GET(request: Request) {
  const db = getDb()
  const { searchParams } = new URL(request.url)
  const limit = Math.min(parseInt(searchParams.get('limit') || '10', 10), 50)
  const since = new Date(Date.now() - 1000 * 60 * 60 * 24)

  const docs = await db
    .select({
      title: wikiPages.title,
      slug: wikiPages.slug,
      views: wikiPages.views,
    })
    .from(wikiPages)
    .where(
      and(
        ne(wikiPages.isDeleted, true),
        gte(wikiPages.updatedAt, since),
        gte(wikiPages.views, 1)
      )
    )
    .orderBy(desc(wikiPages.views))
    .limit(limit)

  return NextResponse.json({ success: true, trending: docs })
}
