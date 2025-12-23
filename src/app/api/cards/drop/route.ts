import { NextRequest, NextResponse } from 'next/server'
import { CardService } from '@/services/cardService'
import connectDB from '@/lib/mongodb'
export const dynamic = 'force-dynamic'

// POST: 일일 카드 드랍
export async function POST(request: NextRequest) {
  let userId: string | undefined
  
  try {
    await connectDB()
    
    const body = await request.json()
    userId = body.userId
    
    if (!userId) {
      return NextResponse.json(
        { success: false, message: '사용자 ID가 필요합니다.' },
        { status: 400 }
      )
    }
    
    
    // 카드 드랍 실행
    const result = await CardService.dailyCardDrop(userId)
    
    return NextResponse.json(result)
    
  } catch (error) {
    console.error('Card drop error:', error)
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : 'No stack trace',
      userId: userId || 'unknown'
    })
    return NextResponse.json(
      { 
        success: false, 
        message: '카드 드랍 중 오류가 발생했습니다.',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// GET: 남은 드랍 횟수 조회
export async function GET(request: NextRequest) {
  try {
    await connectDB()
    
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    
    if (!userId) {
      return NextResponse.json(
        { success: false, message: '사용자 ID가 필요합니다.' },
        { status: 400 }
      )
    }
    
    const remainingDrops = await CardService.getRemainingDrops(userId)
    
    return NextResponse.json({
      success: true,
      remainingDrops
    })
    
  } catch (error) {
    console.error('Remaining drops check error:', error)
    return NextResponse.json(
      { success: false, message: '드랍 횟수 조회 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
