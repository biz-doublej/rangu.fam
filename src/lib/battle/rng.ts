/**
 * 결정론 RNG — 전투 셔플/확률 효과에 사용.
 *
 * 서버에서만 돌고, 상태(rng:number)를 GameState 에 담아 진행하므로
 * 같은 seed + 같은 액션 시퀀스 → 항상 동일 결과 (리플레이/검증 가능).
 * Math.random() 은 절대 쓰지 않는다.
 */

/** 문자열 seed → 32bit 정수 (xmur3) */
export function seedToInt(seed: string): number {
  let h = 1779033703 ^ seed.length
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(h ^ seed.charCodeAt(i), 3432918353)
    h = (h << 13) | (h >>> 19)
  }
  h = Math.imul(h ^ (h >>> 16), 2246822507)
  h = Math.imul(h ^ (h >>> 13), 3266489909)
  return (h ^= h >>> 16) >>> 0
}

/** mulberry32: state 를 받아 [다음 state, 0..1 난수] 반환 */
export function nextRandom(state: number): [number, number] {
  let t = (state + 0x6d2b79f5) | 0
  t = Math.imul(t ^ (t >>> 15), t | 1)
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
  const value = ((t ^ (t >>> 14)) >>> 0) / 4294967296
  return [t >>> 0, value]
}

/** [0, n) 정수 — state 소비 */
export function nextInt(state: number, n: number): [number, number] {
  const [s, v] = nextRandom(state)
  return [s, Math.floor(v * n)]
}

/**
 * Fisher–Yates 셔플 (결정론). 입력 배열은 변형하지 않고 새 배열 반환.
 * 반환: [다음 rng state, 셔플된 배열]
 */
export function seededShuffle<T>(state: number, arr: readonly T[]): [number, T[]] {
  const out = arr.slice()
  let s = state
  for (let i = out.length - 1; i > 0; i--) {
    let j: number
    ;[s, j] = nextInt(s, i + 1)
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return [s, out]
}
