import { NextRequest, NextResponse } from 'next/server'
import { battleErrorResponse, requireMember } from '@/lib/battle/apiHelpers'
import { applyUserAction } from '@/lib/battle/service'
import type { BattleAction } from '@/lib/battle/types'

export const dynamic = 'force-dynamic'

// ── POST: 액션 제출 (mulligan/playUnit/playSpell/declareAttack/declareBlock/pass) ─
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const auth = await requireMember(request)
    if ('error' in auth) return auth.error

    const body = await request.json().catch(() => ({}))
    const action = body?.action as BattleAction | undefined
    if (!action || typeof (action as { type?: unknown }).type !== 'string') {
      return NextResponse.json({ success: false, message: '액션(action)을 지정하세요.' }, { status: 400 })
    }

    const view = await applyUserAction(auth.userId, params.id, action)
    return NextResponse.json({ success: true, battleId: params.id, ...view })
  } catch (error) {
    return battleErrorResponse(error)
  }
}
