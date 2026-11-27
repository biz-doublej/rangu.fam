import { mulberry32 } from '../rng'
import type { RoomGame, RoomUser } from '../rooms/base'
import { CATCHMIND_WORDS } from './words'

/**
 * 캐치마인드 — 한 사람이 그리고 나머지가 맞힌다. 출제자는 순서대로 돌아간다.
 *
 * - 라운드 80초. 모두 맞히거나 시간이 끝나면 정답을 공개하고 다음 사람으로 넘어간다.
 * - 정답 판정은 공백·대소문자를 무시한다. 맞힌 답은 다른 사람에게 보이지 않는다.
 * - 제시어는 출제자(와 이미 맞힌 사람)에게만 보낸다.
 * - 그림은 방 상태와 따로 흐른다: 출제자가 획을 50ms 단위로 묶어 보내면(stream) 다른 사람에게 그대로 전달하고,
 *   서버는 이번 라운드의 그림을 쌓아 두었다가 늦게 들어온 사람에게 통째로 보낸다(streamSnapshot).
 *   좌표는 0~CATCHMIND_SIZE 의 정수, 색은 팔레트 번호, 두께는 정수.
 */

export const CATCHMIND_ROUND_MS = 80_000
export const CATCHMIND_REVEAL_MS = 5_000
export const CATCHMIND_SIZE = { width: 800, height: 600 }
export const CATCHMIND_COLORS = ['#1b1b1f', '#d63a2f', '#e8842b', '#e5b81f', '#3fa652', '#2f6fd6', '#9a4fc7', '#8a5a2b', '#ffffff']
export const CATCHMIND_WIDTHS = [3, 6, 12, 24]
export const CATCHMIND_GUESS_MAX = 30
const MAX_POINTS_PER_MESSAGE = 400
const MAX_POINTS_PER_ROUND = 60_000
const MAX_STROKES_PER_ROUND = 2_000
const LOG_KEEP = 40
const GUESS_MIN_INTERVAL_MS = 400
const MIN_ACTIVE = 3

export type CatchmindPhase = 'draw' | 'reveal' | 'done'
export type CatchmindAction = { type: 'guess'; text: string }

/** 획 하나: 색 번호, 두께, 점들 [x0, y0, x1, y1, …] */
export interface CatchmindStroke {
  id: number
  c: number
  w: number
  p: number[]
}

/** 출제자가 보내는 흐름 자료 */
export type CatchmindStreamIn = { t: 'stroke'; id: number; c: number; w: number; p: number[] } | { t: 'clear' }

export interface CatchmindState {
  players: RoomUser[]
  active: string[]
  /** 라운드별 출제자 */
  drawers: string[]
  words: string[]
  round: number
  phase: CatchmindPhase
  phaseStartedAt: number
  deadline: number
  strokes: CatchmindStroke[]
  pointCount: number
  /** 이번 라운드에 맞힌 사람 (맞힌 순서) */
  correct: string[]
  log: Array<{ id: number; userId: string; text: string | null; correct: boolean }>
  logSeq: number
  lastGuessAt: Record<string, number>
  scores: Record<string, number>
  /** 보상 계산용 집계 */
  stats: Record<string, { correct: number; first: number; drawnGuessed: number }>
  completed: boolean
  startedAt: number
  endedAt: number | null
}

/** 정답 비교용: 공백을 없애고 소문자로 */
export function normalizeGuess(raw: unknown): string {
  return String(raw ?? '').normalize('NFC').replace(/\s+/g, '').toLowerCase()
}

/** 맞히는 사람에게 보여 줄 힌트: 글자는 ○, 띄어쓰기는 그대로 */
export function wordHint(word: string): string {
  return Array.from(word).map((ch) => (ch === ' ' ? ' ' : '○')).join('')
}

/** 인원에 따른 라운드 수 — 모두가 같은 횟수만큼 그린다 */
export function catchmindRoundCount(players: number): number {
  return players * (players <= 3 ? 2 : 1)
}

const drawerOf = (state: CatchmindState): string => state.drawers[state.round]
const guessers = (state: CatchmindState): string[] => state.active.filter((id) => id !== drawerOf(state))

function endRound(state: CatchmindState, now: number) {
  state.phase = 'reveal'
  state.phaseStartedAt = now
  state.deadline = now + CATCHMIND_REVEAL_MS
}

