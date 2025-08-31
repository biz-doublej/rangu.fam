import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/mongodb'
import { Card } from '@/models/Card'
export const dynamic = 'force-dynamic'

// GET: 모든 카드 조회 (필터링 옵션 포함)
export async function GET(request: NextRequest) {
  try {
    await connectDB()
    
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type')
    const rarity = searchParams.get('rarity')
    const member = searchParams.get('member')
    const year = searchParams.get('year')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    
    // 필터 조건 구성
    const filter: any = {}
    if (type) filter.type = type
    if (rarity) filter.rarity = rarity
    if (member) filter.member = member
    if (year) filter.year = parseInt(year)
    
    const skip = (page - 1) * limit
    
    // 카드 조회
    const cards = await Card.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean()
    
    const totalCount = await Card.countDocuments(filter)
    
    return NextResponse.json({
      success: true,
      cards,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalCount / limit),
        totalCount,
        hasMore: skip + cards.length < totalCount
      }
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
    await connectDB()
    
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
      craftingRecipe
    } = body
    
    // 필수 필드 검증
    if (!cardId || !name || !type || !rarity || !description || !imageUrl || dropRate === undefined) {
      return NextResponse.json(
        { success: false, message: '필수 필드가 누락되었습니다.' },
        { status: 400 }
      )
    }
    
    // 중복 카드 ID 체크
    const existingCard = await Card.findOne({ cardId })
    if (existingCard) {
      return NextResponse.json(
        { success: false, message: '이미 존재하는 카드 ID입니다.' },
        { status: 400 }
      )
    }
    
    // 새 카드 생성
    const newCard = new Card({
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
      craftingRecipe
    })
    
    await newCard.save()
    
    return NextResponse.json({
      success: true,
      message: '카드가 성공적으로 생성되었습니다.',
      card: newCard
    })
    
  } catch (error) {
    console.error('Card POST error:', error)
    return NextResponse.json(
      { success: false, message: '카드 생성 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
