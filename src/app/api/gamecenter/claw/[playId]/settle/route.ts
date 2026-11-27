import { NextRequest, NextResponse } from 'next/server'
import { gamecenterErrorResponse, requireGamecenterUser } from '@/lib/gamecenter/auth'
import { settleClawPlay } from '@/lib/gamecenter/claw'

export const dynamic = 'force-dynamic'

/** POST /api/gamecenter/claw/[playId]/settle — 연출 끝, 인형·보상 확정. 같은 판은 한 번만 정산된다. */
export async function POST(request: NextRequest, { params }: { params: { playId: string } }) {
  try {
    const auth = await requireGamecenterUser(request)
    if (!auth.ok) return auth.response
    const result = await settleClawPlay({ userId: auth.user.id, playId: params.playId })
    return NextResponse.json({ success: true, ...result })
  } catch (error) {
    return gamecenterErrorResponse(error, '인형뽑기 정산')
  }
}