function nextRound(state: CatchmindState, now: number) {
  let round = state.round + 1
  // 나간 사람의 차례는 건너뛴다
  while (round < state.drawers.length && !state.active.includes(state.drawers[round])) round++
  if (round >= state.drawers.length) {
    state.completed = true
    state.phase = 'done'
    state.endedAt = now
    return
  }
  state.round = round
  state.phase = 'draw'
  state.phaseStartedAt = now
  state.deadline = now + CATCHMIND_ROUND_MS
  state.strokes = []
  state.pointCount = 0
  state.correct = []
  state.log = []
}

const isInt = (value: unknown, min: number, max: number): value is number =>
  Number.isInteger(value) && (value as number) >= min && (value as number) <= max

export const catchmindGame: RoomGame<CatchmindState, CatchmindAction> = {
  id: 'catchmind',
  name: '캐치마인드',
  minPlayers: 3,
  maxPlayers: 8,

  init(players, { now, seed }) {
    const rng = mulberry32(seed)
    const shuffle = <T>(items: T[]): T[] => {
      const copy = [...items]
      for (let i = copy.length - 1; i > 0; i--) {
        const j = Math.floor(rng() * (i + 1))
        ;[copy[i], copy[j]] = [copy[j], copy[i]]
      }
      return copy
    }
    const laps = catchmindRoundCount(players.length) / players.length
    // 출제자는 들어온 순서대로 돌아간다
    const drawers = Array.from({ length: laps }, () => players.map((player) => player.userId)).flat()
    return {
      players,
      active: players.map((player) => player.userId),
      drawers,
      words: shuffle(CATCHMIND_WORDS).slice(0, drawers.length),
      round: 0,
      phase: 'draw',
      phaseStartedAt: now,
      deadline: now + CATCHMIND_ROUND_MS,
      strokes: [],
      pointCount: 0,
      correct: [],
      log: [],
      logSeq: 0,
      lastGuessAt: {},
      scores: Object.fromEntries(players.map((player) => [player.userId, 0])),
      stats: Object.fromEntries(players.map((player) => [player.userId, { correct: 0, first: 0, drawnGuessed: 0 }])),
      completed: false,
      startedAt: now,
      endedAt: null,
    }
  },

  apply(state, userId, action, now) {
    if (state.phase === 'done') return { ok: false, error: '이미 끝난 판입니다.' }
    if (!state.active.includes(userId)) return { ok: false, error: '이 판의 참가자가 아닙니다.' }
    if (action?.type !== 'guess') return { ok: false, error: '알 수 없는 동작입니다.' }
    if (state.phase !== 'draw') return { ok: false, error: '지금은 맞힐 수 없습니다.' }
    if (userId === drawerOf(state)) return { ok: false, error: '출제자는 맞힐 수 없습니다.' }
    if (state.correct.includes(userId)) return { ok: false, error: '이미 맞혔습니다.' }
    const text = Array.from(String(action.text ?? '').replace(/[\u0000-\u001f\u007f]+/g, ' ').trim()).slice(0, CATCHMIND_GUESS_MAX).join('')
    if (!text) return { ok: false, error: '답을 적어 주세요.' }
    if (now - (state.lastGuessAt[userId] ?? -Infinity) < GUESS_MIN_INTERVAL_MS) return { ok: false, error: '조금 천천히 보내 주세요.' }
    state.lastGuessAt[userId] = now

    const right = normalizeGuess(text) === normalizeGuess(state.words[state.round])
    // 맞힌 답은 글자를 남기지 않는다 (다른 사람이 보고 따라 적지 못하게)
    state.log.push({ id: ++state.logSeq, userId, text: right ? null : text, correct: right })
    if (state.log.length > LOG_KEEP) state.log = state.log.slice(-LOG_KEEP)

    if (right) {
      const drawer = drawerOf(state)
      const secondsLeft = Math.max(0, Math.ceil((state.deadline - now) / 1000))
      state.correct.push(userId)
      state.scores[userId] += 100 + secondsLeft
      state.scores[drawer] += 50
      state.stats[userId].correct++
      if (state.correct.length === 1) state.stats[userId].first++
      state.stats[drawer].drawnGuessed++
      if (guessers(state).every((id) => state.correct.includes(id))) endRound(state, now)
    }
    return { ok: true }
  },

  tick(state, now) {
    if (state.phase === 'done' || now < state.deadline) return false
    if (state.phase === 'draw') endRound(state, now)
    else nextRound(state, now)
    return true
  },

  abandon(state, userId, now) {
    if (state.phase === 'done' || !state.active.includes(userId)) return
    const wasDrawer = drawerOf(state) === userId
    state.active = state.active.filter((id) => id !== userId)
    if (state.active.length < MIN_ACTIVE) {
      state.completed = false
      state.phase = 'done'
      state.endedAt = now
      return
    }
    if (state.phase !== 'draw') return
    // 출제자가 나가면 그 라운드는 끝낸다. 맞힐 사람이 모두 맞힌 상태가 됐어도 끝낸다.
    if (wasDrawer || guessers(state).every((id) => state.correct.includes(id))) endRound(state, now)
  },

  result(state) {
    if (state.phase !== 'done') return null
    const sorted = [...state.players].sort((a, b) => state.scores[b.userId] - state.scores[a.userId])
    const ranks: Record<string, number> = {}
    sorted.forEach((player, index) => {
      const previous = sorted[index - 1]
      ranks[player.userId] = previous && state.scores[previous.userId] === state.scores[player.userId] ? ranks[previous.userId] : index + 1
    })
    return {
      players: state.players.map((player) => ({
        userId: player.userId,
        rank: ranks[player.userId],
        score: state.scores[player.userId],
        stats: { ...state.stats[player.userId], stayed: state.active.includes(player.userId) ? 1 : 0 },
      })),
      summary: {
        completed: state.completed,
        rounds: state.drawers.length,
        playerCount: state.players.length,
        durationMs: (state.endedAt ?? state.startedAt) - state.startedAt,
      },
    }
  },

  view(state, userId) {
    const word = state.words[state.round]
    const drawer = drawerOf(state)
    const knows = userId === drawer || state.correct.includes(userId) || state.phase !== 'draw'
    return {
      players: state.players,
      active: state.active,
      phase: state.phase,
      round: state.round,
      rounds: state.drawers.length,
      drawer,
      deadline: state.deadline,
      // 제시어는 출제자와 이미 맞힌 사람에게만. 나머지는 글자 수만 본다.
      word: knows ? word : null,
      hint: wordHint(word),
      correct: state.correct,
      log: state.log,
      scores: state.scores,
      completed: state.completed,
    }
  },

  stream(state, userId, raw, now) {
    if (state.phase !== 'draw') return { ok: false, error: '지금은 그릴 수 없습니다.' }
    if (userId !== drawerOf(state)) return { ok: false, error: '출제자만 그릴 수 있습니다.' }
    const payload = raw as CatchmindStreamIn
    if (payload?.t === 'clear') {
      state.strokes = []
      state.pointCount = 0
      return { ok: true, relay: { t: 'clear' } }
    }
    if (payload?.t !== 'stroke') return { ok: false, error: '알 수 없는 자료입니다.' }
    const { id, c, w, p } = payload
    if (!isInt(id, 0, 1_000_000) || !isInt(c, 0, CATCHMIND_COLORS.length - 1) || !isInt(w, 1, 40)) {
      return { ok: false, error: '획 형식이 올바르지 않습니다.' }
    }
    if (!Array.isArray(p) || p.length < 2 || p.length % 2 !== 0 || p.length > MAX_POINTS_PER_MESSAGE * 2) {
      return { ok: false, error: '획 형식이 올바르지 않습니다.' }
    }
    for (let i = 0; i < p.length; i += 2) {
      if (!isInt(p[i], 0, CATCHMIND_SIZE.width) || !isInt(p[i + 1], 0, CATCHMIND_SIZE.height)) {
        return { ok: false, error: '좌표가 올바르지 않습니다.' }
      }
    }
    if (state.pointCount + p.length / 2 > MAX_POINTS_PER_ROUND) return { ok: false, error: '그림이 너무 큽니다. 지우고 다시 그려 주세요.' }

    // 같은 id 의 획은 이어 붙인다 (50ms 마다 나눠 오기 때문)
    const last = state.strokes[state.strokes.length - 1]
    if (last && last.id === id) last.p.push(...p)
    else {
      if (state.strokes.length >= MAX_STROKES_PER_ROUND) return { ok: false, error: '그림이 너무 큽니다. 지우고 다시 그려 주세요.' }
      state.strokes.push({ id, c, w, p: [...p] })
    }
    state.pointCount += p.length / 2
    return { ok: true, relay: { t: 'stroke', id, c, w, p } }
  },

  streamSnapshot(state) {
    return { t: 'full', round: state.round, strokes: state.phase === 'done' ? [] : state.strokes }
  },
}

export interface CatchmindView {
  players: RoomUser[]
  active: string[]
  phase: CatchmindPhase
  round: number
  rounds: number
  drawer: string
  deadline: number
  word: string | null
  hint: string
  correct: string[]
  log: Array<{ id: number; userId: string; text: string | null; correct: boolean }>
  scores: Record<string, number>
  completed: boolean
}
