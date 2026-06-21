/**
 * 랑구 배틀 — 엔진 상태/액션 타입 (레전드 오브 룬테라 스타일, 풀 반응형).
 *
 * 모든 전투는 서버 권위(server-authoritative) + 결정론(seed 기반)으로 진행한다.
 * 같은 (초기 덱, seed, 액션 시퀀스) → 항상 같은 결과 → 리플레이/검증 가능.
 *
 * 이 파일은 순수 타입만 — 런타임 의존성 없음(DB 스키마가 jsonb $type 으로 참조).
 */

export type PlayerSlot = 'p1' | 'p2'

export const OTHER: Record<PlayerSlot, PlayerSlot> = { p1: 'p2', p2: 'p1' }

/** 유닛 키워드 — 엔진이 실제로 해석하는 것만. (한글 표시명은 UI에서 매핑) */
export type Keyword =
  | 'overwhelm' //   일격: 막은 유닛을 죽이고 남은 피해는 본진 관통
  | 'elusive' //     잠행: 잠행 유닛으로만 블록 가능
  | 'quickAttack' // 속공: 전투 시 먼저 타격 (상대가 먼저 죽으면 반격 안 받음)
  | 'lifesteal' //   흡혈: 가한 피해만큼 자기 본진 회복
  | 'tough' //       끈질김: 받는 피해 -1 (최소 0)
  | 'barrier' //     보호막: 다음 피해 1회 무효 (전투 후 소멸)
  | 'fearsome' //    위압: 파워 3 이상 유닛으로만 블록 가능
  | 'challenger' //  도발: 공격 시 막을 적 유닛 1기를 지정해 끌어낼 수 있음
  | 'regeneration' // 재생: 라운드 종료 시 체력 전부 회복

export type SpellSpeed = 'burst' | 'fast' | 'slow'

/** 주문 효과 서술자 — 엔진의 effect resolver 가 해석 */
export interface SpellEffect {
  kind:
    | 'buffUnit' // 단일 유닛 파워/체력 증감
    | 'buffTeam' // 아군 전체 파워/체력 증감
    | 'damageUnit' // 적 유닛에 피해
    | 'healNexus' // 본진 회복
    | 'damageNexus' // 적 본진 피해
    | 'grantKeyword' // 키워드 부여
    | 'stun' // 1라운드 행동 봉인
    | 'draw' // 카드 드로우
  amount?: number // 파워 증감 (buffUnit/buffTeam) 또는 피해/회복량
  health?: number // 체력 증감 (buffUnit/buffTeam)
  keyword?: Keyword
  /** duration: null = 영구, number = 본인 턴 기준 남은 라운드 수 */
  duration?: number | null
}

export type TargetRef =
  | { type: 'unit'; instanceId: string }
  | { type: 'nexus'; slot: PlayerSlot }

/** 손패/덱에 있는 카드 (유닛 또는 주문) */
export interface BattleCard {
  instanceId: string
  cardId: string
  owner: PlayerSlot
  name: string
  member?: string | null // 표시용(진영 색) — 엔진 로직엔 영향 없음
  cost: number
  kind: 'unit' | 'spell'
  /** kind === 'unit' 일 때 */
  unit?: {
    power: number
    health: number
    keywords: Keyword[]
    isChampion: boolean
  }
  /** kind === 'spell' 일 때 */
  spell?: {
    speed: SpellSpeed
    effect: SpellEffect
    needsTarget: boolean
  }
}

/** 일시 효과(버프/디버프) — 라운드 경과로 만료 */
export interface StatBuff {
  power?: number
  health?: number
  keywordsAdded?: Keyword[]
  /** null = 영구 */
  duration: number | null
  source: string
}

