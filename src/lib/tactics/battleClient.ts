'use client'

import { useStore } from 'zustand'
import { createBattleStore, type BattleState, type BattleStore } from '@rangu/battle-core'

// 한 탭 = 한 매치 세션. 모듈 싱글톤 스토어.
export const battleStore: BattleStore = createBattleStore()

/**
 * battleStore 구독 훅 — selector 로 필요한 슬라이스만 받아 리렌더 최소화.
 * (Zustand 는 내부적으로 useSyncExternalStore 기반 → 동시성 React 안전.)
 */
export function useBattle<T>(selector: (s: BattleState) => T): T {
  return useStore(battleStore, selector)
}
