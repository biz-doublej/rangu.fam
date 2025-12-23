import { NextRequest, NextResponse } from 'next/server'
import { CardService } from '@/services/cardService'
import connectDB from '@/lib/mongodb'
export const dynamic = 'force-dynamic'

// POST: 프레스티지 카드 조합
export async function POST(request: NextRequest) {
  try {
    await connectDB()
    const body = await request.json()
    const { userId, useMaterialCard = false } = body

    if (!userId) {
      return NextResponse.json(
        { success: false, message: 'User ID is required.' },
        { status: 400 }
      )
    }

    const result = await CardService.craftPrestigeCard(userId, useMaterialCard)

    return NextResponse.json(result)

  } catch (error) {
    console.error('Card craft error:', error)
    return NextResponse.json(
      { success: false, message: '카드 조합 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
