import { NextRequest, NextResponse } from 'next/server'
import { gamecenterErrorResponse, requireGamecenterUser } from '@/lib/gamecenter/auth'
import { startClawPlay } from '@/lib/gamecenter/claw'

export const dynamic = 'force-dynamic'

/**
 * POST /api/gamecenter/claw/play — 20P 또는 무료권 차감 + 서버가 결과 추첨.
 * → { playId, outcome: { grabbed, slipAt?, plush } }. 요청 본문은 읽지 않는다.
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await requireGamecenterUser(request)
    if (!auth.ok) return auth.response
    const play = await startClawPlay({ userId: auth.user.id })
    return NextResponse.json({ success: true, ...play })
  } catch (error) {
    return gamecenterErrorResponse(error, '인형뽑기 시작')
  }
}
