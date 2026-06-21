import { NextRequest, NextResponse } from 'next/server'
import { battleErrorResponse, requireMember } from '@/lib/battle/apiHelpers'
import { getBattleView } from '@/lib/battle/service'

export const dynamic = 'force-dynamic'

// ── GET: 전투 상태 폴링 (요청자 시점 — 상대 손패는 가려짐) ────
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const auth = await requireMember(request)
    if ('error' in auth) return auth.error
    const view = await getBattleView(auth.userId, params.id)
    return NextResponse.json({ success: true, battleId: params.id, ...view })
  } catch (error) {
    return battleErrorResponse(error)
  }
}
