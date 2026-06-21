/**
 * 랜덤 선물상자 — 보상 정의 + 가중 추첨 + 유저·날짜별 결정적 위치 배치.
 *
 * 추첨은 서버에서만(치팅 방지), 위치는 (userId + 날짜) 시드로 클라이언트에서
 * 결정적으로 계산 — 그날은 고정, 유저/날짜마다 다름.
 */

export type GiftRewardKind = 'none' | 'drops' | 'protect'

export interface GiftReward {
  key: string
  label: string
  kind: GiftRewardKind
  amount: number // drops: 드랍권 수, protect: 보호권 수, none: 0
  weight: number // 가중치 (합으로 나눠 확률)
  flavor?: string
}

/**
 * 보상 테이블 — 좋은 건 "극악" 확률.
 * 가중치 합 = 100 → 그대로 % 로 읽힌다.
 *   꽝 45 · 잠이나 자세요 25 · 1회권 18 · 3회권 7 · 보호권 3.5 · 5회권 1.5
 */
export const GIFT_REWARDS: GiftReward[] = [
  { key: 'none', label: '꽝', kind: 'none', amount: 0, weight: 45, flavor: '다음 기회에…' },
  { key: 'sleep', label: '잠이나 자세요', kind: 'none', amount: 0, weight: 25, flavor: '오늘은 일찍 주무세요 😴' },
  { key: 'draw1', label: '카드 1회 뽑기권', kind: 'drops', amount: 1, weight: 18, flavor: '드랍 1회 추가!' },
  { key: 'draw3', label: '카드 3회 뽑기권', kind: 'drops', amount: 3, weight: 7, flavor: '드랍 3회 추가!' },
  { key: 'protect', label: '조합 보호권', kind: 'protect', amount: 1, weight: 3.5, flavor: '다음 조합 실패를 막아줘요' },
  { key: 'draw5', label: '카드 5회 뽑기권', kind: 'drops', amount: 5, weight: 1.5, flavor: '드랍 5회 추가! 대박!' },
]

/** 하루에 배치되는 선물상자 개수 */
export const GIFT_BOX_COUNT = 5

/** 가중 추첨 (rng: 0~1 난수 공급자, 기본 Math.random) */
export function rollGiftReward(rng: () => number = Math.random): GiftReward {
  const total = GIFT_REWARDS.reduce((s, r) => s + r.weight, 0)
  let r = rng() * total
  for (const reward of GIFT_REWARDS) {
    r -= reward.weight
    if (r <= 0) return reward
  }
  return GIFT_REWARDS[0]
}

/** KST 기준 'YYYY-MM-DD' (서버는 UTC라 +9h 보정) */
export function kstDateString(now: Date): string {
  return new Date(now.getTime() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10)
}

// ── 결정적 위치 배치 (클라이언트) ────────────────────────────
function xmur3(str: string): () => number {
  let h = 1779033703 ^ str.length
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353)
    h = (h << 13) | (h >>> 19)
  }
  return () => {
    h = Math.imul(h ^ (h >>> 16), 2246822507)
    h = Math.imul(h ^ (h >>> 13), 3266489909)
    h ^= h >>> 16
    return h >>> 0
  }
}

function mulberry32(seed: number): () => number {
  let a = seed
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export interface GiftBoxPosition {
  index: number
  top: number // viewport %
  left: number // viewport %
}

/**
 * (seed = userId + date) 로 박스 위치를 결정적으로 생성.
 * 세로를 박스 수만큼 띠로 나눠 겹치지 않게 흩뿌린다.
 */
export function giftBoxPositions(seed: string, count: number): GiftBoxPosition[] {
  const rand = mulberry32(xmur3(seed)())
  const TOP_MIN = 16
  const TOP_MAX = 82
  const band = (TOP_MAX - TOP_MIN) / count
  const out: GiftBoxPosition[] = []
  for (let i = 0; i < count; i++) {
    const top = TOP_MIN + i * band + rand() * (band - 6)
    const left = 7 + rand() * 80 // 7% ~ 87%
    out.push({ index: i, top: Math.round(top), left: Math.round(left) })
  }
  return out
}
