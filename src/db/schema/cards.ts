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
import { users } from './users'

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
    userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
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
    userId: uuid('user_id').notNull().unique().references(() => users.id, { onDelete: 'cascade' }),

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
    userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
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

export type Card = typeof cards.$inferSelect
export type NewCard = typeof cards.$inferInsert
export type UserCard = typeof userCards.$inferSelect
export type NewUserCard = typeof userCards.$inferInsert
export type UserCardStats = typeof userCardStats.$inferSelect
export type CardDrop = typeof cardDrops.$inferSelect
