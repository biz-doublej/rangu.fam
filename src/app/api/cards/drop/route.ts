import { NextRequest, NextResponse } from 'next/server'
import { and, eq, gt, ne, sql } from 'drizzle-orm'
import { getDb } from '@/db/client'
import { cardDrops, cards, userCards, userCardStats } from '@/db/schema/cards'
import {
  buildClientUser,
  getAuthenticatedWikiUser,
  resolveMemberIdForUser,
} from '@/lib/doublejAuth'

export const dynamic = 'force-dynamic'

const FALLBACK_IMAGE = '/images/default-music-cover.jpg'
const MAX_DROPS_PER_WINDOW = 5
const DROP_WINDOW_MS = 24 * 60 * 60 * 1000
const DROP_ALLOWED_MEMBER_IDS = new Set(['hanul', 'jaewon', 'jinkyu', 'seungchan', 'minseok'])

// ── 인증 가드 ────────────────────────────────────────────────────
async function authorizeDropUser(request: NextRequest, requestedUserId?: string) {
  const wikiUser = await getAuthenticatedWikiUser(request)
  if (!wikiUser) {
    return {
      errorResponse: NextResponse.json(
        { success: false, message: '카드 드랍은 로그인 후 이용할 수 있습니다.' },
        { status: 401 }
      ),
    }
  }

  const memberId = resolveMemberIdForUser(wikiUser)
  if (!memberId || !DROP_ALLOWED_MEMBER_IDS.has(memberId)) {
    return {
      errorResponse: NextResponse.json(
        { success: false, message: '카드 드랍은 랑구팸 5인 멤버 전용 기능입니다.' },
        { status: 403 }
      ),
    }
  }

  const clientUser = buildClientUser(wikiUser)
  if (requestedUserId && requestedUserId !== clientUser.id) {
    return {
      errorResponse: NextResponse.json(
        { success: false, message: '본인 계정으로만 카드 드랍을 사용할 수 있습니다.' },
        { status: 403 }
      ),
    }
  }

  return { userId: clientUser.id }
}

function ensureImage<T extends { imageUrl?: string | null }>(card: T): T {
  if (!card?.imageUrl || typeof card.imageUrl !== 'string' || !card.imageUrl.trim()) {
    return { ...card, imageUrl: FALLBACK_IMAGE }
  }
  return card
}

function shouldResetDropWindow(lastDropDate: Date | null | undefined, now: Date) {
  if (!lastDropDate) return true
  const parsed = new Date(lastDropDate)
  if (Number.isNaN(parsed.getTime())) return true
  const elapsed = now.getTime() - parsed.getTime()
  return elapsed >= DROP_WINDOW_MS || elapsed < 0
}

// ── 가중 랜덤 카드 선택 ─────────────────────────────────────────
async function selectRandomCard() {
  const db = getDb()
  const candidates = await db
    .select()
    .from(cards)
    .where(
      and(
        ne(cards.type, 'prestige'),
        gt(cards.dropRate, 0),
        sql`(${cards.type} != 'material' OR LOWER(${cards.cardId}) = 'joker_card')`
      )
    )

  const valid = candidates
    .map((c) => ensureImage(c))
    .filter((c) => c.imageUrl !== FALLBACK_IMAGE)

  if (valid.length === 0) {
    if (candidates.length === 0) return null
    return ensureImage(candidates[Math.floor(Math.random() * candidates.length)])
  }

  const totalWeight = valid.reduce((sum, c) => sum + (c.dropRate || 0), 0)
  if (totalWeight <= 0) {
    return ensureImage(valid[Math.floor(Math.random() * valid.length)])
  }

  let r = Math.random() * totalWeight
  for (const c of valid) {
    r -= c.dropRate || 0
    if (r <= 0) return ensureImage(c)
  }
  return ensureImage(valid[valid.length - 1])
}

