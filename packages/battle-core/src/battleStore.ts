import { createStore, type StoreApi } from 'zustand/vanilla'
import type { GameStateSnapshot, ServerMessage } from '@rangu/proto-ts'

type GameEvent = NonNullable<ServerMessage['event']>

export type IntentStatus = 'pending' | 'acked' | 'rejected'

/** 낙관적 UI 추적 단위 — clientIntentId 로 상관. */
export interface PendingIntent {
  intentId: string
  type: string
  status: IntentStatus
  detail?: string
  /** playCard 등 카드 단위 intent 의 대상 — UI 가 어느 카드를 pending 표시할지 결정. */
  cardInstanceId?: string
}

/**
 * 일시적 전투 연출 신호(애니메이션용) — 스냅샷(정본)과 분리된 ephemeral 큐.
 * 좌표(x/y)는 DOM 의존이라 여기 두지 않는다 → 컴포넌트가 instanceId 로 위치를 찾아 띄운다.
 */
export interface CombatFx {
  id: number
  kind: 'damage' | 'death' | 'nexus' | 'awaken'
  targetInstanceId?: string
  nexusSeat?: number
  amount?: number
  lethal?: boolean
  instanceIds?: string[]
  // awaken(챔피언 각성) 전용
  power?: number
  health?: number
  level?: number
}

/** 게임 종료 — 수신자(viewer) 관점 결과. gameOver 이벤트 드레인 결과. */
export interface GameOverState {
  result: 'win' | 'loss' | 'draw'
  reason?: string
}

/**
 * 전투 로그 1줄 — 텍스트가 아니라 구조화 데이터(카드명 렌더는 클라 메타데이터 몫).
 * append-only, capped. 액션 로그 UI 가 그대로 그린다.
 */
export interface BattleLogEntry {
  id: number
  kind: 'play' | 'summon' | 'attack' | 'block' | 'death' | 'nexus' | 'round' | 'awaken'
  /** 행위 주체 좌석(없으면 중립 이벤트) */
  seat?: number
  /** 카드 정의 id — 클라가 메타데이터에서 이름 조회 */
  definitionId?: string
  amount?: number
  count?: number
  round?: number
}

export interface BattleState {
  /** 서버가 보낸 정본 스냅샷(수신자 마스킹 적용). UI 의 단일 진실. */
  snapshot?: GameStateSnapshot
  /** 전송했지만 아직 확정/거부되지 않은 intent (낙관적 UI). */
  pendingIntents: Record<string, PendingIntent>
  /** 전투 연출 큐(append-only, capped). 애니메이션 레이어가 lastSeenId 로 드레인. 스냅샷과 분리. */
  combatFx: CombatFx[]
  /** 전투 로그(append-only, capped) — 액션 로그 UI 용 구조화 이벤트 기록. */
  logs: BattleLogEntry[]
  connected: boolean
  /** 게임 종료 결과(없으면 진행 중). gameOver 이벤트 수신 시 세팅. */
  gameOver?: GameOverState

  /** 수신 ServerMessage 를 받아 상태 갱신(리듀서). */
  apply: (msg: ServerMessage) => void
  /** intent 전송 시 호출 — 낙관적 pending 등록. */
  trackIntent: (intentId: string, type: string, cardInstanceId?: string) => void
  reset: () => void
}

export type BattleStore = StoreApi<BattleState>

const FX_CAP = 60
const LOG_CAP = 80
let fxSeq = 0
let logSeq = 0

