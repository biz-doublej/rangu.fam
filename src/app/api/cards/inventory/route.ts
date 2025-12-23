import { NextRequest, NextResponse } from 'next/server'
import { CardService } from '@/services/cardService'
import { UserCard } from '@/models/UserCard'
import connectDB from '@/lib/mongodb'
export const dynamic = 'force-dynamic'

// GET: 사용자 카드 인벤토리 조회
export async function GET(request: NextRequest) {
  try {
    await connectDB()
    
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const sortBy = searchParams.get('sortBy') || 'recent' // recent, rarity, name
    const filterType = searchParams.get('type')
    const filterRarity = searchParams.get('rarity')
    const favoritesOnly = searchParams.get('favorites') === 'true'
    
    if (!userId) {
      return NextResponse.json(
        { success: false, message: '사용자 ID가 필요합니다.' },
        { status: 400 }
      )
    }
    
    
    const userObjectId = CardService.normalizeUserId(userId)
    const skip = (page - 1) * limit
    
    // 매치 조건 구성
    const matchConditions: any = { userId: userObjectId }
    if (favoritesOnly) {
      matchConditions.isFavorite = true
    }
    
    // 조인 후 필터 조건
    const cardFilterConditions: any = {}
    if (filterType) cardFilterConditions.type = filterType
    if (filterRarity) cardFilterConditions.rarity = filterRarity
    
    // 정렬 조건
    let sortConditions: any = {}
    switch (sortBy) {
      case 'rarity':
        sortConditions = { 'cardInfo.rarity': 1, 'cardInfo.name': 1 }
        break
      case 'name':
        sortConditions = { 'cardInfo.name': 1 }
        break
      case 'recent':
      default:
        sortConditions = { acquiredAt: -1 }
        break
    }
    
    // 집계 파이프라인
    const pipeline: any[] = [
      { $match: matchConditions },
      {
        $lookup: {
          from: 'cards',
          localField: 'cardId',
          foreignField: 'cardId',
          as: 'cardInfo'
        }
      },
      { $unwind: '$cardInfo' }
    ]
    
    // 카드 필터 추가
    if (Object.keys(cardFilterConditions).length > 0) {
      pipeline.push({
        $match: Object.keys(cardFilterConditions).reduce((acc, key) => {
          acc[`cardInfo.${key}`] = cardFilterConditions[key]
          return acc
        }, {} as any)
      })
    }
    
    // 정렬, 스킵, 리밋 추가
    pipeline.push(
      { $sort: sortConditions },
      { $skip: skip },
      { $limit: limit }
    )
    
    // 데이터 조회
    let inventory = await UserCard.aggregate(pipeline)
    inventory = inventory.map((item: any) => ({
      ...item,
      cardInfo: CardService.ensureImage(item.cardInfo)
    }))
    
    // 전체 카운트 조회
    const countPipeline = [...pipeline.slice(0, -2)] // sort, skip, limit 제거
    countPipeline.push({ $count: 'total' })
    const countResult = await UserCard.aggregate(countPipeline)
    const totalCount = countResult[0]?.total || 0
    
    return NextResponse.json({
      success: true,
      inventory,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalCount / limit),
        totalCount,
        hasMore: skip + inventory.length < totalCount
      }
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
    await connectDB()
    
    const body = await request.json()
    const { userId, cardId, isFavorite, isLocked } = body
    
    if (!userId || !cardId) {
      return NextResponse.json(
        { success: false, message: '사용자 ID와 카드 ID가 필요합니다.' },
        { status: 400 }
      )
    }
    
    const userObjectId = CardService.normalizeUserId(userId)
    
    // 사용자 카드 조회
    const userCard = await UserCard.findOne({ 
      userId: userObjectId, 
      cardId 
    })
    
    if (!userCard) {
      return NextResponse.json(
        { success: false, message: '소장하지 않은 카드입니다.' },
        { status: 404 }
      )
    }
    
    // 상태 업데이트
    const updateData: any = {}
    if (isFavorite !== undefined) updateData.isFavorite = isFavorite
    if (isLocked !== undefined) updateData.isLocked = isLocked
    
    await UserCard.findOneAndUpdate(
      { userId: userObjectId, cardId },
      { $set: updateData }
    )
    
    return NextResponse.json({
      success: true,
      message: '카드 상태가 업데이트되었습니다.'
    })
    
  } catch (error) {
    console.error('Inventory PATCH error:', error)
    return NextResponse.json(
      { success: false, message: '카드 상태 업데이트 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
