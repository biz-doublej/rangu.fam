import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * 랑구 택틱스 — 라이브 데모 전용 정적 카드 메타데이터.
 * DB 없이 .NET 게임서버 부팅을 가능케 하는 임시 픽스처(개발 데모용).
 * 실제 메타데이터는 /api/game/metadata/export (buildTacticsMetadata, DB).
 */
export async function GET() {
  return NextResponse.json({
    schemaVersion: 1,
    contentVersion: 'demo-live-20260622',
    generatedAt: '2026-06-22T00:00:00.000Z',
    cardCount: 4,
    keywords: ['Overwhelm', 'Lifesteal', 'QuickAttack', 'Tough'],
    cards: [
      { cardId: 'demo_0', name: '데모 유닛 0', faction: 'rangu', type: 'unit', rarity: 'common', cost: 1, attack: 1, health: 2, keywords: [], spellSpeed: null, effects: [], champion: null, imageUrl: null, derived: false },
      { cardId: 'demo_1', name: '데모 유닛 1', faction: 'rangu', type: 'unit', rarity: 'common', cost: 1, attack: 2, health: 3, keywords: [], spellSpeed: null, effects: [], champion: null, imageUrl: null, derived: false },
      { cardId: 'demo_2', name: '데모 유닛 2', faction: 'rangu', type: 'unit', rarity: 'common', cost: 1, attack: 3, health: 2, keywords: [], spellSpeed: null, effects: [], champion: null, imageUrl: null, derived: false },
      { cardId: 'demo_3', name: '데모 유닛 3', faction: 'rangu', type: 'unit', rarity: 'common', cost: 1, attack: 1, health: 3, keywords: [], spellSpeed: null, effects: [], champion: null, imageUrl: null, derived: false },
    ],
  })
}
