import { describe, expect, it } from 'vitest'
import { mulberry32 } from '../rng'
import {
  COLS,
  HIDDEN_ROWS,
  PIECES,
  ROWS,
  SHAPES,
  applyAction,
  createTetris,
  ghostY,
  gravityInterval,
  isValidTetrisInputs,
  pieceCells,
  replay,
  resultOf,
  stepFrame,
  type TetrisAction,
  type TetrisInput,
  type TetrisState,
} from './engine'

/** 화면 쪽과 같은 방식으로 한 판을 진행하며 입력을 기록한다 (무작위 봇). */
function playRandom(seed: number, botSeed: number, maxFrames = 20_000) {
  const rng = mulberry32(botSeed)
  const state = createTetris(seed)
  const inputs: TetrisInput[] = []
  const actions: TetrisAction[] = ['left', 'right', 'rotateCW', 'rotateCCW', 'softOn', 'softOff', 'hardDrop', 'hold']
  while (!state.over && state.frame < maxFrames) {
    if (rng() < 0.2) {
      const action = actions[Math.floor(rng() * actions.length)]
      inputs.push({ frame: state.frame, action })
      applyAction(state, action)
    }
    stepFrame(state)
  }
  if (!state.over) {
    inputs.push({ frame: state.frame, action: 'end' })
    applyAction(state, 'end')
  }
  return { inputs, result: resultOf(state), state }
}

function fillRow(state: TetrisState, y: number, except: number[]) {
  for (let x = 0; x < COLS; x++) state.board[y][x] = except.includes(x) ? 0 : 1
}

