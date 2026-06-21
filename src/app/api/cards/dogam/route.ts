import { NextRequest, NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { getDb } from '@/db/client'
import { cards, userCards, userCardStats } from '@/db/schema/cards'
import { ensureImage } from '@/lib/cardHelpers'
import {
  BASIC_DOGAM_IDS,
  GROUP_PRESTIGE_CARD_ID,
  PRESTIGE_REWARD_BY_DOGAM,
  computeDogam,
  dogamAchievementId,
  type DogamCardInput,
  type DogamResult,
  type DogamTier,
} from '@/lib/dogam'
import { buildClientUser, getAuthenticatedWikiUser } from '@/lib/doublejAuth'

export const dynamic = 'force-dynamic'

function buildSummary(dogam: DogamResult[]) {
  const tierSummary = (tier: DogamTier) => {
    const items = dogam.filter((d) => d.tier === tier)
    return { total: items.length, unlocked: items.filter((d) => d.unlocked).length }
  }
  return {
    total: dogam.length,
    unlocked: dogam.filter((d) => d.unlocked).length,
    byTier: {
      basic: tierSummary('basic'),
      series: tierSummary('series'),
      special: tierSummary('special'),
    },
  }
}

/** 카탈로그 + 보유 카드 → 도감 계산 결과 (GET·POST 공용) */
async function loadDogam(userId: string | null) {
  const db = getDb()

  const catalog = (await db
    .select({
      cardId: cards.cardId,
      name: cards.name,
      type: cards.type,
      rarity: cards.rarity,
      description: cards.description,
      imageUrl: cards.imageUrl,
      member: cards.member,
      year: cards.year,
      period: cards.period,
      isGroupCard: cards.isGroupCard,
    })
    .from(cards)) as DogamCardInput[]

  let ownedSet = new Set<string>()
  if (userId) {
    const owned = await db
      .select({ cardId: userCards.cardId })
      .from(userCards)
      .where(eq(userCards.userId, userId))
    ownedSet = new Set(owned.map((o) => o.cardId))
  }

  const normalized = catalog.map((c) => ensureImage(c))
  const dogam = computeDogam(normalized, ownedSet)
  return { dogam, summary: buildSummary(dogam), catalog: normalized, ownedSet }
}

/**
 * GET /api/cards/dogam?userId=...
 * 읽기 전용 — 도감 진행도/해금 여부 반환. userId 없으면 전부 미보유(잠금) 상태.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const { dogam, summary } = await loadDogam(userId)
    return NextResponse.json({ success: true, dogam, summary })
  } catch (error) {
    console.error('Dogam GET error:', error)
    return NextResponse.json(
      { success: false, message: '도감을 불러오는 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/cards/dogam  (로그인 필요)
 * 도감을 다시 계산하고, 새로 해금된 도감을 achievements 에 기록하며,
 * 멤버 기본 도감을 완성한 경우 해당 프레스티지 카드를 인벤토리에 지급한다.
 * 멱등 — 이미 기록/지급된 건 건너뛴다. 읽기 결과(dogam/summary)도 함께 반환.
 */
export async function POST(request: NextRequest) {
  try {
    const wikiUser = await getAuthenticatedWikiUser(request)
    if (!wikiUser) {
      return NextResponse.json(
        { success: false, message: '로그인 후 이용할 수 있습니다.' },
        { status: 401 }
      )
    }
    const userId = buildClientUser(wikiUser as any).id

    const db = getDb()
    const { dogam, summary, catalog, ownedSet } = await loadDogam(userId)

    // 통계 row 확보 (achievements 저장용)
    let [stats] = await db
      .select()
      .from(userCardStats)
      .where(eq(userCardStats.userId, userId))
      .limit(1)
    if (!stats) {
      await db.insert(userCardStats).values({ userId }).onConflictDoNothing()
      ;[stats] = await db
        .select()
        .from(userCardStats)
        .where(eq(userCardStats.userId, userId))
        .limit(1)
    }

    const now = new Date()
    type Achievement = {
      achievementId: string
      unlockedAt: string
      title: string
      description: string
    }
    const existing = (stats?.achievements as Achievement[]) || []
    const existingIds = new Set(existing.map((a) => a.achievementId))

    // ① 새로 해금된 도감 → 업적 기록
    const newAchievements: Achievement[] = []
    const newlyUnlocked: Array<{ id: string; title: string; requirement: string }> = []
    for (const d of dogam) {
      if (!d.unlocked) continue
      const achId = dogamAchievementId(d.id)
      if (existingIds.has(achId)) continue
      newAchievements.push({
        achievementId: achId,
        unlockedAt: now.toISOString(),
        title: d.title,
        description: d.requirement,
      })
      newlyUnlocked.push({ id: d.id, title: d.title, requirement: d.requirement })
    }

    // ② 프레스티지 만렙 보상 — 완성된 기본 도감의 프레스티지 카드 지급
    const catalogIds = new Set(catalog.map((c) => c.cardId))
    const unlockedById = new Map(dogam.map((d) => [d.id, d.unlocked]))
    const grantIds = new Set<string>()
    for (const did of BASIC_DOGAM_IDS) {
      if (!unlockedById.get(did)) continue
      const cardId = PRESTIGE_REWARD_BY_DOGAM[did]
      if (cardId && catalogIds.has(cardId) && !ownedSet.has(cardId)) grantIds.add(cardId)
    }
    const allBasicDone = BASIC_DOGAM_IDS.every((did) => unlockedById.get(did))
    if (
      allBasicDone &&
      catalogIds.has(GROUP_PRESTIGE_CARD_ID) &&
      !ownedSet.has(GROUP_PRESTIGE_CARD_ID)
    ) {
      grantIds.add(GROUP_PRESTIGE_CARD_ID)
    }

    // 업적 저장
    if (newAchievements.length) {
      await db
        .update(userCardStats)
        .set({ achievements: [...existing, ...newAchievements], updatedAt: now })
        .where(eq(userCardStats.userId, userId))
    }

    // 카드 지급 (unique 충돌은 무시 — 동시요청/중복 방어)
    const grantedCards: Array<{
      cardId: string
      name: string
      imageUrl: string
      member: string | null
    }> = []
    for (const cardId of grantIds) {
      const inserted = await db
        .insert(userCards)
        .values({ userId, cardId, quantity: 1, acquiredAt: now, acquiredBy: 'reward' })
        .onConflictDoNothing({ target: [userCards.userId, userCards.cardId] })
        .returning({ id: userCards.id })
      if (inserted.length) {
        const info = catalog.find((c) => c.cardId === cardId)
        grantedCards.push({
          cardId,
          name: info?.name || cardId,
          imageUrl: info?.imageUrl || '',
          member: info?.member ?? null,
        })
      }
    }

    return NextResponse.json({ success: true, dogam, summary, newlyUnlocked, grantedCards })
  } catch (error) {
    console.error('Dogam POST(sync) error:', error)
    return NextResponse.json(
      { success: false, message: '도감 동기화 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
