/**
 * 오버률(텐션 지수) 산출 — 카드가 "평소 얼마나 오버하는지".
 *
 * 전투에서 유닛 파워의 핵심 변수이자(stats.ts), 카드 상세에 표시할 재미 스탯.
 * DB 컬럼을 새로 두지 않고 카드 메타(member/type/cardId)에서 결정론적으로 계산한다.
 *  - 멤버 기준선 + 시리즈/타입 보정 + cardId 해시 지터(±5)
 *  - 특정 카드는 OVERRIDES 로 핀포인트 고정
 * cardId 컨벤션을 모르는 레거시 카드도 안전하게 값이 나온다.
 */

import { MEMBER } from '@/lib/dogam'

export interface OverRateInput {
  cardId: string
  member?: string | null
  type?: string | null
  rarity?: string | null
}

/** 멤버별 평소 오버률 기준선 */
const MEMBER_BASELINE: Record<string, number> = {
  [MEMBER.JAEWON]: 88, // 🔥
  [MEMBER.MINSEOK]: 78, // ⭐
  [MEMBER.JINGYU]: 70, // 🎐
  [MEMBER.SEUNGCHAN]: 58, // 🌊
  [MEMBER.HANUL]: 42, // 🌿
}
const DEFAULT_BASELINE = 60

/** 특정 카드 핀포인트 오버률 (알고 있는 cardId 한정) */
const OVERRIDES: Record<string, number> = {
  prestige_jaewon: 100,
  prestige_group_special: 100,
  prestige_minseok: 95,
  prestige_jinkyu: 93,
  prestige_seungchan: 90,
  prestige_hanul: 77,
  SIG_JAE_25: 99,
  SIG_JAE_24: 97,
  SIG_JAE_22: 96,
}

const up = (s: string) => s.toUpperCase()
const startsWithAny = (id: string, ...prefixes: string[]) =>
  prefixes.some((p) => up(id).startsWith(up(p)))

/** 시리즈/타입 보정값 */
function seriesModifier(card: OverRateInput): number {
  const id = card.cardId || ''
  const type = (card.type || '').toLowerCase()

  if (type === 'prestige') return 30 // 만렙 — 오버의 끝
  if (type === 'signature' || startsWithAny(id, 'SIG_')) return 8
  if (startsWithAny(id, 'KIATIGERS_', 'LGTWINS_')) return 14 // 야구 세리머니
  if (startsWithAny(id, 'RANGGU_')) return 10 // 단체 텐션
  if (startsWithAny(id, 'NG_')) return 6 // 신시대 패기
  if (startsWithAny(id, 'OL_')) return -25 // 과거 회상 — 차분
  if (startsWithAny(id, 'PF_')) return -18 // 정적 프로필
  if (startsWithAny(id, 'BACKNUM_')) return -3
  if (startsWithAny(id, 'SC_')) return -8 // 학생회 — 공적인 자리, 절제
  return 0
}

/** cardId 해시 → ±5 결정론 지터 (카드별 다양성) */
function hashJitter(cardId: string): number {
  let h = 0
  for (let i = 0; i < cardId.length; i++) {
    h = (Math.imul(h, 31) + cardId.charCodeAt(i)) >>> 0
  }
  return (h % 11) - 5
}

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v))

/** 카드의 오버률 (5..100) */
export function getOverRate(card: OverRateInput): number {
  const override = OVERRIDES[card.cardId]
  if (override != null) return override

  const base = (card.member && MEMBER_BASELINE[card.member]) || DEFAULT_BASELINE
  return clamp(base + seriesModifier(card) + hashJitter(card.cardId), 5, 100)
}
