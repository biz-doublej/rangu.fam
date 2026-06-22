import { boolean, index, jsonb, pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'
import { wikiUsers } from './wiki'

/**
 * 랑구 택틱스 — 유저 저장 덱 (16장 평면 리스트).
 *
 * 동결된 웹 배틀 cardBattleDecks(factionA/B 2진영 구성)와 별개 — 택틱스 C# 엔진 전용.
 * cards: [{cardId, count}] (합계 16, 사본 ≤3, 챔피언 ≤1 — deckService 검증).
 * 유저당 활성 덱 1개 → C# 게임서버가 매치 생성 시 이 덱을 페치해 DemoDeck 을 대체.
 */
export const tacticsDecks = pgTable(
  'tactics_decks',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => wikiUsers.id, { onDelete: 'cascade' }),
    name: text('name').notNull().default('내 덱'),
    cards: jsonb('cards').notNull().default([]).$type<{ cardId: string; count: number }[]>(),
    isActive: boolean('is_active').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    userActiveIdx: index('td_user_active_idx').on(t.userId, t.isActive),
    // 유저당 활성 덱 최대 1개 (동시성 하에서도 보장)
    oneActivePerUser: uniqueIndex('td_one_active_per_user').on(t.userId).where(sql`${t.isActive}`),
  })
)

export type TacticsDeck = typeof tacticsDecks.$inferSelect
export type NewTacticsDeck = typeof tacticsDecks.$inferInsert
