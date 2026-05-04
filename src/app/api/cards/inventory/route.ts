import { NextRequest, NextResponse } from 'next/server'
import { and, asc, desc, eq, sql } from 'drizzle-orm'
import { getDb } from '@/db/client'
import { cards, userCards } from '@/db/schema/cards'
import { ensureImage } from '@/lib/cardHelpers'

export const dynamic = 'force-dynamic'

// 정렬용 rarity 우선순위 (낮을수록 먼저). cards.rarity는 text라 직접 ORDER BY 시
// 알파벳 순이 어색해서 case 식으로 매핑.
const RARITY_ORDER_SQL = sql`CASE ${cards.rarity}
  WHEN 'legendary' THEN 1
  WHEN 'epic' THEN 2
  WHEN 'rare' THEN 3
  WHEN 'material' THEN 4
  WHEN 'basic' THEN 5
  ELSE 6
END`

// GET: 사용자 카드 인벤토리 조회
export async function GET(request: NextRequest) {
  try {
    const db = getDb()

    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const sortBy = searchParams.get('sortBy') || 'recent' // recent | rarity | name
    const filterType = searchParams.get('type')
    const filterRarity = searchParams.get('rarity')
    const favoritesOnly = searchParams.get('favorites') === 'true'

    if (!userId) {
      return NextResponse.json(
        { success: false, message: '사용자 ID가 필요합니다.' },
        { status: 400 }
      )
    }

    const skip = (page - 1) * limit

    // WHERE 구성
    const whereParts = [eq(userCards.userId, userId)]
    if (favoritesOnly) whereParts.push(eq(userCards.isFavorite, true))
    if (filterType) whereParts.push(eq(cards.type, filterType))
    if (filterRarity) whereParts.push(eq(cards.rarity, filterRarity))
    const whereClause = whereParts.length === 1 ? whereParts[0] : and(...whereParts)

    // 정렬
    let orderBy
    switch (sortBy) {
      case 'rarity':
        orderBy = [RARITY_ORDER_SQL, asc(cards.name)]
        break
      case 'name':
        orderBy = [asc(cards.name)]
        break
      case 'recent':
      default:
        orderBy = [desc(userCards.acquiredAt)]
        break
    }

    const rows = await db
      .select({
        _id: userCards.id,
        userId: userCards.userId,
        cardId: userCards.cardId,
        quantity: userCards.quantity,
        acquiredAt: userCards.acquiredAt,
        acquiredBy: userCards.acquiredBy,
        isFavorite: userCards.isFavorite,
        isLocked: userCards.isLocked,
        cardInfo: {
          _id: cards.id,
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
          dropRate: cards.dropRate,
        },
      })
      .from(userCards)
      .innerJoin(cards, eq(userCards.cardId, cards.cardId))
      .where(whereClause)
      .orderBy(...orderBy)
      .offset(skip)
      .limit(limit)

    const inventory = rows.map((item) => ({
      ...item,
      cardInfo: ensureImage(item.cardInfo),
    }))

    // 전체 카운트
    const [{ count: totalCount }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(userCards)
      .innerJoin(cards, eq(userCards.cardId, cards.cardId))
      .where(whereClause)

    return NextResponse.json({
      success: true,
      inventory,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalCount / limit),
        totalCount,
        hasMore: skip + inventory.length < totalCount,
      },
    })
  } catch (error) {
    console.error('Inventory GET error:', error)
    return NextResponse.json(
      { success: false, message: '인벤토리 조회 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

// PATCH: 카드 상태 업데이트 (즐겨찾기, 잠금 등)
export async function PATCH(request: NextRequest) {
  try {
    const db = getDb()
    const body = await request.json()
    const { userId, cardId, isFavorite, isLocked } = body

    if (!userId || !cardId) {
      return NextResponse.json(
        { success: false, message: '사용자 ID와 카드 ID가 필요합니다.' },
        { status: 400 }
      )
    }

    const updateData: Record<string, any> = {}
    if (isFavorite !== undefined) updateData.isFavorite = isFavorite
    if (isLocked !== undefined) updateData.isLocked = isLocked

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { success: false, message: '업데이트할 상태가 없습니다.' },
        { status: 400 }
      )
    }
    updateData.updatedAt = new Date()

    const [updated] = await db
      .update(userCards)
      .set(updateData)
      .where(and(eq(userCards.userId, userId), eq(userCards.cardId, cardId)))
      .returning({
        isFavorite: userCards.isFavorite,
        isLocked: userCards.isLocked,
      })

    if (!updated) {
      return NextResponse.json(
        { success: false, message: '소장하지 않은 카드입니다.' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      message: '카드 상태가 업데이트되었습니다.',
      cardState: {
        isFavorite: Boolean(updated.isFavorite),
        isLocked: Boolean(updated.isLocked),
      },
    })
  } catch (error) {
    console.error('Inventory PATCH error:', error)
    return NextResponse.json(
      { success: false, message: '카드 상태 업데이트 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
