import { mulberry32 } from '../rng'

/**
 * 테트리스 엔진 — 화면과 서버 검증이 같이 쓰는 순수 로직.
 * 같은 시드와 같은 입력 기록이면 브라우저와 서버에서 항상 같은 결과가 나온다.
 * (정수 연산만 쓰고, 난수는 시드 RNG 로 7-bag 을 섞을 때만 쓴다)
 *
 * 10x20, SRS 회전(벽 차기 포함), 7-bag, 하드·소프트 드롭, 홀드, 고스트, 레벨 속도.
 * 시간 단위는 프레임(1/60초). 입력 기록 = [{ frame, action }].
 */

export const COLS = 10
export const VISIBLE_ROWS = 20
/** 화면 위에 숨은 줄 수 (블록이 여기서 나온다) */
export const HIDDEN_ROWS = 4
export const ROWS = VISIBLE_ROWS + HIDDEN_ROWS
export const FPS = 60
export const PREVIEW_COUNT = 5

export const PIECES = ['I', 'J', 'L', 'O', 'S', 'T', 'Z'] as const
export type PieceType = (typeof PIECES)[number]

export const TETRIS_ACTIONS = ['left', 'right', 'rotateCW', 'rotateCCW', 'softOn', 'softOff', 'hardDrop', 'hold', 'end'] as const
export type TetrisAction = (typeof TETRIS_ACTIONS)[number]

export interface TetrisInput {
  frame: number
  action: TetrisAction
}

/** 검증할 수 있는 최대 길이 (3시간) */
export const MAX_FRAMES = FPS * 60 * 60 * 3
export const MAX_INPUTS = 300_000

const LOCK_DELAY = 30
const MAX_LOCK_RESETS = 15
const SOFT_DROP_INTERVAL = 2
/** 레벨별 한 칸 내려가는 데 걸리는 프레임 (레벨 1부터) */
const GRAVITY_FRAMES = [48, 43, 38, 33, 28, 23, 18, 13, 8, 6, 5, 5, 5, 4, 4, 4, 3, 3, 3, 2]
const LINE_SCORES = [0, 100, 300, 500, 800]

const BASE_SHAPES: Record<PieceType, number[][]> = {
  I: [
    [0, 0, 0, 0],
    [1, 1, 1, 1],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
  ],
  J: [
    [1, 0, 0],
    [1, 1, 1],
    [0, 0, 0],
  ],
  L: [
    [0, 0, 1],
    [1, 1, 1],
    [0, 0, 0],
  ],
  O: [
    [1, 1],
    [1, 1],
  ],
  S: [
    [0, 1, 1],
    [1, 1, 0],
    [0, 0, 0],
  ],
  T: [
    [0, 1, 0],
    [1, 1, 1],
    [0, 0, 0],
  ],
  Z: [
    [1, 1, 0],
    [0, 1, 1],
    [0, 0, 0],
  ],
}

function rotateMatrixCW(matrix: number[][]): number[][] {
  const n = matrix.length
  return matrix.map((_, y) => matrix.map((__, x) => matrix[n - 1 - x][y]))
}

/** SHAPES[종류][회전 0~3] = 차지하는 칸 [x, y] 목록 (상자 왼쪽 위 기준) */
export const SHAPES: Record<PieceType, Array<Array<[number, number]>>> = Object.fromEntries(
  PIECES.map((type) => {
    const states: Array<Array<[number, number]>> = []
    let matrix = BASE_SHAPES[type]
    for (let rotation = 0; rotation < 4; rotation++) {
      const cells: Array<[number, number]> = []
      matrix.forEach((row, y) => row.forEach((on, x) => on && cells.push([x, y])))
      states.push(cells)
      matrix = rotateMatrixCW(matrix)
    }
    return [type, states]
  })
) as Record<PieceType, Array<Array<[number, number]>>>

// SRS 벽 차기 표. 표준 표는 y 가 위쪽이라 여기서는 dy 부호를 뒤집어 쓴다(보드는 y 가 아래쪽).
type Kicks = Record<string, Array<[number, number]>>
const KICKS_JLSTZ: Kicks = {
  '0>1': [[0, 0], [-1, 0], [-1, 1], [0, -2], [-1, -2]],
  '1>0': [[0, 0], [1, 0], [1, -1], [0, 2], [1, 2]],
  '1>2': [[0, 0], [1, 0], [1, -1], [0, 2], [1, 2]],
  '2>1': [[0, 0], [-1, 0], [-1, 1], [0, -2], [-1, -2]],
  '2>3': [[0, 0], [1, 0], [1, 1], [0, -2], [1, -2]],
  '3>2': [[0, 0], [-1, 0], [-1, -1], [0, 2], [-1, 2]],
  '3>0': [[0, 0], [-1, 0], [-1, -1], [0, 2], [-1, 2]],
  '0>3': [[0, 0], [1, 0], [1, 1], [0, -2], [1, -2]],
}
const KICKS_I: Kicks = {
  '0>1': [[0, 0], [-2, 0], [1, 0], [-2, -1], [1, 2]],
  '1>0': [[0, 0], [2, 0], [-1, 0], [2, 1], [-1, -2]],
  '1>2': [[0, 0], [-1, 0], [2, 0], [-1, 2], [2, -1]],
  '2>1': [[0, 0], [1, 0], [-2, 0], [1, -2], [-2, 1]],
  '2>3': [[0, 0], [2, 0], [-1, 0], [2, 1], [-1, -2]],
  '3>2': [[0, 0], [-2, 0], [1, 0], [-2, -1], [1, 2]],
  '3>0': [[0, 0], [1, 0], [-2, 0], [1, -2], [-2, 1]],
  '0>3': [[0, 0], [-1, 0], [2, 0], [-1, 2], [2, -1]],
}

