import { randomUUID } from 'crypto'
import { and, asc, desc, eq, gte, ne, sql } from 'drizzle-orm'
import { getDb, type DB } from '@/db/client'
import {
  gcInventory,
  gcOrders,
  gcShopItems,
  type GcLimitPeriod,
  type GcOrder,
  type GcOrderStatus,
  type GcShopItem,
  type GcShopItemKind,
} from '@/db/schema/gamecenter'
import { wikiUsers } from '@/db/schema/wiki'
import { periodStart } from './kst'
import { GamecenterError, awardPointsTx, lockWallet, spendPointsTx, type GcTx } from './points'
import { REASONS } from './rewards'

/**
 * 상점: 교환(purchase) → 지급(fulfill).
 * 교환은 한 트랜잭션에서 잔액 확인 → 차감 원장 기록 → 상품 지급 → 주문 기록을 하고,
 * 하나라도 실패하면 전부 취소된다.
 */

export const SHOP_ITEM_KINDS: GcShopItemKind[] = ['inventory', 'title', 'wiki_color', 'coupon']
export const LIMIT_PERIODS: GcLimitPeriod[] = ['day', 'week', 'month', 'once']

/** 현금성 상품을 실수로 등록하지 않게 이름·설명에서 걸러내는 말 (원칙: 현금성 상품 없음) */
const CASH_LIKE_WORDS = ['기프티콘', '상품권', '현금', '문화상품권', '기프트카드', '계좌이체']

export function findCashLikeWord(text: string): string | null {
  return CASH_LIKE_WORDS.find((word) => text.includes(word)) ?? null
}

/** 상품 payload 에서 지급할 보유품 키와 수량을 읽는다. */
export function grantOf(item: Pick<GcShopItem, 'id' | 'kind' | 'payload'>): { itemKey: string; amount: number } | null {
  if (item.kind === 'coupon') return null
  const payload = (item.payload ?? {}) as Record<string, unknown>
  const itemKey = typeof payload.itemKey === 'string' && payload.itemKey.trim() ? payload.itemKey.trim() : item.id
  const rawAmount = Number(payload.amount)
  const amount = Number.isSafeInteger(rawAmount) && rawAmount > 0 ? rawAmount : 1
  return { itemKey, amount }
}

/** 보유품 수량을 더한다 (없으면 만든다). */
export async function grantInventoryTx(tx: GcTx, userId: string, itemKey: string, amount: number, now: Date) {
  const [row] = await tx
    .insert(gcInventory)
    .values({ userId, itemKey, quantity: amount, updatedAt: now })
    .onConflictDoUpdate({
      target: [gcInventory.userId, gcInventory.itemKey],
      set: { quantity: sql`${gcInventory.quantity} + ${amount}`, updatedAt: now },
    })
    .returning()
  return row
}

export async function listShopItems(db: DB = getDb(), opts: { includeInactive?: boolean } = {}): Promise<GcShopItem[]> {
  const query = db.select().from(gcShopItems)
  const rows = opts.includeInactive ? await query : await query.where(eq(gcShopItems.active, true))
  return rows.sort((a, b) => a.sortOrder - b.sortOrder || a.id.localeCompare(b.id))
}

/** 기간 안에 그 상품을 몇 번 교환했는지 (취소된 주문 제외) */
async function countPurchases(tx: GcTx | DB, userId: string, itemId: string, period: GcLimitPeriod, now: Date) {
  const since = periodStart(period, now)
  const conditions = [eq(gcOrders.userId, userId), eq(gcOrders.itemId, itemId), ne(gcOrders.status, 'cancelled')]
  if (since) conditions.push(gte(gcOrders.createdAt, since))
  const [row] = await tx
    .select({ n: sql<number>`count(*)::int` })
    .from(gcOrders)
    .where(and(...conditions))
  return Number(row?.n ?? 0)
}

/** 내가 기간 제한 때문에 지금 살 수 없는 상품 id 목록 */
export async function purchasedOutItemIds(userId: string, items: GcShopItem[], now: Date = new Date(), db: DB = getDb()) {
  const blocked: string[] = []
  for (const item of items) {
    if (!item.limitPerPeriod || !item.limitPeriod) continue
    if ((await countPurchases(db, userId, item.id, item.limitPeriod, now)) >= item.limitPerPeriod) blocked.push(item.id)
  }
  return blocked
}

export interface PurchaseInput {
  userId: string
  itemId: string
  /** 클라이언트가 만든 요청 id — 같은 요청이 두 번 와도 한 번만 처리한다. */
  requestId: string
  now?: Date
}

export interface PurchaseResult {
  status: 'purchased' | 'duplicate'
  order: GcOrder | null
  balance: number
  granted: { itemKey: string; amount: number; quantity: number } | null
}

const REQUEST_ID_PATTERN = /^[A-Za-z0-9_-]{8,64}$/