export function createBattleStore(): BattleStore {
  return createStore<BattleState>((set) => ({
    snapshot: undefined,
    pendingIntents: {},
    combatFx: [],
    logs: [],
    connected: false,
    gameOver: undefined,

    trackIntent: (intentId, type, cardInstanceId) =>
      set((s) => ({
        pendingIntents: { ...s.pendingIntents, [intentId]: { intentId, type, status: 'pending', cardInstanceId } },
      })),

    reset: () =>
      set({ snapshot: undefined, pendingIntents: {}, combatFx: [], logs: [], connected: false, gameOver: undefined }),

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
      if (msg.event) {
        const ev = msg.event
        // 낙관적 reconciliation
        if (ev.intentAck) {
          set((s) => patchPending(s, ev.intentAck!.clientIntentId, 'acked'))
        } else if (ev.intentRejected) {
          set((s) => patchPending(s, ev.intentRejected!.clientIntentId, 'rejected', ev.intentRejected!.detail))
        } else if (ev.gameOver) {
          // 게임 종료 — proto Result(WIN=1/LOSS=2/DRAW=3) → viewer 관점 결과 슬라이스
          const r = ev.gameOver.viewerResult
          set({ gameOver: { result: r === 1 ? 'win' : r === 2 ? 'loss' : 'draw', reason: ev.gameOver.reason || undefined } })
        } else {
          // 전투/연출 이벤트 → ephemeral fx 큐(스냅샷 불변). 좌표는 컴포넌트가 부여.
          const fx = toCombatFx(ev)
          const log = toLogEntries(ev)
          if (fx.length || log.length)
            set((s) => ({
              combatFx: fx.length ? [...s.combatFx, ...fx].slice(-FX_CAP) : s.combatFx,
              logs: log.length ? [...s.logs, ...log].slice(-LOG_CAP) : s.logs,
            }))
        }
        return
      }
      // connectRejected / heartbeat 등은 상태 변화 없음
    },
  }))
}

/** 전투 이벤트 → ephemeral 연출 신호. 스냅샷은 건드리지 않는다. */
function toCombatFx(ev: GameEvent): CombatFx[] {
  const out: CombatFx[] = []
  if (ev.damageDealt) {
    for (const d of ev.damageDealt.instances) {
      out.push({
        id: ++fxSeq,
        kind: 'damage',
        targetInstanceId: d.target?.cardInstanceId || undefined,
        nexusSeat: d.target?.nexus?.seat,
        amount: d.amount,
        lethal: d.isLethal,
      })
    }
  }
  if (ev.unitDied) {
    out.push({ id: ++fxSeq, kind: 'death', instanceIds: ev.unitDied.instanceIds })
  }
  if (ev.nexusDamaged) {
    out.push({ id: ++fxSeq, kind: 'nexus', nexusSeat: ev.nexusDamaged.player?.seat, amount: ev.nexusDamaged.amount })
  }
  if (ev.championAwakened) {
    const a = ev.championAwakened
    out.push({
      id: ++fxSeq,
      kind: 'awaken',
      targetInstanceId: a.instanceId || undefined,
      power: a.newPower,
      health: a.newHealth,
      level: a.championLevel,
    })
  }
  return out
}

/** 전투 이벤트 → 로그 엔트리(구조화). 카드명 등 표시 문자열은 클라가 메타데이터로 렌더. */
function toLogEntries(ev: GameEvent): BattleLogEntry[] {
  const out: BattleLogEntry[] = []
  if (ev.cardPlayed) {
    out.push({
      id: ++logSeq,
      kind: 'play',
      seat: ev.cardPlayed.player?.seat,
      definitionId: ev.cardPlayed.card?.revealed?.definitionId || undefined,
    })
  }
  if (ev.unitSummoned) {
    out.push({
      id: ++logSeq,
      kind: 'summon',
      seat: ev.unitSummoned.player?.seat,
      definitionId: ev.unitSummoned.unit?.revealed?.definitionId || undefined,
    })
  }
  if (ev.attackDeclared) {
    out.push({
      id: ++logSeq,
      kind: 'attack',
      seat: ev.attackDeclared.attacker?.seat,
      count: ev.attackDeclared.attackerInstanceIds.length,
    })
  }
  if (ev.blockDeclared) {
    out.push({ id: ++logSeq, kind: 'block', seat: ev.blockDeclared.blocker?.seat, count: ev.blockDeclared.pairs.length })
  }
  if (ev.unitDied) {
    out.push({ id: ++logSeq, kind: 'death', count: ev.unitDied.instanceIds.length })
  }
  if (ev.nexusDamaged) {
    out.push({ id: ++logSeq, kind: 'nexus', seat: ev.nexusDamaged.player?.seat, amount: ev.nexusDamaged.amount })
  }
  if (ev.roundEnded) {
    out.push({ id: ++logSeq, kind: 'round', round: ev.roundEnded.roundNumber })
  }
  if (ev.championAwakened) {
    out.push({ id: ++logSeq, kind: 'awaken', amount: ev.championAwakened.championLevel })
  }
  return out
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
