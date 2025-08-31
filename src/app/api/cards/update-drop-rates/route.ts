import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/mongodb'
import { Card } from '@/models/Card'

export const dynamic = 'force-dynamic'

// 카드 타입 열거형 정의
enum CardType {
  YEAR = 'year',
  SPECIAL = 'special',
  SIGNATURE = 'signature',
  MATERIAL = 'material',
  PRESTIGE = 'prestige'
}

// POST: 기존 카드들의 드랍률만 업데이트
export async function POST(request: NextRequest) {
  try {
    await connectDB()
    
    console.log('카드 드랍률 업데이트 시작...')
    
    // 1. Year 카드들 (BASIC) - 1%로 업데이트
    const yearUpdateResult = await Card.updateMany(
      { type: CardType.YEAR },
      { $set: { dropRate: 0.01 } }
    )
    console.log(`Year 카드 ${yearUpdateResult.modifiedCount}개 업데이트됨 (1%)`)
    
    // 2. Signature 카드들 (EPIC) - 0.5%로 업데이트  
    const signatureUpdateResult = await Card.updateMany(
      { type: CardType.SIGNATURE },
      { $set: { dropRate: 0.005 } }
    )
    console.log(`Signature 카드 ${signatureUpdateResult.modifiedCount}개 업데이트됨 (0.5%)`)
    
    // 3. 기존 Material 카드들 삭제 (멤버별 재료카드 제거)
    const oldMaterialDeleteResult = await Card.deleteMany({
      type: CardType.MATERIAL,
      cardId: { $regex: /^material_/ }
    })
    console.log(`기존 멤버별 재료카드 ${oldMaterialDeleteResult.deletedCount}개 삭제됨`)
    
    // 4. 새로운 조커카드 생성 또는 업데이트
    const jokerCardData = {
      cardId: 'joker_card',
      name: '조커카드',
      type: CardType.MATERIAL,
      rarity: 'material',
      description: '모든 조합에 사용할 수 있는 만능 재료카드',
      imageUrl: '/images/cards/material/BG_JOKER_CARD.jpg',
      cardImageUrl: '/images/cards/material/JOKER_CARD.jpg',
      isGroupCard: true,
      dropRate: 0.05,
      canBeUsedForCrafting: true,
      createdAt: new Date(),
      updatedAt: new Date()
    }
    
    const jokerResult = await Card.findOneAndUpdate(
      { cardId: 'joker_card' },
      { $set: jokerCardData },
      { upsert: true, new: true }
    )
    
    if (jokerResult) {
      console.log(`조커카드 생성/업데이트됨: ${jokerResult.name} (5%)`)
    }
    
    // 4. Special 카드들 개별 업데이트
    
    // LG Twins & KIA Tigers - 1%
    const sportsUpdateResult = await Card.updateMany(
      { 
        type: CardType.SPECIAL,
        $or: [
          { cardId: { $regex: /^LGTWINS_/ } },
          { cardId: { $regex: /^KIATIGERS_/ } }
        ]
      },
      { $set: { dropRate: 0.01 } }
    )
    console.log(`스포츠팀 카드 ${sportsUpdateResult.modifiedCount}개 업데이트됨 (1%)`)
    
    // 백넘버 카드들 - 0.2%
    const backNumUpdateResult = await Card.updateMany(
      { 
        type: CardType.SPECIAL,
        cardId: { $regex: /^BACKNUM_/ }
      },
      { $set: { dropRate: 0.002 } }
    )
    console.log(`백넘버 카드 ${backNumUpdateResult.modifiedCount}개 업데이트됨 (0.2%)`)
    
    // SC 카드들 - 0.2%
    const scUpdateResult = await Card.updateMany(
      { 
        type: CardType.SPECIAL,
        cardId: { $regex: /^SC_/ }
      },
      { $set: { dropRate: 0.002 } }
    )
    console.log(`SC 카드 ${scUpdateResult.modifiedCount}개 업데이트됨 (0.2%)`)
    
    // 랑구 기념 카드들 - 1%
    const rangguUpdateResult = await Card.updateMany(
      { 
        type: CardType.SPECIAL,
        $or: [
          { cardId: 'RANGGU_ANNIVER' },
          { cardId: 'RANGGU_SPECIAL' }
        ]
      },
      { $set: { dropRate: 0.01 } }
    )
    console.log(`랑구 기념 카드 ${rangguUpdateResult.modifiedCount}개 업데이트됨 (1%)`)
    
    // 5. 프레스티지 카드들 확인 (드랍률 0 유지)
    const prestigeCount = await Card.countDocuments({ 
      type: CardType.PRESTIGE,
      dropRate: 0 
    })
    console.log(`프레스티지 카드 ${prestigeCount}개 확인됨 (드랍률 0% 유지)`)
    
    // 업데이트 후 드랍률 요약
    const dropRateSummary = {
      year: await Card.countDocuments({ type: CardType.YEAR }),
      special: await Card.countDocuments({ type: CardType.SPECIAL }),
      signature: await Card.countDocuments({ type: CardType.SIGNATURE }),
      material: await Card.countDocuments({ type: CardType.MATERIAL }),
      prestige: await Card.countDocuments({ type: CardType.PRESTIGE })
    }
    
    // 예상 총 드랍률 계산
    const expectedDropRates = {
      year: dropRateSummary.year * 0.01, // 1% each
      lgTwins: 3 * 0.01, // 1% each
      kiaTigers: 1 * 0.01, // 1% each  
      backNumber: 5 * 0.002, // 0.2% each
      sc: 10 * 0.002, // 0.2% each
      ranggu: 2 * 0.01, // 1% each
      signature: dropRateSummary.signature * 0.005, // 0.5% each
      material: 1 * 0.05, // 5% (조커카드 1개)
      prestige: 0 // 조합으로만
    }
    
    const totalExpectedRate = Object.values(expectedDropRates).reduce((sum, rate) => sum + rate, 0)
    
    return NextResponse.json({
      success: true,
      message: '카드 드랍률이 성공적으로 업데이트되었습니다.',
      updatedCounts: {
        year: yearUpdateResult.modifiedCount,
        signature: signatureUpdateResult.modifiedCount,
        oldMaterialDeleted: oldMaterialDeleteResult.deletedCount,
        jokerCardCreated: jokerResult ? 1 : 0,
        sports: sportsUpdateResult.modifiedCount,
        backNumber: backNumUpdateResult.modifiedCount,
        sc: scUpdateResult.modifiedCount,
        ranggu: rangguUpdateResult.modifiedCount
      },
      cardCounts: dropRateSummary,
      expectedDropRates,
      totalExpectedDropRate: `${(totalExpectedRate * 100).toFixed(1)}%`
    }, { status: 200 })
    
  } catch (error) {
    console.error('Drop rate update error:', error)
    return NextResponse.json(
      { 
        success: false, 
        message: '드랍률 업데이트 중 오류가 발생했습니다.',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
