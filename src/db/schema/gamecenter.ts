import { sql } from 'drizzle-orm'
import {
  bigint,
  bigserial,
  boolean,
  check,
  date,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core'
import { wikiUsers } from './wiki'

/**
 * 이랑게임센터(irang.wiki/game) 표.
 * 모든 표는 gc_ 접두어를 쓰고 wiki_users.id 를 참조한다.
 * 포인트는 원장(gc_point_ledger)이 기준이고, 지갑 잔액은 빠른 조회용 사본이다.
 * DDL 은 /api/admin/maintenance/gamecenter 로 적용한다(src/lib/gamecenter/ddl.ts).
 */

/** 지갑: 잔액 사본 (원장 합계와 항상 같아야 함) */
export const gcWallets = pgTable(
  'gc_wallets',
  {
    userId: uuid('user_id')
      .primaryKey()
      .references(() => wikiUsers.id, { onDelete: 'cascade' }),
    balance: integer('balance').notNull().default(0),
    lifetimeEarned: integer('lifetime_earned').notNull().default(0),
    streakDays: integer('streak_days').notNull().default(0),
    /** 마지막 출석일 (KST 날짜, YYYY-MM-DD) */
    lastCheckIn: date('last_check_in'),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    balanceNonNegative: check('gc_wallets_balance_check', sql`${t.balance} >= 0`),
  })
)

/** 원장: 적립(+)·사용(-) 모두 한 줄씩, 수정·삭제 없음 */
export const gcPointLedger = pgTable(
  'gc_point_ledger',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => wikiUsers.id, { onDelete: 'cascade' }),
    /** +적립 / -사용 */
    amount: integer('amount').notNull(),
    /** 'tetris.clear', 'shop.purchase', 'checkin' ... */
    reason: text('reason').notNull(),
    /** 'tetris' | 'climb' | 'claw' | 'quiz' ... */
    game: text('game'),
    /** runId, roomId, orderId */
    refId: text('ref_id'),
    /** 같은 보상 두 번 금지 */
    idempotencyKey: text('idempotency_key').notNull().unique(),
    countsToDailyCap: boolean('counts_to_daily_cap').notNull().default(true),
    /** 하루 상한 계산용 KST 날짜 */
    kstDay: date('kst_day').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    userDayIdx: index('gc_point_ledger_user_id_kst_day_idx').on(t.userId, t.kstDay),
  })
)

/** 아케이드 한 판: 서버가 시드를 발급하고 결과를 검증한 기록 */
export const gcRuns = pgTable(
  'gc_runs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => wikiUsers.id, { onDelete: 'cascade' }),
    /** 'tetris' | 'climb' | 'claw' */
    game: text('game').notNull(),
    seed: bigint('seed', { mode: 'number' }).notNull(),
    /** started | verified | rejected */
    status: text('status').notNull().default('started'),
    score: integer('score'),
    /** lines, tetrises, maxHeight, biggestFall ... */
    stats: jsonb('stats').notNull().default({}).$type<Record<string, unknown>>(),
    startedAt: timestamp('started_at', { withTimezone: true }).notNull().defaultNow(),
    finishedAt: timestamp('finished_at', { withTimezone: true }),
  },
  (t) => ({
    gameScoreIdx: index('gc_runs_game_score_idx').on(t.game, t.score.desc()),
  })
)

/** 파티·보드 한 판 결과 (실시간 서버가 서명해서 보냄) */
export const gcMatches = pgTable('gc_matches', {
  id: uuid('id').primaryKey(),
  /** 'quiz' | 'liar' | 'catchmind' | 'omok' | 'yut' */
  game: text('game').notNull(),
  players: jsonb('players')
    .notNull()
    .$type<Array<{ userId: string; rank?: number; score?: number; role?: string }>>(),
  summary: jsonb('summary').notNull().default({}).$type<Record<string, unknown>>(),
  finishedAt: timestamp('finished_at', { withTimezone: true }).notNull().defaultNow(),
})

export type GcShopItemKind = 'inventory' | 'title' | 'wiki_color' | 'coupon'
export type GcLimitPeriod = 'day' | 'week' | 'month' | 'once'

/** 상점 상품 */
export const gcShopItems = pgTable(
  'gc_shop_items',
  {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    description: text('description').notNull().default(''),
    /** inventory | title | wiki_color | coupon */
    kind: text('kind').notNull().$type<GcShopItemKind>(),
    price: integer('price').notNull(),
    /** { itemKey, amount } — 지급할 보유품 키와 수량 */
    payload: jsonb('payload').notNull().default({}).$type<Record<string, unknown>>(),
    /** null = 무제한 */
    stock: integer('stock'),
    limitPerPeriod: integer('limit_per_period'),
    /** 'day' | 'week' | 'month' | 'once' */
    limitPeriod: text('limit_period').$type<GcLimitPeriod>(),
    active: boolean('active').notNull().default(true),
    sortOrder: integer('sort_order').notNull().default(0),
  },
  (t) => ({
    pricePositive: check('gc_shop_items_price_check', sql`${t.price} > 0`),
  })
)

export type GcOrderStatus = 'fulfilled' | 'pending' | 'used' | 'cancelled'

/** 상점 주문 */
export const gcOrders = pgTable(
  'gc_orders',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => wikiUsers.id, { onDelete: 'cascade' }),
    itemId: text('item_id')
      .notNull()
      .references(() => gcShopItems.id),
    price: integer('price').notNull(),
    /** fulfilled | pending(쿠폰) | used | cancelled */
    status: text('status').notNull().default('fulfilled').$type<GcOrderStatus>(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    resolvedAt: timestamp('resolved_at', { withTimezone: true }),
    resolvedBy: uuid('resolved_by'),
  },
  (t) => ({
    // 기간별 구매 제한 조회용 (기획안 DDL 에는 없지만 조회 전용 보조 인덱스)
    userItemIdx: index('gc_orders_user_id_item_id_idx').on(t.userId, t.itemId),
  })
)

/** 보유품: 스킨, 칭호, 무료권, 인형 도감 */
export const gcInventory = pgTable(
  'gc_inventory',
  {
    userId: uuid('user_id')
      .notNull()
      .references(() => wikiUsers.id, { onDelete: 'cascade' }),
    /** 'claw-ticket', 'plush:gold', 'skin:tetris:neon' */
    itemKey: text('item_key').notNull(),
    quantity: integer('quantity').notNull().default(1),
    equipped: boolean('equipped').notNull().default(false),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.userId, t.itemKey] }),
    quantityNonNegative: check('gc_inventory_quantity_check', sql`${t.quantity} >= 0`),
  })
)

/** 퀴즈 배틀 문제 은행 (자기 답) */
export const gcQuizSelfAnswers = pgTable(
  'gc_quiz_self_answers',
  {
    userId: uuid('user_id')
      .notNull()
      .references(() => wikiUsers.id, { onDelete: 'cascade' }),
    promptId: text('prompt_id').notNull(),
    answer: jsonb('answer').notNull().$type<unknown>(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.userId, t.promptId] }),
  })
)

export type GcWallet = typeof gcWallets.$inferSelect
export type GcLedgerRow = typeof gcPointLedger.$inferSelect
export type GcShopItem = typeof gcShopItems.$inferSelect
export type GcOrder = typeof gcOrders.$inferSelect
export type GcInventoryRow = typeof gcInventory.$inferSelect
