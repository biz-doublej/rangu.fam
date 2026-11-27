import { describe, expect, it } from 'vitest'
import { COMMON_REWARDS, DAILY_GAME_CAP, GAME_IDS, GAME_REWARDS, clampToDailyCap, isStreakBonusDay } from './rewards'

describe('보상 규칙 표 — 기획안 ‘포인트 획득 규칙’과 같은지', () => {
  it('하루 상한 300P', () => {
    expect(DAILY_GAME_CAP).toBe(300)
  })

  it('게임 9종', () => {
    expect([...GAME_IDS].sort()).toEqual(
      ['catchmind', 'claw', 'climb', 'ladder', 'liar', 'omok', 'quiz', 'tetris', 'yut'].sort()
    )
    expect(Object.keys(GAME_REWARDS).sort()).toEqual([...GAME_IDS].sort())
  })

  it('게임별 숫자', () => {
    expect(GAME_REWARDS.claw).toMatchObject({ playCost: 20, newPlush: 50, goldenRangu: 100 })
    expect(GAME_REWARDS.tetris).toMatchObject({
      clear: 5,
      clearPerDay: 10,
      per10kScore: 5,
      per10kScoreMaxPerRun: 40,
      tetris: 3,
      tetrisMaxPerRun: 30,
      personalBest: 20,
    })
    expect(GAME_REWARDS.climb).toMatchObject({ play: 5, playPerDay: 3, newZone: 30, summit: 500, fasterClear: 50 })
    expect(GAME_REWARDS.quiz).toMatchObject({
      participate: 10,
      minPlayers: 3,
      correct: 2,
      rank: [50, 30, 15],
      predictionHit: 10,
      questionUsed: 3,
      questionUsedMaxPerDay: 30,
    })
    expect(GAME_REWARDS.liar).toMatchObject({ participate: 10, minPlayers: 3, winAsLiar: 40, winAsCitizen: 20 })
    expect(GAME_REWARDS.catchmind).toMatchObject({ participate: 10, correct: 5, earlyBonus: 3, drawingGuessedPerPlayer: 3 })
    expect(GAME_REWARDS.omok).toMatchObject({ win: 20, lose: 5, rewardedGamesPerOpponentPerDay: 3 })
    expect(GAME_REWARDS.yut).toMatchObject({ participate: 10, win: 30 })
    expect(GAME_REWARDS.ladder).toEqual({})
  })

  it('공통 보상', () => {
    expect(COMMON_REWARDS).toMatchObject({
      dailyCheckIn: 10,
      streak7: 70,
      threeGamesInDay: 20,
      weeklyRank: [200, 100, 50],
      weeklyBiggestFall: 50,
    })
  })
})

describe('clampToDailyCap', () => {
  it('상한 안이면 그대로', () => {
    expect(clampToDailyCap(50, 0)).toBe(50)
    expect(clampToDailyCap(50, 250)).toBe(50)
  })

  it('초과분은 잘라낸다', () => {
    expect(clampToDailyCap(50, 290)).toBe(10)
    expect(clampToDailyCap(500, 0)).toBe(300)
  })

  it('이미 상한이면 0', () => {
    expect(clampToDailyCap(5, 300)).toBe(0)
    expect(clampToDailyCap(5, 999)).toBe(0)
  })
})

describe('isStreakBonusDay', () => {
  it('7일째마다', () => {
    expect([1, 6, 7, 8, 14, 21].map(isStreakBonusDay)).toEqual([false, false, true, false, true, true])
    expect(isStreakBonusDay(0)).toBe(false)
  })
})
