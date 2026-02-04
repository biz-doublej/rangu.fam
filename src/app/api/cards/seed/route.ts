import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/mongodb'
import { Card } from '@/models/Card'
import { CardCatalogService } from '@/services/cardCatalogService'

export const dynamic = 'force-dynamic'

type SeedRequestBody = {
  force?: boolean
}

// POST: 로컬 카드 이미지 기준 카드 데이터 동기화
export async function POST(request: NextRequest) {
  try {
    await connectDB()

    let force = false
    try {
      const body = (await request.json()) as SeedRequestBody
      force = Boolean(body?.force)
    } catch {
      force = false
    }

    const existingCardCount = await Card.countDocuments()
    if (existingCardCount > 0 && !force) {
      return NextResponse.json({
        success: true,
        message: `이미 ${existingCardCount}개의 카드가 존재합니다. 다시 동기화하려면 force=true로 요청하세요.`,
        count: existingCardCount
      })
    }

    const syncResult = await CardCatalogService.syncCardsFromLocalImages()

    return NextResponse.json({
      success: true,
      message: `${syncResult.upsertedCount}개의 카드를 이미지 기준으로 동기화했습니다.`,
      generatedCount: syncResult.generatedCount,
      upsertedCount: syncResult.upsertedCount,
      cards: syncResult.generatedCards.map((card) => ({
        cardId: card.cardId,
        name: card.name,
        imageUrl: card.imageUrl
      }))
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