/** 보드 위의 유닛 인스턴스 */
export interface BattleUnit {
  instanceId: string
  cardId: string
  owner: PlayerSlot
  name: string
  member?: string | null // 표시용(진영 색)
  power: number // 버프 포함 현재 파워
  basePower: number
  health: number // 현재 체력
  maxHealth: number // 버프 포함 현재 최대 체력
  baseMaxHealth: number // 카드 고유 최대 체력 (체력 버프 만료 시 복원 기준)
  keywords: Keyword[] // 버프 포함 현재 키워드
  baseKeywords: Keyword[] // 카드 고유 키워드 (버프 만료 시 복원 기준)
  cost: number
  // 챔피언(프레스티지)
  isChampion: boolean
  championLevel: 1 | 2
  championProgress: number
  // 상태
  summonedRound: number
  hasAttacked: boolean
  isStunned: boolean
  hasBarrier: boolean
  buffs: StatBuff[]
}

/** 스택에 올라간 주문/능력 (반응형 — 우선권 양보 후 해결) */
export interface StackItem {
  id: string
  source: PlayerSlot
  card: BattleCard
  effect: SpellEffect
  speed: SpellSpeed
  targets: TargetRef[]
}

export type BattlePhase =
  | 'mulligan' // 양쪽 멀리건 제출 대기
  | 'action' // 메인 액션 윈도우 — 우선권 핑퐁
  | 'declareBlock' // 공격 선언됨 → 수비자 블록 배정 + 전투 반응 윈도우
  | 'finished'

export interface CombatState {
  /** 공격 유닛 instanceId (선언 순서) */
  attackers: string[]
  /** attackerInstanceId -> blockerInstanceId */
  blocks: Record<string, string>
  /** challenger 가 끌어낸 강제 블록: attackerInstanceId -> 강제로 끌려온 blockerInstanceId */
  challenged: Record<string, string>
  /** 블록 배정이 끝나 전투 반응 윈도우에 진입했는지 */
  blocksDeclared: boolean
}

export interface PlayerState {
  slot: PlayerSlot
  userId: string | null // null = AI/고스트
  rng: number // 플레이어 전용 RNG (셔플/멀리건 — 상대 행동·제출순서와 독립)
  nexusHealth: number // 20 → 0
  mana: number // 현재 사용 가능 오버 마나
  maxMana: number // 라운드마다 +1 (최대 10)
  spellMana: number // 적립 마나 (≤3, 주문 전용)
  deck: BattleCard[] // 드로우 더미 (seed 셔플 순서)
  hand: BattleCard[]
  board: BattleUnit[]
  graveyard: string[] // 사망 유닛 cardId (공개 정보)
  burned: string[] // 핸드 상한 초과 소각 카드 (비공개 — redact 시 상대에겐 가림)
  fatigueCount: number // 덱 소진 후 누적 피로 피해 카운터
  hasAttackToken: boolean
  hasPassed: boolean
  mulliganDone: boolean
}

export interface GameEvent {
  round: number
  phase: BattlePhase
  actor: PlayerSlot | 'system'
  type: string
  detail?: Record<string, unknown>
}

export interface GameState {
  version: number
  seed: string
  rng: number // 결정론 RNG 현재 상태 (mutate)
  round: number
  phase: BattlePhase
  activePlayer: PlayerSlot // 이번 라운드 공격 토큰 보유자
  priority: PlayerSlot // 지금 행동/대응할 차례
  attackDeclaredThisRound: boolean // 토큰 보유자는 라운드당 공격 1회만 선언 가능
  passStreak: number // 연속 패스 (2 = 양쪽 패스 → 스택 해결 또는 라운드 진행)
  players: Record<PlayerSlot, PlayerState>
  stack: StackItem[]
  combat: CombatState | null
  winner: PlayerSlot | null
  log: GameEvent[]
}

/** 플레이어 입력 액션 */
export type BattleAction =
  | { type: 'mulligan'; replace: string[] } // 교체할 instanceId 목록
  | { type: 'playUnit'; instanceId: string }
  | { type: 'playSpell'; instanceId: string; targets?: TargetRef[] }
  | {
      type: 'declareAttack'
      attackers: string[]
      /** challenger 유닛이 끌어낼 대상: attackerInstanceId -> enemyUnitInstanceId */
      challenges?: Record<string, string>
    }
  | { type: 'declareBlock'; blocks: Record<string, string> }
  | { type: 'pass' }

export interface ActionResult {
  ok: boolean
  state: GameState
  error?: string
}
