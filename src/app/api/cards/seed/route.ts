import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/mongodb'
import { Card, CardType, CardRarity } from '@/models/Card'
export const dynamic = 'force-dynamic'

// POST: 기본 카드 데이터 생성
export async function POST(request: NextRequest) {
  try {
    await connectDB()
    
    // 기존 카드 수 확인
    const existingCardCount = await Card.countDocuments()
    if (existingCardCount > 0) {
      return NextResponse.json({
        success: true,
        message: `이미 ${existingCardCount}개의 카드가 존재합니다.`,
        count: existingCardCount
      })
    }
    
    // 기본 카드 데이터 생성
    const basicCards = [
      // 년도 카드 (베이직)
      {
        cardId: 'jaewon_2024_h1',
        name: '재원 2024년 상반기',
        type: CardType.YEAR,
        rarity: CardRarity.BASIC,
        description: '2024년 상반기 재원의 모습',
        imageUrl: '/images/cards/year/jaewon_2024_h1.jpg',
        member: '재원',
        year: 2024,
        period: 'h1',
        isGroupCard: false,
        dropRate: 0.08, // 8%
        canBeUsedForCrafting: true
      },
      {
        cardId: 'minseok_2024_h1',
        name: '민석 2024년 상반기',
        type: CardType.YEAR,
        rarity: CardRarity.BASIC,
        description: '2024년 상반기 민석의 모습',
        imageUrl: '/images/cards/year/minseok_2024_h1.jpg',
        member: '민석',
        year: 2024,
        period: 'h1',
        isGroupCard: false,
        dropRate: 0.08,
        canBeUsedForCrafting: true
      },
      {
        cardId: 'jinkyu_2024_h1',
        name: '진규 2024년 상반기',
        type: CardType.YEAR,
        rarity: CardRarity.BASIC,
        description: '2024년 상반기 진규의 모습',
        imageUrl: '/images/cards/year/jinkyu_2024_h1.jpg',
        member: '진규',
        year: 2024,
        period: 'h1',
        isGroupCard: false,
        dropRate: 0.08,
        canBeUsedForCrafting: true
      },
      {
        cardId: 'hanul_2024_h1',
        name: '한울 2024년 상반기',
        type: CardType.YEAR,
        rarity: CardRarity.BASIC,
        description: '2024년 상반기 한울의 모습',
        imageUrl: '/images/cards/year/hanul_2024_h1.jpg',
        member: '한울',
        year: 2024,
        period: 'h1',
        isGroupCard: false,
        dropRate: 0.08,
        canBeUsedForCrafting: true
      },
      {
        cardId: 'seungchan_2024_h1',
        name: '승찬 2024년 상반기',
        type: CardType.YEAR,
        rarity: CardRarity.BASIC,
        description: '2024년 상반기 승찬의 모습',
        imageUrl: '/images/cards/year/seungchan_2024_h1.jpg',
        member: '승찬',
        year: 2024,
        period: 'h1',
        isGroupCard: false,
        dropRate: 0.08,
        canBeUsedForCrafting: true
      },
      
      // 스페셜 카드 (레어)
      {
        cardId: 'group_formation',
        name: '랑구 결성',
        type: CardType.SPECIAL,
        rarity: CardRarity.RARE,
        description: '다섯 친구가 처음 만나 랑구를 결성한 순간',
        imageUrl: '/images/cards/special/formation.jpg',
        isGroupCard: true,
        dropRate: 0.15, // 15%
        canBeUsedForCrafting: true
      },
      {
        cardId: 'group_anniversary_1',
        name: '랑구 1주년',
        type: CardType.SPECIAL,
        rarity: CardRarity.RARE,
        description: '랑구 결성 1주년 기념',
        imageUrl: '/images/cards/special/anniversary_1.jpg',
        isGroupCard: true,
        dropRate: 0.15,
        canBeUsedForCrafting: true
      },
      
      // 시그니처 카드 (에픽)
      {
        cardId: 'signature_jaewon_2024_h1',
        name: '재원 시그니처 2024년 상반기',
        type: CardType.SIGNATURE,
        rarity: CardRarity.EPIC,
        description: '2024년 상반기 재원의 특별한 순간',
        imageUrl: '/images/cards/signature/jaewon_2024_h1.jpg',
        member: '재원',
        year: 2024,
        period: 'h1',
        isGroupCard: false,
        dropRate: 0.05, // 5%
        canBeUsedForCrafting: true
      },
      
      // 재료 카드
      {
        cardId: 'material_friendship',
        name: '우정의 조각',
        type: CardType.MATERIAL,
        rarity: CardRarity.MATERIAL,
        description: '진정한 우정으로 만들어진 신비한 재료',
        imageUrl: '/images/cards/material/friendship.jpg',
        dropRate: 0.1, // 10%
        canBeUsedForCrafting: true
      },
      
      // 프레스티지 카드 (조합으로만 획득)
      {
        cardId: 'prestige_jaewon',
        name: '재원 프레스티지',
        type: CardType.PRESTIGE,
        rarity: CardRarity.LEGENDARY,
        description: '재원의 모든 추억과 성장이 담긴 전설의 카드',
        imageUrl: '/images/cards/prestige/jaewon.jpg',
        member: '재원',
        isGroupCard: false,
        dropRate: 0, // 드랍 불가, 조합으로만 획득
        maxCopies: 1,
        craftingRecipe: {
          requiredCards: [
            { type: CardType.YEAR, count: 7 },
            { type: CardType.SPECIAL, count: 3 },
            { type: CardType.SIGNATURE, count: 1 }
          ],
          successRate: 0.7
        }
      }
    ]
    
    // 카드 생성
    const now = new Date()
    const cardsWithTimestamps = basicCards.map(card => ({
      ...card,
      createdAt: now,
      updatedAt: now
    }))
    
    const result = await Card.insertMany(cardsWithTimestamps)
    
    return NextResponse.json({
      success: true,
      message: `${result.length}개의 기본 카드가 생성되었습니다.`,
      count: result.length,
      cards: result.map(card => ({ cardId: card.cardId, name: card.name }))
    })
    
  } catch (error) {
    console.error('Card seed error:', error)
    return NextResponse.json(
      { 
        success: false, 
        message: '카드 시드 중 오류가 발생했습니다.',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
