import { and, eq, gt, sql } from 'drizzle-orm'
import { getDb, type DB } from '@/db/client'
import { gcPointLedger, gcWallets, type GcWallet } from '@/db/schema/gamecenter'
import { kstDay } from './kst'
import { DAILY_GAME_CAP, clampToDailyCap } from './rewards'

/**
 * 포인트 지급·차감.
 * 원장(gc_point_ledger)에 쓰는 곳은 이 파일의 awardPoints / spendPoints 뿐이다.
 *
 * - 한 트랜잭션에서 지갑 행을 FOR UPDATE 로 잠근 뒤 원장 insert + 지갑 update.
 * - idempotency_key(UNIQUE)로 같은 보상·차감을 두 번 처리하지 않는다.
 * - 하루 게임 보상 상한(KST 날짜)을 넘는 부분은 잘라서 기록한다.
 * - 잔액은 음수가 될 수 없다.
 */

/** db.transaction() 콜백이 받는 트랜잭션 */
export type GcTx = Parameters<Parameters<DB['transaction']>[0]>[0]

export class GamecenterError extends Error {
  constructor(
    public code: string,
    message: string,
    public status = 400
  ) {
    super(message)
    this.name = 'GamecenterError'
  }
}

export class InsufficientPointsError extends GamecenterError {
  constructor(
    public balance: number,
    public required: number
  ) {
    super('insufficient_points', '포인트가 부족합니다.', 409)
    this.name = 'InsufficientPointsError'
  }
}

export interface AwardInput {
  userId: string
  /** 지급할 포인트 (양의 정수). 상한에 걸리면 줄어들 수 있다. */
  amount: number
  reason: string
  game?: string | null
  refId?: string | null
  idempotencyKey: string
  /** 하루 게임 보상 상한에 포함할지. 출석·랭킹·환불·수동 조정은 false. */
  countsToDailyCap?: boolean
  /** 누적 획득(lifetime_earned)에 더할지. 환불은 false. */
  countsToLifetime?: boolean
  now?: Date
}

export interface SpendInput {
  userId: string
  /** 차감할 포인트 (양의 정수) */
  amount: number
  reason: string
  game?: string | null
  refId?: string | null
  idempotencyKey: string
  now?: Date
}

export interface PointsResult {
  /** applied: 이번에 기록함 / duplicate: 같은 키가 이미 있어 아무것도 하지 않음 */
  status: 'applied' | 'duplicate'
  /** 실제로 원장에 기록된 금액 (적립 +, 사용 -). duplicate 면 0. */
  amount: number
  /** 상한 때문에 잘린 금액 */
  clipped: number
  balance: number
}

function assertAmount(amount: number) {
  if (!Number.isSafeInteger(amount) || amount <= 0) {
    throw new GamecenterError('invalid_amount', '포인트는 1 이상의 정수여야 합니다.')
  }
}

/** 지갑 행을 (없으면 만들고) FOR UPDATE 로 잠가서 돌려준다. */
export async function lockWallet(tx: GcTx, userId: string): Promise<GcWallet> {
  await tx.insert(gcWallets).values({ userId }).onConflictDoNothing()
  const [wallet] = await tx.select().from(gcWallets).where(eq(gcWallets.userId, userId)).for('update')
  if (!wallet) throw new GamecenterError('wallet_missing', '지갑을 만들지 못했습니다.', 500)
  return wallet
}

/** 그 KST 날짜에 상한에 포함되는 보상으로 받은 합계 */
export async function earnedTowardCap(tx: GcTx | DB, userId: string, day: string): Promise<number> {
  const [row] = await tx
    .select({ total: sql<number>`coalesce(sum(${gcPointLedger.amount}), 0)::int` })
    .from(gcPointLedger)
    .where(
      and(
        eq(gcPointLedger.userId, userId),
        eq(gcPointLedger.kstDay, day),
        eq(gcPointLedger.countsToDailyCap, true),
        gt(gcPointLedger.amount, 0)
      )
    )
  return Number(row?.total ?? 0)
}

