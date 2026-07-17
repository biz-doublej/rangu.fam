import { and, desc, eq } from 'drizzle-orm'
import { getDb } from '@/db/client'
import { tacticsDecks, type TacticsDeck } from '@/db/schema/tacticsDecks'
import { DECK_SIZE, MAX_CHAMPION_COPIES, MAX_COPIES, type DeckCard } from './deckRules'
import { TACTICS_ROSTER } from './cardDefsSeed'

/** 택틱스 정본 로스터 인덱스 — 덱 검증 기준. 택틱스는 웹 뽑기와 별개라 보유(userCards)와 무관. */
const ROSTER = new Map(TACTICS_ROSTER.map((c) => [c.cardId, c]))

export { DECK_SIZE, MAX_CHAMPION_COPIES, MAX_COPIES } from './deckRules'
export type { DeckCard } from './deckRules'

/** 검증 실패(클라 입력) — API 가 status 로 응답. */
export class DeckError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message)
    this.name = 'DeckError'
  }
}

/** tactics_decks 미생성(마이그레이션 전) 감지 → API 503. */
export function isMissingTacticsDeckTable(error: unknown): boolean {
  const code = (error as { code?: string } | null)?.code
  const msg = error instanceof Error ? error.message : ''
  return code === '42P01' || /tactics_decks/.test(msg) && /exist/i.test(msg)
}

/**
 * 덱 검증 — 합계 16, 사본 ≤3(챔피언 ≤1), 카드가 택틱스 로스터에 존재.
 * 같은 cardId 가 여러 엔트리로 쪼개져도 합산해 일관 검사. 통과 시 정규화(병합)된 cards 반환.
 * ★ 택틱스는 웹 뽑기와 별개 시스템 — **보유(userCards) 검사 없음**. 로스터의 121종이면 누구나 편성 가능.
 */
function validateDeck(cards: DeckCard[]): DeckCard[] {
  if (!Array.isArray(cards) || cards.length === 0) throw new DeckError('덱이 비어 있습니다.')

  const merged = new Map<string, number>()
  for (const c of cards) {
    if (!c?.cardId || !Number.isInteger(c.count) || c.count <= 0) throw new DeckError('덱 구성이 올바르지 않습니다.')
    merged.set(c.cardId, (merged.get(c.cardId) ?? 0) + c.count)
  }
  const entries = [...merged.entries()].map(([cardId, count]) => ({ cardId, count }))
  const total = entries.reduce((s, e) => s + e.count, 0)
  if (total !== DECK_SIZE) throw new DeckError(`덱은 정확히 ${DECK_SIZE}장이어야 합니다. (현재 ${total}장)`)

  for (const e of entries) {
    const card = ROSTER.get(e.cardId)
    if (!card) throw new DeckError(`택틱스 카드가 아닙니다: ${e.cardId}`)
    const isChampion = card.cardType === 'champion'
    const cap = isChampion ? MAX_CHAMPION_COPIES : MAX_COPIES
    if (e.count > cap) {
      throw new DeckError(`${isChampion ? '챔피언' : '같은 카드'}은(는) 최대 ${cap}장입니다: ${e.cardId}`)
    }
  }
  return entries
}

export async function listTacticsDecks(userId: string): Promise<TacticsDeck[]> {
  const db = getDb()
  return db.select().from(tacticsDecks).where(eq(tacticsDecks.userId, userId)).orderBy(desc(tacticsDecks.updatedAt))
}

/** C# 게임서버 주입용 — 유저의 활성 덱(없으면 null). */
export async function getActiveTacticsDeck(userId: string): Promise<DeckCard[] | null> {
  const db = getDb()
  const [row] = await db
    .select()
    .from(tacticsDecks)
    .where(and(eq(tacticsDecks.userId, userId), eq(tacticsDecks.isActive, true)))
    .limit(1)
  return row ? (row.cards as DeckCard[]) : null
}

/** 저장/수정 — 검증 통과 시에만. setActive 면 기존 활성 해제(원자). 반환 = deckId. */
export async function saveTacticsDeck(
  userId: string,
  input: { id?: string; name: string; cards: DeckCard[]; setActive?: boolean },
): Promise<string> {
  const db = getDb()
  const cards = validateDeck(input.cards) // 검증 + 정규화 (로스터 기준, 보유 무관)
  const now = new Date()
  const fields = { name: input.name?.trim() || '내 덱', cards, isActive: input.setActive ?? false, updatedAt: now }

  return db.transaction(async (tx) => {
    if (input.setActive) {
      await tx.update(tacticsDecks).set({ isActive: false, updatedAt: now }).where(eq(tacticsDecks.userId, userId))
    }
    if (input.id) {
      // 본인 소유 행만 수정 (IDOR 방지)
      const [updated] = await tx
        .update(tacticsDecks)
        .set(fields)
        .where(and(eq(tacticsDecks.id, input.id), eq(tacticsDecks.userId, userId)))
        .returning({ id: tacticsDecks.id })
      if (updated) return updated.id
    }
    const [created] = await tx
      .insert(tacticsDecks)
      .values({ userId, ...fields })
      .returning({ id: tacticsDecks.id })
    return created.id
  })
}
