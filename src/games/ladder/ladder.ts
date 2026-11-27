import { mulberry32 } from '../rng'

/**
 * 사다리 타기 규칙. 시드가 같으면 사다리도 같아서, 공유 링크를 연 사람도 같은 결과를 본다.
 * 보상이 없는 도구라 서버를 거치지 않는다.
 */

export const LADDER_MIN = 2
export const LADDER_MAX = 10
export const LADDER_NAME_MAX = 12

export interface Ladder {
  columns: number
  /** rungs[row][gap] — gap 번째 세로줄과 그 오른쪽 세로줄 사이에 가로줄이 있는지 */
  rungs: boolean[][]
}

export interface LadderSetup {
  participants: string[]
  results: string[]
  seed: number
}

/** 가로줄은 같은 높이에서 서로 붙지 않게 놓고, 모든 칸에 적어도 하나는 있게 한다. */
export function generateLadder(seed: number, columns: number): Ladder {
  const rng = mulberry32(seed)
  const gaps = columns - 1
  const rowCount = Math.max(8, columns * 2 + 2)
  const rungs: boolean[][] = []
  for (let row = 0; row < rowCount; row++) {
    const line: boolean[] = []
    for (let gap = 0; gap < gaps; gap++) {
      line.push(!line[gap - 1] && rng() < 0.42)
    }
    rungs.push(line)
  }
  for (let gap = 0; gap < gaps; gap++) {
    if (rungs.some((line) => line[gap])) continue
    // 비어 있는 칸: 양옆과 겹치지 않는 줄을 골라 하나 놓는다
    const free = rungs.filter((line) => !line[gap - 1] && !line[gap + 1])
    const line = free.length ? free[Math.floor(rng() * free.length)] : rungs[Math.floor(rng() * rowCount)]
    if (line[gap - 1]) line[gap - 1] = false
    if (line[gap + 1]) line[gap + 1] = false
    line[gap] = true
  }
  return { columns, rungs }
}

export interface LadderPath {
  /** 도착한 세로줄 */
  end: number
  /** 지나간 점. y 는 0(맨 위) ~ rows+1(맨 아래), 가로줄 row 는 y = row + 1 */
  points: Array<{ x: number; y: number }>
}

export function traceLadder(ladder: Ladder, start: number): LadderPath {
  let column = start
  const points = [{ x: column, y: 0 }]
  ladder.rungs.forEach((line, row) => {
    const y = row + 1
    if (line[column]) {
      points.push({ x: column, y }, { x: column + 1, y })
      column += 1
    } else if (column > 0 && line[column - 1]) {
      points.push({ x: column, y }, { x: column - 1, y })
      column -= 1
    }
  })
  points.push({ x: column, y: ladder.rungs.length + 1 })
  return { end: column, points }
}

/** 출발 세로줄 → 도착 세로줄 (항상 1대1) */
export function ladderMapping(ladder: Ladder): number[] {
  return Array.from({ length: ladder.columns }, (_, start) => traceLadder(ladder, start).end)
}

function cleanNames(values: string[]): string[] {
  return values.map((value) => value.replace(/\s+/g, ' ').trim().slice(0, LADDER_NAME_MAX))
}

/** 입력을 검증해 정리한다. 문제가 있으면 이유를 돌려준다. */
export function validateLadderSetup(
  participants: string[],
  results: string[]
): { ok: true; participants: string[]; results: string[] } | { ok: false; error: string } {
  const names = cleanNames(participants)
  const outcomes = cleanNames(results)
  if (names.length < LADDER_MIN || names.length > LADDER_MAX) {
    return { ok: false, error: `참가자는 ${LADDER_MIN}~${LADDER_MAX}명이어야 합니다.` }
  }
  if (names.length !== outcomes.length) return { ok: false, error: '참가자 수와 결과 수가 같아야 합니다.' }
  if (names.some((name) => !name)) return { ok: false, error: '참가자 이름을 모두 채워 주세요.' }
  if (outcomes.some((outcome) => !outcome)) return { ok: false, error: '결과를 모두 채워 주세요.' }
  if (new Set(names).size !== names.length) return { ok: false, error: '참가자 이름이 겹칩니다.' }
  return { ok: true, participants: names, results: outcomes }
}

/** 공유 링크 쿼리스트링: p=참가자(여러 개)&r=결과(여러 개)&s=시드 */
export function encodeLadderQuery(setup: LadderSetup): string {
  const params = new URLSearchParams()
  for (const name of setup.participants) params.append('p', name)
  for (const result of setup.results) params.append('r', result)
  params.set('s', String(setup.seed >>> 0))
  return params.toString()
}

export function parseLadderQuery(query: string | URLSearchParams): LadderSetup | null {
  const params = typeof query === 'string' ? new URLSearchParams(query) : query
  const seedText = params.get('s')
  if (!seedText || !/^\d{1,10}$/.test(seedText)) return null
  const seed = Number(seedText)
  if (seed > 0xffffffff) return null
  const checked = validateLadderSetup(params.getAll('p'), params.getAll('r'))
  if (!checked.ok) return null
  return { participants: checked.participants, results: checked.results, seed }
}
