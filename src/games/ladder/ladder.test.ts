import { describe, expect, it } from 'vitest'
import {
  encodeLadderQuery,
  generateLadder,
  ladderMapping,
  parseLadderQuery,
  traceLadder,
  validateLadderSetup,
} from './ladder'

describe('사다리 타기', () => {
  it('같은 시드는 같은 사다리', () => {
    expect(generateLadder(1234, 6)).toEqual(generateLadder(1234, 6))
    expect(generateLadder(1234, 6)).not.toEqual(generateLadder(1235, 6))
  })

  it('가로줄은 같은 높이에서 붙지 않고, 모든 칸에 하나 이상 있다', () => {
    for (let columns = 2; columns <= 10; columns++) {
      for (let seed = 0; seed < 300; seed++) {
        const ladder = generateLadder(seed, columns)
        for (const line of ladder.rungs) {
          expect(line).toHaveLength(columns - 1)
          for (let gap = 1; gap < line.length; gap++) expect(line[gap] && line[gap - 1]).toBe(false)
        }
        for (let gap = 0; gap < columns - 1; gap++) expect(ladder.rungs.some((line) => line[gap])).toBe(true)
      }
    }
  })

  it('결과는 항상 1대1로 나뉜다 (누구도 같은 결과에 도착하지 않음)', () => {
    for (let columns = 2; columns <= 10; columns++) {
      for (let seed = 0; seed < 300; seed++) {
        const mapping = ladderMapping(generateLadder(seed, columns))
        expect([...mapping].sort((a, b) => a - b)).toEqual(Array.from({ length: columns }, (_, i) => i))
      }
    }
  })

  it('가는 길은 위에서 아래로 이어지고 가로줄에서만 옆으로 간다', () => {
    const ladder = generateLadder(99, 5)
    for (let start = 0; start < 5; start++) {
      const { points, end } = traceLadder(ladder, start)
      expect(points[0]).toEqual({ x: start, y: 0 })
      expect(points[points.length - 1]).toEqual({ x: end, y: ladder.rungs.length + 1 })
      for (let i = 1; i < points.length; i++) {
        const dx = Math.abs(points[i].x - points[i - 1].x)
        const dy = points[i].y - points[i - 1].y
        expect(dy).toBeGreaterThanOrEqual(0)
        expect(dx === 0 || (dx === 1 && dy === 0)).toBe(true)
        if (dx === 1) {
          const gap = Math.min(points[i].x, points[i - 1].x)
          expect(ladder.rungs[points[i].y - 1][gap]).toBe(true)
        }
      }
    }
  })

  it('여러 시드에서 결과가 골고루 섞인다', () => {
    const counts = [0, 0, 0, 0]
    for (let seed = 0; seed < 4000; seed++) counts[ladderMapping(generateLadder(seed, 4))[0]]++
    for (const count of counts) {
      expect(count).toBeGreaterThan(700)
      expect(count).toBeLessThan(1300)
    }
  })

  describe('입력 검증', () => {
    it('공백을 정리하고 12자로 자른다', () => {
      const checked = validateLadderSetup(['  강한울 ', '정재원'], ['커피  쏘기', '가나다라마바사아자차카타파하'])
      expect(checked).toEqual({ ok: true, participants: ['강한울', '정재원'], results: ['커피 쏘기', '가나다라마바사아자차카타'] })
    })

    it('인원·빈칸·중복·개수 불일치는 거절', () => {
      expect(validateLadderSetup(['a'], ['x']).ok).toBe(false)
      expect(validateLadderSetup(Array(11).fill(0).map((_, i) => `p${i}`), Array(11).fill('x')).ok).toBe(false)
      expect(validateLadderSetup(['a', ''], ['x', 'y']).ok).toBe(false)
      expect(validateLadderSetup(['a', 'b'], ['x', ' ']).ok).toBe(false)
      expect(validateLadderSetup(['a', 'a'], ['x', 'y']).ok).toBe(false)
      expect(validateLadderSetup(['a', 'b'], ['x']).ok).toBe(false)
    })
  })

  describe('공유 링크', () => {
    const setup = { participants: ['강한울', '정재원', '정민석'], results: ['꽝', '커피 & 빵, 쏘기', '통과=1'], seed: 4294967295 }

    it('쿼리스트링으로 바꿨다가 되돌리면 같다 (쉼표·&·= 포함)', () => {
      const query = encodeLadderQuery(setup)
      expect(parseLadderQuery(query)).toEqual(setup)
      expect(parseLadderQuery(new URLSearchParams(query))).toEqual(setup)
    })

    it('같은 링크는 같은 결과를 보여 준다', () => {
      const a = parseLadderQuery(encodeLadderQuery(setup))!
      const b = parseLadderQuery(encodeLadderQuery(setup))!
      expect(ladderMapping(generateLadder(a.seed, 3))).toEqual(ladderMapping(generateLadder(b.seed, 3)))
    })

    it('잘못된 링크는 버린다', () => {
      expect(parseLadderQuery('')).toBeNull()
      expect(parseLadderQuery('p=a&p=b&r=x&r=y')).toBeNull()
      expect(parseLadderQuery('p=a&p=b&r=x&r=y&s=abc')).toBeNull()
      expect(parseLadderQuery('p=a&p=b&r=x&r=y&s=99999999999')).toBeNull()
      expect(parseLadderQuery('p=a&r=x&s=1')).toBeNull()
      expect(parseLadderQuery('p=a&p=b&r=x&s=1')).toBeNull()
    })
  })
})