// ── POST: 일일 카드 드랍 ───────────────────────────────────────
export async function POST(request: NextRequest) {
  try {
    const db = getDb()
    const body = await request.json().catch(() => ({}))
    const requestedUserId = typeof body?.userId === 'string' ? body.userId : undefined

    const auth = await authorizeDropUser(request, requestedUserId)
    if ('errorResponse' in auth) return auth.errorResponse

    const userId = auth.userId
    const now = new Date()

    let [stats] = await db
      .select()
      .from(userCardStats)
      .where(eq(userCardStats.userId, userId))
      .limit(1)

    if (!stats) {
      const [created] = await db
        .insert(userCardStats)
        .values({
          userId,
          lastDropDate: now,
          dailyDropsUsed: 0,
        })
        .returning()
      stats = created
    }

    let dailyDropsUsed = stats.dailyDropsUsed || 0
    let lastDropDate = stats.lastDropDate

    if (shouldResetDropWindow(lastDropDate, now)) {
      dailyDropsUsed = 0
      lastDropDate = now
    }

    if (dailyDropsUsed >= MAX_DROPS_PER_WINDOW) {
      return NextResponse.json({
        success: false,
        message: '24시간 동안 사용 가능한 드랍 5회를 모두 사용했습니다. 자동 초기화를 기다려주세요.',
        remainingDrops: 0,
      })
    }

    if (dailyDropsUsed === 0) {
      lastDropDate = now
    }

    const droppedCard = await selectRandomCard()
    if (!droppedCard) {
      return NextResponse.json({
        success: false,
        message: '드랍 가능한 카드가 없습니다.',
        remainingDrops: Math.max(0, MAX_DROPS_PER_WINDOW - dailyDropsUsed),
      })
    }

    const [existingUserCard] = await db
      .select()
      .from(userCards)
      .where(and(eq(userCards.userId, userId), eq(userCards.cardId, droppedCard.cardId)))
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
        cardId: droppedCard.cardId,
        quantity: 1,
        acquiredAt: now,
        acquiredBy: 'drop',
      })
    }

    await db.insert(cardDrops).values({
      userId,
      cardId: droppedCard.cardId,
      dropType: 'daily',
      droppedAt: now,
      dailyDropCount: dailyDropsUsed + 1,
    })

    const [updatedStats] = await db
      .update(userCardStats)
      .set({
        dailyDropsUsed: dailyDropsUsed + 1,
        totalDropsUsed: (stats.totalDropsUsed || 0) + 1,
        totalCardsCollected: (stats.totalCardsCollected || 0) + 1,
        lastDropDate,
        updatedAt: now,
      })
      .where(eq(userCardStats.userId, userId))
      .returning()

    const remainingDrops = Math.max(
      0,
      MAX_DROPS_PER_WINDOW - (updatedStats?.dailyDropsUsed || dailyDropsUsed + 1)
    )

    return NextResponse.json({
      success: true,
      card: droppedCard,
      remainingDrops,
      message: `카드를 획득했습니다! 남은 드랍 ${remainingDrops}회`,
    })
  } catch (error) {
    console.error('Card drop error:', error)
    return NextResponse.json(
      {
        success: false,
        message: '카드 드랍 중 오류가 발생했습니다.',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

// ── GET: 남은 드랍 횟수 ───────────────────────────────────────
export async function GET(request: NextRequest) {
  try {
    const db = getDb()
    const { searchParams } = new URL(request.url)
    const requestedUserId = searchParams.get('userId') || undefined

    const auth = await authorizeDropUser(request, requestedUserId)
    if ('errorResponse' in auth) return auth.errorResponse

    const [stats] = await db
      .select({
        dailyDropsUsed: userCardStats.dailyDropsUsed,
        lastDropDate: userCardStats.lastDropDate,
      })
      .from(userCardStats)
      .where(eq(userCardStats.userId, auth.userId))
      .limit(1)

    if (!stats) {
      return NextResponse.json({ success: true, remainingDrops: MAX_DROPS_PER_WINDOW })
    }

    const now = new Date()
    const used = shouldResetDropWindow(stats.lastDropDate, now) ? 0 : stats.dailyDropsUsed || 0
    const remainingDrops = Math.max(0, MAX_DROPS_PER_WINDOW - used)

    return NextResponse.json({ success: true, remainingDrops })
  } catch (error) {
    console.error('Remaining drops check error:', error)
    return NextResponse.json(
      { success: false, message: '드랍 횟수 조회 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
