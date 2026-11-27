import { mulberry32 } from '../rng'
import type { RoomGame, RoomUser } from '../rooms/base'
import { DONE, WAITING, moveBack, moveForward, type PiecePosition } from './board'

/**
 * 윷놀이. 2~4명 개인전, 또는 4명이 2팀(자리 1·3 대 2·4).
 *
 * - 윷은 서버가 던진다 (시드 난수). 화면은 결과를 받아 보여 주기만 한다. 시드는 화면에 보내지 않는다.
 * - 한 편에 말 4개. 윷·모가 나오면 한 번 더 던지고, 상대 말을 잡으면 한 번 더 던진다.
 * - 자기 말이 있는 자리에 서면 업고 같이 다닌다. 빽도는 판 위의 말을 한 칸 뒤로.
 * - 말 4개가 먼저 다 나면 이긴다.
 */

export const YUT_THROW_MS = 20_000
export const YUT_MOVE_MS = 30_000
export const YUT_PIECES = 4

export type YutResult = 'backdo' | 'do' | 'gae' | 'geol' | 'yut' | 'mo'
export const YUT_STEPS: Record<YutResult, number> = { backdo: -1, do: 1, gae: 2, geol: 3, yut: 4, mo: 5 }
export const YUT_NAMES: Record<YutResult, string> = { backdo: '빽도', do: '도', gae: '개', geol: '걸', yut: '윷', mo: '모' }

export type YutAction = { type: 'throw' } | { type: 'move'; pending: number; piece: number }
export type YutPhase = 'throw' | 'move' | 'done'

export interface YutSide {
  name: string
  members: string[]
  pieces: PiecePosition[]
  /** 구성원이 모두 나간 편 */
  out: boolean
}

export interface YutState {
  players: RoomUser[]
  active: string[]
  team: boolean
  sides: YutSide[]
  /** 던지는 순서 (userId) */
  order: string[]
  turn: number
  phase: YutPhase
  deadline: number
  /** 이번 차례에 더 던질 수 있는 횟수 */
  throwsLeft: number
  /** 던져 놓고 아직 쓰지 않은 결과 */
  pending: YutResult[]
  lastThrow: { by: string; result: YutResult; sticks: number[] } | null
  lastEvent: string | null
  seed: number
  throws: number
  winner: number | null
  endReason: 'finish' | 'abandon' | null
  startedAt: number
  endedAt: number | null
}

/**
 * 윷 네 가락을 던진다. 가락마다 배(평평한 면)가 위로 올 확률은 1/2.
 * 배가 1개면 도(그 가락이 표시된 첫 가락이면 빽도), 2개 개, 3개 걸, 4개 윷, 0개 모.
 */
export function throwYut(seed: number, n: number): { result: YutResult; sticks: number[] } {
  const rng = mulberry32((seed ^ Math.imul(n + 1, 0x9e3779b1)) >>> 0)
  const sticks: number[] = [0, 1, 2, 3].map(() => (rng() < 0.5 ? 1 : 0))
  const flats = sticks.reduce((sum, stick) => sum + stick, 0)
  const result: YutResult = flats === 0 ? 'mo' : flats === 1 ? (sticks[0] === 1 ? 'backdo' : 'do') : flats === 2 ? 'gae' : flats === 3 ? 'geol' : 'yut'
  return { result, sticks }
}

export const yutThrower = (state: YutState): string => state.order[state.turn % state.order.length]
export const yutSideOf = (state: YutState, userId: string): number => state.sides.findIndex((side) => side.members.includes(userId))

export interface YutMove {
  pending: number
  piece: number
  to: PiecePosition
}

/** 지금 그 편이 둘 수 있는 수 전부 */
export function yutLegalMoves(state: YutState, sideIndex: number): YutMove[] {
  const side = state.sides[sideIndex]
  if (!side || state.phase !== 'move') return []
  const moves: YutMove[] = []
  state.pending.forEach((result, pending) => {
    const seen = new Set<number>()
    side.pieces.forEach((piece, index) => {
      if (piece.pos === DONE) return
      // 업힌 말들과 대기 중인 말들은 어느 것을 골라도 같은 수라 하나만 낸다
      if (seen.has(piece.pos)) return
      seen.add(piece.pos)
      if (result === 'backdo') {
        if (piece.pos === WAITING) return
        moves.push({ pending, piece: index, to: moveBack(piece) })
      } else {
        moves.push({ pending, piece: index, to: moveForward(piece, YUT_STEPS[result]) })
      }
    })
  })
  return moves
}