/** 트랜잭션 안에서 포인트를 지급한다. 다른 변경과 한 트랜잭션으로 묶을 때 쓴다. */
export async function awardPointsTx(tx: GcTx, input: AwardInput): Promise<PointsResult> {
  assertAmount(input.amount)
  const now = input.now ?? new Date()
  const day = kstDay(now)
  const countsToDailyCap = input.countsToDailyCap ?? true

  const wallet = await lockWallet(tx, input.userId)

  let granted = input.amount
  if (countsToDailyCap) {
    granted = clampToDailyCap(input.amount, await earnedTowardCap(tx, input.userId, day), DAILY_GAME_CAP)
  }

  // 상한에 걸려 0P 가 되어도 한 줄을 남긴다 — 같은 보상을 내일 다시 받지 못하게 키를 소모한다.
  const inserted = await tx
    .insert(gcPointLedger)
    .values({
      userId: input.userId,
      amount: granted,
      reason: input.reason,
      game: input.game ?? null,
      refId: input.refId ?? null,
      idempotencyKey: input.idempotencyKey,
      countsToDailyCap,
      kstDay: day,
      createdAt: now,
    })
    .onConflictDoNothing({ target: gcPointLedger.idempotencyKey })
    .returning({ id: gcPointLedger.id })

  if (inserted.length === 0) {
    return { status: 'duplicate', amount: 0, clipped: 0, balance: wallet.balance }
  }

  const balance = wallet.balance + granted
  if (granted > 0) {
    await tx
      .update(gcWallets)
      .set({
        balance,
        lifetimeEarned: wallet.lifetimeEarned + (input.countsToLifetime === false ? 0 : granted),
        updatedAt: now,
      })
      .where(eq(gcWallets.userId, input.userId))
  }
  return { status: 'applied', amount: granted, clipped: input.amount - granted, balance }
}

/** 트랜잭션 안에서 포인트를 차감한다. 잔액이 모자라면 InsufficientPointsError. */
export async function spendPointsTx(tx: GcTx, input: SpendInput): Promise<PointsResult> {
  assertAmount(input.amount)
  const now = input.now ?? new Date()

  const wallet = await lockWallet(tx, input.userId)

  // 같은 키가 이미 처리됐으면 잔액 검사보다 먼저 duplicate 로 답한다.
  const [existing] = await tx
    .select({ id: gcPointLedger.id })
    .from(gcPointLedger)
    .where(eq(gcPointLedger.idempotencyKey, input.idempotencyKey))
    .limit(1)
  if (existing) {
    return { status: 'duplicate', amount: 0, clipped: 0, balance: wallet.balance }
  }

  if (wallet.balance < input.amount) {
    throw new InsufficientPointsError(wallet.balance, input.amount)
  }

  const inserted = await tx
    .insert(gcPointLedger)
    .values({
      userId: input.userId,
      amount: -input.amount,
      reason: input.reason,
      game: input.game ?? null,
      refId: input.refId ?? null,
      idempotencyKey: input.idempotencyKey,
      countsToDailyCap: false,
      kstDay: kstDay(now),
      createdAt: now,
    })
    .onConflictDoNothing({ target: gcPointLedger.idempotencyKey })
    .returning({ id: gcPointLedger.id })

  if (inserted.length === 0) {
    return { status: 'duplicate', amount: 0, clipped: 0, balance: wallet.balance }
  }

  const balance = wallet.balance - input.amount
  await tx.update(gcWallets).set({ balance, updatedAt: now }).where(eq(gcWallets.userId, input.userId))
  return { status: 'applied', amount: -input.amount, clipped: 0, balance }
}

export function awardPoints(input: AwardInput, db: DB = getDb()): Promise<PointsResult> {
  return db.transaction((tx) => awardPointsTx(tx, input))
}

export function spendPoints(input: SpendInput, db: DB = getDb()): Promise<PointsResult> {
  return db.transaction((tx) => spendPointsTx(tx, input))
}