export interface ActivePiece {
  type: PieceType
  rotation: number
  x: number
  y: number
}

export interface TetrisState {
  /** board[y][x] — 0 빈칸, 1~7 블록 종류(PIECES 순서 + 1). y 는 아래로 갈수록 커진다. */
  board: number[][]
  piece: ActivePiece | null
  hold: PieceType | null
  canHold: boolean
  /** 다음에 나올 블록들 (앞에서부터) */
  queue: PieceType[]
  score: number
  lines: number
  /** 4줄 동시 제거 횟수 */
  tetrises: number
  level: number
  /** 지금까지 진행한 프레임 수 */
  frame: number
  over: boolean
  softDrop: boolean
  gravityCounter: number
  lockCounter: number
  lockResets: number
  rng: () => number
}

export interface TetrisResult {
  score: number
  lines: number
  tetrises: number
  frames: number
  level: number
}

function refillQueue(state: TetrisState) {
  while (state.queue.length < PREVIEW_COUNT + 1) {
    const bag = [...PIECES]
    for (let i = bag.length - 1; i > 0; i--) {
      const j = Math.floor(state.rng() * (i + 1))
      ;[bag[i], bag[j]] = [bag[j], bag[i]]
    }
    state.queue.push(...bag)
  }
}

export function pieceCells(piece: ActivePiece): Array<[number, number]> {
  return SHAPES[piece.type][piece.rotation].map(([x, y]) => [piece.x + x, piece.y + y])
}

function collides(state: TetrisState, piece: ActivePiece): boolean {
  for (const [dx, dy] of SHAPES[piece.type][piece.rotation]) {
    const x = piece.x + dx
    const y = piece.y + dy
    if (x < 0 || x >= COLS || y >= ROWS) return true
    if (y >= 0 && state.board[y][x]) return true
  }
  return false
}

function spawn(state: TetrisState, type?: PieceType) {
  const next = type ?? state.queue.shift()!
  refillQueue(state)
  const piece: ActivePiece = { type: next, rotation: 0, x: next === 'O' ? 4 : 3, y: HIDDEN_ROWS - 2 }
  state.gravityCounter = 0
  state.lockCounter = 0
  state.lockResets = 0
  if (collides(state, piece)) {
    state.piece = null
    state.over = true
    return
  }
  state.piece = piece
}

export function createTetris(seed: number): TetrisState {
  const state: TetrisState = {
    board: Array.from({ length: ROWS }, () => Array<number>(COLS).fill(0)),
    piece: null,
    hold: null,
    canHold: true,
    queue: [],
    score: 0,
    lines: 0,
    tetrises: 0,
    level: 1,
    frame: 0,
    over: false,
    softDrop: false,
    gravityCounter: 0,
    lockCounter: 0,
    lockResets: 0,
    rng: mulberry32(seed),
  }
  refillQueue(state)
  spawn(state)
  return state
}

function grounded(state: TetrisState): boolean {
  const piece = state.piece!
  return collides(state, { ...piece, y: piece.y + 1 })
}

/** 바닥에 닿은 상태에서 움직이면 고정까지의 시간을 다시 센다 (횟수 제한 있음). */
function touchLock(state: TetrisState) {
  if (state.lockCounter > 0 && state.lockResets < MAX_LOCK_RESETS) {
    state.lockCounter = 0
    state.lockResets++
  }
}

function tryMove(state: TetrisState, dx: number): boolean {
  const piece = state.piece!
  const moved = { ...piece, x: piece.x + dx }
  if (collides(state, moved)) return false
  state.piece = moved
  touchLock(state)
  return true
}

function tryRotate(state: TetrisState, dir: 1 | -1): boolean {
  const piece = state.piece!
  if (piece.type === 'O') return false
  const to = (piece.rotation + dir + 4) % 4
  const kicks = (piece.type === 'I' ? KICKS_I : KICKS_JLSTZ)[`${piece.rotation}>${to}`]
  for (const [kx, ky] of kicks) {
    const rotated = { ...piece, rotation: to, x: piece.x + kx, y: piece.y - ky }
    if (!collides(state, rotated)) {
      state.piece = rotated
      touchLock(state)
      return true
    }
  }
  return false
}

