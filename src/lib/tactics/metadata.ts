import crypto from 'crypto'
import { getDb } from '@/db/client'
import { cards as cardsTable } from '@/db/schema/cards'
import { cardGameDefs, type CardGameDef } from '@/db/schema/cardGameDefs'
import { deriveBattleUnit } from '@/lib/battle/stats'
import type { Keyword, TacticsCardMeta, TacticsMetadataDocument } from './types'

const SCHEMA_VERSION = 1

/** 카드 1장이 참조하는 모든 키워드 (top-level + 효과 + 챔피언 승격분) — 사전 검증용. */
function keywordsReferenced(c: TacticsCardMeta): Keyword[] {
  const out: Keyword[] = [...c.keywords]
  for (const e of c.effects) if (e.keyword) out.push(e.keyword)
  if (c.champion?.addKeywords) out.push(...c.champion.addKeywords)
  for (const e of c.champion?.addEffects ?? []) if (e.keyword) out.push(e.keyword)
  return out
}

/**
 * cards + card_game_defs 를 합쳐 버전드 메타데이터 문서를 생성한다.
 *
 * - 명시 정의(card_game_defs)가 있으면 그대로 사용.
 * - 없으면 기존 stats.ts(deriveBattleUnit) 파생으로 폴백 → 점진 마이그레이션.
 * - 카드 배열을 결정론 정렬 후 sha256 → contentVersion (동일 내용 → 동일 버전).
 */
export async function buildTacticsMetadata(): Promise<TacticsMetadataDocument> {
  const db = getDb()
  const allCards = await db.select().from(cardsTable)

  // card_game_defs 가 아직 없으면(마이그레이션 전) 전부 파생 폴백 — 기존 기능 무영향.
  let defs: CardGameDef[] = []
  try {
    defs = await db.select().from(cardGameDefs)
  } catch {
    defs = []
  }
  const defByCardId = new Map(defs.map((d) => [d.cardId, d]))

  const out: TacticsCardMeta[] = []
  for (const c of allCards) {
    const def = defByCardId.get(c.cardId)
    if (def) {
      if (!def.isPlayable) continue
      out.push({
        cardId: c.cardId,
        name: c.name,
        faction: def.faction,
        type: def.cardType,
        rarity: c.rarity,
        cost: def.cost,
        attack: def.attack ?? null,
        health: def.health ?? null,
        keywords: def.keywords,
        spellSpeed: def.spellSpeed ?? undefined,
        effects: def.effects,
        champion: def.champion ?? null,
        imageUrl: c.imageUrl,
        derived: false,
      })
    } else {
      // 폴백: 명시 정의가 없는 카드는 기존 파생 로직으로 유닛 스탯 산출.
      const u = deriveBattleUnit({
        cardId: c.cardId,
        name: c.name,
        member: c.member,
        type: c.type,
        rarity: c.rarity,
      })
      out.push({
        cardId: c.cardId,
        name: c.name,
        faction: c.member ?? 'neutral',
        type: u.isChampion ? 'champion' : 'unit',
        rarity: c.rarity,
        cost: u.cost,
        attack: u.power,
        health: u.health,
        keywords: u.keywords,
        effects: [],
        champion: null,
        imageUrl: c.imageUrl,
        derived: true,
      })
    }
  }

  // 결정론 정렬 → 안정적 해시(버전). 같은 데이터면 배포해도 contentVersion 불변.
  out.sort((a, b) => a.cardId.localeCompare(b.cardId))
  const usedKeywords = [...new Set(out.flatMap(keywordsReferenced))].sort() as Keyword[]

  const canonical = JSON.stringify(out)
  const contentVersion = crypto.createHash('sha256').update(canonical).digest('hex').slice(0, 16)

  return {
    schemaVersion: SCHEMA_VERSION,
    contentVersion,
    generatedAt: new Date().toISOString(),
    cardCount: out.length,
    keywords: usedKeywords,
    cards: out,
  }
}
