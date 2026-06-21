import { NextRequest, NextResponse } from 'next/server'
import { battleErrorResponse, requireMember } from '@/lib/battle/apiHelpers'
import { listDecks, saveDeck, type DeckEntry } from '@/lib/battle/service'

export const dynamic = 'force-dynamic'

// ── GET: 내 저장 덱 목록 ──────────────────────────────────────
export async function GET(request: NextRequest) {
  try {
    const auth = await requireMember(request)
    if ('error' in auth) return auth.error
    const decks = await listDecks(auth.userId)
    return NextResponse.json({ success: true, decks })
  } catch (error) {
    return battleErrorResponse(error)
  }
}

// ── POST: 덱 저장/수정 ────────────────────────────────────────
export async function POST(request: NextRequest) {
  try {
    const auth = await requireMember(request)
    if ('error' in auth) return auth.error

    const body = await request.json().catch(() => ({}))
    const cards = body?.cards as DeckEntry[] | undefined
    if (!Array.isArray(cards)) {
      return NextResponse.json({ success: false, message: 'cards(덱 구성)를 지정하세요.' }, { status: 400 })
    }
    const id = await saveDeck(auth.userId, {
      id: typeof body?.id === 'string' ? body.id : undefined,
      name: typeof body?.name === 'string' ? body.name : '내 덱',
      cards,
      setActive: !!body?.setActive,
    })
    return NextResponse.json({ success: true, deckId: id })
  } catch (error) {
    return battleErrorResponse(error)
  }
}
