import { NextRequest, NextResponse } from 'next/server'
import { gamecenterErrorResponse, requireGamecenterUser } from '@/lib/gamecenter/auth'
import { checkIn } from '@/lib/gamecenter/checkin'

export const dynamic = 'force-dynamic'

/** POST /api/gamecenter/checkin — 하루 첫 접속 보상(KST), 연속 출석. 금액은 서버가 정한다. */
export async function POST(request: NextRequest) {
  try {
    const auth = await requireGamecenterUser(request)
    if (!auth.ok) return auth.response
    const result = await checkIn(auth.user.id)
    return NextResponse.json({ success: true, ...result })
  } catch (error) {
    return gamecenterErrorResponse(error, '출석')
  }
}
