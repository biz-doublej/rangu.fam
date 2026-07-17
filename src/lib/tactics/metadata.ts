import crypto from 'crypto'
import { TACTICS_ROSTER } from './cardDefsSeed'
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
 * 택틱스 카드 메타데이터 문서를 생성한다.
 *
 * ★ 택틱스는 웹 카드 뽑기와 **별개 시스템**이다 — 카드 로스터의 단일 출처는 `TACTICS_ROSTER`
 *   (엑셀 「카드 일람 [완성]」, 121종). 뽑기 `cards` 테이블·DB 에 의존하지 않고(이미지 파일만 공유),
 *   보유 여부와 무관하게 이 코드 로스터로 자족한다. → DB 마이그레이션/시드 실행 불필요, 배포만으로 반영.
 * - 밸런스 변경 = 시드(cardDefsSeed.ts) 수정 후 재배포. (런타임 DB 오버레이가 필요해지면 그때 도입.)
 * - 결정론 정렬 후 sha256 → contentVersion (동일 내용 → 동일 버전, ETag/핀).
 */
export async function buildTacticsMetadata(): Promise<TacticsMetadataDocument> {
  const out: TacticsCardMeta[] = TACTICS_ROSTER.map((c) => ({
    cardId: c.cardId,
    name: c.name,
    faction: c.faction,
    type: c.cardType,
    rarity: c.rarity,
    cost: c.cost,
    attack: c.attack ?? null,
    health: c.health ?? null,
    keywords: c.keywords,
    spellSpeed: c.spellSpeed || undefined,
    effects: c.effects,
    champion: c.champion ?? null,
    imageUrl: c.imageUrl ?? undefined,
    derived: false,
  }))

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
