import { NextRequest, NextResponse } from 'next/server'
import { sql } from 'drizzle-orm'
import { getDb } from '@/db/client'

export const dynamic = 'force-dynamic'

/**
 * 기여도 히트맵(잔디) + 배지 데이터.
 *
 * GET /api/wiki/contributions?author=<username>
 *   → 최근 ~1년 일자별 편집 횟수 + 누적 통계 + 달성 배지.
 *
 * wiki_revisions(author, timestamp_at, edit_type, size_change, page_id) 집계.
 */

export interface Badge {
  id: string
  label: string
  icon: string // 이모지
  desc: string
}

function computeBadges(stats: {
  totalEdits: number
  createdDocs: number
  pagesTouched: number
  sizeAdded: number
  maxStreak: number
  activeDays: number
}): Badge[] {
  const badges: Badge[] = []
  const add = (id: string, label: string, icon: string, desc: string) =>
    badges.push({ id, label, icon, desc })

  if (stats.totalEdits >= 1) add('first-edit', '첫 발자국', '🌱', '첫 편집을 남겼습니다')
  if (stats.totalEdits >= 50) add('edits-50', '단골 편집자', '✏️', '편집 50회 달성')
  if (stats.totalEdits >= 200) add('edits-200', '위키 일꾼', '⚙️', '편집 200회 달성')
  if (stats.totalEdits >= 500) add('edits-500', '위키 장인', '🏆', '편집 500회 달성')

  if (stats.createdDocs >= 1) add('creator-1', '개척자', '📄', '문서를 만들었습니다')
  if (stats.createdDocs >= 10) add('creator-10', '문서 건축가', '🏗️', '문서 10개 생성')
  if (stats.createdDocs >= 30) add('creator-30', '백과 설계자', '📚', '문서 30개 생성')

  if (stats.sizeAdded >= 10000) add('writer-10k', '다작 작가', '🖋️', '누적 1만 자 이상 기여')
  if (stats.sizeAdded >= 50000) add('writer-50k', '대문호', '📜', '누적 5만 자 이상 기여')

  if (stats.maxStreak >= 3) add('streak-3', '꾸준함', '🔥', '3일 연속 편집')
  if (stats.maxStreak >= 7) add('streak-7', '열정의 일주일', '🔥', '7일 연속 편집')

  if (stats.activeDays >= 30) add('active-30', '한 달 개근', '📅', '30일 이상 활동')
  if (stats.pagesTouched >= 20) add('breadth-20', '박학다식', '🌐', '문서 20종 이상 편집')

  return badges
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const author = (searchParams.get('author') || '').trim()
    if (!author) {
      return NextResponse.json({ success: false, error: 'author가 필요합니다.' }, { status: 400 })
    }

    const db = getDb()

    // 일자별 편집 횟수 (최근 371일)
    const dailyResult = await db.execute<{ day: string; c: number }>(sql`
      SELECT to_char(date_trunc('day', timestamp_at), 'YYYY-MM-DD') AS day, COUNT(*)::int AS c
      FROM wiki_revisions
      WHERE author = ${author}
        AND timestamp_at >= now() - interval '371 days'
      GROUP BY 1
      ORDER BY 1
    `)
    const dailyRows = ((dailyResult as any).rows ?? dailyResult) as Array<{ day: string; c: number }>
    const daily: Record<string, number> = {}
    for (const row of dailyRows) daily[row.day] = row.c

    // 누적 통계
    const statResult = await db.execute<{
      total_edits: number
      created_docs: number
      pages_touched: number
      size_added: number
    }>(sql`
      SELECT
        COUNT(*)::int AS total_edits,
        COUNT(*) FILTER (WHERE edit_type = 'create')::int AS created_docs,
        COUNT(DISTINCT page_id)::int AS pages_touched,
        COALESCE(SUM(GREATEST(size_change, 0)), 0)::int AS size_added
      FROM wiki_revisions
      WHERE author = ${author}
    `)
    const s = (((statResult as any).rows ?? statResult) as any[])[0] || {
      total_edits: 0,
      created_docs: 0,
      pages_touched: 0,
      size_added: 0,
    }

    // 연속 편집(streak) + 활동일수 — daily 키로 계산
    const activeDates = Object.keys(daily).sort()
    const activeDays = activeDates.length
    let maxStreak = 0
    let curStreak = 0
    let prev: number | null = null
    for (const dateStr of activeDates) {
      const t = new Date(dateStr + 'T00:00:00Z').getTime()
      if (prev !== null && t - prev === 86400000) {
        curStreak++
      } else {
        curStreak = 1
      }
      if (curStreak > maxStreak) maxStreak = curStreak
      prev = t
    }

    const stats = {
      totalEdits: s.total_edits,
      createdDocs: s.created_docs,
      pagesTouched: s.pages_touched,
      sizeAdded: s.size_added,
      maxStreak,
      activeDays,
    }

    return NextResponse.json({
      success: true,
      author,
      daily,
      stats,
      badges: computeBadges(stats),
    })
  } catch (error) {
    console.error('기여도 조회 오류:', error)
    // [DEV-MOCK] DB 없는 로컬 개발 환경 전용 — 칭호/잔디 렌더 경로 프리뷰 검증용.
    if (process.env.NODE_ENV !== 'production') {
      const author = new URL(request.url).searchParams.get('author') || 'demo'
      const mockStats = {
        totalEdits: 540,
        createdDocs: 32,
        pagesTouched: 25,
        sizeAdded: 52000,
        maxStreak: 8,
        activeDays: 40,
      }
      const daily: Record<string, number> = {}
      const today = new Date()
      for (let i = 0; i < 60; i++) {
        const d = new Date(today.getTime() - i * 2 * 86400000)
        daily[
          `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`
        ] = (i % 8) + 1
      }
      return NextResponse.json({
        success: true,
        author,
        daily,
        stats: mockStats,
        badges: computeBadges(mockStats),
        mock: true,
      })
    }
    return NextResponse.json(
      { success: false, error: '기여도 데이터를 불러오지 못했습니다.' },
      { status: 500 }
    )
  }
}
