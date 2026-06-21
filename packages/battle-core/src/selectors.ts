import { Zone, type CardView, type GameStateSnapshot } from '@rangu/proto-ts'

/**
 * 스냅샷 → UI 뷰모델. proto 타입을 UI 에서 직접 다루지 않게 격리하고,
 * 마스킹(상대 손패 = hidden)을 faceDown 으로 평탄화한다.
 */
export interface CardVM {
  instanceId: string
  faceDown: boolean // 상대 손패 등 비공개 → 카드 뒷면
  definitionId?: string // 공개 시: 메타데이터 조회 키
  cost?: number
  power?: number
  health?: number
  damage?: number
  exhausted?: boolean
  keywords: number[] // proto Keyword enum 값
}

export interface SideVM {
  seat: number
  nexusHealth: number
  mana: number
  manaMax: number
  spellMana: number
  handCount: number
  deckCount: number
  hasAttackToken: boolean
  board: CardVM[]
}

export interface BattleVM {
  phase: number
  round: number
  priorityIsMine: boolean
  me: SideVM
  opponent: SideVM
  myHand: CardVM[]
  /** 상대 손패 — 마스킹되어 전부 faceDown(뒷면). 장수만큼 카드백 렌더용. */
  opponentHand: CardVM[]
  stackCount: number
}

export function toCardVM(c: CardView): CardVM {
  if (c.revealed) {
    const r = c.revealed
    return {
      instanceId: c.instanceId,
      faceDown: false,
      definitionId: r.definitionId,
      cost: r.currentCost,
      power: r.currentPower,
      health: r.currentHealth,
      damage: r.damage,
      exhausted: r.isExhausted,
      keywords: r.keywords ?? [],
    }
  }
  return { instanceId: c.instanceId, faceDown: true, keywords: [] }
}

function side(snapshot: GameStateSnapshot, seat: number): SideVM {
  const p = snapshot.players.find((pl) => pl.player?.seat === seat)
  const board = snapshot.cards
    .filter((c) => c.controller?.seat === seat && c.zone === Zone.ZONE_BATTLEFIELD)
    .map(toCardVM)
  return {
    seat,
    nexusHealth: p?.nexusHealth ?? 0,
    mana: p?.mana ?? 0,
    manaMax: p?.manaMax ?? 0,
    spellMana: p?.spellMana ?? 0,
    handCount: p?.handCount ?? 0,
    deckCount: p?.deckCount ?? 0,
    hasAttackToken: p?.hasAttackToken ?? false,
    board,
  }
}

/** 수신자(mySeat) 관점의 전장 뷰모델. snapshot 없으면 null. */
export function selectBattle(snapshot: GameStateSnapshot | undefined, mySeat: number): BattleVM | null {
  if (!snapshot) return null
  const oppSeat = mySeat === 0 ? 1 : 0
  return {
    phase: snapshot.phase,
    round: snapshot.roundNumber,
    priorityIsMine: snapshot.priorityPlayer?.seat === mySeat,
    me: side(snapshot, mySeat),
    opponent: side(snapshot, oppSeat),
    myHand: snapshot.cards
      .filter((c) => c.controller?.seat === mySeat && c.zone === Zone.ZONE_HAND)
      .map(toCardVM),
    opponentHand: snapshot.cards
      .filter((c) => c.controller?.seat === oppSeat && c.zone === Zone.ZONE_HAND)
      .map(toCardVM),
    stackCount: snapshot.stack.length,
  }
}
