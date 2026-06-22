import { NextRequest, NextResponse } from 'next/server'
import { buildTacticsMetadata } from '@/lib/tactics/metadata'
import { getActiveTacticsDeck } from '@/lib/tactics/deckService'

export const dynamic = 'force-dynamic'

/**
 * 서버 간(C# 택틱스 게임서버) 전용 — 유저의 활성 덱을 카드 스탯과 함께 반환.
 *
 * 인증: X-Game-Server-Secret == env GAME_SERVER_SECRET (유저 세션 아님 — 게임서버가 호출).
 * 응답: { success, deck: null | [{ cardId, count, name, cardType, cost, attack, health, keywords, spellSpeed, effects }] }
 *   - deck=null → 활성 덱 없음 → 게임서버가 DemoDeck 폴백.
 *   - 카드 스탯은 buildTacticsMetadata(cardGameDefs + 파생 폴백)에서 — C# 이 BattleCard 를 자족적으로 빌드.
 */
export async function GET(request: NextRequest) {
  const secret = process.env.GAME_SERVER_SECRET
  const provided = request.headers.get('x-game-server-secret')
  if (!secret || provided !== secret) {
    return NextResponse.json({ success: false, error: 'unauthorized' }, { status: 401 })
  }

  const userId = request.nextUrl.searchParams.get('userId')
  if (!userId) {
    return NextResponse.json({ success: false, error: 'userId required' }, { status: 400 })
  }

  try {
    const active = await getActiveTacticsDeck(userId) // [{cardId,count}] | null
    if (!active || active.length === 0) {
      return NextResponse.json({ success: true, deck: null }) // 게임서버 DemoDeck 폴백
    }

    const doc = await buildTacticsMetadata()
    const byId = new Map(doc.cards.map((c) => [c.cardId, c]))
    const deck = active
      .map((e) => {
        const m = byId.get(e.cardId)
        if (!m) return null
        return {
          cardId: m.cardId,
          count: e.count,
          name: m.name,
          cardType: m.type, // 'unit' | 'spell' | 'champion' | 'landmark'
          cost: m.cost,
          attack: m.attack,
          health: m.health,
          keywords: m.keywords,
          spellSpeed: m.spellSpeed ?? null,
          effects: m.effects ?? [],
        }
      })
      .filter((x): x is NonNullable<typeof x> => x !== null)

    return NextResponse.json({ success: true, deck })
  } catch (error) {
    console.error('game/deck error:', error)
    return NextResponse.json({ success: false, error: 'deck load failed' }, { status: 500 })
  }
}
