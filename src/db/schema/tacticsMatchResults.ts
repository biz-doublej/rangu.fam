import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'

/**
 * 랑구 택틱스 — 처리된 매치 결과(멱등성 가드 + 감사 로그). [랭크 C2]
 *
 * match_id PK = 중복 집계 방지. C# 서버가 매치당 1회 POST 하지만, 재전송/재시작에도
 * INSERT ... ON CONFLICT DO NOTHING 으로 LP 이중 적용을 원천 차단(이 행이 lock).
 */
export const tacticsMatchResults = pgTable('tactics_match_results', {
  matchId: text('match_id').primaryKey(),
  winnerUserId: uuid('winner_user_id').notNull(),
  loserUserId: uuid('loser_user_id').notNull(),
  season: text('season').notNull().default('s1'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export type TacticsMatchResult = typeof tacticsMatchResults.$inferSelect
export type NewTacticsMatchResult = typeof tacticsMatchResults.$inferInsert
