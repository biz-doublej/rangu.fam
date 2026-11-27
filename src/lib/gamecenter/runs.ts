import { randomInt } from 'crypto'
import { and, eq, ne, sql } from 'drizzle-orm'
import { getDb, type DB } from '@/db/client'
import { gcPointLedger, gcRuns } from '@/db/schema/gamecenter'
import { isValidClimbInputs, replayClimb, type ClimbResult } from '@/games/climb/engine'
import { CLIMB_MAP } from '@/games/climb/map'
import { isValidTetrisInputs, replay as replayTetris, type TetrisResult } from '@/games/tetris/engine'
import { kstDay } from './kst'
import { GamecenterError, awardPointsTx, lockWallet, type GcTx } from './points'
import { GAME_REWARDS, REASONS, climbRankScore, tetrisRunBonuses } from './rewards'

/**
 * 아케이드 한 판 (테트리스·랑구 등반).
 * 시작할 때 서버가 runId 와 시드를 발급하고, 끝나면 입력 기록을 받아 같은 엔진으로 다시 실행해 점수를 확정한다.
 * 클라이언트가 보낸 점수는 비교에만 쓰고, 기록·보상은 서버가 재실행한 결과로만 정한다.
 */

export const ARCADE_GAMES = ['tetris', 'climb'] as const
export type ArcadeGame = (typeof ARCADE_GAMES)[number]

export function isArcadeGame(value: unknown): value is ArcadeGame {
  return ARCADE_GAMES.includes(value as ArcadeGame)
}

/** 시작한 지 이보다 오래된 판은 받지 않는다 */
const RUN_MAX_AGE_MS = 6 * 60 * 60 * 1000
/** 서버 경과 시간이 입력 기록 길이보다 이만큼 넘게 짧으면 조작으로 본다 (네트워크·타이머 오차 여유) */
const TIME_TOLERANCE = 0.9
const TIME_SLACK_MS = 1500

export type RejectReason = 'invalid_inputs' | 'score_mismatch' | 'too_fast' | 'expired'

export interface RunAward {
  reason: string
  amount: number
  /** 하루 상한 때문에 받지 못한 포인트 */
  clipped: number
}

export interface FinishResult {
  /** 이미 끝난 판이면 true (아무것도 지급하지 않음) */
  alreadyFinished: boolean
  status: 'verified' | 'rejected'
  rejectReason?: RejectReason
  game: ArcadeGame
  score: number | null
  result: TetrisResult | ClimbResult | null
  awards: RunAward[]
  awarded: number
  balance: number
  /** 이번 판이 개인 최고 기록인지 */
  personalBest: boolean
}

export async function startRun(input: { userId: string; game: ArcadeGame }, db: DB = getDb(), opts: { seed?: number } = {}) {
  const seed = opts.seed ?? randomInt(0, 2 ** 32)
  const [run] = await db
    .insert(gcRuns)
    .values({ userId: input.userId, game: input.game, seed, stats: input.game === 'climb' ? { mapVersion: CLIMB_MAP.version } : {} })
    .returning({ id: gcRuns.id, startedAt: gcRuns.startedAt })
  return { runId: run.id, seed, game: input.game }
}

/** 오늘(KST) 그 사유로 지급된 횟수 */
async function countToday(tx: GcTx, userId: string, reason: string, day: string): Promise<number> {
  const [row] = await tx
    .select({ n: sql<number>`count(*)::int` })
    .from(gcPointLedger)
    .where(and(eq(gcPointLedger.userId, userId), eq(gcPointLedger.reason, reason), eq(gcPointLedger.kstDay, day)))
  return Number(row?.n ?? 0)
}

interface Collector {
  awards: RunAward[]
  balance: number
}

