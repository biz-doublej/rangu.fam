import { NextRequest, NextResponse } from 'next/server'
import { and, eq, gt, ne, sql } from 'drizzle-orm'
import { getDb } from '@/db/client'
import { cardDrops, cards, userCards, userCardStats, userPerks } from '@/db/schema/cards'
import { ensureImage as ensureImageBase, normalizeUserIdToUuid } from '@/lib/cardHelpers'
import { getPerks } from '@/lib/perks'

export const dynamic = 'force-dynamic'

const FALLBACK_IMAGE = '/images/default-music-cover.jpg'
const JOKER_CARD_ID = 'joker_card'
const CRAFT_SUCCESS_RATE = 0.7
const PERSONAL_CARD_RATE = 0.175
const PRESTIGE_POOL = ['jaewon', 'minseok', 'jinkyu', 'hanul', 'seungchan']

const REQUIREMENTS = [
  { type: 'year', required: 7, label: '년도 카드' },
  { type: 'special', required: 3, label: '스페셜 카드' },
  { type: 'signature', required: 1, label: '시그니처 카드' },
] as const

function ensureImage<T extends { imageUrl?: string | null }>(card: T): T {
  if (!card?.imageUrl || typeof card.imageUrl !== 'string' || !card.imageUrl.trim()) {
    return { ...card, imageUrl: FALLBACK_IMAGE }
  }
  return card
}

