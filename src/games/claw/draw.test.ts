import { describe, expect, it } from 'vitest'
import { CLAW_ODDS, clawWinChance, drawClawOutcome, isClawWin } from './draw'
import { PLUSHES } from './plushes'

const N = 40_000

describe('인형뽑기 추첨', () => {
  it('같은 시드와 연속 실패 횟수는 항상 같은 결과', () => {
    for (const seed of [0, 1, 42, 123456789, 4294967295]) {
      expect(drawClawOutcome(seed, 2)).toEqual(drawClawOutcome(seed, 2))
    }
  })

  it('결과 모양: 못 잡았으면 slipAt 이 없고, 인형은 6종 중 하나', () => {
    const keys = new Set(PLUSHES.map((plush) => plush.key))
    for (let seed = 0; seed < 2000; seed++) {
      const outcome = drawClawOutcome(seed, seed % 8)
      expect(keys.has(outcome.plush)).toBe(true)
      if (!outcome.grabbed) expect(outcome.slipAt).toBeUndefined()
      if (outcome.slipAt) expect(['top', 'carry']).toContain(outcome.slipAt)
    }
  })

  it('성공 확률은 기본값에서 시작해 연속 실패마다 오르고 상한에서 멈춘다', () => {
    expect(clawWinChance(0)).toBe(CLAW_ODDS.baseWin)
    expect(clawWinChance(2)).toBeCloseTo(CLAW_ODDS.baseWin + 2 * CLAW_ODDS.pityStep)
    expect(clawWinChance(100)).toBe(CLAW_ODDS.maxWin)
    expect(clawWinChance(-3)).toBe(CLAW_ODDS.baseWin)
  })

  it('실제 분포가 확률표와 맞는다', () => {
    for (const misses of [0, 3, 20]) {
      let wins = 0
      for (let seed = 0; seed < N; seed++) if (isClawWin(drawClawOutcome(seed * 7919 + misses, misses))) wins++
      expect(wins / N).toBeGreaterThan(clawWinChance(misses) - 0.015)
      expect(wins / N).toBeLessThan(clawWinChance(misses) + 0.015)
    }
  })

  it('황금 랑구는 2%, 나머지 5종은 고르게', () => {
    const counts: Record<string, number> = {}
    for (let seed = 0; seed < N; seed++) {
      const { plush } = drawClawOutcome(seed * 104729, 0)
      counts[plush] = (counts[plush] || 0) + 1
    }
    expect(counts.gold / N).toBeGreaterThan(0.015)
    expect(counts.gold / N).toBeLessThan(0.025)
    for (const plush of PLUSHES.filter((entry) => !entry.rare)) {
      expect(counts[plush.key] / N).toBeGreaterThan(0.18)
      expect(counts[plush.key] / N).toBeLessThan(0.212)
    }
  })

  it('인형 종류와 성공 여부는 서로 독립이다 (황금이라고 덜 잡히지 않음)', () => {
    let gold = 0
    let goldWins = 0
    for (let seed = 0; seed < 400_000; seed++) {
      const outcome = drawClawOutcome(seed, 0)
      if (outcome.plush !== 'gold') continue
      gold++
      if (isClawWin(outcome)) goldWins++
    }
    expect(goldWins / gold).toBeGreaterThan(CLAW_ODDS.baseWin - 0.03)
    expect(goldWins / gold).toBeLessThan(CLAW_ODDS.baseWin + 0.03)
  })
})
