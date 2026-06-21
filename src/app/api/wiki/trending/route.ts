import { NextResponse } from 'next/server'
import { and, desc, gte, ne, sql } from 'drizzle-orm'
import { getDb } from '@/db/client'
import { wikiPages } from '@/db/schema/wiki'

export const dynamic = 'force-dynamic'

type TrendItem = { title: string; slug: string; views: number }

const WINDOW_DAYS: Record<string, number> = {
  day: 1,
  week: 7,
  month: 30,
}

/**
 * GET /api/wiki/trending?period=week|month|day&limit=10
 *
 * period 별 실제 조회 지표 — wiki_page_view_daily(일별 롤업) 에서 기간 합산.
 * 표가 없거나(마이그레이션 전) 기간 내 데이터가 없으면 누적 views 기준으로
 * 폴백하고 fallback:true 를 함께 반환한다.
 */
export async function GET(request: Request) {
  const db = getDb()
  const { searchParams } = new URL(request.url)
  const limit = Math.min(parseInt(searchParams.get('limit') || '10', 10), 50)
  const periodParam = (searchParams.get('period') || 'week').toLowerCase()
  const period = periodParam in WINDOW_DAYS ? periodParam : 'week'
  const days = WINDOW_DAYS[period]

  // 1순위: 기간별 실지표 (일별 롤업 합산)
  try {
    const result = await db.execute<{ title: string; slug: string; views: number }>(sql`
      SELECT p.title AS title, p.slug AS slug, SUM(d.count)::int AS views
      FROM "wiki_page_view_daily" d
      JOIN "wiki_pages" p ON p.id = d.page_id
      WHERE d.day >= (now() AT TIME ZONE 'Asia/Seoul')::date - ${days - 1}
        AND p.is_deleted = false
      GROUP BY p.id, p.title, p.slug
      HAVING SUM(d.count) > 0
      ORDER BY views DESC
      LIMIT ${limit}
    `)
    const rows = (((result as any).rows ?? result) as TrendItem[]).map((r) => ({
      title: r.title,
      slug: r.slug,
      views: Number(r.views),
    }))

    if (rows.length > 0) {
      return NextResponse.json({ success: true, period, trending: rows })
    }
    // 기간 내 집계 데이터가 아직 없음 → 누적 폴백
    const cum = await cumulativeTop(db, limit)
    if (cum.length === 0 && process.env.NODE_ENV !== 'production') {
      return NextResponse.json({ success: true, period, fallback: true, mock: true, trending: mockTrending(period, limit) })
    }
    return NextResponse.json({ success: true, period, fallback: true, trending: cum })
  } catch {
    // 표가 아직 없음(마이그레이션 전) → 누적 폴백
    try {
      const cum = await cumulativeTop(db, limit)
      if (cum.length === 0 && process.env.NODE_ENV !== 'production') {
        return NextResponse.json({ success: true, period, fallback: true, mock: true, trending: mockTrending(period, limit) })
      }
      return NextResponse.json({ success: true, period, fallback: true, trending: cum })
    } catch {
      // DB 자체가 없는 로컬 환경 → dev-mock (토글 렌더 검증용)
      if (process.env.NODE_ENV !== 'production') {
        return NextResponse.json({ success: true, period, fallback: true, mock: true, trending: mockTrending(period, limit) })
      }
      return NextResponse.json({ success: true, period, fallback: true, trending: [] })
    }
  }
}

// [DEV-MOCK] DB 없는 로컬 개발 환경 전용 — 기간 토글 UI 렌더 검증용.
// week/month 가 서로 다른 순위를 갖도록 가중치를 달리한다.
function mockTrending(period: string, limit: number): TrendItem[] {
  const base = [
    { title: '정재원', slug: '정재원', w: 9, m: 7 },
    { title: '이랑위키:대문', slug: '이랑위키:대문', w: 7, m: 9 },
    { title: '강한울', slug: '강한울', w: 6, m: 5 },
    { title: '랑구팸', slug: '랑구팸', w: 5, m: 8 },
    { title: '정민석', slug: '정민석', w: 4, m: 3 },
    { title: '정진규', slug: '정진규', w: 3, m: 4 },
    { title: '이승찬', slug: '이승찬', w: 2, m: 2 },
  ]
  const mul = period === 'month' ? 41 : 13
  return base
    .map((b) => ({ title: b.title, slug: b.slug, views: (period === 'month' ? b.m : b.w) * mul }))
    .sort((a, b) => b.views - a.views)
    .slice(0, limit)
}

/** 누적 조회수 기준 상위 문서 (폴백용 — 기존 동작 유지). */
async function cumulativeTop(db: ReturnType<typeof getDb>, limit: number): Promise<TrendItem[]> {
  const docs = await db
    .select({ title: wikiPages.title, slug: wikiPages.slug, views: wikiPages.views })
    .from(wikiPages)
    .where(and(ne(wikiPages.isDeleted, true), gte(wikiPages.views, 1)))
    .orderBy(desc(wikiPages.views))
    .limit(limit)
  return docs.map((d) => ({ title: d.title, slug: d.slug, views: Number(d.views) }))
}
