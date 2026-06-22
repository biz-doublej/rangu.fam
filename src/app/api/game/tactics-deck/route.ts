import { NextRequest, NextResponse } from 'next/server'
import { requireMember } from '@/lib/battle/apiHelpers'
import {
  DeckError,
  isMissingTacticsDeckTable,
  listTacticsDecks,
  saveTacticsDeck,
  type DeckCard,
} from '@/lib/tactics/deckService'

export const dynamic = 'force-dynamic'

function errorResponse(error: unknown): NextResponse {
  if (error instanceof DeckError) {
    return NextResponse.json({ success: false, message: error.message }, { status: error.status })
  }
  if (isMissingTacticsDeckTable(error)) {
    return NextResponse.json(
      { success: false, needsMigration: true, message: '덱 빌더가 아직 활성화되지 않았습니다(테이블 미생성).' },
      { status: 503 },
    )
  }
  console.error('tactics-deck route error:', error)
  return NextResponse.json({ success: false, message: '덱 처리 중 오류가 발생했습니다.' }, { status: 500 })
}

// ── GET: 내 택틱스 덱 목록 (활성 포함) ──────────────────────────
export async function GET(request: NextRequest) {
  try {
    const auth = await requireMember(request)
    if ('error' in auth) return auth.error
    const decks = await listTacticsDecks(auth.userId)
    return NextResponse.json({ success: true, decks, active: decks.find((d) => d.isActive) ?? null })
  } catch (error) {
    return errorResponse(error)
  }
}

// ── POST: 덱 저장/수정 (검증 후) ──────────────────────────────
export async function POST(request: NextRequest) {
  try {
    const auth = await requireMember(request)
    if ('error' in auth) return auth.error

    const body = await request.json().catch(() => ({}))
    const cards = body?.cards as DeckCard[] | undefined
    if (!Array.isArray(cards)) {
      return NextResponse.json({ success: false, message: 'cards(덱 구성)를 지정하세요.' }, { status: 400 })
    }
    const deckId = await saveTacticsDeck(auth.userId, {
      id: typeof body?.id === 'string' ? body.id : undefined,
      name: typeof body?.name === 'string' ? body.name : '내 덱',
      cards,
      setActive: !!body?.setActive,
    })
    return NextResponse.json({ success: true, deckId })
  } catch (error) {
    return errorResponse(error)
  }
}
