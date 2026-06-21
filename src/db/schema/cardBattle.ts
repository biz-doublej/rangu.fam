import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'
import { wikiUsers } from './wiki'
import type { GameEvent, GameState } from '@/lib/battle/types'

/**
 * 랑구 배틀 (LoR 스타일) — 전용 테이블.
 *
 * 카드 소유/도감 등 영구 데이터는 기존 cards/user_cards 를 그대로 쓰고,
 * 여기엔 "전투" 도메인만 둔다. user_id 는 카드 시스템과 동일하게 wiki_users.id 참조.
 * 휘발성 전투 상태(state)는 jsonb 로 보관 — 결정론 엔진(src/lib/battle)이 해석.
 */

// ── 저장된 덱 ─────────────────────────────────────────────────
// 진영 2개(=멤버 2명)로 구성. cards: [{cardId, count}] (count ≤ 3, 챔피언 ≤ 2 — 앱단 검증).
export const cardBattleDecks = pgTable(
  'card_battle_decks',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => wikiUsers.id, { onDelete: 'cascade' }),
    name: text('name').notNull().default('내 덱'),
    factionA: text('faction_a').notNull(), // 진영 멤버 한글명
    factionB: text('faction_b').notNull(),
    cards: jsonb('cards').notNull().default([]).$type<{ cardId: string; count: number }[]>(),
    isActive: boolean('is_active').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    userActiveIdx: index('cbd_user_active_idx').on(t.userId, t.isActive),
    // 유저당 활성 덱은 최대 1개 (동시성 하에서도 보장)
    oneActivePerUser: uniqueIndex('cbd_one_active_per_user').on(t.userId).where(sql`${t.isActive}`),
  })
)

// ── 전투 (진행/완료) ──────────────────────────────────────────
export const cardBattles = pgTable(
  'card_battles',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    mode: text('mode').notNull().default('pve'), // 'pve' | 'pvp'
    status: text('status').notNull().default('mulligan'), // 'mulligan'|'active'|'finished'|'abandoned'

    player1Id: uuid('player1_id')
      .notNull()
      .references(() => wikiUsers.id, { onDelete: 'cascade' }),
    player2Id: uuid('player2_id').references(() => wikiUsers.id, { onDelete: 'set null' }), // null = PvE/고스트

    // 전투 시작 시점의 덱 스냅샷 (이후 덱 편집과 분리)
    p1Deck: jsonb('p1_deck').notNull().default([]).$type<{ cardId: string; count: number }[]>(),
    p2Deck: jsonb('p2_deck').notNull().default([]).$type<{ cardId: string; count: number }[]>(),

    state: jsonb('state').$type<GameState>(), // 결정론 엔진 현재 상태
    seed: text('seed').notNull(),
    round: integer('round').notNull().default(0),
    activePlayerId: uuid('active_player_id').references(() => wikiUsers.id, { onDelete: 'set null' }),
    winnerId: uuid('winner_id').references(() => wikiUsers.id, { onDelete: 'set null' }),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    expiresAt: timestamp('expires_at', { withTimezone: true }), // 비동기 타임아웃 정리용
  },
  (t) => ({
    p1StatusIdx: index('cb_p1_status_idx').on(t.player1Id, t.status),
    p2StatusIdx: index('cb_p2_status_idx').on(t.player2Id, t.status),
    statusExpiresIdx: index('cb_status_expires_idx').on(t.status, t.expiresAt),
  })
)

// ── 유저별 시즌 전적 / 랭킹 / 재화 ────────────────────────────
export const cardBattleStats = pgTable(
  'card_battle_stats',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => wikiUsers.id, { onDelete: 'cascade' }),
    season: text('season').notNull().default('2026-S1'),

    wins: integer('wins').notNull().default(0),
    losses: integer('losses').notNull().default(0),
    draws: integer('draws').notNull().default(0),

    rating: integer('rating').notNull().default(1000), // ELO
    bestRating: integer('best_rating').notNull().default(1000),
    battlePoints: integer('battle_points').notNull().default(0), // BP 상점 재화

    winStreak: integer('win_streak').notNull().default(0),
    currentStreak: integer('current_streak').notNull().default(0),

    // 일일 보상 캡 (파밍 방지)
    dailyRewardedWins: integer('daily_rewarded_wins').notNull().default(0),
    lastRewardDate: text('last_reward_date'), // 'YYYY-MM-DD' (KST)

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    userSeasonUnique: uniqueIndex('cbs_user_season_unique').on(t.userId, t.season),
    seasonRatingIdx: index('cbs_season_rating_idx').on(t.season, t.rating),
  })
)

// ── 전투 로그 (전적/리플레이/피드) ────────────────────────────
export const cardBattleLog = pgTable(
  'card_battle_log',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    battleId: uuid('battle_id')
      .notNull()
      .references(() => cardBattles.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => wikiUsers.id, { onDelete: 'cascade' }),
    opponentId: uuid('opponent_id').references(() => wikiUsers.id, { onDelete: 'set null' }),
    mode: text('mode').notNull(),
    result: text('result').notNull(), // 'win' | 'loss' | 'draw'
    ratingDelta: integer('rating_delta').notNull().default(0),
    bpDelta: integer('bp_delta').notNull().default(0),
    rounds: jsonb('rounds').notNull().default([]).$type<GameEvent[]>(), // 리플레이용 이벤트 로그
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    userCreatedIdx: index('cbl_user_created_idx').on(t.userId, t.createdAt),
    // 전투당 유저별 로그 1행 — 이중 정산 멱등성 보장
    battleUserUnique: uniqueIndex('cbl_battle_user_unique').on(t.battleId, t.userId),
  })
)

export type CardBattleDeck = typeof cardBattleDecks.$inferSelect
export type NewCardBattleDeck = typeof cardBattleDecks.$inferInsert
export type CardBattle = typeof cardBattles.$inferSelect
export type NewCardBattle = typeof cardBattles.$inferInsert
export type CardBattleStats = typeof cardBattleStats.$inferSelect
export type CardBattleLog = typeof cardBattleLog.$inferSelect
