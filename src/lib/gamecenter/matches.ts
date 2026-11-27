import { and, eq, gt, inArray, sql } from 'drizzle-orm'
import { getDb, type DB } from '@/db/client'
import { gcInventory, gcMatches, gcPointLedger } from '@/db/schema/gamecenter'
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
  players: Array<{ userId: string; rank: number; score?: number; role?: string; stats?: Record<string, number> }>
  summary?: Record<string, unknown>
}

export interface MatchRecord {
  duplicate: boolean
  /** userId → 이번 판으로 받은 포인트 */
  rewards: Record<string, number>
  /** 보상이 없었다면 그 이유 */
  noRewardReason?: 'opponent_limit' | 'too_short' | 'not_completed'
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const REWARDED_GAMES = ['omok', 'liar', 'quiz', 'catchmind', 'yut']
/** 퀴즈 벌칙 면제권의 보유품 키 (상점 상품 quiz-penalty-pass 가 지급한다) */
export const QUIZ_PASS_KEY = 'quiz-penalty-pass'

/** 게임별 집계는 0 이상의 작은 정수만 받는다 */
function cleanStats(raw: unknown): Record<string, number> | undefined {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return undefined
  const stats: Record<string, number> = {}
  for (const [key, value] of Object.entries(raw as Record<string, unknown>).slice(0, 12)) {
    const n = Number(value)
    if (/^[a-zA-Z]{1,24}$/.test(key) && Number.isInteger(n) && n >= 0 && n <= 1000) stats[key] = n
  }
  return stats
}

export function parseMatchReport(raw: any): MatchReport {
  const bad = (message: string) => new GamecenterError('invalid_match', message)
  if (!raw || typeof raw !== 'object') throw bad('결과 형식이 올바르지 않습니다.')
  if (typeof raw.matchId !== 'string' || !UUID.test(raw.matchId)) throw bad('matchId 가 올바르지 않습니다.')
  if (!REWARDED_GAMES.includes(raw.game)) throw bad('알 수 없는 게임입니다.')
  if (!Array.isArray(raw.players) || raw.players.length < 2 || raw.players.length > 8) throw bad('참가자가 올바르지 않습니다.')
  const players = raw.players.map((player: any) => {
    if (typeof player?.userId !== 'string' || !UUID.test(player.userId)) throw bad('참가자 id 가 올바르지 않습니다.')
    if (!Number.isInteger(player.rank) || player.rank < 1 || player.rank > 10) throw bad('순위가 올바르지 않습니다.')
    return {
      userId: player.userId.toLowerCase(),
      rank: player.rank as number,
      score: Number.isFinite(player.score) ? Number(player.score) : 0,
      role: typeof player.role === 'string' ? player.role.slice(0, 20) : undefined,
      stats: cleanStats(player.stats),
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

interface Part {
  userId: string
  amount: number
  reason: string
  /** 지급 키의 마지막 부분 */
  part: string
}

/** 여러 갈래의 보상을 한 줄씩 지급하고 사람별 합계를 돌려준다. */
async function payParts(tx: GcTx, report: MatchReport, parts: Part[], now: Date): Promise<Record<string, number>> {
  const rewards: Record<string, number> = {}
  for (const entry of parts) {
    if (entry.amount <= 0) continue
    const result = await awardPointsTx(tx, {
      userId: entry.userId,
      amount: entry.amount,
      reason: entry.reason,
      game: report.game,
      refId: report.matchId,
      idempotencyKey: `${report.game}:${report.matchId}:${entry.userId}:${entry.part}`,
      now,
    })
    rewards[entry.userId] = (rewards[entry.userId] ?? 0) + result.amount
  }
  return rewards
}

/** 끝까지 진행된 판이고 사람이 최소 인원 이상이었는지 */
function completedWith(report: MatchReport, minPlayers: number): boolean {
  return report.summary?.completed === true && report.players.length >= minPlayers
}

async function rewardLiar(tx: GcTx, report: MatchReport, now: Date): Promise<Pick<MatchRecord, 'rewards' | 'noRewardReason'>> {
  const rule = GAME_REWARDS.liar
  if (!completedWith(report, rule.minPlayers)) return { rewards: {}, noRewardReason: 'not_completed' }
  const parts: Part[] = []
  for (const player of report.players) {
    // 도중에 나간 사람은 보상이 없다
    if (!player.stats?.stayed) continue
    parts.push({ userId: player.userId, amount: rule.participate, reason: REASONS.liarPlay, part: 'play' })
    if (player.stats.won) {
      parts.push({ userId: player.userId, amount: player.role === 'liar' ? rule.winAsLiar : rule.winAsCitizen, reason: REASONS.liarWin, part: 'win' })
    }
  }
  return { rewards: await payParts(tx, report, parts, now) }
}

async function rewardQuiz(tx: GcTx, report: MatchReport, now: Date): Promise<Pick<MatchRecord, 'rewards' | 'noRewardReason'>> {
  const rule = GAME_REWARDS.quiz
  if (!completedWith(report, rule.minPlayers)) return { rewards: {}, noRewardReason: 'not_completed' }
  const questions = Math.min(100, Math.max(0, Number(report.summary?.questions) || 0))
  const day = kstDay(now)
  const parts: Part[] = []
  for (const player of report.players) {
    const stats = player.stats ?? {}
    if (!stats.stayed) continue
    const asSubject = Math.min(stats.asSubject ?? 0, questions)
    parts.push({ userId: player.userId, amount: rule.participate, reason: REASONS.quizPlay, part: 'play' })
    parts.push({ userId: player.userId, amount: Math.min(stats.correct ?? 0, questions) * rule.correct, reason: REASONS.quizCorrect, part: 'correct' })
    // 아무도 점수를 못 낸 판(전원 0점 동률 1위)은 순위 보상이 없다
    if ((player.score ?? 0) > 0 && player.rank <= rule.rank.length) {
      parts.push({ userId: player.userId, amount: rule.rank[player.rank - 1], reason: REASONS.quizRank, part: 'rank' })
    }
    parts.push({ userId: player.userId, amount: Math.min(stats.predictionHits ?? 0, asSubject) * rule.predictionHit, reason: REASONS.quizPredict, part: 'predict' })

    // 내 문제가 게임에 쓰임: 하루 30P 까지
    const [used] = await tx
      .select({ total: sql<number>`coalesce(sum(${gcPointLedger.amount}), 0)::int` })
      .from(gcPointLedger)
      .where(and(eq(gcPointLedger.userId, player.userId), eq(gcPointLedger.reason, REASONS.quizUsed), eq(gcPointLedger.kstDay, day)))
    const left = Math.max(0, rule.questionUsedMaxPerDay - Number(used?.total ?? 0))
    parts.push({ userId: player.userId, amount: Math.min(asSubject * rule.questionUsed, left), reason: REASONS.quizUsed, part: 'used' })
  }

  // 벌칙 면제권을 썼으면 한 장 차감한다 (없으면 그냥 넘어간다 — 이미 다른 판에서 쓴 경우)
  const passUser = report.summary?.passUsedBy
  if (typeof passUser === 'string' && report.players.some((player) => player.userId === passUser)) {
    await tx
      .update(gcInventory)
      .set({ quantity: sql`${gcInventory.quantity} - 1`, updatedAt: now })
      .where(and(eq(gcInventory.userId, passUser), eq(gcInventory.itemKey, QUIZ_PASS_KEY), gt(gcInventory.quantity, 0)))
  }
  return { rewards: await payParts(tx, report, parts, now) }
}

async function rewardCatchmind(tx: GcTx, report: MatchReport, now: Date): Promise<Pick<MatchRecord, 'rewards' | 'noRewardReason'>> {
  const rule = GAME_REWARDS.catchmind
  if (!completedWith(report, rule.minPlayers)) return { rewards: {}, noRewardReason: 'not_completed' }
  const rounds = Math.min(32, Math.max(0, Number(report.summary?.rounds) || 0))
  const others = report.players.length - 1
  const parts: Part[] = []
  for (const player of report.players) {
    const stats = player.stats ?? {}
    if (!stats.stayed) continue
    const correct = Math.min(stats.correct ?? 0, rounds)
    parts.push({ userId: player.userId, amount: rule.participate, reason: REASONS.catchmindPlay, part: 'play' })
    parts.push({ userId: player.userId, amount: correct * rule.correct, reason: REASONS.catchmindCorrect, part: 'correct' })
    // 가장 먼저 맞힌 라운드마다 추가
    parts.push({ userId: player.userId, amount: Math.min(stats.first ?? 0, correct) * rule.earlyBonus, reason: REASONS.catchmindFirst, part: 'first' })
    // 내 그림을 맞힌 사람 1명당
    parts.push({
      userId: player.userId,
      amount: Math.min(stats.drawnGuessed ?? 0, rounds * others) * rule.drawingGuessedPerPlayer,
      reason: REASONS.catchmindDrawn,
      part: 'drawn',
    })
  }
  return { rewards: await payParts(tx, report, parts, now) }
}

async function rewardYut(tx: GcTx, report: MatchReport, now: Date): Promise<Pick<MatchRecord, 'rewards' | 'noRewardReason'>> {
  const rule = GAME_REWARDS.yut
  if (!completedWith(report, 2)) return { rewards: {}, noRewardReason: 'not_completed' }
  if (Number(report.summary?.throws ?? 0) < rule.minThrowsForReward) return { rewards: {}, noRewardReason: 'too_short' }
  const parts: Part[] = []
  for (const player of report.players) {
    if (!player.stats?.stayed) continue
    parts.push({ userId: player.userId, amount: rule.participate, reason: REASONS.yutPlay, part: 'play' })
    if (player.stats.won) parts.push({ userId: player.userId, amount: rule.win, reason: REASONS.yutWin, part: 'win' })
  }
  return { rewards: await payParts(tx, report, parts, now) }
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

    // 이미 저장된 판이면 보상도 면제권 차감도 다시 하지 않는다
    const [existing] = await tx.select({ id: gcMatches.id }).from(gcMatches).where(eq(gcMatches.id, report.matchId)).limit(1)
    if (existing) return { duplicate: true, rewards: {} }

    const reward =
      report.game === 'omok'
        ? await rewardOmok(tx, report, now)
        : report.game === 'liar'
          ? await rewardLiar(tx, report, now)
          : report.game === 'quiz'
            ? await rewardQuiz(tx, report, now)
            : report.game === 'catchmind'
              ? await rewardCatchmind(tx, report, now)
              : await rewardYut(tx, report, now)

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
