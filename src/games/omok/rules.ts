import type { RoomGame, RoomUser } from '../rooms/base'

/**
 * 오목 규칙. 15x15, 흑이 먼저 둔다.
 * 정확히 다섯 개가 이어져야 이긴다 — 여섯 개 이상(장목)은 둘 수는 있지만 승리가 아니다.
 * 렌주 금수(33, 44)는 없다. 한 수에 30초, 넘기면 시간패. 기권 가능.
 */

export const OMOK_SIZE = 15
export const OMOK_TURN_MS = 30_000
const DIRECTIONS: Array<[number, number]> = [
  [1, 0],
  [0, 1],
  [1, 1],
  [1, -1],
]

export type OmokColor = 'black' | 'white'
export type OmokEndReason = 'five' | 'resign' | 'timeout' | 'abandon' | 'draw'

export type OmokAction = { type: 'place'; x: number; y: number } | { type: 'resign' }

export interface OmokState {
  /** board[y][x] — 0 빈칸, 1 흑, 2 백 */
  board: number[][]
  black: string
  white: string
  turn: OmokColor
  moves: number
  lastMove: { x: number; y: number } | null
  /** 이번 수를 둬야 하는 시각 (밀리초) */
  turnDeadline: number
  winner: OmokColor | null
  /** 이긴 다섯 알 */
  winLine: Array<{ x: number; y: number }> | null
  endReason: OmokEndReason | null
  startedAt: number
  endedAt: number | null
}

const other = (color: OmokColor): OmokColor => (color === 'black' ? 'white' : 'black')
const colorOf = (state: OmokState, userId: string): OmokColor | null =>
  userId === state.black ? 'black' : userId === state.white ? 'white' : null

/** (x, y) 를 지나는 같은 색 줄 가운데 길이가 정확히 5인 것 */
export function findExactFive(board: number[][], x: number, y: number): Array<{ x: number; y: number }> | null {
  const stone = board[y]?.[x]
  if (!stone) return null
  for (const [dx, dy] of DIRECTIONS) {
    const line = [{ x, y }]
    for (const sign of [1, -1]) {
      let cx = x + dx * sign
      let cy = y + dy * sign
      while (board[cy]?.[cx] === stone) {
        if (sign === 1) line.push({ x: cx, y: cy })
        else line.unshift({ x: cx, y: cy })
        cx += dx * sign
        cy += dy * sign
      }
    }
    if (line.length === 5) return line
  }
  return null
}

function end(state: OmokState, winner: OmokColor | null, reason: OmokEndReason, now: number) {
  if (state.endReason) return
  state.winner = winner
  state.endReason = reason
  state.endedAt = now
}

export const omokGame: RoomGame<OmokState, OmokAction> = {
  id: 'omok',
  name: '오목',
  minPlayers: 2,
  maxPlayers: 2,

  init(players: RoomUser[], { now, round }) {
    // 판마다 흑(선공)을 번갈아 준다
    const first = round % 2
    return {
      board: Array.from({ length: OMOK_SIZE }, () => Array<number>(OMOK_SIZE).fill(0)),
      black: players[first].userId,
      white: players[1 - first].userId,
      turn: 'black',
      moves: 0,
      lastMove: null,
      turnDeadline: now + OMOK_TURN_MS,
      winner: null,
      winLine: null,
      endReason: null,
      startedAt: now,
      endedAt: null,
    }
  },

  apply(state, userId, action, now) {
    if (state.endReason) return { ok: false, error: '이미 끝난 판입니다.' }
    const color = colorOf(state, userId)
    if (!color) return { ok: false, error: '이 판의 대국자가 아닙니다.' }

    if (action?.type === 'resign') {
      end(state, other(color), 'resign', now)
      return { ok: true }
    }
    if (action?.type !== 'place') return { ok: false, error: '알 수 없는 동작입니다.' }
    if (state.turn !== color) return { ok: false, error: '상대 차례입니다.' }
    const { x, y } = action
    if (!Number.isInteger(x) || !Number.isInteger(y) || x < 0 || y < 0 || x >= OMOK_SIZE || y >= OMOK_SIZE) {
      return { ok: false, error: '판 밖입니다.' }
    }
    if (state.board[y][x]) return { ok: false, error: '이미 돌이 있는 자리입니다.' }

    state.board[y][x] = color === 'black' ? 1 : 2
    state.moves++
    state.lastMove = { x, y }
    const five = findExactFive(state.board, x, y)
    if (five) {
      state.winLine = five
      end(state, color, 'five', now)
    } else if (state.moves >= OMOK_SIZE * OMOK_SIZE) {
      end(state, null, 'draw', now)
    } else {
      state.turn = other(color)
      state.turnDeadline = now + OMOK_TURN_MS
    }
    return { ok: true }
  },

  tick(state, now) {
    if (state.endReason || now < state.turnDeadline) return false
    end(state, other(state.turn), 'timeout', now)
    return true
  },

  abandon(state, userId, now) {
    const color = colorOf(state, userId)
    if (color) end(state, other(color), 'abandon', now)
  },

  result(state) {
    if (!state.endReason) return null
    const rankOf = (color: OmokColor) => (state.winner === null ? 1 : state.winner === color ? 1 : 2)
    return {
      players: [
        { userId: state.black, rank: rankOf('black'), score: state.winner === 'black' ? 1 : 0, role: 'black' },
        { userId: state.white, rank: rankOf('white'), score: state.winner === 'white' ? 1 : 0, role: 'white' },
      ],
      summary: { reason: state.endReason, moves: state.moves, durationMs: (state.endedAt ?? state.startedAt) - state.startedAt },
    }
  },

  // 오목은 숨길 정보가 없다
  view: (state) => state,
}
