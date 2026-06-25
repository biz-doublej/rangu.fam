import { boolean, index, integer, jsonb, pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core'
import { wikiUsers } from './wiki'

/**
 * 랑구 택틱스 경제 — 지갑/상점보유/퀘스트/배틀패스. [경제 E1]
 *
 * 서버 권위: 통화·패스XP·퀘스트진행은 /api/game/match-result(게임서버만 호출)에서 매치당
 * 1회 멱등 지급. 클라이언트는 잔액 조회 + 구매/수령(서버 검증)만 한다(클라 신뢰 안 함).
 * 카탈로그(상점 아이템/퀘스트/패스 티어) 정본 = src/lib/tactics/economyRules.ts(코드).
 */

// 지갑 — 유저별 통화. coin=플레이 획득, gem=희소(퀘/패스 보상).
export const tacticsWallets = pgTable('tactics_wallets', {
  userId: uuid('user_id')
    .primaryKey()
    .references(() => wikiUsers.id, { onDelete: 'cascade' }),
  coins: integer('coins').notNull().default(0),
  gems: integer('gems').notNull().default(0),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

// 보유 상점 아이템 — 구매 시 1행. itemId = economyRules.STORE_ITEMS 의 id.
export const tacticsOwnedItems = pgTable(
  'tactics_owned_items',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => wikiUsers.id, { onDelete: 'cascade' }),
    itemId: text('item_id').notNull(),
    acquiredAt: timestamp('acquired_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({ userItemIdx: uniqueIndex('toi_user_item_idx').on(t.userId, t.itemId) })
)

// 퀘스트 진행 — (유저, 퀘스트, 기간키) 당 1행. 기간키=일일(YYYY-MM-DD KST)·주간(YYYY-Www KST).
export const tacticsQuestProgress = pgTable(
  'tactics_quest_progress',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => wikiUsers.id, { onDelete: 'cascade' }),
    questId: text('quest_id').notNull(),
    periodKey: text('period_key').notNull(),
    progress: integer('progress').notNull().default(0),
    claimed: boolean('claimed').notNull().default(false),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    userQuestPeriodIdx: uniqueIndex('tqp_user_quest_period_idx').on(t.userId, t.questId, t.periodKey),
    userPeriodIdx: index('tqp_user_period_idx').on(t.userId, t.periodKey),
  })
)

// 배틀패스 진행 — (유저, 시즌) 당 1행. xp 누적 + 수령한 티어 레벨 배열(claimedTiers).
export const tacticsPassProgress = pgTable(
  'tactics_pass_progress',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => wikiUsers.id, { onDelete: 'cascade' }),
    season: text('season').notNull().default('s1'),
    xp: integer('xp').notNull().default(0),
    claimedTiers: jsonb('claimed_tiers').$type<number[]>().notNull().default([]),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({ userSeasonIdx: uniqueIndex('tpp_user_season_idx').on(t.userId, t.season) })
)

export type TacticsWallet = typeof tacticsWallets.$inferSelect
export type TacticsOwnedItem = typeof tacticsOwnedItems.$inferSelect
export type TacticsQuestProgress = typeof tacticsQuestProgress.$inferSelect
export type TacticsPassProgress = typeof tacticsPassProgress.$inferSelect