function finish(state: YutState, winner: number | null, reason: NonNullable<YutState['endReason']>, now: number) {
  state.phase = 'done'
  state.winner = winner
  state.endReason = reason
  state.endedAt = now
  state.pending = []
}

function nextTurn(state: YutState, now: number) {
  for (let i = 0; i < state.order.length; i++) {
    state.turn++
    if (state.active.includes(yutThrower(state))) break
  }
  state.phase = 'throw'
  state.throwsLeft = 1
  state.pending = []
  state.deadline = now + YUT_THROW_MS
}

/** 쓸 수 있는 결과가 남았으면 말 옮기기, 아니면 더 던지거나 차례를 넘긴다. */
function settle(state: YutState, now: number) {
  if (state.phase === 'done') return
  const sideIndex = yutSideOf(state, yutThrower(state))
  if (state.throwsLeft > 0) {
    state.phase = 'throw'
    state.deadline = now + YUT_THROW_MS
    return
  }
  state.phase = 'move'
  // 둘 수 없는 결과(판에 말이 없는데 빽도)는 버린다
  const usable = new Set(yutLegalMoves(state, sideIndex).map((move) => move.pending))
  state.pending = state.pending.filter((_, index) => usable.has(index))
  if (state.pending.length === 0) nextTurn(state, now)
  else state.deadline = now + YUT_MOVE_MS
}

function doThrow(state: YutState, userId: string, now: number) {
  const thrown = throwYut(state.seed, state.throws++)
  state.lastThrow = { by: userId, ...thrown }
  state.lastEvent = null
  state.pending.push(thrown.result)
  state.throwsLeft--
  // 윷·모는 한 번 더
  if (thrown.result === 'yut' || thrown.result === 'mo') state.throwsLeft++
  settle(state, now)
}

function doMove(state: YutState, sideIndex: number, move: YutMove, now: number) {
  const side = state.sides[sideIndex]
  const origin = side.pieces[move.piece].pos
  // 판 위에서는 업힌 말이 함께 움직이고, 대기 중인 말은 하나씩 올라온다
  const group = origin === WAITING ? [side.pieces[move.piece]] : side.pieces.filter((piece) => piece.pos === origin)
  for (const piece of group) {
    piece.pos = move.to.pos
    piece.from = move.to.from
  }
  state.pending.splice(move.pending, 1)
  state.lastEvent = null

  if (move.to.pos === DONE) {
    state.lastEvent = `${side.name}: 말 ${group.length}개가 났습니다`
  } else {
    let caught = 0
    state.sides.forEach((other, index) => {
      if (index === sideIndex) return
      for (const piece of other.pieces) {
        if (piece.pos === move.to.pos) {
          piece.pos = WAITING
          piece.from = undefined
          caught++
        }
      }
    })
    if (caught > 0) {
      // 잡으면 한 번 더 던진다
      state.throwsLeft++
      state.lastEvent = `${side.name}: 상대 말 ${caught}개를 잡았습니다 — 한 번 더!`
    } else if (side.pieces.filter((piece) => piece.pos === move.to.pos).length > group.length) {
      state.lastEvent = `${side.name}: 말을 업었습니다`
    }
  }

  if (side.pieces.every((piece) => piece.pos === DONE)) {
    finish(state, sideIndex, 'finish', now)
    return
  }
  settle(state, now)
}

