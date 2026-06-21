'use client'

import { useCallback, useState } from 'react'
import { applyAction, createBattle } from '@/lib/battle/engine'
import { chooseAction } from '@/lib/battle/bot'
import type { BattleAction, GameState, PlayerSlot } from '@/lib/battle/types'
import type { CardDef } from '@/lib/battle/stats'

export const HUMAN: PlayerSlot = 'p1'
export const AI: PlayerSlot = 'p2'

/** 게임이 끝나거나 우선권이 사람에게 돌아올 때까지 AI(p2)를 자동으로 둔다. */
function runAi(state: GameState): GameState {
  let s = state
  let guard = 0
  while (s.phase !== 'finished' && guard++ < 5000) {
    if (s.phase === 'mulligan') {
      if (s.players[AI].mulliganDone) break
      const r = applyAction(s, AI, { type: 'mulligan', replace: [] })
      if (!r.ok) break
      s = r.state
      continue
    }
    if (s.priority !== AI) break
    const r = applyAction(s, AI, chooseAction(s, AI))
    if (!r.ok) break
    s = r.state
  }
  return s
}

export function useBattle() {
  const [state, setState] = useState<GameState | null>(null)
  const [error, setError] = useState<string | null>(null)

  const start = useCallback((myDeck: CardDef[], oppDeck: CardDef[]) => {
    const seed = `${Date.now().toString(36)}-${Math.floor(Math.random() * 1e9).toString(36)}`
    let s = createBattle({ seed, p1: { userId: 'me', deck: myDeck }, p2: { userId: null, deck: oppDeck } })
    s = runAi(s) // AI 멀리건 선처리
    setState(s)
    setError(null)
  }, [])

  const act = useCallback((action: BattleAction) => {
    setError(null)
    setState((prev) => {
      if (!prev || prev.phase === 'finished') return prev
      const res = applyAction(prev, HUMAN, action)
      if (!res.ok) {
        setError(res.error || '허용되지 않는 행동입니다.')
        return prev
      }
      return runAi(res.state)
    })
  }, [])

  const reset = useCallback(() => {
    setState(null)
    setError(null)
  }, [])

  return { state, error, start, act, reset }
}
