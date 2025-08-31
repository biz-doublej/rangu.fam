import { NextRequest, NextResponse } from 'next/server'
import { CardService } from '@/services/cardService'
import User from '@/models/User'
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
        { success: false, message: '사용자 ID가 필요합니다.' },
        { status: 400 }
      )
    }
    
    // 사용자 존재 확인
    const user = await User.findById(userId)
    if (!user) {
      return NextResponse.json(
        { success: false, message: '존재하지 않는 사용자입니다.' },
        { status: 404 }
      )
    }
    
    // 조합 실행
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
