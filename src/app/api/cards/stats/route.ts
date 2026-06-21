import { NextRequest, NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { getDb } from '@/db/client'
import { userCardStats } from '@/db/schema/cards'
import { normalizeUserIdToUuid } from '@/lib/cardHelpers'

export const dynamic = 'force-dynamic'

const DROP_WINDOW_MS = 24 * 60 * 60 * 1000
const MAX_DROPS_PER_WINDOW = 10

// GET: 사용자 카드 통계 조회
export async function GET(request: NextRequest) {
  try {
    const db = getDb()

    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json(
        { success: false, message: '사용자 ID가 필요합니다.' },
        { status: 400 }
      )
    }

    const userUuid = normalizeUserIdToUuid(userId)

    let [stats] = await db
      .select()
      .from(userCardStats)
      .where(eq(userCardStats.userId, userUuid))
      .limit(1)

    if (!stats) {
      const [created] = await db
        .insert(userCardStats)
        .values({
          userId: userUuid,
          lastDropDate: new Date(),
          dailyDropsUsed: 0,
        })
        .returning()
      stats = created
    }

    // 24시간 경과 시 드랍 윈도우 자동 리셋
    const now = new Date()
    const lastDrop = new Date(stats.lastDropDate)
    const elapsedMs = now.getTime() - lastDrop.getTime()
    const shouldResetWindow =
      Number.isNaN(lastDrop.getTime()) || elapsedMs >= DROP_WINDOW_MS || elapsedMs < 0

    if (shouldResetWindow) {
      const [updated] = await db
        .update(userCardStats)
        .set({ dailyDropsUsed: 0, lastDropDate: now, updatedAt: now })
        .where(eq(userCardStats.userId, userUuid))
        .returning()
      stats = updated
    }

    const remainingDrops = Math.max(0, MAX_DROPS_PER_WINDOW - (stats.dailyDropsUsed || 0))

    const yearProgress = (stats.yearCardCompletion || []) as Array<{
      year: number
      totalCards: number
      ownedCards: number
      completionRate: number
    }>
    const overallCompletionRate =
      yearProgress.length > 0
        ? yearProgress.reduce((sum, y) => sum + (y.completionRate || 0), 0) / yearProgress.length
        : 0

    return NextResponse.json({
      success: true,
      stats: {
        ...stats,
        remainingDrops,
        collectionProgress: {
          totalProgress: 0,
          yearlyProgress: yearProgress,
          overallCompletionRate,
        },
      },
    })
  } catch (error) {
    console.error('Stats GET error:', error)
    return NextResponse.json(
      { success: false, message: '통계 조회 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
