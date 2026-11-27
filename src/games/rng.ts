/**
 * 시드 난수 (mulberry32). 같은 시드는 브라우저와 서버에서 항상 같은 수열을 낸다.
 * 게임 엔진은 Math.random 대신 이것만 쓴다.
 */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
