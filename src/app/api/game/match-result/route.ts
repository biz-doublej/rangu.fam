import { NextRequest, NextResponse } from 'next/server'
import { and, eq } from 'drizzle-orm'
import { getDb } from '@/db/client'
import { tacticsRankings } from '@/db/schema/tacticsRankings'
import { tacticsMatchResults } from '@/db/schema/tacticsMatchResults'
import { applyMatchResult, type RankState } from '@/lib/tactics/rankRules'

export const dynamic = 'force-dynamic'
const SEASON = 's1'

/**
 * 서버 권위 매치 결과 수신 → 랭크 LP 갱신. [랭크 C2]
 * C# 게임서버만 호출(X-Game-Server-Secret). 클라이언트 신뢰 안 함.
 * 멱등: match_id 선점(ON CONFLICT DO NOTHING) → 이미 처리된 매치면 LP 미적용.
 * body: { matchId, winnerUserId, loserUserId }
 */
export async function POST(req: NextRequest) {
  const expected = process.env.GAME_SERVER_SECRET
  if (!expected || req.headers.get('x-game-server-secret') !== expected) {
    return NextResponse.json({ success: false, error: 'unauthorized' }, { status: 401 })
  }

  let body: { matchId?: string; winnerUserId?: string; loserUserId?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ success: false, error: 'bad_json' }, { status: 400 })
  }
  const { matchId, winnerUserId, loserUserId } = body
  if (!matchId || !winnerUserId || !loserUserId || winnerUserId === loserUserId) {
    return NextResponse.json({ success: false, error: 'missing_or_invalid_fields' }, { status: 400 })
  }

  const db = getDb()
  try {
    const result = await db.transaction(async (tx) => {
      // 멱등 선점 — 이미 처리된 matchId 면 conflict → LP 미적용
      const claimed = await tx
        .insert(tacticsMatchResults)
        .values({ matchId, winnerUserId, loserUserId, season: SEASON })
        .onConflictDoNothing({ target: tacticsMatchResults.matchId })
        .returning({ matchId: tacticsMatchResults.matchId })
      if (claimed.length === 0) return { duplicate: true as const }

      const apply = async (userId: string, didWin: boolean) => {
        const [row] = await tx
          .select()
          .from(tacticsRankings)
          .where(and(eq(tacticsRankings.userId, userId), eq(tacticsRankings.season, SEASON)))
        const prev: RankState = row
          ? { lp: row.lp, wins: row.wins, losses: row.losses, winStreak: row.winStreak }
          : { lp: 0, wins: 0, losses: 0, winStreak: 0 }
        const next = applyMatchResult(prev, didWin)
        await tx
          .insert(tacticsRankings)
          .values({ userId, season: SEASON, lp: next.lp, wins: next.wins, losses: next.losses, winStreak: next.winStreak })
          .onConflictDoUpdate({
            target: [tacticsRankings.userId, tacticsRankings.season],
            set: { lp: next.lp, wins: next.wins, losses: next.losses, winStreak: next.winStreak, updatedAt: new Date() },
          })
        return { lp: next.lp, lpDelta: next.lpDelta, tier: next.tier.key, promoted: next.promoted, demoted: next.demoted }
      }

      const winner = await apply(winnerUserId, true)
      const loser = await apply(loserUserId, false)
      return { duplicate: false as const, winner, loser }
    })

    return NextResponse.json({ success: true, ...result })
  } catch (e) {
    console.error('match-result 처리 오류:', e)
    return NextResponse.json(
      { success: false, error: 'server_error', detail: e instanceof Error ? e.message : String(e) },
      { status: 500 },
    )
  }
}