function lockPiece(state: TetrisState) {
  const piece = state.piece!
  const color = PIECES.indexOf(piece.type) + 1
  let aboveVisible = true
  for (const [x, y] of pieceCells(piece)) {
    if (y >= 0) state.board[y][x] = color
    if (y >= HIDDEN_ROWS) aboveVisible = false
  }
  state.piece = null

  const kept = state.board.filter((row) => row.some((cell) => !cell))
  const cleared = ROWS - kept.length
  if (cleared > 0) {
    state.board = [...Array.from({ length: cleared }, () => Array<number>(COLS).fill(0)), ...kept]
    state.score += LINE_SCORES[cleared] * state.level
    state.lines += cleared
    if (cleared === 4) state.tetrises++
    state.level = Math.floor(state.lines / 10) + 1
  }

  // 화면 위에서만 굳었으면 끝
  if (aboveVisible && cleared === 0) {
    state.over = true
    return
  }
  state.canHold = true
  spawn(state)
}

/** 지금 블록이 그대로 떨어졌을 때 멈추는 y (고스트) */
export function ghostY(state: TetrisState): number | null {
  if (!state.piece) return null
  let y = state.piece.y
  while (!collides(state, { ...state.piece, y: y + 1 })) y++
  return y
}

export function gravityInterval(level: number): number {
  if (level >= 29) return 1
  return GRAVITY_FRAMES[Math.min(level, GRAVITY_FRAMES.length) - 1]
}

/** 입력 하나를 적용한다. 끝난 판에서는 아무 일도 하지 않는다. */
export function applyAction(state: TetrisState, action: TetrisAction) {
  if (state.over) return
  if (action === 'end') {
    state.over = true
    return
  }
  if (action === 'softOn') state.softDrop = true
  else if (action === 'softOff') state.softDrop = false
  if (!state.piece) return

  if (action === 'left') tryMove(state, -1)
  else if (action === 'right') tryMove(state, 1)
  else if (action === 'rotateCW') tryRotate(state, 1)
  else if (action === 'rotateCCW') tryRotate(state, -1)
  else if (action === 'hardDrop') {
    const y = ghostY(state)!
    state.score += (y - state.piece.y) * 2
    state.piece = { ...state.piece, y }
    lockPiece(state)
  } else if (action === 'hold') {
    if (!state.canHold) return
    const current = state.piece.type
    const swap = state.hold
    state.hold = current
    state.canHold = false
    spawn(state, swap ?? undefined)
  }
}

/** 한 프레임 진행: 중력, 바닥에 닿았으면 고정 대기. */
export function stepFrame(state: TetrisState) {
  if (state.over) return
  state.frame++
  if (!state.piece) return

  if (grounded(state)) {
    state.gravityCounter = 0
    state.lockCounter++
    if (state.lockCounter >= LOCK_DELAY) lockPiece(state)
    return
  }

  state.lockCounter = 0
  const interval = state.softDrop ? Math.min(SOFT_DROP_INTERVAL, gravityInterval(state.level)) : gravityInterval(state.level)
  state.gravityCounter++
  if (state.gravityCounter >= interval) {
    state.gravityCounter = 0
    state.piece = { ...state.piece, y: state.piece.y + 1 }
    if (state.softDrop) state.score += 1
  }
}

export function resultOf(state: TetrisState): TetrisResult {
  return { score: state.score, lines: state.lines, tetrises: state.tetrises, frames: state.frame, level: state.level }
}

/** 입력 기록이 형식에 맞는지 (프레임이 뒤로 가지 않는 정수, 아는 동작) */
export function isValidTetrisInputs(inputs: unknown): inputs is TetrisInput[] {
  if (!Array.isArray(inputs) || inputs.length > MAX_INPUTS) return false
  let last = 0
  for (const input of inputs) {
    if (!input || typeof input !== 'object') return false
    const { frame, action } = input as TetrisInput
    if (!Number.isSafeInteger(frame) || frame < last || frame > MAX_FRAMES) return false
    if (!TETRIS_ACTIONS.includes(action)) return false
    last = frame
  }
  return true
}

/**
 * 입력 기록을 처음부터 다시 실행한다. 프레임 f 의 입력은 f 번째 프레임을 진행하기 전에 적용된다.
 * 입력이 끝났는데 판이 안 끝났으면 아무 입력 없이 끝날 때까지 진행한다.
 */
export function replay(seed: number, inputs: TetrisInput[]): TetrisResult {
  const state = createTetris(seed)
  let index = 0
  while (!state.over && state.frame < MAX_FRAMES) {
    while (index < inputs.length && inputs[index].frame <= state.frame) {
      applyAction(state, inputs[index].action)
      index++
    }
    stepFrame(state)
  }
  return resultOf(state)
}
