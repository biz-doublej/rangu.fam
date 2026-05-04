import { NextRequest, NextResponse } from 'next/server'
import { and, desc, eq, sql } from 'drizzle-orm'
import { getDb } from '@/db/client'
import { cards } from '@/db/schema/cards'

export const dynamic = 'force-dynamic'

// GET: 모든 카드 조회 (필터링 옵션 포함)
export async function GET(request: NextRequest) {
  try {
    const db = getDb()

    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type')
    const rarity = searchParams.get('rarity')
    const member = searchParams.get('member')
    const year = searchParams.get('year')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const skip = (page - 1) * limit

    const conditions = []
    if (type) conditions.push(eq(cards.type, type))
    if (rarity) conditions.push(eq(cards.rarity, rarity))
    if (member) conditions.push(eq(cards.member, member))
    if (year) conditions.push(eq(cards.year, parseInt(year)))

    const where = conditions.length ? and(...conditions) : undefined

    const rows = await db
      .select()
      .from(cards)
      .where(where as any)
      .orderBy(desc(cards.createdAt))
      .offset(skip)
      .limit(limit)

    const [{ count: totalCount }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(cards)
      .where(where as any)

    return NextResponse.json({
      success: true,
      cards: rows,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalCount / limit),
        totalCount,
        hasMore: skip + rows.length < totalCount,
      },
    })
  } catch (error) {
    console.error('Cards GET error:', error)
    return NextResponse.json(
      { success: false, message: '카드 목록 조회 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

// POST: 새 카드 생성 (관리자 전용)
export async function POST(request: NextRequest) {
  try {
    const db = getDb()
    const body = await request.json()
    const {
      cardId,
      name,
      type,
      rarity,
      description,
      imageUrl,
      member,
      year,
      period,
      isGroupCard,
      dropRate,
      maxCopies,
      canBeUsedForCrafting,
      craftingRecipe,
    } = body

    if (
      !cardId ||
      !name ||
      !type ||
      !rarity ||
      !description ||
      !imageUrl ||
      dropRate === undefined
    ) {
      return NextResponse.json(
        { success: false, message: '필수 필드가 누락되었습니다.' },
        { status: 400 }
      )
    }

    const [existing] = await db
      .select({ id: cards.id })
      .from(cards)
      .where(eq(cards.cardId, cardId))
      .limit(1)

    if (existing) {
      return NextResponse.json(
        { success: false, message: '이미 존재하는 카드 ID입니다.' },
        { status: 400 }
      )
    }

    const [newCard] = await db
      .insert(cards)
      .values({
        cardId,
        name,
        type,
        rarity,
        description,
        imageUrl,
        member: member ?? null,
        year: year ?? null,
        period: period ?? null,
        isGroupCard: Boolean(isGroupCard),
        dropRate,
        maxCopies: maxCopies ?? null,
        canBeUsedForCrafting: Boolean(canBeUsedForCrafting),
        craftingRecipe: craftingRecipe ?? null,
      })
      .returning()

    return NextResponse.json({
      success: true,
      message: '카드가 성공적으로 생성되었습니다.',
      card: newCard,
    })
  } catch (error) {
    console.error('Card POST error:', error)
    return NextResponse.json(
      { success: false, message: '카드 생성 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
