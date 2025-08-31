import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/mongodb'
import { Card, CardType, CardRarity } from '@/models/Card'
export const dynamic = 'force-dynamic'

// POST: 기본 카드 데이터 생성
export async function POST(request: NextRequest) {
  try {
    await connectDB()
    
    // URL 파라미터에서 force 옵션 확인
    const { searchParams } = new URL(request.url)
    const force = searchParams.get('force') === 'true'
    
    // 기존 카드 수 확인
    const existingCardCount = await Card.countDocuments()
    if (existingCardCount > 0 && !force) {
      return NextResponse.json({
        success: true,
        message: `이미 ${existingCardCount}개의 카드가 존재합니다. 강제로 재생성하려면 ?force=true를 추가하세요.`,
        count: existingCardCount
      })
    }
    
    // Force 모드일 때 기존 카드 삭제
    if (force) {
      await Card.deleteMany({})
      console.log('기존 카드 데이터 삭제됨')
    }
    
    // 멤버 정보 (업데이트된 한글명과 약어 매핑)
    const members = [
      { korean: '재원', abbrev: 'JAE' },
      { korean: '강한울', abbrev: 'HAN' },
      { korean: '이승찬', abbrev: 'LEE' },
      { korean: '정민석', abbrev: 'MIN' },
      { korean: '정진규', abbrev: 'JIN' }
    ]

    const basicCards = []

    // 모든 연도 배열 (2021부터 2025까지)
    const years = [2021, 2022, 2023, 2024, 2025]

    // 년도 카드 (베이직) - 각 멤버당 모든 연도 버전별
    for (const member of members) {
      for (const year of years) {
        // 각 연도별 2개 버전
        for (let version = 1; version <= 2; version++) {
          basicCards.push({
            cardId: `${member.abbrev}_${year}_v${version}`,
            name: `${member.korean} ${year} v${version}`,
            type: CardType.YEAR,
            rarity: CardRarity.BASIC,
            description: `${year}년 ${member.korean}의 모습 (버전 ${version})`,
            imageUrl: `/images/cards/year/${member.abbrev}_${year.toString().slice(-2)}_V${version}.jpg`,
            backgroundUrl: `/images/cards/year/BG_${year}.jpg`,
            member: member.korean,
            year: year,
            version: version,
            isGroupCard: false,
            dropRate: 0.01, // 1% (총 50% for all year cards, 5년 × 2버전 × 5명 = 50장)
            canBeUsedForCrafting: true
          })
        }
      }
    }

    // 스페셜 카드 (레어) - 개인 및 그룹 (총 30%)
    
    // LG 트윈스 스페셜 카드 (실제 존재하는 파일만)
    const lgtwinsMembers = ['JAE', 'LEE', 'MIN'] // 실제 파일이 존재하는 멤버만
    for (const abbrev of lgtwinsMembers) {
      const member = members.find(m => m.abbrev === abbrev)
      if (member) {
        basicCards.push({
          cardId: `LGTWINS_${member.abbrev}`,
          name: `${member.korean} LG 트윈스`,
          type: CardType.SPECIAL,
          rarity: CardRarity.RARE,
          description: `${member.korean}의 LG 트윈스 팬카드`,
          imageUrl: `/images/cards/special/LGTWINS_${member.abbrev}.jpg`,
          member: member.korean,
          isGroupCard: false,
          dropRate: 0.01, // 1%
          canBeUsedForCrafting: true
        })
      }
    }

    // KIA 타이거즈 스페셜 카드 (실제 존재하는 파일만)
    const kiatigersMembers = ['HAN'] // 실제 파일이 존재하는 멤버만
    for (const abbrev of kiatigersMembers) {
      const member = members.find(m => m.abbrev === abbrev)
      if (member) {
        basicCards.push({
          cardId: `KIATIGERS_${member.abbrev}`,
          name: `${member.korean} KIA 타이거즈`,
          type: CardType.SPECIAL,
          rarity: CardRarity.RARE,
          description: `${member.korean}의 KIA 타이거즈 팬카드`,
          imageUrl: `/images/cards/special/KIATIGERS_${member.abbrev}.jpg`,
          member: member.korean,
          isGroupCard: false,
          dropRate: 0.01, // 1%
          canBeUsedForCrafting: true
        })
      }
    }

    // 백넘버 스페셜 카드
    for (const member of members) {
      basicCards.push({
        cardId: `BACKNUM_${member.abbrev}`,
        name: `${member.korean} 백넘버`,
        type: CardType.SPECIAL,
        rarity: CardRarity.RARE,
        description: `${member.korean}의 특별한 백넘버 카드`,
        imageUrl: `/images/cards/special/BACKNUM_${member.abbrev}.jpg`,
        member: member.korean,
        isGroupCard: false,
        dropRate: 0.002, // 0.2% (총 1% for 백넘버 카드들)
        canBeUsedForCrafting: true
      })
    }

    // SC 연도별 스페셜 카드 (실제 존재하는 파일만)
    const scCards = [
      // 한울 SC 카드
      { abbrev: 'HAN', year: 2019 },
      { abbrev: 'HAN', year: 2020 },
      { abbrev: 'HAN', year: 2021 },
      { abbrev: 'HAN', year: 2022 },
      { abbrev: 'HAN', year: 2023 },
      // 재원 SC 카드
      { abbrev: 'JAE', year: 2022 },
      { abbrev: 'JAE', year: 2023 },
      // 진규 SC 카드
      { abbrev: 'JIN', year: 2019 },
      { abbrev: 'JIN', year: 2020 },
      // 민석 SC 카드
      { abbrev: 'MIN', year: 2022 }
    ]
    
    for (const scCard of scCards) {
      const member = members.find(m => m.abbrev === scCard.abbrev)
      if (member) {
        basicCards.push({
          cardId: `SC_${member.abbrev}_${scCard.year}`,
          name: `${member.korean} SC ${scCard.year}`,
          type: CardType.SPECIAL,
          rarity: CardRarity.RARE,
          description: `${scCard.year}년 ${member.korean}의 SC 모먼트`,
          imageUrl: `/images/cards/special/SC_${member.abbrev}_${scCard.year.toString().slice(-2)}.jpg`,
          member: member.korean,
          year: scCard.year,
          isGroupCard: false,
          dropRate: 0.002, // 0.2% (총 2% for SC 카드들)
          canBeUsedForCrafting: true
        })
      }
    }

    // 랑구 기념 카드
    const rangguSpecialCards = [
      { 
        cardId: 'RANGGU_ANNIVER',
        name: '랑구 기념일',
        description: '랑구의 특별한 기념일을 담은 카드',
        dropRate: 0.01 // 1%
      },
      {
        cardId: 'RANGGU_SPECIAL',
        name: '랑구 스페셜',
        description: '랑구의 특별한 순간을 담은 카드',
        dropRate: 0.01 // 1%
      }
    ]

    for (const card of rangguSpecialCards) {
      basicCards.push({
        cardId: card.cardId,
        name: card.name,
        type: CardType.SPECIAL,
        rarity: CardRarity.RARE,
        description: card.description,
        imageUrl: `/images/cards/special/${card.cardId}.jpg`,
        isGroupCard: true,
        dropRate: card.dropRate,
        canBeUsedForCrafting: true
      })
    }

    // 시그니처 카드 (에픽) - 실제 존재하는 파일만
    const signatureCards = [
      // 한울 시그니처 카드
      { abbrev: 'HAN', year: 2020 },
      { abbrev: 'HAN', year: 2022 },
      { abbrev: 'HAN', year: 2023 },
      // 재원 시그니처 카드
      { abbrev: 'JAE', year: 2022 },
      { abbrev: 'JAE', year: 2024 },
      { abbrev: 'JAE', year: 2025 },

      // 민석 시그니처 카드
      { abbrev: 'MIN', year: 2021 },
      { abbrev: 'MIN', year: 2024 }
    ]
    
    for (const sigCard of signatureCards) {
      const member = members.find(m => m.abbrev === sigCard.abbrev)
      if (member) {
        basicCards.push({
          cardId: `SIG_${member.abbrev}_${sigCard.year}`,
          name: `${member.korean} ${sigCard.year} 시그니처`,
          type: CardType.SIGNATURE,
          rarity: CardRarity.EPIC,
          description: `${sigCard.year}년 ${member.korean}의 시그니처 모먼트`,
          imageUrl: `/images/cards/signature/BG_SIGNATURE.jpg`,
          cardImageUrl: `/images/cards/signature/SIG_${member.abbrev}_${sigCard.year.toString().slice(-2)}.jpg`,
          member: member.korean,
          year: sigCard.year,
          isGroupCard: false,
          dropRate: 0.005, // 0.5% each (총 4% for 시그니처 카드들)
          canBeUsedForCrafting: true
        })
      }
    }

    // 재료 카드 (조합용) - 조커카드 1개
    basicCards.push({
      cardId: 'joker_card',
      name: '조커카드',
      type: CardType.MATERIAL,
      rarity: CardRarity.MATERIAL,
      description: '모든 조합에 사용할 수 있는 만능 재료카드',
      imageUrl: '/images/cards/material/BG_JOKER_CARD.jpg',
      cardImageUrl: '/images/cards/material/JOKER_CARD.jpg',
      isGroupCard: true,
      dropRate: 0.05, // 5% (단일 카드)
      canBeUsedForCrafting: true
    })

    // 프레스티지 카드 (조합으로만 획득)
    for (const member of members) {
      basicCards.push({
        cardId: `prestige_${member.abbrev.toLowerCase()}`,
        name: `${member.korean} 프레스티지`,
        type: CardType.PRESTIGE,
        rarity: CardRarity.LEGENDARY,
        description: `${member.korean}의 모든 추억과 성장이 담긴 전설의 카드`,
        imageUrl: `/images/cards/prestige/${member.abbrev}_prestige.jpg`,
        member: member.korean,
        isGroupCard: false,
        dropRate: 0, // 드랍 불가, 조합으로만 획득
        maxCopies: 1,
        canBeUsedForCrafting: false,
        craftingRecipe: {
          requiredCards: [
            { type: CardType.YEAR, count: 7 },
            { type: CardType.SPECIAL, count: 3 },
            { type: CardType.SIGNATURE, count: 1 }
          ],
          successRate: 0.7
        }
      })
    }

    // 드랍률 요약 계산
    const dropRateSummary = {
      year: 50 * 0.01, // 50%
      lgTwins: 3 * 0.01, // 3%
      kiaTigers: 1 * 0.01, // 1%
      backNumber: 5 * 0.002, // 1%
      sc: 10 * 0.002, // 2%
      ranggu: 2 * 0.01, // 2%
      signature: 8 * 0.005, // 4%
      material: 1 * 0.05, // 5% (조커카드 1개)
      prestige: 5 * 0 // 0% (조합만)
    }
    
    const totalDropRate = Object.values(dropRateSummary).reduce((sum, rate) => sum + rate, 0)
    
    console.log(`생성할 카드 수: ${basicCards.length}개`)
    console.log('드랍률 요약:', dropRateSummary)
    console.log(`총 드랍률: ${(totalDropRate * 100).toFixed(1)}%`)
    
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
