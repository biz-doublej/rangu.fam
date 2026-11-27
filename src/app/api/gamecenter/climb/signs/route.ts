import { NextRequest, NextResponse } from 'next/server'
import { gamecenterErrorResponse, requireGamecenterUser } from '@/lib/gamecenter/auth'
import { writeClimbSign } from '@/lib/gamecenter/climbBoard'

export const dynamic = 'force-dynamic'

/** PUT /api/gamecenter/climb/signs { zone, text } — 표지판 남기기 (구역당 1개, 20자) */
export async function PUT(request: NextRequest) {
  try {
    const auth = await requireGamecenterUser(request)
    if (!auth.ok) return auth.response
    const body = await request.json().catch(() => null)
    const sign = await writeClimbSign({ userId: auth.user.id, zone: body?.zone, text: body?.text })
    return NextResponse.json({ success: true, sign: { zone: sign.zone, text: sign.text } })
  } catch (error) {
    return gamecenterErrorResponse(error, '표지판 저장')
  }
}