// POST: 프레스티지 카드 조합
export async function POST(request: NextRequest) {
  try {
    const db = getDb()
    const body = await request.json().catch(() => ({}))
    const { userId: rawUserId, useMaterialCard = true } = body

    if (!rawUserId) {
      return NextResponse.json(
        { success: false, message: 'User ID is required.' },
        { status: 400 }
      )
    }

    const userId = normalizeUserIdToUuid(rawUserId)

    // 사용자 인벤토리 (잠금 X, quantity > 0)
    const inventory = await db
      .select({
        cardId: userCards.cardId,
        quantity: userCards.quantity,
      })
      .from(userCards)
      .where(
        and(eq(userCards.userId, userId), ne(userCards.isLocked, true), gt(userCards.quantity, 0))
      )

    const cardCounts: Record<string, number> = {}
    for (const c of inventory) {
      cardCounts[c.cardId] = (cardCounts[c.cardId] || 0) + (c.quantity || 0)
    }

    // 모든 카드 메타데이터
    const allCards = await db.select().from(cards)
    const cardMap = new Map<string, any>()
    for (const c of allCards) cardMap.set(c.cardId, c)

    const buildUsedCardDetails = (source: { cardId: string; quantity: number }[]) =>
      source.map(({ cardId, quantity }) => {
        const cardInfo = cardMap.get(cardId)
        const ensured = cardInfo ? ensureImage(cardInfo) : null
        return {
          cardId,
          name: cardInfo?.name || '알 수 없는 카드',
          quantity,
          imageUrl: ensured?.imageUrl,
        }
      })

    // 기본 재료 채우기
    const usedCards: { cardId: string; quantity: number }[] = []
    const missingByType: Record<string, number> = {}
    for (const requirement of REQUIREMENTS) {
      const candidateIds = Object.keys(cardCounts).filter(
        (cid) => cardMap.get(cid)?.type === requirement.type && cardCounts[cid] > 0
      )

      let used = 0
      for (const cid of candidateIds) {
        if (used >= requirement.required) break
        const useCount = Math.min(cardCounts[cid], requirement.required - used)
        if (useCount <= 0) continue
        usedCards.push({ cardId: cid, quantity: useCount })
        used += useCount
      }
      missingByType[requirement.label] = Math.max(0, requirement.required - used)
    }

    const missingCount = Object.values(missingByType).reduce((s, n) => s + n, 0)
    const jokerEntry = Object.entries(cardCounts).find(
      ([cid]) => cid.toLowerCase() === JOKER_CARD_ID
    )
    const jokerCardId = jokerEntry?.[0] || JOKER_CARD_ID
    const jokerOwned = Number(jokerEntry?.[1] || 0)

    let canCraft = false
    if (missingCount === 0) {
      canCraft = true
    } else if (useMaterialCard && jokerOwned >= missingCount) {
      canCraft = true
      usedCards.push({ cardId: jokerCardId, quantity: missingCount })
    }

    if (!canCraft) {
      const missingSummary = Object.entries(missingByType)
        .filter(([, n]) => n > 0)
        .map(([label, n]) => `${label} ${n}`)
        .join(', ')
      return NextResponse.json({
        success: false,
        message:
          missingCount > 0
            ? `조합 재료가 부족합니다. (${missingSummary}) 조커카드 ${missingCount}장이 필요합니다.`
            : '조합에 필요한 카드가 부족합니다. (잠금 카드는 제외됩니다.)',
        usedCards: [],
        usedCardDetails: [],
      })
    }

    // 70% 성공률
    const isSuccess = Math.random() < CRAFT_SUCCESS_RATE
    const now = new Date()

    // 조합 보호권: 실패 굴림이라도 보호권이 있으면 1장 소모하고 재료를 보존(실패 무효).
    if (!isSuccess) {
      const perks = await getPerks(userId)
      if (perks && perks.craftProtections > 0) {
        try {
          await db
            .update(userPerks)
            .set({
              craftProtections: sql`GREATEST(${userPerks.craftProtections} - 1, 0)`,
              updatedAt: now,
            })
            .where(eq(userPerks.userId, userId))
        } catch {}
        // 시도 횟수만 +1 (실패로는 기록하지 않음)
        try {
          await db
            .update(userCardStats)
            .set({ craftingAttempts: sql`${userCardStats.craftingAttempts} + 1`, updatedAt: now })
            .where(eq(userCardStats.userId, userId))
        } catch {}
        return NextResponse.json({
          success: false,
          protected: true,
          message: '🛡️ 조합 보호권 발동! 재료가 보존되었어요. 다시 시도하세요.',
          usedCards: [],
          usedCardDetails: [],
        })
      }
    }

    // 조합 로그
    const [dropLog] = await db
      .insert(cardDrops)
      .values({
        userId,
        cardId: isSuccess ? 'prestige_random' : 'craft_fail',
        dropType: 'craft',
        droppedAt: now,
        dailyDropCount: 1,
        craftingAttempt: { usedCards, wasSuccessful: isSuccess },
      })
      .returning({ id: cardDrops.id })

    // 사용된 카드 차감 (실패 시에도 소모)
    for (const { cardId, quantity } of usedCards) {
      await db
        .update(userCards)
        .set({
          quantity: sql`${userCards.quantity} - ${quantity}`,
          updatedAt: now,
        })
        .where(
          and(
            eq(userCards.userId, userId),
            eq(userCards.cardId, cardId),
            ne(userCards.isLocked, true)
          )
        )
    }
    // quantity ≤ 0 정리
    await db
      .delete(userCards)
      .where(and(eq(userCards.userId, userId), sql`${userCards.quantity} <= 0`))

    // 통계 업데이트
    try {
      await db
        .update(userCardStats)
        .set({
          craftingAttempts: sql`${userCardStats.craftingAttempts} + 1`,
          successfulCrafts: isSuccess
            ? sql`${userCardStats.successfulCrafts} + 1`
            : sql`${userCardStats.successfulCrafts}`,
          failedCrafts: !isSuccess
            ? sql`${userCardStats.failedCrafts} + 1`
            : sql`${userCardStats.failedCrafts}`,
          updatedAt: now,
        })
        .where(eq(userCardStats.userId, userId))
    } catch {}

    if (!isSuccess) {
      return NextResponse.json({
        success: false,
        message: '조합에 실패했습니다. 사용된 카드들이 사라졌습니다.',
        usedCards,
        usedCardDetails: buildUsedCardDetails(usedCards),
      })
    }

    // 성공 → 프레스티지 카드 지급
    const isPersonal = Math.random() < PERSONAL_CARD_RATE
    let prestigeCardId = isPersonal
      ? `prestige_${PRESTIGE_POOL[Math.floor(Math.random() * PRESTIGE_POOL.length)]}`
      : 'prestige_group_special'

    let [prestigeCard] = await db
      .select()
      .from(cards)
      .where(eq(cards.cardId, prestigeCardId))
      .limit(1)

    // 없으면 type=prestige 인 임의 카드로 폴백
    if (!prestigeCard) {
      const [fallback] = await db
        .select()
        .from(cards)
        .where(eq(cards.type, 'prestige'))
        .limit(1)
      if (fallback) {
        prestigeCard = fallback
        prestigeCardId = fallback.cardId
      }
    }

    if (!prestigeCard) {
      return NextResponse.json(
        {
          success: false,
          message: '프레스티지 카드 데이터를 찾을 수 없습니다.',
          usedCards,
          usedCardDetails: buildUsedCardDetails(usedCards),
        },
        { status: 500 }
      )
    }

    // 드롭 로그를 실제 카드 ID로 교정
    await db
      .update(cardDrops)
      .set({ cardId: prestigeCardId })
      .where(eq(cardDrops.id, dropLog.id))

    // 인벤토리에 추가 (이미 있으면 quantity++)
    const [existingUserCard] = await db
      .select()
      .from(userCards)
      .where(and(eq(userCards.userId, userId), eq(userCards.cardId, prestigeCardId)))
      .limit(1)

    if (existingUserCard) {
      await db
        .update(userCards)
        .set({
          quantity: existingUserCard.quantity + 1,
          acquiredAt: now,
          updatedAt: now,
        })
        .where(eq(userCards.id, existingUserCard.id))
    } else {
      await db.insert(userCards).values({
        userId,
        cardId: prestigeCardId,
        quantity: 1,
        acquiredAt: now,
        acquiredBy: 'craft',
      })
    }

    const ensured = ensureImage(prestigeCard)
    return NextResponse.json({
      success: true,
      card: ensured,
      message: `축하합니다! ${(ensured as any)?.name || '프레스티지 카드'}를 획득했습니다!`,
      usedCards,
      usedCardDetails: buildUsedCardDetails(usedCards),
    })
  } catch (error) {
    console.error('Card craft error:', error)
    return NextResponse.json(
      {
        success: false,
        message: '카드 조합 중 오류가 발생했습니다.',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
