/**
 * 랑구 택틱스 — Data-Driven 카드 정의/효과 타입 (DB · Next · Unity · .NET 공유 계약).
 *
 * 키워드/주문속도는 기존 배틀 엔진(src/lib/battle/types)과 단일 출처를 공유한다
 * → 웹 PvE 엔진과 데스크톱 택틱스 서버가 같은 카드 데이터를 소비.
 */
import type { Keyword, SpellSpeed } from '@/lib/battle/types'

export type { Keyword, SpellSpeed }

export type TacticsCardType = 'champion' | 'unit' | 'spell' | 'landmark'

/** 효과가 "언제" 발동되는가 — 유닛 트리거 능력 + 주문을 한 모델로. */
export type EffectTrigger =
  | 'cast'       // 주문 시전 시
  | 'summon'     // 유닛 소환(플레이) 시
  | 'attack'     // 공격 선언 시
  | 'strike'     // 전투 타격 시
  | 'death'      // 사망 시
  | 'roundStart' // 라운드 시작 시
  | 'roundEnd'   // 라운드 종료 시

/** 효과 타깃 선택 규칙 (없으면 무타깃/자동). */
export interface EffectTarget {
  select:
    | 'none'
    | 'self'
    | 'chooseAllyUnit'
    | 'chooseEnemyUnit'
    | 'chooseAnyUnit'
    | 'allAllies'
    | 'allEnemies'
  count?: number
}

/**
 * ★ 효과 = 파라미터 포함 객체 (단순 enum 이 아님).
 * 엔진의 effect resolver 가 `kind` 로 분기해 해석한다.
 * (기존 battle/types 의 SpellEffect 를 일반화: trigger + target 추가, kind 확장)
 *
 * 새 "파라미터 조합"은 코드 변경 없이 데이터만으로 추가 가능.
 * 새 `kind` 추가 시에만 양쪽 엔진(resolver)에 코드가 필요.
 */
export interface CardEffect {
  trigger: EffectTrigger
  kind:
    | 'buffUnit'
    | 'buffTeam'
    | 'damageUnit'
    | 'damageNexus'
    | 'healNexus'
    | 'grantKeyword'
    | 'stun'
    | 'draw'
    | 'summonToken'
  amount?: number          // 파워 증감 / 피해 / 회복 / 드로우 수
  health?: number          // 체력 증감
  keyword?: Keyword        // grantKeyword 전용
  duration?: number | null // null = 영구, number = 라운드 수
  target?: EffectTarget
  token?: { cardId: string; count: number } // summonToken 전용
}

/** 챔피언 승격(레벨업) 정의. */
export interface ChampionSpec {
  levelUpCondition: string   // 엔진이 아는 조건 키 (예: 'you_have_attacked_3_times')
  attack?: number            // 승격 후 스탯(있으면 덮어씀)
  health?: number
  addKeywords?: Keyword[]
  addEffects?: CardEffect[]
}

/** export 문서의 카드 1장 (Unity/.NET 공통 소비 형태). */
export interface TacticsCardMeta {
  cardId: string
  name: string
  faction: string            // 진영 = 멤버 (cards.member 어휘)
  type: TacticsCardType
  rarity: string
  cost: number
  attack: number | null      // spell/landmark 은 null
  health: number | null
  keywords: Keyword[]
  spellSpeed?: SpellSpeed     // spell 만
  effects: CardEffect[]
  champion?: ChampionSpec | null
  imageUrl?: string
  derived: boolean           // true = DB 명시 정의 없이 stats.ts 로 파생된 카드
}

/** 버전드 메타데이터 문서 (export 응답 전체). */
export interface TacticsMetadataDocument {
  schemaVersion: number   // 구조(파서) 버전 — 깨지는 변경 시 증가, .NET 이 호환성 체크
  contentVersion: string  // 내용 해시 버전 — 카드/밸런스 변경 감지(ETag/핀)
  generatedAt: string     // ISO 타임스탬프
  cardCount: number
  keywords: Keyword[]      // 문서가 사용하는 키워드 전체 — 클라/서버 사전(vocabulary) 검증용
  cards: TacticsCardMeta[]
}
