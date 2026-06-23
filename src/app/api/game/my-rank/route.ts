import { NextRequest, NextResponse } from 'next/server'
import { and, eq } from 'drizzle-orm'
import { requireMember } from '@/lib/battle/apiHelpers'
import { getDb } from '@/db/client'
import { tacticsRankings } from '@/db/schema/tacticsRankings'
import { tierForLp } from '@/lib/tactics/rankRules'

export const dynamic = 'force-dynamic'
const SEASON = 's1'

/** 랭크 테이블 미생성(maintenance 전) → graceful 503. */
function isMissingRankTable(e: unknown): boolean {
  const msg = e instanceof Error ? e.message : String(e)
  return /tactics_rankings/.test(msg) && /does not exist|undefined_table|42P01/i.test(msg)
}

/** 세션 유저의 현재 시즌 랭크(없으면 미배치 기본값). 클라/로비·매치종료 연출이 사용. */
export async function GET(request: NextRequest) {
  const auth = await requireMember(request)
  if ('error' in auth) return auth.error
  try {
    const db = getDb()
    const [row] = await db
      .select()
      .from(tacticsRankings)
      .where(and(eq(tacticsRankings.userId, auth.userId), eq(tacticsRankings.season, SEASON)))
    const lp = row?.lp ?? 0
    const tier = tierForLp(lp)
    return NextResponse.json({
      success: true,
      rank: {
        lp,
        tier: tier.key,
        tierName: tier.name,
        wins: row?.wins ?? 0,
        losses: row?.losses ?? 0,
        winStreak: row?.winStreak ?? 0,
        placed: !!row,
        season: SEASON,
      },
    })
  } catch (error) {
    if (isMissingRankTable(error)) {
      return NextResponse.json({ success: false, needsMigration: true, message: '랭크가 아직 활성화되지 않았습니다.' }, { status: 503 })
    }
    console.error('my-rank error:', error)
    return NextResponse.json({ success: false, message: '랭크 조회 오류' }, { status: 500 })
  }
}
