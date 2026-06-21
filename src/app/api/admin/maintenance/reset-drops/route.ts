import { NextRequest, NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { getDb } from '@/db/client'
import { userCardStats } from '@/db/schema/cards'
import { checkAdminAuth } from '@/lib/adminAuth'

export const dynamic = 'force-dynamic'

/**
 * 일일 드랍 초기화 (관리자) — 전원(또는 특정 유저)의 오늘 사용량을 0 으로 리셋하고
 * 24h 윈도우를 now 로 갱신한다. 드랍 한도가 10회 고정이므로 호출 즉시 10회 풀충전된다.
 * 배포 직후 1회 호출용. (선물상자 보너스 드랍권은 별도라 그대로 위에 가산)
 *
 *   GET /api/admin/maintenance/reset-drops                     → dry-run
 *   GET /api/admin/maintenance/reset-drops?confirm=1           → 전원 즉시 풀충전
 *   GET /api/admin/maintenance/reset-drops?user=<id>&confirm=1 → 특정 유저만
 */
export async function GET(request: NextRequest) {
  try {
    const admin = await checkAdminAuth(request)
    if (!admin) {
      return NextResponse.json({ success: false, error: '관리자 권한이 필요합니다.' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('user') || null
    const confirm = searchParams.get('confirm') === '1'

    const db = getDb()

    if (!confirm) {
      return NextResponse.json({
        success: true,
        applied: false,
        message: `dry-run — ?confirm=1 을 붙이면 ${userId ? '해당 유저' : '전원'}의 오늘 드랍을 0 으로 리셋해 즉시 10회 풀충전합니다.`,
        scope: userId ? `user=${userId}` : '전원',
      })
    }

    const now = new Date()
    const setValues = { dailyDropsUsed: 0, lastDropDate: now, updatedAt: now }

    const updated = userId
      ? await db
          .update(userCardStats)
          .set(setValues)
          .where(eq(userCardStats.userId, userId))
          .returning({ userId: userCardStats.userId })
      : await db.update(userCardStats).set(setValues).returning({ userId: userCardStats.userId })

    return NextResponse.json({
      success: true,
      applied: true,
      message: `${updated.length}명의 오늘 드랍을 초기화했습니다. 지금 바로 10회 가능합니다. (선물상자 보너스권은 별도 가산)`,
      affected: updated.length,
      appliedBy: admin.username,
    })
  } catch (error) {
    console.error('reset-drops 오류:', error)
    return NextResponse.json(
      { success: false, error: '드랍 초기화 중 오류가 발생했습니다.', detail: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}