export const yutGame: RoomGame<YutState, YutAction> = {
  id: 'yut',
  name: '윷놀이',
  minPlayers: 2,
  maxPlayers: 4,

  validate(players, _data) {
    return null
  },

  init(players, { now, seed, options }) {
    // 팀전은 4명일 때만: 자리 1·3 대 2·4
    const team = players.length === 4 && options?.team === true
    const newPieces = (): PiecePosition[] => Array.from({ length: YUT_PIECES }, () => ({ pos: WAITING }))
    const sides: YutSide[] = team
      ? [0, 1].map((index) => ({
          name: `${index + 1}팀`,
          members: [players[index].userId, players[index + 2].userId],
          pieces: newPieces(),
          out: false,
        }))
      : players.map((player) => ({ name: player.name, members: [player.userId], pieces: newPieces(), out: false }))
    return {
      players,
      active: players.map((player) => player.userId),
      team,
      sides,
      order: players.map((player) => player.userId),
      turn: 0,
      phase: 'throw',
      deadline: now + YUT_THROW_MS,
      throwsLeft: 1,
      pending: [],
      lastThrow: null,
      lastEvent: null,
      seed,
      throws: 0,
      winner: null,
      endReason: null,
      startedAt: now,
      endedAt: null,
    }
  },

  apply(state, userId, action, now) {
    if (state.phase === 'done') return { ok: false, error: '이미 끝난 판입니다.' }
    if (!state.active.includes(userId)) return { ok: false, error: '이 판의 참가자가 아닙니다.' }
    if (yutThrower(state) !== userId) return { ok: false, error: '내 차례가 아닙니다.' }

    if (action?.type === 'throw') {
      if (state.phase !== 'throw') return { ok: false, error: '먼저 말을 옮겨 주세요.' }
      doThrow(state, userId, now)
      return { ok: true }
    }
    if (action?.type === 'move') {
      if (state.phase !== 'move') return { ok: false, error: '먼저 윷을 던져 주세요.' }
      const sideIndex = yutSideOf(state, userId)
      const origin = state.sides[sideIndex].pieces[action.piece]?.pos
      // 업힌 말은 어느 것을 골라도 같은 수다
      const move = yutLegalMoves(state, sideIndex).find(
        (entry) => entry.pending === action.pending && state.sides[sideIndex].pieces[entry.piece].pos === origin
      )
      if (!move) return { ok: false, error: '둘 수 없는 수입니다.' }
      doMove(state, sideIndex, move, now)
      return { ok: true }
    }
    return { ok: false, error: '알 수 없는 동작입니다.' }
  },

  tick(state, now) {
    if (state.phase === 'done' || now < state.deadline) return false
    const thrower = yutThrower(state)
    if (state.phase === 'throw') {
      doThrow(state, thrower, now)
    } else {
      // 시간 안에 고르지 않으면 둘 수 있는 첫 수를 둔다
      const sideIndex = yutSideOf(state, thrower)
      const move = yutLegalMoves(state, sideIndex)[0]
      if (move) doMove(state, sideIndex, move, now)
      else nextTurn(state, now)
    }
    return true
  },

  abandon(state, userId, now) {
    if (state.phase === 'done' || !state.active.includes(userId)) return
    const wasThrower = yutThrower(state) === userId
    state.active = state.active.filter((id) => id !== userId)
    const side = state.sides[yutSideOf(state, userId)]
    if (side && !side.members.some((member) => state.active.includes(member))) {
      // 편 전체가 나갔으면 그 편의 말을 판에서 치운다
      side.out = true
      for (const piece of side.pieces) if (piece.pos !== DONE) piece.pos = WAITING
    }
    const remaining = state.sides.map((entry, index) => ({ entry, index })).filter(({ entry }) => !entry.out)
    if (remaining.length <= 1) {
      finish(state, remaining[0]?.index ?? null, 'abandon', now)
      return
    }
    if (wasThrower) nextTurn(state, now)
  },

  result(state) {
    if (state.phase !== 'done') return null
    return {
      players: state.players.map((player) => {
        const won = state.winner !== null && yutSideOf(state, player.userId) === state.winner
        return {
          userId: player.userId,
          rank: won ? 1 : 2,
          score: won ? 1 : 0,
          stats: { won: won ? 1 : 0, stayed: state.active.includes(player.userId) ? 1 : 0 },
        }
      }),
      summary: {
        completed: state.winner !== null,
        reason: state.endReason,
        team: state.team,
        throws: state.throws,
        playerCount: state.players.length,
        durationMs: (state.endedAt ?? state.startedAt) - state.startedAt,
      },
    }
  },

  view(state, userId) {
    // 시드를 알면 다음 윷을 미리 알 수 있으므로 내보내지 않는다
    const { seed: _seed, ...visible } = state
    const mySide = yutSideOf(state, userId)
    return {
      ...visible,
      thrower: yutThrower(state),
      mySide,
      moves: state.phase === 'move' && yutThrower(state) === userId ? yutLegalMoves(state, mySide) : [],
    }
  },
}

export type YutView = Omit<YutState, 'seed'> & { thrower: string; mySide: number; moves: YutMove[] }
