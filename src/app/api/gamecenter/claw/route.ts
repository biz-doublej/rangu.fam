import { NextRequest, NextResponse } from 'next/server'
import { gamecenterErrorResponse, requireGamecenterUser } from '@/lib/gamecenter/auth'
import { getClawState } from '@/lib/gamecenter/claw'

export const dynamic = 'force-dynamic'

/** GET /api/gamecenter/claw — 잔액, 무료권, 도감, 확률, 정산하지 않은 판 */
export async function GET(request: NextRequest) {
  try {
    const auth = await requireGamecenterUser(request)
    if (!auth.ok) return auth.response
    return NextResponse.json({ success: true, ...(await getClawState(auth.user.id)) })
  } catch (error) {
    return gamecenterErrorResponse(error, '인형뽑기 상태 조회')
  }
}
