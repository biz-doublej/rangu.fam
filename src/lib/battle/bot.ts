/**
 * 랑구 배틀 — 결정론 봇 (PvE/고스트 자동 플레이 + 시뮬 공용).
 *
 * 상태만 보고 합법 액션을 고르는 순수 함수. RNG 미사용 → 결정론.
 * 공격적(어그로) 휴리스틱: 가능하면 전부 공격, 합법 블록은 살아남/잡을 때만.
 */

import { OTHER, type BattleAction, type BattleUnit, type GameState, type PlayerSlot } from './types'

export function canBlockLocal(attacker: BattleUnit, blocker: BattleUnit): boolean {
  if (blocker.isStunned) return false
  if (attacker.keywords.includes('elusive') && !blocker.keywords.includes('elusive')) return false
  if (attacker.keywords.includes('fearsome') && blocker.power < 3) return false
  return true
}

function blockScore(blocker: BattleUnit, attacker: BattleUnit): number {
  const survives = blocker.health > attacker.power ? 1 : 0
  const kills = blocker.power >= attacker.health ? 2 : 0
  return survives + kills
}

export function chooseBlocks(s: GameState, slot: PlayerSlot): Record<string, string> {
  const def = s.players[slot]
  const atkSlot = s.activePlayer
  const blocks: Record<string, string> = {}
  const used = new Set<string>()

  const attackers = (s.combat?.attackers ?? [])
    .map((id) => s.players[atkSlot].board.find((u) => u.instanceId === id))
    .filter((u): u is BattleUnit => !!u)
    .sort((a, b) => b.power - a.power) // 큰 위협부터

  for (const a of attackers) {
    const forced = s.combat?.challenged[a.instanceId]
    if (forced && !used.has(forced)) {
      const fb = def.board.find((u) => u.instanceId === forced)
      if (fb && canBlockLocal(a, fb)) {
        blocks[a.instanceId] = forced
        used.add(forced)
        continue
      }
    }
    const candidates = def.board
      .filter((u) => !used.has(u.instanceId) && canBlockLocal(a, u))
      .sort((x, y) => blockScore(y, a) - blockScore(x, a))
    if (candidates.length === 0) continue
    // 살아남거나 잡을 수 있을 때만 블록 (의미없는 자살블록 회피 → 본진 피해 누수 유도)
    if (blockScore(candidates[0], a) === 0 && def.nexusHealth > a.power) continue
    blocks[a.instanceId] = candidates[0].instanceId
    used.add(candidates[0].instanceId)
  }
  return blocks
}

/** 멀리건은 호출측에서 별도 처리(전부 keep). 그 외 단계의 합법 액션 1개 반환. */
export function chooseAction(s: GameState, slot: PlayerSlot): BattleAction {
  const me = s.players[slot]

  if (s.phase === 'declareBlock' && s.combat && !s.combat.blocksDeclared && slot === OTHER[s.activePlayer]) {
    return { type: 'declareBlock', blocks: chooseBlocks(s, slot) }
  }

  if (s.phase === 'action') {
    if (me.hasAttackToken && !s.attackDeclaredThisRound && s.stack.length === 0) {
      const attackers = me.board
        .filter((u) => !u.hasAttacked && !u.isStunned && u.summonedRound < s.round && u.power > 0)
        .map((u) => u.instanceId)
      if (attackers.length > 0) return { type: 'declareAttack', attackers }
    }
    if (s.stack.length === 0 && me.board.length < 6) {
      const playable = me.hand
        .filter((c) => c.kind === 'unit' && !!c.unit && c.cost <= me.mana)
        .sort((a, b) => a.cost - b.cost)
      if (playable.length > 0) return { type: 'playUnit', instanceId: playable[0].instanceId }
    }
  }

  return { type: 'pass' }
}
