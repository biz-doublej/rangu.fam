import { describe, expect, it } from 'vitest'
import { OMOK_SIZE, OMOK_TURN_MS, findExactFive, omokGame, type OmokState } from './rules'

const A = { userId: 'a', name: '가' }
const B = { userId: 'b', name: '나' }
const start = (round = 0, now = 0) => omokGame.init([A, B], { now, seed: 1, round })
const place = (state: OmokState, userId: string, x: number, y: number, now = 1000) => omokGame.apply(state, userId, { type: 'place', x, y }, now)

/** 흑이 (0..n-1, 7) 에, 백이 (0..n-1, 0) 에 번갈아 둔다 */
function playRow(state: OmokState, blackXs: number[], whiteXs: number[]) {
  const black = state.black
  const white = state.white
  for (let i = 0; i < blackXs.length; i++) {
    place(state, black, blackXs[i], 7)
    if (state.endReason) return
    if (i < whiteXs.length) place(state, white, whiteXs[i], 0)
  }
}

describe('오목 규칙', () => {
  it('15x15 빈 판에서 흑이 먼저 둔다', () => {
    const state = start()
    expect(state.board).toHaveLength(OMOK_SIZE)
    expect(state.board.every((row) => row.length === OMOK_SIZE && row.every((cell) => cell === 0))).toBe(true)
    expect(state).toMatchObject({ black: 'a', white: 'b', turn: 'black', turnDeadline: OMOK_TURN_MS })
    expect(place(state, 'b', 7, 7)).toEqual({ ok: false, error: '상대 차례입니다.' })
    expect(place(state, 'a', 7, 7)).toEqual({ ok: true })
    expect(state.turn).toBe('white')
  })

  it('판마다 선공이 바뀐다', () => {
    expect(start(0)).toMatchObject({ black: 'a', white: 'b' })
    expect(start(1)).toMatchObject({ black: 'b', white: 'a' })
    expect(start(2)).toMatchObject({ black: 'a', white: 'b' })
  })

  it('판 밖·이미 돌이 있는 자리·남의 판은 둘 수 없다', () => {
    const state = start()
    expect(place(state, 'a', 15, 0).ok).toBe(false)
    expect(place(state, 'a', -1, 0).ok).toBe(false)
    expect(place(state, 'a', 1.5, 0).ok).toBe(false)
    expect(place(state, 'c', 0, 0).ok).toBe(false)
    place(state, 'a', 3, 3)
    expect(place(state, 'b', 3, 3)).toEqual({ ok: false, error: '이미 돌이 있는 자리입니다.' })
    expect(state.moves).toBe(1)
  })

  it('가로·세로·대각선 다섯 개가 이어지면 이긴다', () => {
    const row = start()
    playRow(row, [3, 4, 5, 6, 7], [0, 1, 2, 3])
    expect(row).toMatchObject({ winner: 'black', endReason: 'five', moves: 9 })
    expect(row.winLine).toEqual([3, 4, 5, 6, 7].map((x) => ({ x, y: 7 })))

    for (const [dx, dy] of [[0, 1], [1, 1], [1, -1]]) {
      const board = Array.from({ length: OMOK_SIZE }, () => Array<number>(OMOK_SIZE).fill(0))
      for (let i = 0; i < 5; i++) board[7 + dy * (i - 2)][7 + dx * (i - 2)] = 2
      expect(findExactFive(board, 7, 7)).toHaveLength(5)
    }
  })

  it('여섯 개(장목)는 승리가 아니고 판이 이어진다', () => {
    const state = start()
    // 흑: 2 3 4 _ 6 7 을 먼저 두고 가운데 5 를 채워 여섯 개를 만든다
    playRow(state, [2, 3, 4, 6, 7, 5], [0, 1, 2, 3, 5])
    expect(state.board[7].slice(2, 8)).toEqual([1, 1, 1, 1, 1, 1])
    expect(state.endReason).toBeNull()
    expect(state.turn).toBe('white')
  })

  it('네 개까지는 아직 승리가 아니다', () => {
    const state = start()
    playRow(state, [3, 4, 5, 6], [0, 1, 2, 3])
    expect(state.endReason).toBeNull()
  })

  it('백도 다섯 개를 만들면 이긴다', () => {
    const state = start()
    // 흑은 흩어 두고 백이 맨 윗줄에 다섯 개
    const blackMoves = [[0, 14], [2, 12], [4, 10], [6, 8], [8, 6]]
    for (let i = 0; i < 5; i++) {
      place(state, 'a', blackMoves[i][0], blackMoves[i][1])
      place(state, 'b', i, 0)
    }
    expect(state).toMatchObject({ winner: 'white', endReason: 'five' })
  })

  it('30초 안에 두지 않으면 시간패', () => {
    const state = start(0, 0)
    expect(omokGame.tick(state, OMOK_TURN_MS - 1)).toBe(false)
    place(state, 'a', 7, 7, 10_000)
    expect(state.turnDeadline).toBe(10_000 + OMOK_TURN_MS)
    expect(omokGame.tick(state, 39_999)).toBe(false)
    expect(omokGame.tick(state, 40_000)).toBe(true)
    expect(state).toMatchObject({ winner: 'black', endReason: 'timeout' })
    expect(omokGame.tick(state, 99_000)).toBe(false) // 한 번만
  })

  it('기권하면 상대가 이긴다 (자기 차례가 아니어도 가능)', () => {
    const state = start()
    expect(omokGame.apply(state, 'b', { type: 'resign' }, 500)).toEqual({ ok: true })
    expect(state).toMatchObject({ winner: 'black', endReason: 'resign' })
    expect(place(state, 'a', 0, 0)).toEqual({ ok: false, error: '이미 끝난 판입니다.' })
  })

  it('자리를 비우고 돌아오지 않으면 상대 승', () => {
    const state = start()
    omokGame.abandon(state, 'a', 5000)
    expect(state).toMatchObject({ winner: 'white', endReason: 'abandon' })
  })

  it('결과: 이긴 사람이 1위, 수와 이유가 요약에 들어간다', () => {
    const state = start()
    expect(omokGame.result(state)).toBeNull()
    playRow(state, [3, 4, 5, 6, 7], [0, 1, 2, 3])
    expect(omokGame.result(state)).toEqual({
      players: [
        { userId: 'a', rank: 1, score: 1, role: 'black' },
        { userId: 'b', rank: 2, score: 0, role: 'white' },
      ],
      summary: { reason: 'five', moves: 9, durationMs: 1000 },
    })
  })

  it('판이 가득 차면 무승부', () => {
    const state = start()
    state.moves = OMOK_SIZE * OMOK_SIZE - 1
    place(state, 'a', 0, 0)
    expect(state).toMatchObject({ winner: null, endReason: 'draw' })
    expect(omokGame.result(state)!.players.map((player) => player.rank)).toEqual([1, 1])
  })
})
