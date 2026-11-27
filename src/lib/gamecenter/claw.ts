import { randomInt } from 'crypto'
import { and, desc, eq, gt, like, sql } from 'drizzle-orm'
import { getDb, type DB } from '@/db/client'
import { gcInventory, gcRuns, gcWallets } from '@/db/schema/gamecenter'
import { CLAW_ODDS, clawWinChance, drawClawOutcome, isClawWin, type ClawOutcome } from '@/games/claw/draw'
import { GOLD_PLUSH_KEY, PLUSHES, plushItemKey } from '@/games/claw/plushes'
import { GamecenterError, awardPointsTx, lockWallet, spendPointsTx, type GcTx } from './points'
import { GAME_REWARDS, REASONS } from './rewards'
import { grantInventoryTx } from './shop'

/**
 * 인형뽑기 서버 로직.
 * - play: 20P(또는 무료권)를 차감하고 결과를 추첨해 gc_runs 에 남긴다. 화면은 그 결과대로 연출만 한다.
 * - settle: 연출이 끝나면 인형과 보상을 확정한다. 한 판은 한 번만 정산된다.
 * 정산하지 않은 판이 있으면 새 판을 시작하지 않고 그 판을 돌려준다
 * (새로고침·더블 클릭으로 두 번 차감되거나 얻은 인형을 잃지 않게).
 */

export const CLAW_GAME = 'claw'
export const CLAW_TICKET_KEY = 'claw-ticket'

type PaidWith = 'points' | 'ticket'

interface ClawRunStats {
  outcome: ClawOutcome
  won: boolean
  /** 이 판을 시작할 때의 연속 실패 횟수 */
  misses: number
  paidWith: PaidWith
  [key: string]: unknown
}

export interface ClawPlay {
  playId: string
  outcome: ClawOutcome
  paidWith: PaidWith
  /** 정산하지 않은 이전 판을 이어서 돌려준 것이면 true (이번 요청으로는 차감하지 않음) */
  resumed: boolean
  balance: number
  tickets: number
}

export interface ClawSettlement {
  /** 이미 정산된 판이면 true (아무것도 지급하지 않음) */
  alreadySettled: boolean
  won: boolean
  plush: string
  /** 도감에 처음 등록된 인형인지 */
  firstOfKind: boolean
  /** 이번 정산으로 받은 포인트 (하루 상한에 걸리면 줄어든다) */
  awarded: number
  /** 하루 상한 때문에 받지 못한 포인트 */
  clipped: number
  balance: number
}

async function ticketCount(tx: GcTx | DB, userId: string): Promise<number> {
  const [row] = await tx
    .select({ quantity: gcInventory.quantity })
    .from(gcInventory)
    .where(and(eq(gcInventory.userId, userId), eq(gcInventory.itemKey, CLAW_TICKET_KEY)))
    .limit(1)
  return row?.quantity ?? 0
}

async function pendingRun(tx: GcTx | DB, userId: string) {
  const [run] = await tx
    .select()
    .from(gcRuns)
    .where(and(eq(gcRuns.userId, userId), eq(gcRuns.game, CLAW_GAME), eq(gcRuns.status, 'started')))
    .orderBy(desc(gcRuns.startedAt))
    .limit(1)
  return run
}

/** 가장 최근 판 기준 연속 실패 횟수 (마지막 판이 성공이면 0) */
async function missStreak(tx: GcTx | DB, userId: string): Promise<number> {
  const [last] = await tx
    .select({ stats: gcRuns.stats })
    .from(gcRuns)
    .where(and(eq(gcRuns.userId, userId), eq(gcRuns.game, CLAW_GAME)))
    .orderBy(desc(gcRuns.startedAt))
    .limit(1)
  if (!last) return 0
  const stats = last.stats as Partial<ClawRunStats>
  return stats.won ? 0 : Number(stats.misses ?? 0) + 1
}

function toPlay(run: { id: string; stats: unknown }, resumed: boolean, balance: number, tickets: number): ClawPlay {
  const stats = run.stats as ClawRunStats
  return { playId: run.id, outcome: stats.outcome, paidWith: stats.paidWith, resumed, balance, tickets }
}

/**
 * 한 판 시작: 무료권이 있으면 무료권 1장, 없으면 포인트를 차감하고 결과를 추첨한다.
 * opts.seed 는 테스트에서 결과를 고정할 때만 쓴다.
 */