async function give(
  tx: GcTx,
  out: Collector,
  input: { userId: string; game: ArcadeGame; runId: string; amount: number; reason: string; key: string; now: Date; capped?: boolean }
) {
  if (input.amount <= 0) return
  const result = await awardPointsTx(tx, {
    userId: input.userId,
    amount: input.amount,
    reason: input.reason,
    game: input.game,
    refId: input.runId,
    idempotencyKey: input.key,
    countsToDailyCap: input.capped ?? true,
    now: input.now,
  })
  if (result.status !== 'applied') return
  out.awards.push({ reason: input.reason, amount: result.amount, clipped: result.clipped })
  out.balance = result.balance
}

async function rewardTetris(tx: GcTx, out: Collector, userId: string, runId: string, result: TetrisResult, prevBest: number | null, now: Date) {
  const rule = GAME_REWARDS.tetris
  const day = kstDay(now)
  const bonus = tetrisRunBonuses(result)
  const base = { userId, game: 'tetris' as const, runId, now }

  if (bonus.longEnough && (await countToday(tx, userId, REASONS.tetrisClear, day)) < rule.clearPerDay) {
    await give(tx, out, { ...base, amount: rule.clear, reason: REASONS.tetrisClear, key: `tetris.clear:${runId}` })
  }
  await give(tx, out, { ...base, amount: bonus.score, reason: REASONS.tetrisScore, key: `tetris.score:${runId}` })
  await give(tx, out, { ...base, amount: bonus.tetris, reason: REASONS.tetrisTetris, key: `tetris.tetris:${runId}` })
  // 경신은 이전 기록이 있을 때만. 키에 날짜를 넣어 하루 1회.
  if (prevBest !== null && result.score > prevBest) {
    await give(tx, out, { ...base, amount: rule.personalBest, reason: REASONS.tetrisBest, key: `tetris.best:${userId}:${day}` })
  }
}

async function rewardClimb(tx: GcTx, out: Collector, userId: string, runId: string, result: ClimbResult, prevBestTime: number | null, now: Date) {
  const rule = GAME_REWARDS.climb
  const day = kstDay(now)
  const base = { userId, game: 'climb' as const, runId, now }

  if (result.frames >= rule.playMinSeconds * 60 && (await countToday(tx, userId, REASONS.climbPlay, day)) < rule.playPerDay) {
    await give(tx, out, { ...base, amount: rule.play, reason: REASONS.climbPlay, key: `climb.play:${runId}` })
  }
  // 구역당 1회 — 출발 구역(1)은 보상이 없다
  for (let zone = 2; zone <= result.maxZone; zone++) {
    await give(tx, out, { ...base, amount: rule.newZone, reason: REASONS.climbZone, key: `climb.zone:${userId}:${zone}` })
  }
  if (result.completedAt !== null) {
    // 정상 첫 도달(500P)은 하루 상한(300P)보다 커서 상한 밖으로 둔다.
    await give(tx, out, { ...base, amount: rule.summit, reason: REASONS.climbSummit, key: `climb.summit:${userId}`, capped: false })
    if (prevBestTime !== null && result.completedAt < prevBestTime) {
      await give(tx, out, { ...base, amount: rule.fasterClear, reason: REASONS.climbFaster, key: `climb.faster:${userId}:${day}` })
    }
  }
}

