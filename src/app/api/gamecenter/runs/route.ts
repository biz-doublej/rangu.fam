import { NextRequest, NextResponse } from 'next/server'
import { gamecenterErrorResponse, requireGamecenterUser } from '@/lib/gamecenter/auth'
import { isArcadeGame, startRun } from '@/lib/gamecenter/runs'

export const dynamic = 'force-dynamic'

/** POST /api/gamecenter/runs { game } → { runId, seed } — 아케이드 판 시작 */
export async function POST(request: NextRequest) {
  try {
    const auth = await requireGamecenterUser(request)
    if (!auth.ok) return auth.response
    const body = await request.json().catch(() => null)
    if (!isArcadeGame(body?.game)) {
      return NextResponse.json({ success: false, error: '게임을 골라 주세요.' }, { status: 400 })
    }
    return NextResponse.json({ success: true, ...(await startRun({ userId: auth.user.id, game: body.game })) })
  } catch (error) {
    return gamecenterErrorResponse(error, '판 시작')
  }
}
