import { NextResponse } from 'next/server'
import { sql } from 'drizzle-orm'
import { getDb } from '@/db/client'

export const dynamic = 'force-dynamic'
export const revalidate = 600 // 10분 캐시

/**
 * 이랑위키 연보 — 공개 통계 대시보드 데이터.
 *
 * GET /api/wiki/stats
 *   → 총계 + 연도별 편집/생성 + 월별 편집량 + 누적 문서 수 성장(최근 24개월).
 *
 * 모든 날짜 경계는 KST(Asia/Seoul) 기준. wiki_revisions / wiki_pages 집계.
 */

type MonthRow = { month: string; edits: number; newPages: number; cumulativePages: number }
type YearRow = { year: number; edits: number; newPages: number; contributors: number }

const DISPLAY_MONTHS = 24

function ymIndex(ym: string): number {
  const [y, m] = ym.split('-').map(Number)
  return y * 12 + (m - 1)
}
function indexToYm(i: number): string {
  const y = Math.floor(i / 12)
  const m = (i % 12) + 1
  return `${y}-${String(m).padStart(2, '0')}`
}

export async function GET() {
  try {
    const db = getDb()

    const rowsOf = <T,>(r: unknown): T[] => ((r as any).rows ?? r) as T[]

    // 총계
    const totalsRes = await db.execute(sql`
      SELECT
        (SELECT COUNT(*) FROM wiki_pages WHERE is_deleted = false)::int AS pages,
        (SELECT COUNT(*) FROM wiki_revisions)::int AS edits,
        (SELECT COUNT(DISTINCT author) FROM wiki_revisions WHERE author IS NOT NULL AND author <> '')::int AS contributors,
        (SELECT COALESCE(SUM(views), 0) FROM wiki_pages WHERE is_deleted = false)::int AS views
    `)
    const totals = rowsOf<{ pages: number; edits: number; contributors: number; views: number }>(totalsRes)[0] || {
      pages: 0,
      edits: 0,
      contributors: 0,
      views: 0,
    }

    // 연도별 편집/생성/기여자
    const yearRes = await db.execute(sql`
      SELECT
        date_part('year', timestamp_at AT TIME ZONE 'Asia/Seoul')::int AS year,
        COUNT(*)::int AS edits,
        COUNT(*) FILTER (WHERE edit_type = 'create')::int AS new_pages,
        COUNT(DISTINCT author)::int AS contributors
      FROM wiki_revisions
      GROUP BY 1
      ORDER BY 1
    `)
    const yearRaw = rowsOf<{ year: number; edits: number; new_pages: number; contributors: number }>(yearRes)
    const byYear: YearRow[] = yearRaw
      .map((r) => ({
        year: Number(r.year),
        edits: Number(r.edits),
        newPages: Number(r.new_pages),
        contributors: Number(r.contributors),
      }))
      .sort((a, b) => b.year - a.year)

    // 월별 편집량 (전체 기간 — 누적 계산용)
    const monthEditRes = await db.execute(sql`
      SELECT to_char(date_trunc('month', timestamp_at AT TIME ZONE 'Asia/Seoul'), 'YYYY-MM') AS month,
             COUNT(*)::int AS edits
      FROM wiki_revisions
      GROUP BY 1
    `)
    const editByMonth = new Map<string, number>()
    for (const r of rowsOf<{ month: string; edits: number }>(monthEditRes)) {
      if (r.month) editByMonth.set(r.month, Number(r.edits))
    }

    // 월별 신규 문서 (canonical — wiki_pages.created_at)
    const monthPageRes = await db.execute(sql`
      SELECT to_char(date_trunc('month', created_at AT TIME ZONE 'Asia/Seoul'), 'YYYY-MM') AS month,
             COUNT(*)::int AS new_pages
      FROM wiki_pages
      WHERE is_deleted = false
      GROUP BY 1
    `)
    const pageByMonth = new Map<string, number>()
    for (const r of rowsOf<{ month: string; new_pages: number }>(monthPageRes)) {
      if (r.month) pageByMonth.set(r.month, Number(r.new_pages))
    }

    // 연속 월 시리즈 [최소 데이터월 .. 현재월(KST)] → 누적 문서 수 계산 후 최근 N개월 노출
    const kstNow = new Date(Date.now() + 9 * 3600 * 1000)
    const curIdx = kstNow.getUTCFullYear() * 12 + kstNow.getUTCMonth()
    const dataIdx = [...editByMonth.keys(), ...pageByMonth.keys()].map(ymIndex)
    const startIdx = dataIdx.length > 0 ? Math.min(...dataIdx) : curIdx
    const endIdx = Math.max(curIdx, dataIdx.length > 0 ? Math.max(...dataIdx) : curIdx)

    const fullSeries: MonthRow[] = []
    let cumulative = 0
    for (let i = startIdx; i <= endIdx; i++) {
      const ym = indexToYm(i)
      const newPages = pageByMonth.get(ym) || 0
      cumulative += newPages
      fullSeries.push({
        month: ym,
        edits: editByMonth.get(ym) || 0,
        newPages,
        cumulativePages: cumulative,
      })
    }
    const monthly = fullSeries.slice(-DISPLAY_MONTHS)

    // 파생 통계
    const peakMonth =
      fullSeries.length > 0
        ? fullSeries.reduce((best, m) => (m.edits > best.edits ? m : best), fullSeries[0])
        : null
    const thisYearRow = byYear.find((y) => y.year === kstNow.getUTCFullYear()) || null

    return NextResponse.json({
      success: true,
      generatedAt: new Date().toISOString(),
      totals,
      thisYear: thisYearRow
        ? { year: thisYearRow.year, edits: thisYearRow.edits, newPages: thisYearRow.newPages }
        : { year: kstNow.getUTCFullYear(), edits: 0, newPages: 0 },
      byYear,
      monthly,
      peakMonth: peakMonth ? { month: peakMonth.month, edits: peakMonth.edits } : null,
    })
  } catch (error) {
    console.error('wiki stats 조회 오류:', error)
    // [DEV-MOCK] DB 없는 로컬 개발 환경 전용 — 연보 차트 렌더 검증용.
    if (process.env.NODE_ENV !== 'production') {
      const kstNow = new Date(Date.now() + 9 * 3600 * 1000)
      const curIdx = kstNow.getUTCFullYear() * 12 + kstNow.getUTCMonth()
      const monthly: MonthRow[] = []
      let cumulative = 40
      for (let k = DISPLAY_MONTHS - 1; k >= 0; k--) {
        const i = curIdx - k
        const newPages = Math.max(0, Math.round(3 + 4 * Math.sin(i)))
        cumulative += newPages
        monthly.push({
          month: indexToYm(i),
          edits: Math.round(20 + 30 * Math.abs(Math.sin(i * 1.3))),
          newPages,
          cumulativePages: cumulative,
        })
      }
      const thisY = kstNow.getUTCFullYear()
      return NextResponse.json({
        success: true,
        mock: true,
        generatedAt: new Date().toISOString(),
        totals: { pages: cumulative, edits: 1280, contributors: 5, views: 24500 },
        thisYear: { year: thisY, edits: 430, newPages: 38 },
        byYear: [
          { year: thisY, edits: 430, newPages: 38, contributors: 5 },
          { year: thisY - 1, edits: 720, newPages: 64, contributors: 5 },
          { year: thisY - 2, edits: 130, newPages: 22, contributors: 3 },
        ],
        monthly,
        peakMonth: { month: indexToYm(curIdx - 10), edits: 95 },
      })
    }
    return NextResponse.json({ success: false, error: '통계를 불러오지 못했습니다.' }, { status: 500 })
  }
}
