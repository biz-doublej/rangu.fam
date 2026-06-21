/**
 * 카드 → 배틀 유닛 스탯 변환 (LoR 스케일: 파워/체력은 한 자리 정수, 본진 20).
 *
 * 기존 카드 메타(member/type/rarity) + 오버률만으로 결정론적으로 산출한다.
 * 카드 테이블 변경 없음. 멤버별 역할(어태커/탱커/…)이 기본 성향을 잡고,
 * 오버률이 파워를 가감, 레어도가 전체 스케일과 코스트를 결정한다.
 */

import { MEMBER } from '@/lib/dogam'
import { getOverRate, type OverRateInput } from './overRate'
import type { Keyword, SpellEffect, SpellSpeed } from './types'

/** 주문 카드 정의 (선택) — 있으면 buildBattleCards 가 유닛 대신 주문으로 만든다 */
export interface SpellDef {
  speed: SpellSpeed
  cost: number
  effect: SpellEffect
  needsTarget?: boolean
}

export interface CardDef extends OverRateInput {
  cardId: string
  name: string
  spell?: SpellDef
}

export interface DerivedUnit {
  power: number
  health: number
  cost: number
  keywords: Keyword[]
  isChampion: boolean
}

interface Archetype {
  role: string
  /** LoR 스케일 기본 파워/체력 (basic 기준) */
  basePower: number
  baseHealth: number
  /** 진영 시그니처 키워드 */
  keyword: Keyword
}

/** 멤버 = 진영. 도감 이모지/색 성향 그대로. */
const ARCHETYPE: Record<string, Archetype> = {
  [MEMBER.JAEWON]: { role: '어태커', basePower: 4, baseHealth: 2, keyword: 'overwhelm' },
  [MEMBER.HANUL]: { role: '탱커', basePower: 1, baseHealth: 5, keyword: 'tough' },
  [MEMBER.MINSEOK]: { role: '서포터', basePower: 3, baseHealth: 4, keyword: 'lifesteal' },
  [MEMBER.SEUNGCHAN]: { role: '후반캐리', basePower: 3, baseHealth: 4, keyword: 'elusive' },
  [MEMBER.JINGYU]: { role: '트릭스터', basePower: 3, baseHealth: 3, keyword: 'quickAttack' },
}
const DEFAULT_ARCHETYPE: Archetype = {
  role: '중립',
  basePower: 2,
  baseHealth: 3,
  keyword: 'tough',
}

/** 레어/타입 → 스탯 스케일 (type 우선, 없으면 rarity) */
function scaleOf(card: CardDef): number {
  const type = (card.type || '').toLowerCase()
  if (type === 'prestige') return 3.0
  if (type === 'signature') return 1.6

  switch ((card.rarity || 'basic').toLowerCase()) {
    case 'legendary':
      return 2.2
    case 'epic':
      return 1.8
    case 'rare':
    case 'special':
      return 1.3
    case 'material':
      return 1.1
    default:
      return 1.0 // basic
  }
}

/** 레어/타입 → 마나 코스트 */
function costOf(card: CardDef): number {
  const type = (card.type || '').toLowerCase()
  if (type === 'prestige') return 5
  if (type === 'signature') return 3

  switch ((card.rarity || 'basic').toLowerCase()) {
    case 'legendary':
      return 4
    case 'epic':
      return 3
    case 'rare':
    case 'special':
      return 2
    case 'material':
      return 2
    default:
      return 1
  }
}

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v))

/**
 * 카드 → 유닛 스탯.
 *  power  = clamp( round( (기본파워 + 오버보정) × 스케일 ), 0, 12 )
 *  health = clamp( round( 기본체력 × 스케일 ), 1, 12 )
 *  오버보정 = round( (오버률 - 60) / 18 )   → 대략 -3 ~ +2
 */
export function deriveBattleUnit(card: CardDef): DerivedUnit {
  const arch = (card.member && ARCHETYPE[card.member]) || DEFAULT_ARCHETYPE
  const over = getOverRate(card)
  const overAdj = Math.round((over - 60) / 18)
  const scale = scaleOf(card)
  const isChampion = (card.type || '').toLowerCase() === 'prestige'

  const power = clamp(Math.round((arch.basePower + overAdj) * scale), 0, 12)
  const health = clamp(Math.round(arch.baseHealth * scale), 1, 12)

  const keywords: Keyword[] = [arch.keyword]
  // 야구 카드 = 직관 풀스윙 → 일격 추가
  if (/^(KIATIGERS_|LGTWINS_)/i.test(card.cardId) && !keywords.includes('overwhelm')) {
    keywords.push('overwhelm')
  }

  return { power, health, cost: costOf(card), keywords, isChampion }
}

/** 멤버 한글명 → 역할 라벨 (UI 표시용) */
export function roleOf(member?: string | null): string {
  return (member && ARCHETYPE[member]?.role) || DEFAULT_ARCHETYPE.role
}

export { ARCHETYPE }
