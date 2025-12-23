import { NextRequest, NextResponse } from 'next/server'
import { UserCardStats } from '@/models/UserCardStats'
import { CardService } from '@/services/cardService'
import connectDB from '@/lib/mongodb'
export const dynamic = 'force-dynamic'

// GET: 사용자 카드 통계 조회
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
    
    const userObjectId = CardService.normalizeUserId(userId)
    
    // 사용자 통계 조회
    let userStats = await UserCardStats.findOne({ userId: userObjectId })
    
    if (!userStats) {
      // 통계가 없으면 초기 통계 생성
      userStats = new UserCardStats({
        userId: userObjectId,
        lastDropDate: new Date(),
        dailyDropsUsed: 0
      })
      await userStats.save()
    }
    
    // 오늘 날짜 체크하여 드랍 횟수 리셋 여부 확인
    const today = new Date()
    const lastDrop = new Date(userStats.lastDropDate)
    const isNewDay = today.toDateString() !== lastDrop.toDateString()
    
    if (isNewDay) {
      userStats.dailyDropsUsed = 0
      userStats.lastDropDate = today
      await userStats.save()
    }
    
    // 남은 드랍 횟수 계산
    const remainingDrops = Math.max(0, 5 - userStats.dailyDropsUsed)
    
    // 컬렉션 완성도 계산
    const collectionProgress = {
      totalProgress: 0,
      yearlyProgress: userStats.yearCardCompletion || [],
      overallCompletionRate: 0
    }
    
    if (userStats.yearCardCompletion && userStats.yearCardCompletion.length > 0) {
      const totalRate = userStats.yearCardCompletion.reduce((sum: number, year: any) => sum + year.completionRate, 0)
      collectionProgress.overallCompletionRate = totalRate / userStats.yearCardCompletion.length
    }
    
    return NextResponse.json({
      success: true,
      stats: {
        ...userStats.toObject(),
        remainingDrops,
        collectionProgress
      }
    })
    
  } catch (error) {
    console.error('Stats GET error:', error)
    return NextResponse.json(
      { success: false, message: '통계 조회 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
