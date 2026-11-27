import { NextRequest, NextResponse } from 'next/server'
import { gamecenterErrorResponse, requireGamecenterUser } from '@/lib/gamecenter/auth'
import { issueRtAccess } from '@/lib/gamecenter/rt'

export const dynamic = 'force-dynamic'

/** POST /api/gamecenter/rt-token — 실시간 서버 접속용 5분짜리 토큰과 서버 주소 */
export async function POST(request: NextRequest) {
  try {
    const auth = await requireGamecenterUser(request)
    if (!auth.ok) return auth.response
    const { user } = auth
    return NextResponse.json({
      success: true,
      userId: user.id,
      ...issueRtAccess({ id: user.id, name: user.displayName || user.username }),
    })
  } catch (error) {
    return gamecenterErrorResponse(error, '실시간 토큰 발급')
  }
}