export function isValidRequestId(value: unknown): value is string {
  return typeof value === 'string' && REQUEST_ID_PATTERN.test(value)
}

export async function purchase(input: PurchaseInput, db: DB = getDb()): Promise<PurchaseResult> {
  if (!isValidRequestId(input.requestId)) {
    throw new GamecenterError('invalid_request_id', '요청 id 가 올바르지 않습니다.')
  }
  const now = input.now ?? new Date()

  return db.transaction(async (tx) => {
    // 지갑 잠금이 같은 사용자의 동시 구매를 한 줄로 세운다 (잔액·기간 제한 경쟁 방지).
    await lockWallet(tx, input.userId)

    const [item] = await tx.select().from(gcShopItems).where(eq(gcShopItems.id, input.itemId)).for('update')
    if (!item || !item.active) {
      throw new GamecenterError('item_unavailable', '지금은 교환할 수 없는 상품입니다.', 404)
    }
    if (item.stock !== null && item.stock <= 0) {
      throw new GamecenterError('out_of_stock', '재고가 모두 소진됐습니다.', 409)
    }

    const orderId = randomUUID()
    const spent = await spendPointsTx(tx, {
      userId: input.userId,
      amount: item.price,
      reason: REASONS.shopPurchase,
      refId: orderId,
      idempotencyKey: `shop:${input.userId}:${input.requestId}`,
      now,
    })
    if (spent.status === 'duplicate') {
      return { status: 'duplicate' as const, order: null, balance: spent.balance, granted: null }
    }

    if (item.limitPerPeriod && item.limitPeriod) {
      const count = await countPurchases(tx, input.userId, item.id, item.limitPeriod, now)
      if (count >= item.limitPerPeriod) {
        // 던지면 트랜잭션 전체(위의 차감 포함)가 취소된다.
        throw new GamecenterError('purchase_limit', '이 상품은 교환 횟수 제한에 도달했습니다.', 409)
      }
    }

    if (item.stock !== null) {
      await tx.update(gcShopItems).set({ stock: item.stock - 1 }).where(eq(gcShopItems.id, item.id))
    }

    const grant = grantOf(item)
    let granted: PurchaseResult['granted'] = null
    if (grant) {
      const row = await grantInventoryTx(tx, input.userId, grant.itemKey, grant.amount, now)
      granted = { ...grant, quantity: row.quantity }
    }

    const [order] = await tx
      .insert(gcOrders)
      .values({
        id: orderId,
        userId: input.userId,
        itemId: item.id,
        price: item.price,
        // 자동 지급 상품은 즉시 fulfilled, 관리자가 처리하는 상품(쿠폰)은 pending
        status: grant ? 'fulfilled' : 'pending',
        createdAt: now,
        resolvedAt: grant ? now : null,
      })
      .returning()

    return { status: 'purchased' as const, order, balance: spent.balance, granted }
  })
}

/** 관리자: pending 주문을 사용 완료(used) 또는 취소(cancelled, 포인트 반환)로 처리 */
export async function resolveOrder(
  input: { orderId: string; action: 'used' | 'cancelled'; adminId: string; now?: Date },
  db: DB = getDb()
): Promise<GcOrder> {
  const now = input.now ?? new Date()
  return db.transaction(async (tx) => {
    const [order] = await tx.select().from(gcOrders).where(eq(gcOrders.id, input.orderId)).for('update')
    if (!order) throw new GamecenterError('order_not_found', '주문을 찾을 수 없습니다.', 404)
    if (order.status !== 'pending') {
      throw new GamecenterError('order_not_pending', '이미 처리된 주문입니다.', 409)
    }

    if (input.action === 'cancelled') {
      await awardPointsTx(tx, {
        userId: order.userId,
        amount: order.price,
        reason: REASONS.shopRefund,
        refId: order.id,
        idempotencyKey: `shop.refund:${order.id}`,
        countsToDailyCap: false,
        countsToLifetime: false,
        now,
      })
      // 재고가 있는 상품이면 한 개 되돌린다.
      await tx
        .update(gcShopItems)
        .set({ stock: sql`${gcShopItems.stock} + 1` })
        .where(and(eq(gcShopItems.id, order.itemId), sql`${gcShopItems.stock} is not null`))
    }

    const [updated] = await tx
      .update(gcOrders)
      .set({ status: input.action as GcOrderStatus, resolvedAt: now, resolvedBy: input.adminId })
      .where(eq(gcOrders.id, order.id))
      .returning()
    return updated
  })
}

