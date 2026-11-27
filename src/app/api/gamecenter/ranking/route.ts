import { NextRequest, NextResponse } from 'next/server'
import { gamecenterErrorResponse, requireGamecenterUser } from '@/lib/gamecenter/auth'
import { getRanking, settleLastWeekQuietly } from '@/lib/gamecenter/ranking'
import { isArcadeGame } from '@/lib/gamecenter/runs'

export const dynamic = 'force-dynamic'

/** GET /api/gamecenter/ranking?game=tetris|climb&period=week|all */
export async function GET(request: NextRequest) {
  try {
    const auth = await requireGamecenterUser(request)
    if (!auth.ok) return auth.response
    const { searchParams } = new URL(request.url)
    const game = searchParams.get('game') || 'tetris'
    if (!isArcadeGame(game)) {
      return NextResponse.json({ success: false, error: '랭킹이 없는 게임입니다.' }, { status: 400 })
    }
    // 월요일 이후 첫 요청 때 지난주 정산
    await settleLastWeekQuietly()
    const period = searchParams.get('period') === 'all' ? 'all' : 'week'
    return NextResponse.json({ success: true, ...(await getRanking({ game, period, userId: auth.user.id })) })
  } catch (error) {
    return gamecenterErrorResponse(error, '랭킹 조회')
  }
}
