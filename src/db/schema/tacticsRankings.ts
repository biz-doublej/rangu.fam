import { integer, index, pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core'
import { wikiUsers } from './wiki'

/**
 * 랑구 택틱스 — 유저 랭크/래더 상태(시즌별). [랭크 C1]
 *
 * 서버 권위: C# 엔진이 매치 승자 판정 → /api/game/match-result 가 rankRules.applyMatchResult 로 LP 갱신(C2).
 * tier 는 lp 에서 파생(저장 안 함, 단일 진실 = rankRules.tierForLp). PvP 만 집계.
 */
export const tacticsRankings = pgTable(
  'tactics_rankings',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => wikiUsers.id, { onDelete: 'cascade' }),
    season: text('season').notNull().default('s1'),
    lp: integer('lp').notNull().default(0),
    wins: integer('wins').notNull().default(0),
    losses: integer('losses').notNull().default(0),
    winStreak: integer('win_streak').notNull().default(0),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    // 유저+시즌 유일(시즌당 한 행) — upsert 기준
    userSeasonIdx: uniqueIndex('tr_user_season_idx').on(t.userId, t.season),
    // 리더보드 정렬(시즌별 LP)
    seasonLpIdx: index('tr_season_lp_idx').on(t.season, t.lp),
  })
)

export type TacticsRanking = typeof tacticsRankings.$inferSelect
export type NewTacticsRanking = typeof tacticsRankings.$inferInsert