describe('테트리스 엔진', () => {
  it('블록 모양: 7종 모두 네 칸, 회전 4가지', () => {
    for (const type of PIECES) {
      expect(SHAPES[type]).toHaveLength(4)
      for (const cells of SHAPES[type]) expect(cells).toHaveLength(4)
    }
    // I 의 세로 상태는 상자의 셋째 열
    expect(SHAPES.I[1]).toEqual([[2, 0], [2, 1], [2, 2], [2, 3]])
    expect(SHAPES.T[0]).toEqual([[1, 0], [0, 1], [1, 1], [2, 1]])
  })

  it('7-bag: 7개씩 끊으면 항상 7종이 한 번씩 나온다', () => {
    const state = createTetris(2026)
    const seen = [state.piece!.type]
    for (let i = 0; i < 69; i++) {
      applyAction(state, 'hardDrop')
      if (state.over) break
      seen.push(state.piece!.type)
    }
    for (let i = 0; i + 7 <= seen.length; i += 7) {
      expect([...seen.slice(i, i + 7)].sort()).toEqual([...PIECES].sort())
    }
    expect(seen.length).toBeGreaterThanOrEqual(7)
  })

  it('같은 시드는 같은 블록 순서, 다른 시드는 다른 순서', () => {
    const order = (seed: number) => {
      const state = createTetris(seed)
      return [state.piece!.type, ...state.queue.slice(0, 5)].join('')
    }
    expect(order(7)).toBe(order(7))
    expect(new Set([1, 2, 3, 4, 5, 6, 7, 8].map(order)).size).toBeGreaterThan(1)
  })

  it('중력: 레벨 1은 48프레임에 한 칸, 소프트 드롭은 2프레임에 한 칸 + 칸당 1점', () => {
    const state = createTetris(1)
    const y0 = state.piece!.y
    for (let i = 0; i < 47; i++) stepFrame(state)
    expect(state.piece!.y).toBe(y0)
    stepFrame(state)
    expect(state.piece!.y).toBe(y0 + 1)

    applyAction(state, 'softOn')
    for (let i = 0; i < 4; i++) stepFrame(state)
    expect(state.piece!.y).toBe(y0 + 3)
    expect(state.score).toBe(2)
    expect(gravityInterval(1)).toBe(48)
    expect(gravityInterval(10)).toBe(6)
    expect(gravityInterval(40)).toBe(1)
  })

  it('벽 밖으로는 못 나간다', () => {
    const state = createTetris(3)
    for (let i = 0; i < 20; i++) applyAction(state, 'left')
    expect(Math.min(...pieceCells(state.piece!).map(([x]) => x))).toBe(0)
    for (let i = 0; i < 20; i++) applyAction(state, 'right')
    expect(Math.max(...pieceCells(state.piece!).map(([x]) => x))).toBe(COLS - 1)
  })

  it('하드 드롭: 고스트 위치에 바로 굳고 칸당 2점', () => {
    const state = createTetris(5)
    const first = state.piece!
    const drop = ghostY(state)! - first.y
    applyAction(state, 'hardDrop')
    expect(state.score).toBe(drop * 2)
    expect(state.board.flat().filter(Boolean)).toHaveLength(4)
    expect(state.board[ROWS - 1].some(Boolean)).toBe(true)
  })

  it('홀드: 한 블록에 한 번만, 다음부터는 맞바꾼다', () => {
    const state = createTetris(9)
    const a = state.piece!.type
    const b = state.queue[0]
    applyAction(state, 'hold')
    expect(state.hold).toBe(a)
    expect(state.piece!.type).toBe(b)
    applyAction(state, 'hold') // 같은 블록에서 두 번째는 무시
    expect(state.hold).toBe(a)
    applyAction(state, 'hardDrop')
    const c = state.piece!.type
    applyAction(state, 'hold')
    expect(state.hold).toBe(c)
    expect(state.piece!.type).toBe(a)
  })

  it('SRS 벽 차기: 왼쪽 벽에 붙은 세로 I 를 돌리면 안쪽으로 밀려 들어온다', () => {
    const state = createTetris(1)
    state.piece = { type: 'I', rotation: 1, x: -2, y: 10 }
    applyAction(state, 'rotateCW')
    expect(state.piece!.rotation).toBe(2)
    expect(Math.min(...pieceCells(state.piece!).map(([x]) => x))).toBe(0)
  })

  it('T 블록을 네 번 돌리면 제자리로 온다', () => {
    const state = createTetris(1)
    state.piece = { type: 'T', rotation: 0, x: 3, y: 10 }
    for (let i = 0; i < 4; i++) applyAction(state, 'rotateCW')
    expect(state.piece).toEqual({ type: 'T', rotation: 0, x: 3, y: 10 })
    applyAction(state, 'rotateCCW')
    expect(state.piece!.rotation).toBe(3)
  })

  it('줄 제거 점수: 1줄 100, 4줄 800 × 레벨, 4줄은 tetrises 에 센다', () => {
    const single = createTetris(1)
    fillRow(single, ROWS - 1, [0, 1, 2, 3])
    single.piece = { type: 'I', rotation: 0, x: 0, y: ROWS - 2 }
    applyAction(single, 'hardDrop')
    expect(single).toMatchObject({ lines: 1, tetrises: 0, score: 100 })
    expect(single.board[ROWS - 1].every((cell) => !cell)).toBe(true)

    const quad = createTetris(1)
    for (let y = ROWS - 4; y < ROWS; y++) fillRow(quad, y, [9])
    quad.piece = { type: 'I', rotation: 1, x: 7, y: ROWS - 4 }
    applyAction(quad, 'hardDrop')
    expect(quad).toMatchObject({ lines: 4, tetrises: 1, score: 800 })
  })

  it('10줄마다 레벨이 오른다', () => {
    const state = createTetris(1)
    for (let n = 0; n < 3; n++) {
      for (let y = ROWS - 4; y < ROWS; y++) fillRow(state, y, [9])
      state.piece = { type: 'I', rotation: 1, x: 7, y: ROWS - 4 }
      applyAction(state, 'hardDrop')
    }
    expect(state.lines).toBe(12)
    expect(state.level).toBe(2)
    // 세 번째 4줄은 아직 레벨 1 (8줄 뒤) 에서 지워졌다
    expect(state.score).toBe(800 * 3)
  })

  it('바닥에 닿으면 30프레임 뒤에 굳고, 움직이면 다시 센다', () => {
    const state = createTetris(1)
    state.piece = { type: 'O', rotation: 0, x: 4, y: ROWS - 2 }
    for (let i = 0; i < 29; i++) stepFrame(state)
    expect(state.board.flat().some(Boolean)).toBe(false)
    applyAction(state, 'left')
    for (let i = 0; i < 29; i++) stepFrame(state)
    expect(state.board.flat().some(Boolean)).toBe(false)
    stepFrame(state)
    expect(state.board[ROWS - 1][3]).toBeGreaterThan(0)
  })

  it('쌓여서 새 블록이 나올 자리가 없으면 끝난다', () => {
    const state = createTetris(11)
    let drops = 0
    while (!state.over && drops < 100) {
      applyAction(state, 'hardDrop')
      drops++
    }
    expect(state.over).toBe(true)
    expect(drops).toBeLessThan(30)
    expect(state.board.slice(0, HIDDEN_ROWS).flat().length).toBe(HIDDEN_ROWS * COLS)
  })

  it("'end' 는 그 프레임에서 판을 끝낸다", () => {
    const result = replay(1, [{ frame: 100, action: 'end' }])
    expect(result.frames).toBe(100)
  })

  describe('재실행', () => {
    it('같은 seed + inputs 는 화면에서 진행한 결과와 정확히 같다', () => {
      for (let seed = 1; seed <= 25; seed++) {
        const { inputs, result } = playRandom(seed * 7919, seed + 1000)
        expect(replay(seed * 7919, inputs)).toEqual(result)
        // JSON 으로 보냈다 받아도 같다 (서버가 받는 모양)
        expect(replay(seed * 7919, JSON.parse(JSON.stringify(inputs)))).toEqual(result)
      }
    })

    it('오래 살아남는 판도 같다 (줄을 실제로 지우는 판)', () => {
      const played = [3, 5, 8].map((seed) => playRandom(seed, seed * 31, 60_000))
      for (const [index, seed] of [3, 5, 8].entries()) {
        expect(replay(seed, played[index].inputs)).toEqual(played[index].result)
      }
    })

    it('시드가 다르거나 입력을 고치면 결과가 달라진다', () => {
      const { inputs, result } = playRandom(424242, 7)
      expect(replay(424243, inputs)).not.toEqual(result)
      const tampered = inputs.filter((_, i) => i % 3 !== 0)
      expect(replay(424242, tampered)).not.toEqual(result)
    })

    it('입력이 없으면 가만히 쌓이다 끝난다', () => {
      const result = replay(77, [])
      expect(result.score).toBe(0)
      expect(result.frames).toBeGreaterThan(1000)
    })
  })

  describe('입력 형식 검사', () => {
    it('정상', () => {
      expect(isValidTetrisInputs([])).toBe(true)
      expect(isValidTetrisInputs([{ frame: 0, action: 'left' }, { frame: 0, action: 'hardDrop' }, { frame: 9, action: 'end' }])).toBe(true)
    })

    it('모르는 동작·뒤로 가는 프레임·정수가 아닌 값은 거절', () => {
      expect(isValidTetrisInputs('x')).toBe(false)
      expect(isValidTetrisInputs([{ frame: 0, action: 'cheat' }])).toBe(false)
      expect(isValidTetrisInputs([{ frame: 5, action: 'left' }, { frame: 4, action: 'left' }])).toBe(false)
      expect(isValidTetrisInputs([{ frame: 1.5, action: 'left' }])).toBe(false)
      expect(isValidTetrisInputs([{ frame: -1, action: 'left' }])).toBe(false)
      expect(isValidTetrisInputs([null])).toBe(false)
    })
  })
})
