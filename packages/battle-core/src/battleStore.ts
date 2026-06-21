import { createStore, type StoreApi } from 'zustand/vanilla'
import type { GameStateSnapshot, ServerMessage } from '@rangu/proto-ts'

export type IntentStatus = 'pending' | 'acked' | 'rejected'

/** 낙관적 UI 추적 단위 — clientIntentId 로 상관. */
export interface PendingIntent {
  intentId: string
  type: string
  status: IntentStatus
  detail?: string
}

export interface BattleState {
  /** 서버가 보낸 정본 스냅샷(수신자 마스킹 적용). UI 의 단일 진실. */
  snapshot?: GameStateSnapshot
  /** 전송했지만 아직 확정/거부되지 않은 intent (낙관적 UI). */
  pendingIntents: Record<string, PendingIntent>
  connected: boolean

  /** 수신 ServerMessage 를 받아 상태 갱신(리듀서). */
  apply: (msg: ServerMessage) => void
  /** intent 전송 시 호출 — 낙관적 pending 등록. */
  trackIntent: (intentId: string, type: string) => void
  reset: () => void
}

export type BattleStore = StoreApi<BattleState>

export function createBattleStore(): BattleStore {
  return createStore<BattleState>((set) => ({
    snapshot: undefined,
    pendingIntents: {},
    connected: false,

    trackIntent: (intentId, type) =>
      set((s) => ({ pendingIntents: { ...s.pendingIntents, [intentId]: { intentId, type, status: 'pending' } } })),

    reset: () => set({ snapshot: undefined, pendingIntents: {}, connected: false }),

    apply: (msg) => {
      // 연결 수락 — 즉시 현재 스냅샷으로 복구(재접속 포함)
      if (msg.connectAccepted?.snapshot) {
        set({ snapshot: msg.connectAccepted.snapshot, connected: true })
        return
      }
      // V1 상태 동기화: 매 액션 후 전체 마스킹 스냅샷 교체(정합성 100%)
      if (msg.snapshot) {
        set({ snapshot: msg.snapshot })
        return
      }
      // 이벤트 — 낙관적 reconciliation (IntentAck/Rejected). 그 외 이벤트는 step3 애니메이션 큐로.
      if (msg.event) {
        const ev = msg.event
        if (ev.intentAck) set((s) => patchPending(s, ev.intentAck!.clientIntentId, 'acked'))
        else if (ev.intentRejected)
          set((s) => patchPending(s, ev.intentRejected!.clientIntentId, 'rejected', ev.intentRejected!.detail))
        return
      }
      // connectRejected / heartbeat 등은 상태 변화 없음
    },
  }))
}

function patchPending(
  s: BattleState,
  intentId: string,
  status: IntentStatus,
  detail?: string,
): Partial<BattleState> {
  const prev = s.pendingIntents[intentId]
  if (!prev) return {}
  return { pendingIntents: { ...s.pendingIntents, [intentId]: { ...prev, status, detail } } }
}
