import { inArray, sql } from 'drizzle-orm'
import { getDb, type DB } from '@/db/client'
import { gcMatches } from '@/db/schema/gamecenter'
import { wikiUsers } from '@/db/schema/wiki'
import { kstDay, kstDayStart } from './kst'
import { GamecenterError, awardPointsTx, lockWallet, type GcTx } from './points'
import { GAME_REWARDS, REASONS } from './rewards'

/**
 * 파티·보드 한 판 결과 저장 + 보상.
 * 실시간 서버가 서명해서 보낸 결과만 여기로 온다 (/api/gamecenter/internal/match-result).
 * matchId 가 같으면 두 번째부터는 아무 일도 하지 않는다.
 */

export interface MatchReport {
  matchId: string
  game: string
  players: Array<{ userId: string; rank: number; score?: number; role?: string }>
  summary?: Record<string, unknown>
}

export interface MatchRecord {
  duplicate: boolean
  /** userId → 이번 판으로 받은 포인트 */
  rewards: Record<string, number>
  /** 보상이 없었다면 그 이유 */
  noRewardReason?: 'opponent_limit' | 'too_short'
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const REWARDED_GAMES = ['omok']

export function parseMatchReport(raw: any): MatchReport {
  const bad = (message: string) => new GamecenterError('invalid_match', message)
  if (!raw || typeof raw !== 'object') throw bad('결과 형식이 올바르지 않습니다.')
  if (typeof raw.matchId !== 'string' || !UUID.test(raw.matchId)) throw bad('matchId 가 올바르지 않습니다.')
  if (!REWARDED_GAMES.includes(raw.game)) throw bad('알 수 없는 게임입니다.')
  if (!Array.isArray(raw.players) || raw.players.length < 2 || raw.players.length > 10) throw bad('참가자가 올바르지 않습니다.')
  const players = raw.players.map((player: any) => {
    if (typeof player?.userId !== 'string' || !UUID.test(player.userId)) throw bad('참가자 id 가 올바르지 않습니다.')
    if (!Number.isInteger(player.rank) || player.rank < 1 || player.rank > 10) throw bad('순위가 올바르지 않습니다.')
    return {
      userId: player.userId.toLowerCase(),
      rank: player.rank as number,
      score: Number.isFinite(player.score) ? Number(player.score) : 0,
      role: typeof player.role === 'string' ? player.role.slice(0, 20) : undefined,
    }
  })
  if (new Set(players.map((player: { userId: string }) => player.userId)).size !== players.length) throw bad('참가자가 겹칩니다.')
  if (raw.game === 'omok' && players.length !== 2) throw bad('오목은 두 명이어야 합니다.')
  const summary = raw.summary && typeof raw.summary === 'object' && !Array.isArray(raw.summary) ? raw.summary : {}
  return { matchId: raw.matchId.toLowerCase(), game: raw.game, players, summary }
}

/** 오늘(KST) 그 두 사람이 이미 둔 오목 판 수 */
async function omokGamesToday(tx: GcTx, a: string, b: string, now: Date): Promise<number> {
  const rows = await tx.execute(sql`
    SELECT count(*)::int AS n FROM gc_matches
    WHERE game = 'omok'
      AND finished_at >= ${kstDayStart(kstDay(now)).toISOString()}::timestamptz
      AND players @> ${JSON.stringify([{ userId: a }])}::jsonb
      AND players @> ${JSON.stringify([{ userId: b }])}::jsonb
  `)
  return Number((((rows as any).rows ?? rows) as any[])[0]?.n ?? 0)
}

async function rewardOmok(tx: GcTx, report: MatchReport, now: Date): Promise<Pick<MatchRecord, 'rewards' | 'noRewardReason'>> {
  const rule = GAME_REWARDS.omok
  const [a, b] = report.players
  // 같은 상대와는 하루 3판까지만 보상 (이 판을 넣기 전에 센다)
  if ((await omokGamesToday(tx, a.userId, b.userId, now)) >= rule.rewardedGamesPerOpponentPerDay) {
    return { rewards: {}, noRewardReason: 'opponent_limit' }
  }
  if (Number(report.summary?.moves ?? 0) < rule.minMovesForReward) {
    return { rewards: {}, noRewardReason: 'too_short' }
  }
  const draw = a.rank === b.rank
  const rewards: Record<string, number> = {}
  for (const player of report.players) {
    const won = !draw && player.rank === 1
    const result = await awardPointsTx(tx, {
      userId: player.userId,
      amount: won ? rule.win : rule.lose,
      reason: draw ? REASONS.omokDraw : won ? REASONS.omokWin : REASONS.omokLose,
      game: 'omok',
      refId: report.matchId,
      idempotencyKey: `omok:${report.matchId}:${player.userId}`,
      now,
    })
    rewards[player.userId] = result.amount
  }
  return { rewards }
}

export async function recordMatch(raw: unknown, now: Date = new Date(), db: DB = getDb()): Promise<MatchRecord> {
  const report = parseMatchReport(raw)
  const ids = report.players.map((player) => player.userId).sort()

  const known = await db.select({ id: wikiUsers.id }).from(wikiUsers).where(inArray(wikiUsers.id, ids))
  if (known.length !== ids.length) throw new GamecenterError('unknown_player', '없는 사용자가 포함돼 있습니다.')

  return db.transaction(async (tx) => {
    // 참가자 지갑을 항상 같은 순서로 잠근다 — 같은 두 사람의 결과가 동시에 와도 한 줄로 처리된다.
    for (const id of ids) await lockWallet(tx, id)

    const reward = report.game === 'omok' ? await rewardOmok(tx, report, now) : { rewards: {} }

    const inserted = await tx
      .insert(gcMatches)
      .values({ id: report.matchId, game: report.game, players: report.players, summary: report.summary ?? {}, finishedAt: now })
      .onConflictDoNothing({ target: gcMatches.id })
      .returning({ id: gcMatches.id })
    if (inserted.length === 0) {
      // 이미 저장된 판 — 위에서 준 보상도 같은 키라 중복 지급되지 않는다.
      return { duplicate: true, rewards: {} }
    }
    return { duplicate: false, ...reward }
  })
}
