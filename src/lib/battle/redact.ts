/**
 * 안개(fog-of-war) 직렬화 — 순수 함수 (DB/인증 비의존).
 *
 * 서비스 레이어와 분리해 둬서 서버 런타임 없이도(시뮬/테스트) 단독 검증이 가능하다.
 * 요청자(viewer) 시점에서 비공개 정보를 가린다:
 *   - 상대 손패/덱/소각 카드 식별자
 *   - 본인 덱 순서(개수만 공개)
 *   - 서버 전용 RNG/seed (덱 순서 역산 방지)
 */
import { OTHER, type GameState, type PlayerSlot } from './types'

export interface RedactedView {
  youAre: PlayerSlot
  state: GameState
  counts: Record<PlayerSlot, { hand: number; deck: number }>
}

const clone = <T>(x: T): T => JSON.parse(JSON.stringify(x)) as T

export function redactState(state: GameState, viewer: PlayerSlot): RedactedView {
  const opp = OTHER[viewer]
  const s = clone(state)
  const counts: Record<PlayerSlot, { hand: number; deck: number }> = {
    p1: { hand: state.players.p1.hand.length, deck: state.players.p1.deck.length },
    p2: { hand: state.players.p2.hand.length, deck: state.players.p2.deck.length },
  }
  s.players[opp].hand = []
  s.players[opp].deck = []
  s.players[opp].burned = [] // 상대 소각 카드 식별자 비공개
  s.players[viewer].deck = [] // 본인 덱 순서도 비공개(개수만)
  // 서버 전용 RNG/seed 는 절대 노출하지 않는다 (덱 순서 역산 방지)
  s.seed = ''
  s.rng = 0
  s.players.p1.rng = 0
  s.players.p2.rng = 0
  return { youAre: viewer, state: s, counts }
}
