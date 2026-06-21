import {
  boolean,
  doublePrecision,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core'
// 카드 소유/드랍의 user_id 는 SSO 인증이 발급하는 wiki_users.id 를 가리킨다.
// (구버전은 레거시 music-app `users` 테이블을 참조했음 — SSO 사용자가 거기 없어
//  모든 카드 INSERT가 FK 위반으로 실패. 운영 DB는 /api/admin/maintenance/cards-fk 로 재지정.)
import { wikiUsers } from './wiki'

// ── 카드 정의 (마스터 데이터) ─────────────────────────────────
export const cards = pgTable(
  'cards',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    cardId: text('card_id').notNull().unique(), // 'jaewon_2021_h1', 'group_formation' 등
    name: text('name').notNull(),
    type: text('type').notNull(), // 'year' | 'special' | 'signature' | 'material' | 'prestige'
    rarity: text('rarity').notNull(), // 'basic' | 'rare' | 'epic' | 'material' | 'legendary'
    description: text('description').notNull(),
    imageUrl: text('image_url').notNull(),

    // 카드별 메타
    member: text('member'),
    year: integer('year'),
    period: text('period'), // 'h1' | 'h2'
    isGroupCard: boolean('is_group_card').notNull().default(false),

    dropRate: doublePrecision('drop_rate').notNull(),
    maxCopies: integer('max_copies'),
    canBeUsedForCrafting: boolean('can_be_used_for_crafting').notNull().default(false),

    craftingRecipe: jsonb('crafting_recipe').$type<{
      requiredCards: { type: string; count: number }[]
      successRate: number
    } | null>(),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    typeRarityIdx: index('cards_type_rarity_idx').on(t.type, t.rarity),
    memberYearPeriodIdx: index('cards_member_year_period_idx').on(t.member, t.year, t.period),
    dropRateIdx: index('cards_drop_rate_idx').on(t.dropRate),
  })
)

// ── 사용자별 카드 인벤토리 ────────────────────────────────────
export const userCards = pgTable(
  'user_cards',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').notNull().references(() => wikiUsers.id, { onDelete: 'cascade' }),
    cardId: text('card_id').notNull(),
    quantity: integer('quantity').notNull().default(1),
    acquiredAt: timestamp('acquired_at', { withTimezone: true }).notNull().defaultNow(),
    acquiredBy: text('acquired_by').notNull().default('drop'), // 'drop' | 'craft' | 'gift' | 'admin'
    isFavorite: boolean('is_favorite').notNull().default(false),
    isLocked: boolean('is_locked').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    userCardUnique: uniqueIndex('user_cards_user_card_unique').on(t.userId, t.cardId),
    userFavIdx: index('user_cards_user_fav_idx').on(t.userId, t.isFavorite),
    userAcquiredIdx: index('user_cards_user_acquired_idx').on(t.userId, t.acquiredAt),
  })
)

// ── 사용자 카드 통계 (1:1) ──────────────────────────────────
export const userCardStats = pgTable(
  'user_card_stats',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').notNull().unique().references(() => wikiUsers.id, { onDelete: 'cascade' }),

    // 일일 드랍
    lastDropDate: timestamp('last_drop_date', { withTimezone: true }).notNull().defaultNow(),
    dailyDropsUsed: integer('daily_drops_used').notNull().default(0),
    totalDropsUsed: integer('total_drops_used').notNull().default(0),

    // 컬렉션 통계
    totalCardsOwned: integer('total_cards_owned').notNull().default(0),
    uniqueCardsOwned: integer('unique_cards_owned').notNull().default(0),
    totalCardsCollected: integer('total_cards_collected').notNull().default(0),

    basicCardsOwned: integer('basic_cards_owned').notNull().default(0),
    rareCardsOwned: integer('rare_cards_owned').notNull().default(0),
    epicCardsOwned: integer('epic_cards_owned').notNull().default(0),
    legendaryCardsOwned: integer('legendary_cards_owned').notNull().default(0),
    materialCardsOwned: integer('material_cards_owned').notNull().default(0),

    // 조합
    craftingAttempts: integer('crafting_attempts').notNull().default(0),
    successfulCrafts: integer('successful_crafts').notNull().default(0),
    failedCrafts: integer('failed_crafts').notNull().default(0),

    // 컬렉션 달성도 / 업적 — jsonb
    yearCardCompletion: jsonb('year_card_completion').notNull().default([]).$type<Array<{
      year: number
      totalCards: number
      ownedCards: number
      completionRate: number
    }>>(),
    achievements: jsonb('achievements').notNull().default([]).$type<Array<{
      achievementId: string
      unlockedAt: string
      title: string
      description: string
    }>>(),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    totalCardsIdx: index('ucs_total_cards_idx').on(t.totalCardsOwned),
    uniqueCardsIdx: index('ucs_unique_cards_idx').on(t.uniqueCardsOwned),
  })
)

