'use client'

import { useStore } from 'zustand'
import {
  createBattleStore,
  playCard,
  mulligan,
  pass,
  type BattleState,
  type BattleStore,
  type SocketLike,
} from '@rangu/battle-core'

// 한 탭 = 한 매치 세션. 모듈 싱글톤 스토어.
export const battleStore: BattleStore = createBattleStore()

/**
 * battleStore 구독 훅 — selector 로 필요한 슬라이스만 받아 리렌더 최소화.
 * (Zustand 는 내부적으로 useSyncExternalStore 기반 → 동시성 React 안전.)
 */
export function useBattle<T>(selector: (s: BattleState) => T): T {
  return useStore(battleStore, selector)
}

// ── 아웃바운드 ── useGameConnection 이 소켓을 바인딩하고, 컴포넌트는 do* 액션을 호출한다.
//    각 액션은 battle-core 가 낙관적 pending 등록 + ClientMessage 인코딩 + 전송을 담당.
let socket: SocketLike | null = null

export function bindSocket(ws: SocketLike | null): void {
  socket = ws
}
export function doPlayCard(cardInstanceId: string): void {
  if (socket) playCard(socket, battleStore, cardInstanceId)
}
export function doMulligan(replaceCardInstanceIds: string[] = []): void {
  if (socket) mulligan(socket, battleStore, replaceCardInstanceIds)
}
export function doPass(): void {
  if (socket) pass(socket, battleStore)
}
