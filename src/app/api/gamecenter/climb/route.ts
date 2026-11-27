import { NextRequest, NextResponse } from 'next/server'
import { gamecenterErrorResponse, requireGamecenterUser } from '@/lib/gamecenter/auth'
import { getClimbBoard } from '@/lib/gamecenter/climbBoard'
import { settleLastWeekQuietly } from '@/lib/gamecenter/ranking'

export const dynamic = 'force-dynamic'

/** GET /api/gamecenter/climb — 친구 깃발, 표지판, 이번 주 가장 크게 떨어진 사람, 내 기록 */
export async function GET(request: NextRequest) {
  try {
    const auth = await requireGamecenterUser(request)
    if (!auth.ok) return auth.response
    await settleLastWeekQuietly()
    return NextResponse.json({ success: true, ...(await getClimbBoard(auth.user.id)) })
  } catch (error) {
    return gamecenterErrorResponse(error, '등반 정보 조회')
  }
}
