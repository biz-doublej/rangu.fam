import { NextRequest, NextResponse } from 'next/server'
import { desc, eq } from 'drizzle-orm'
import { requireMember } from '@/lib/battle/apiHelpers'
import { getDb } from '@/db/client'
import { tacticsRankings } from '@/db/schema/tacticsRankings'
import { wikiUsers } from '@/db/schema/wiki'
import { tierForLp } from '@/lib/tactics/rankRules'

export const dynamic = 'force-dynamic'
const SEASON = 's1'
const LIMIT = 50

function isMissingRankTable(e: unknown): boolean {
  const msg = e instanceof Error ? e.message : String(e)
  return /tactics_rankings/.test(msg) && /does not exist|undefined_table|42P01/i.test(msg)
}

/** 시즌 상위 랭커(LP 내림차순). wikiUsers 조인 → displayName ?? username. */
export async function GET(request: NextRequest) {
  const auth = await requireMember(request)
  if ('error' in auth) return auth.error
  try {
    const db = getDb()
    const rows = await db
      .select({
        userId: tacticsRankings.userId,
        lp: tacticsRankings.lp,
        wins: tacticsRankings.wins,
        losses: tacticsRankings.losses,
        username: wikiUsers.username,
        displayName: wikiUsers.displayName,
      })
      .from(tacticsRankings)
      .innerJoin(wikiUsers, eq(tacticsRankings.userId, wikiUsers.id))
      .where(eq(tacticsRankings.season, SEASON))
      .orderBy(desc(tacticsRankings.lp))
      .limit(LIMIT)

    const board = rows.map((r, i) => {
      const tier = tierForLp(r.lp)
      return {
        rank: i + 1,
        userId: r.userId,
        name: r.displayName ?? r.username,
        lp: r.lp,
        tier: tier.key,
        tierName: tier.name,
        wins: r.wins,
        losses: r.losses,
      }
    })
    return NextResponse.json({ success: true, season: SEASON, board })
  } catch (error) {
    if (isMissingRankTable(error)) {
      return NextResponse.json({ success: false, needsMigration: true, board: [], message: '랭크가 아직 활성화되지 않았습니다.' }, { status: 503 })
    }
    console.error('leaderboard error:', error)
    return NextResponse.json({ success: false, message: '리더보드 조회 오류' }, { status: 500 })
  }
}