// ── 카드 드랍 로그 ────────────────────────────────────────────
export const cardDrops = pgTable(
  'card_drops',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').notNull().references(() => wikiUsers.id, { onDelete: 'cascade' }),
    cardId: text('card_id').notNull(),
    dropType: text('drop_type').notNull(), // 'daily' | 'craft' | 'special'
    droppedAt: timestamp('dropped_at', { withTimezone: true }).notNull().defaultNow(),
    dailyDropCount: integer('daily_drop_count').notNull(),
    craftingAttempt: jsonb('crafting_attempt').$type<{
      usedCards: { cardId: string; quantity: number }[]
      wasSuccessful: boolean
    } | null>(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    userDroppedIdx: index('card_drops_user_dropped_idx').on(t.userId, t.droppedAt),
    userTypeDroppedIdx: index('card_drops_user_type_dropped_idx').on(t.userId, t.dropType, t.droppedAt),
  })
)

// ── 카드 교환 제안 (멤버 간 트레이딩) ─────────────────────────
// 제안자(from)가 offer 카드를 내놓고 recipient(to)에게 request 카드를 요구.
// 수락 시 양측 user_cards 수량을 트랜잭션으로 맞교환한다.
export const cardTrades = pgTable(
  'card_trades',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    fromUserId: uuid('from_user_id').notNull().references(() => wikiUsers.id, { onDelete: 'cascade' }),
    toUserId: uuid('to_user_id').notNull().references(() => wikiUsers.id, { onDelete: 'cascade' }),
    offerCardId: text('offer_card_id').notNull(), // 제안자가 주는 카드 (cards.card_id)
    offerQuantity: integer('offer_quantity').notNull().default(1),
    requestCardId: text('request_card_id').notNull(), // 제안자가 받고 싶은 카드 (cards.card_id)
    requestQuantity: integer('request_quantity').notNull().default(1),
    status: text('status').notNull().default('pending'), // 'pending' | 'accepted' | 'rejected' | 'cancelled'
    message: text('message'),
    respondedAt: timestamp('responded_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    toStatusIdx: index('card_trades_to_status_idx').on(t.toUserId, t.status),
    fromStatusIdx: index('card_trades_from_status_idx').on(t.fromUserId, t.status),
    createdIdx: index('card_trades_created_idx').on(t.createdAt),
  })
)

// ── 사용자 혜택/선물상자 상태 (1:1) ──────────────────────────
// 랜덤 선물상자 보상으로 쌓이는 보너스 드랍권·조합 보호권, 그리고 그날의 상자
// 개봉 상태를 저장. 기존 테이블과 분리해 둬서(가드된 조회) 마이그레이션 전에도
// 기존 카드 기능은 영향받지 않는다.
export const userPerks = pgTable('user_perks', {
  userId: uuid('user_id')
    .primaryKey()
    .references(() => wikiUsers.id, { onDelete: 'cascade' }),
  bonusDrops: integer('bonus_drops').notNull().default(0), // 추가 드랍권(뽑기권) 보유량
  craftProtections: integer('craft_protections').notNull().default(0), // 조합 보호권 보유량
  giftDate: text('gift_date'), // 현재 선물상자 배치의 기준일 'YYYY-MM-DD' (KST)
  giftOpened: jsonb('gift_opened').notNull().default([]).$type<number[]>(), // 그날 개봉한 상자 index
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export type Card = typeof cards.$inferSelect
export type NewCard = typeof cards.$inferInsert
export type UserCard = typeof userCards.$inferSelect
export type NewUserCard = typeof userCards.$inferInsert
export type UserCardStats = typeof userCardStats.$inferSelect
export type CardDrop = typeof cardDrops.$inferSelect
export type CardTrade = typeof cardTrades.$inferSelect
export type NewCardTrade = typeof cardTrades.$inferInsert
export type UserPerks = typeof userPerks.$inferSelect
