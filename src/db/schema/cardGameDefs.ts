import { boolean, index, integer, jsonb, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'
import type { Keyword, SpellSpeed } from '@/lib/battle/types'
import type { CardEffect, ChampionSpec, TacticsCardType } from '@/lib/tactics/types'

/**
 * 랑구 택틱스 — 카드 "게임 정의"(Data-Driven).
 *
 * 기존 cards 테이블(수집/도감 메타: 이름·등급·일러스트·드랍률)은 건드리지 않고,
 * 여기엔 전투에 쓰이는 명시적 스탯/효과만 둔다. cardId 로 cards.card_id 와 1:1.
 *
 * 행이 없는 카드는 export 시 stats.ts 파생 로직으로 폴백 → 점진 마이그레이션.
 * (userPerks/cardBattle 과 동일하게 분리해 둬서, 마이그레이션 전에도 기존 기능 무영향.)
 */
export const cardGameDefs = pgTable(
  'card_game_defs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    cardId: text('card_id').notNull().unique(), // → cards.card_id

    faction: text('faction').notNull(), // 진영 = 멤버 (cards.member 어휘와 동일)
    cardType: text('card_type').$type<TacticsCardType>().notNull().default('unit'),

    cost: integer('cost').notNull().default(0),
    attack: integer('attack'), // 유닛/챔피언만 (spell/landmark = null)
    health: integer('health'),

    keywords: jsonb('keywords').notNull().default([]).$type<Keyword[]>(),
    spellSpeed: text('spell_speed').$type<SpellSpeed>(), // spell 전용

    // ★ Data-Driven 핵심: 효과는 파라미터 포함 객체 배열로 선언 (types.ts CardEffect)
    effects: jsonb('effects').notNull().default([]).$type<CardEffect[]>(),

    // 챔피언 승격 정의 (조건 + 승격 후 스탯/키워드/효과)
    champion: jsonb('champion').$type<ChampionSpec | null>(),

    isPlayable: boolean('is_playable').notNull().default(true), // 전투 노출 여부
    balanceTag: text('balance_tag'), // 밸런스 패치 라벨 (선택, 예: '2026.06-nerf')

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    factionTypeIdx: index('cgd_faction_type_idx').on(t.faction, t.cardType),
    playableIdx: index('cgd_playable_idx').on(t.isPlayable),
  })
)

export type CardGameDef = typeof cardGameDefs.$inferSelect
export type NewCardGameDef = typeof cardGameDefs.$inferInsert