export async function startClawPlay(
  input: { userId: string; now?: Date },
  db: DB = getDb(),
  opts: { seed?: number } = {}
): Promise<ClawPlay> {
  const now = input.now ?? new Date()
  return db.transaction(async (tx) => {
    // 지갑 잠금으로 같은 사용자의 동시 요청을 한 줄로 세운다.
    const wallet = await lockWallet(tx, input.userId)

    const pending = await pendingRun(tx, input.userId)
    if (pending) {
      return toPlay(pending, true, wallet.balance, await ticketCount(tx, input.userId))
    }

    const misses = await missStreak(tx, input.userId)
    const seed = opts.seed ?? randomInt(0, 2 ** 32)
    const outcome = drawClawOutcome(seed, misses)

    const [run] = await tx
      .insert(gcRuns)
      .values({ userId: input.userId, game: CLAW_GAME, seed, stats: {} })
      .returning({ id: gcRuns.id })

    // 무료권이 있으면 먼저 쓴다.
    const usedTicket = await tx
      .update(gcInventory)
      .set({ quantity: sql`${gcInventory.quantity} - 1`, updatedAt: now })
      .where(
        and(eq(gcInventory.userId, input.userId), eq(gcInventory.itemKey, CLAW_TICKET_KEY), gt(gcInventory.quantity, 0))
      )
      .returning({ quantity: gcInventory.quantity })

    let balance = wallet.balance
    let paidWith: PaidWith = 'ticket'
    if (usedTicket.length === 0) {
      paidWith = 'points'
      // 잔액이 모자라면 여기서 던져지고 위의 판 기록까지 전부 취소된다.
      const spent = await spendPointsTx(tx, {
        userId: input.userId,
        amount: GAME_REWARDS.claw.playCost,
        reason: REASONS.clawPlay,
        game: CLAW_GAME,
        refId: run.id,
        idempotencyKey: `claw.play:${run.id}`,
        now,
      })
      balance = spent.balance
    }

    const stats: ClawRunStats = { outcome, won: isClawWin(outcome), misses, paidWith }
    await tx.update(gcRuns).set({ stats }).where(eq(gcRuns.id, run.id))

    return {
      playId: run.id,
      outcome,
      paidWith,
      resumed: false,
      balance,
      tickets: usedTicket[0]?.quantity ?? 0,
    }
  })
}

/** 연출이 끝난 판을 정산한다: 인형 지급, 도감 첫 등록·황금 랑구 보상. */
export async function settleClawPlay(
  input: { userId: string; playId: string; now?: Date },
  db: DB = getDb()
): Promise<ClawSettlement> {
  const now = input.now ?? new Date()
  if (!/^[0-9a-f-]{36}$/i.test(input.playId)) {
    throw new GamecenterError('play_not_found', '그 판을 찾을 수 없습니다.', 404)
  }

  return db.transaction(async (tx) => {
    const wallet = await lockWallet(tx, input.userId)
    const [run] = await tx
      .select()
      .from(gcRuns)
      .where(and(eq(gcRuns.id, input.playId), eq(gcRuns.userId, input.userId), eq(gcRuns.game, CLAW_GAME)))
      .for('update')
    if (!run) throw new GamecenterError('play_not_found', '그 판을 찾을 수 없습니다.', 404)

    const stats = run.stats as ClawRunStats
    const base = { won: stats.won, plush: stats.outcome.plush, firstOfKind: false, awarded: 0, clipped: 0 }
    if (run.status !== 'started') {
      return { ...base, alreadySettled: true, balance: wallet.balance }
    }

    let { firstOfKind, awarded, clipped } = base
    let balance = wallet.balance
    if (stats.won) {
      const plush = stats.outcome.plush
      await grantInventoryTx(tx, input.userId, plushItemKey(plush), 1, now)

      // 종류당 1회 — 키에 판 id 가 아니라 인형 종류를 넣어 한 번만 지급되게 한다.
      const dex = await awardPointsTx(tx, {
        userId: input.userId,
        amount: GAME_REWARDS.claw.newPlush,
        reason: REASONS.clawNewPlush,
        game: CLAW_GAME,
        refId: run.id,
        idempotencyKey: `claw.dex:${input.userId}:${plush}`,
        now,
      })
      if (dex.status === 'applied') {
        firstOfKind = true
        awarded += dex.amount
        clipped += dex.clipped
        balance = dex.balance
      }

      if (plush === GOLD_PLUSH_KEY) {
        const gold = await awardPointsTx(tx, {
          userId: input.userId,
          amount: GAME_REWARDS.claw.goldenRangu,
          reason: REASONS.clawGold,
          game: CLAW_GAME,
          refId: run.id,
          idempotencyKey: `claw.gold:${run.id}`,
          now,
        })
        awarded += gold.amount
        clipped += gold.clipped
        balance = gold.balance
      }
    }

    await tx
      .update(gcRuns)
      .set({ status: 'verified', score: stats.won ? 1 : 0, finishedAt: now })
      .where(eq(gcRuns.id, run.id))

    return { alreadySettled: false, won: stats.won, plush: stats.outcome.plush, firstOfKind, awarded, clipped, balance }
  })
}

/** 인형뽑기 화면에 필요한 내 상태 (읽기 전용) */
export async function getClawState(userId: string, db: DB = getDb()) {
  const [wallet] = await db.select().from(gcWallets).where(eq(gcWallets.userId, userId)).limit(1)
  const owned = await db
    .select({ itemKey: gcInventory.itemKey, quantity: gcInventory.quantity })
    .from(gcInventory)
    .where(and(eq(gcInventory.userId, userId), like(gcInventory.itemKey, 'plush:%')))
  const counts = new Map(owned.map((row) => [row.itemKey, row.quantity]))
  const pending = await pendingRun(db, userId)
  const misses = await missStreak(db, userId)

  return {
    balance: wallet?.balance ?? 0,
    tickets: await ticketCount(db, userId),
    cost: GAME_REWARDS.claw.playCost,
    dex: PLUSHES.map((plush) => ({ key: plush.key, count: counts.get(plushItemKey(plush.key)) ?? 0 })),
    misses,
    winChance: clawWinChance(misses),
    odds: { baseWin: CLAW_ODDS.baseWin, pityStep: CLAW_ODDS.pityStep, maxWin: CLAW_ODDS.maxWin, gold: CLAW_ODDS.gold },
    rewards: { newPlush: GAME_REWARDS.claw.newPlush, goldenRangu: GAME_REWARDS.claw.goldenRangu },
    pending: pending ? { playId: pending.id, outcome: (pending.stats as ClawRunStats).outcome } : null,
  }
}
