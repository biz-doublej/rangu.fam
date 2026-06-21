import { NextRequest, NextResponse } from 'next/server'
import { battleErrorResponse, requireMember } from '@/lib/battle/apiHelpers'
import { createBattleForUser, listBattlesForUser, type DeckEntry } from '@/lib/battle/service'

export const dynamic = 'force-dynamic'

// ── POST: 전투 생성 (mode: 'pve' | 'pvp') ─────────────────────
export async function POST(request: NextRequest) {
  try {
    const auth = await requireMember(request)
    if ('error' in auth) return auth.error

    const body = await request.json().catch(() => ({}))
    const mode = body?.mode === 'pvp' ? 'pvp' : 'pve'
    const deck = body?.deck as DeckEntry[] | undefined
    if (!Array.isArray(deck)) {
      return NextResponse.json({ success: false, message: '덱(deck)을 지정하세요.' }, { status: 400 })
    }
    const opponentId = typeof body?.opponentId === 'string' ? body.opponentId : undefined

    const { id, view } = await createBattleForUser(auth.userId, { mode, deck, opponentId })
    return NextResponse.json({ success: true, battleId: id, ...view })
  } catch (error) {
    return battleErrorResponse(error)
  }
}

// ── GET: 내 전투 목록 ─────────────────────────────────────────
export async function GET(request: NextRequest) {
  try {
    const auth = await requireMember(request)
    if ('error' in auth) return auth.error
    const battles = await listBattlesForUser(auth.userId)
    return NextResponse.json({ success: true, battles })
  } catch (error) {
    return battleErrorResponse(error)
  }
}