export async function finishRun(
  input: { userId: string; runId: string; inputs: unknown; clientScore: unknown; now?: Date },
  db: DB = getDb()
): Promise<FinishResult> {
  const now = input.now ?? new Date()
  if (!/^[0-9a-f-]{36}$/i.test(input.runId)) throw new GamecenterError('run_not_found', '그 판을 찾을 수 없습니다.', 404)

  return db.transaction(async (tx) => {
    const wallet = await lockWallet(tx, input.userId)
    const [run] = await tx
      .select()
      .from(gcRuns)
      .where(and(eq(gcRuns.id, input.runId), eq(gcRuns.userId, input.userId)))
      .for('update')
    if (!run || !isArcadeGame(run.game)) throw new GamecenterError('run_not_found', '그 판을 찾을 수 없습니다.', 404)
    const game = run.game

    if (run.status !== 'started') {
      const stats = run.stats as { result?: TetrisResult | ClimbResult; rejectReason?: RejectReason }
      return {
        alreadyFinished: true,
        status: run.status === 'verified' ? 'verified' : 'rejected',
        rejectReason: stats.rejectReason,
        game,
        score: run.score,
        result: stats.result ?? null,
        awards: [],
        awarded: 0,
        balance: wallet.balance,
        personalBest: false,
      }
    }

    const reject = async (rejectReason: RejectReason, result: TetrisResult | ClimbResult | null = null): Promise<FinishResult> => {
      await tx
        .update(gcRuns)
        .set({ status: 'rejected', finishedAt: now, stats: { ...(run.stats as object), rejectReason, result, clientScore: Number(input.clientScore) || 0 } })
        .where(eq(gcRuns.id, run.id))
      return { alreadyFinished: false, status: 'rejected', rejectReason, game, score: null, result, awards: [], awarded: 0, balance: wallet.balance, personalBest: false }
    }

    const elapsedMs = now.getTime() - run.startedAt.getTime()
    if (elapsedMs > RUN_MAX_AGE_MS) return reject('expired')

    // 같은 엔진으로 다시 실행
    let result: TetrisResult | ClimbResult
    let score: number
    let claimed: number
    if (game === 'tetris') {
      if (!isValidTetrisInputs(input.inputs)) return reject('invalid_inputs')
      const replayed = replayTetris(run.seed, input.inputs)
      result = replayed
      score = replayed.score
      claimed = replayed.score
    } else {
      const inputs = input.inputs
      // 등반 기록은 반드시 'end' 로 끝나야 한다 (어디서 끝났는지가 기록의 일부)
      if (!isValidClimbInputs(inputs) || inputs.length === 0 || inputs[inputs.length - 1].action !== 'end') return reject('invalid_inputs')
      const replayed = replayClimb(CLIMB_MAP, inputs)
      result = replayed
      score = climbRankScore(replayed)
      claimed = replayed.maxHeight
    }

    if (!Number.isSafeInteger(input.clientScore) || input.clientScore !== claimed) return reject('score_mismatch', result)
    // 입력 기록이 실제로 흐른 시간보다 명백히 길면 (빨리 감기·만들어 낸 기록) 거절
    if (elapsedMs + TIME_SLACK_MS < (result.frames / 60) * 1000 * TIME_TOLERANCE) return reject('too_fast', result)

    // 이전 기록 (이 판 제외)
    const [best] = await tx
      .select({
        score: sql<number | null>`max(${gcRuns.score})`,
        time: sql<number | null>`min((${gcRuns.stats} -> 'result' ->> 'completedAt')::int)`,
      })
      .from(gcRuns)
      .where(and(eq(gcRuns.userId, input.userId), eq(gcRuns.game, game), eq(gcRuns.status, 'verified'), ne(gcRuns.id, run.id)))
    const prevBest = best?.score === null || best?.score === undefined ? null : Number(best.score)
    const prevBestTime = best?.time === null || best?.time === undefined ? null : Number(best.time)

    await tx
      .update(gcRuns)
      .set({ status: 'verified', score, finishedAt: now, stats: { ...(run.stats as object), result } })
      .where(eq(gcRuns.id, run.id))

    const out: Collector = { awards: [], balance: wallet.balance }
    if (game === 'tetris') await rewardTetris(tx, out, input.userId, run.id, result as TetrisResult, prevBest, now)
    else await rewardClimb(tx, out, input.userId, run.id, result as ClimbResult, prevBestTime, now)

    return {
      alreadyFinished: false,
      status: 'verified',
      game,
      score,
      result,
      awards: out.awards,
      awarded: out.awards.reduce((sum, award) => sum + award.amount, 0),
      balance: out.balance,
      personalBest: score > 0 && (prevBest === null || score > prevBest),
    }
  })
}