export async function listOrders(db: DB = getDb(), opts: { status?: GcOrderStatus; limit?: number } = {}) {
  const query = db
    .select({
      id: gcOrders.id,
      userId: gcOrders.userId,
      username: wikiUsers.username,
      displayName: wikiUsers.displayName,
      itemId: gcOrders.itemId,
      itemName: gcShopItems.name,
      price: gcOrders.price,
      status: gcOrders.status,
      createdAt: gcOrders.createdAt,
      resolvedAt: gcOrders.resolvedAt,
    })
    .from(gcOrders)
    .innerJoin(gcShopItems, eq(gcShopItems.id, gcOrders.itemId))
    .innerJoin(wikiUsers, eq(wikiUsers.id, gcOrders.userId))
  const filtered = opts.status ? query.where(eq(gcOrders.status, opts.status)) : query
  return filtered.orderBy(desc(gcOrders.createdAt)).limit(Math.min(opts.limit ?? 100, 200))
}

export interface ShopItemInput {
  id: string
  name: string
  description: string
  kind: GcShopItemKind
  price: number
  payload: Record<string, unknown>
  stock: number | null
  limitPerPeriod: number | null
  limitPeriod: GcLimitPeriod | null
  active: boolean
  sortOrder: number
}

const ITEM_ID_PATTERN = /^[a-z0-9][a-z0-9-]{1,48}$/

function optionalPositiveInt(value: unknown, label: string, allowZero = false): number | null {
  if (value === null || value === undefined || value === '') return null
  const n = Number(value)
  if (!Number.isSafeInteger(n) || n < (allowZero ? 0 : 1)) {
    throw new GamecenterError('invalid_item', `${label} 값이 올바르지 않습니다.`)
  }
  return n
}

/** 관리자 화면에서 온 상품 입력을 검증해 저장할 모양으로 만든다. */
export function parseShopItemInput(raw: any): ShopItemInput {
  const id = String(raw?.id ?? '').trim()
  if (!ITEM_ID_PATTERN.test(id)) {
    throw new GamecenterError('invalid_item', '상품 id 는 영문 소문자·숫자·하이픈 2~49자여야 합니다.')
  }
  const name = String(raw?.name ?? '').trim()
  if (!name || name.length > 60) throw new GamecenterError('invalid_item', '상품 이름은 1~60자여야 합니다.')
  const description = String(raw?.description ?? '').trim().slice(0, 300)
  const cashWord = findCashLikeWord(`${name} ${description}`)
  if (cashWord) {
    throw new GamecenterError('cash_like_item', `현금성 상품(${cashWord})은 등록할 수 없습니다.`)
  }
  const kind = raw?.kind as GcShopItemKind
  if (!SHOP_ITEM_KINDS.includes(kind)) throw new GamecenterError('invalid_item', '상품 분류가 올바르지 않습니다.')
  const price = Number(raw?.price)
  if (!Number.isSafeInteger(price) || price <= 0 || price > 1_000_000) {
    throw new GamecenterError('invalid_item', '가격은 1 이상의 정수여야 합니다.')
  }
  const payload = raw?.payload && typeof raw.payload === 'object' && !Array.isArray(raw.payload) ? raw.payload : {}
  const limitPerPeriod = optionalPositiveInt(raw?.limitPerPeriod, '교환 제한 횟수')
  const limitPeriod = limitPerPeriod ? (raw?.limitPeriod as GcLimitPeriod) : null
  if (limitPerPeriod && !LIMIT_PERIODS.includes(limitPeriod as GcLimitPeriod)) {
    throw new GamecenterError('invalid_item', '교환 제한 기간이 올바르지 않습니다.')
  }
  return {
    id,
    name,
    description,
    kind,
    price,
    payload,
    stock: optionalPositiveInt(raw?.stock, '재고', true),
    limitPerPeriod,
    limitPeriod,
    active: raw?.active !== false,
    sortOrder: Number.isSafeInteger(Number(raw?.sortOrder)) ? Number(raw.sortOrder) : 0,
  }
}

/** 관리자: 상품 추가·수정 (id 가 같으면 덮어쓴다) */
export async function upsertShopItem(input: ShopItemInput, db: DB = getDb()): Promise<GcShopItem> {
  const { id, ...rest } = input
  const [row] = await db
    .insert(gcShopItems)
    .values(input)
    .onConflictDoUpdate({ target: gcShopItems.id, set: rest })
    .returning()
  return row
}

export async function setShopItemActive(id: string, active: boolean, db: DB = getDb()): Promise<GcShopItem> {
  const [row] = await db.update(gcShopItems).set({ active }).where(eq(gcShopItems.id, id)).returning()
  if (!row) throw new GamecenterError('item_not_found', '상품을 찾을 수 없습니다.', 404)
  return row
}

export async function listInventory(userId: string, db: DB = getDb()) {
  return db
    .select({ itemKey: gcInventory.itemKey, quantity: gcInventory.quantity, equipped: gcInventory.equipped })
    .from(gcInventory)
    .where(eq(gcInventory.userId, userId))
    .orderBy(asc(gcInventory.itemKey))
}
