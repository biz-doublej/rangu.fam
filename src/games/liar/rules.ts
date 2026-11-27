import { mulberry32 } from '../rng'
import type { RoomGame, RoomUser } from '../rooms/base'
import { LIAR_CATEGORIES } from './words'

/**
 * 라이어 게임.
 * 한 명(라이어)만 제시어를 모른다. 돌아가며 한 줄씩 설명하고 → 투표로 라이어를 지목한다.
 * - 라이어가 지목되면 제시어를 맞힐 기회가 한 번 있다. 맞히면 라이어 승, 틀리면 시민 승.
 * - 다른 사람이 지목되거나 표가 갈려 동률이면 라이어 승.
 * 제시어는 라이어에게, 라이어가 누구인지는 끝날 때까지 누구에게도 보내지 않는다.
 */

export const LIAR_DESCRIBE_MS = 30_000
export const LIAR_VOTE_MS = 40_000
export const LIAR_GUESS_MS = 25_000
export const LIAR_DESCRIPTION_MAX = 40
const MIN_ACTIVE = 3

export type LiarPhase = 'describe' | 'vote' | 'guess' | 'done'
export type LiarAction =
  | { type: 'describe'; text: string }
  | { type: 'vote'; target: string }
  | { type: 'guess'; word: string }

export interface LiarState {
  players: RoomUser[]
  /** 아직 판에 남아 있는 사람 */
  active: string[]
  liar: string
  category: string
  word: string
  /** 그 분류의 낱말 전부 (라이어가 고를 보기) */
  choices: string[]
  /** 설명 순서 */
  order: string[]
  rounds: number
  /** 지금까지 끝난 설명 차례 수 */
  turn: number
  phase: LiarPhase
  deadline: number
  descriptions: Array<{ userId: string; text: string; round: number }>
  votes: Record<string, string>
  accused: string | null
  liarGuess: string | null
  winner: 'liar' | 'citizens' | null
  endReason: 'caught' | 'guessed' | 'escaped' | 'tie' | 'liar_left' | 'aborted' | null
  startedAt: number
  endedAt: number | null
}

function cleanLine(raw: unknown): string {
  return Array.from(String(raw ?? '').replace(/[\u0000-\u001f\u007f]+/g, ' ').replace(/\s+/g, ' ').trim())
    .slice(0, LIAR_DESCRIPTION_MAX)
    .join('')
}

/** 지금 설명할 사람 (나간 사람의 차례는 건너뛴다) */
export function liarSpeaker(state: LiarState): string | null {
  if (state.phase !== 'describe') return null
  return state.order[state.turn % state.order.length] ?? null
}

function finish(state: LiarState, winner: LiarState['winner'], reason: NonNullable<LiarState['endReason']>, now: number) {
  if (state.phase === 'done') return
  state.phase = 'done'
  state.winner = winner
  state.endReason = reason
  state.endedAt = now
}

function advanceTurn(state: LiarState, now: number) {
  const total = state.order.length * state.rounds
  do {
    state.turn++
  } while (state.turn < total && !state.active.includes(state.order[state.turn % state.order.length]))
  if (state.turn >= total) {
    state.phase = 'vote'
    state.deadline = now + LIAR_VOTE_MS
  } else {
    state.deadline = now + LIAR_DESCRIBE_MS
  }
}

function closeVote(state: LiarState, now: number) {
  const tally = new Map<string, number>()
  for (const voter of state.active) {
    const target = state.votes[voter]
    if (target) tally.set(target, (tally.get(target) ?? 0) + 1)
  }
  const top = Math.max(0, ...tally.values())
  const leaders = [...tally.entries()].filter(([, count]) => count === top).map(([userId]) => userId)
  if (top === 0 || leaders.length !== 1) {
    finish(state, 'liar', 'tie', now)
    return
  }
  state.accused = leaders[0]
  if (state.accused !== state.liar) {
    finish(state, 'liar', 'escaped', now)
    return
  }
  state.phase = 'guess'
  state.deadline = now + LIAR_GUESS_MS
}

export const liarGame: RoomGame<LiarState, LiarAction> = {
  id: 'liar',
  name: '라이어 게임',
  minPlayers: 3,
  maxPlayers: 8,

  init(players, { now, seed }) {
    const rng = mulberry32(seed)
    const category = LIAR_CATEGORIES[Math.floor(rng() * LIAR_CATEGORIES.length)]
    const word = category.words[Math.floor(rng() * category.words.length)]
    const liar = players[Math.floor(rng() * players.length)].userId
    const order = players.map((player) => player.userId)
    for (let i = order.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1))
      ;[order[i], order[j]] = [order[j], order[i]]
    }
    return {
      players,
      active: players.map((player) => player.userId),
      liar,
      category: category.name,
      word,
      choices: category.words,
      order,
      // 사람이 적으면 두 바퀴 돌아야 단서가 충분하다
      rounds: players.length <= 4 ? 2 : 1,
      turn: 0,
      phase: 'describe',
      deadline: now + LIAR_DESCRIBE_MS,
      descriptions: [],
      votes: {},
      accused: null,
      liarGuess: null,
      winner: null,
      endReason: null,
      startedAt: now,
      endedAt: null,
    }
  },

  apply(state, userId, action, now) {
    if (state.phase === 'done') return { ok: false, error: '이미 끝난 판입니다.' }
    if (!state.active.includes(userId)) return { ok: false, error: '이 판의 참가자가 아닙니다.' }

    if (action?.type === 'describe') {
      if (state.phase !== 'describe') return { ok: false, error: '설명할 때가 아닙니다.' }
      if (liarSpeaker(state) !== userId) return { ok: false, error: '내 차례가 아닙니다.' }
      const text = cleanLine(action.text)
      if (!text) return { ok: false, error: '설명을 적어 주세요.' }
      // 제시어를 그대로 말하면 게임이 안 된다
      if (text.replace(/\s/g, '').includes(state.word.replace(/\s/g, '')) && userId !== state.liar) {
        return { ok: false, error: '제시어를 그대로 말할 수는 없습니다.' }
      }
      state.descriptions.push({ userId, text, round: Math.floor(state.turn / state.order.length) + 1 })
      advanceTurn(state, now)
      return { ok: true }
    }

    if (action?.type === 'vote') {
      if (state.phase !== 'vote') return { ok: false, error: '투표할 때가 아닙니다.' }
      if (action.target === userId) return { ok: false, error: '자기 자신에게는 투표할 수 없습니다.' }
      if (!state.active.includes(action.target)) return { ok: false, error: '투표할 수 없는 사람입니다.' }
      state.votes[userId] = action.target
      if (state.active.every((voter) => state.votes[voter])) closeVote(state, now)
      return { ok: true }
    }

    if (action?.type === 'guess') {
      if (state.phase !== 'guess') return { ok: false, error: '맞힐 때가 아닙니다.' }
      if (userId !== state.liar) return { ok: false, error: '라이어만 맞힐 수 있습니다.' }
      if (!state.choices.includes(action.word)) return { ok: false, error: '보기에 없는 낱말입니다.' }
      state.liarGuess = action.word
      if (action.word === state.word) finish(state, 'liar', 'guessed', now)
      else finish(state, 'citizens', 'caught', now)
      return { ok: true }
    }
    return { ok: false, error: '알 수 없는 동작입니다.' }
  },

  tick(state, now) {
    if (state.phase === 'done' || now < state.deadline) return false
    if (state.phase === 'describe') {
      const speaker = liarSpeaker(state)
      if (speaker) state.descriptions.push({ userId: speaker, text: '(시간 초과)', round: Math.floor(state.turn / state.order.length) + 1 })
      advanceTurn(state, now)
    } else if (state.phase === 'vote') {
      closeVote(state, now)
    } else {
      // 라이어가 시간 안에 고르지 못하면 시민 승
      finish(state, 'citizens', 'caught', now)
    }
    return true
  },

  abandon(state, userId, now) {
    if (state.phase === 'done' || !state.active.includes(userId)) return
    state.active = state.active.filter((id) => id !== userId)
    delete state.votes[userId]
    if (userId === state.liar) {
      finish(state, 'citizens', 'liar_left', now)
      return
    }
    if (state.active.length < MIN_ACTIVE) {
      finish(state, null, 'aborted', now)
      return
    }
    if (state.phase === 'describe' && liarSpeaker(state) === userId) advanceTurn(state, now)
    else if (state.phase === 'vote' && state.active.every((voter) => state.votes[voter])) closeVote(state, now)
  },

  result(state) {
    if (state.phase !== 'done') return null
    const completed = state.winner !== null
    return {
      players: state.players.map((player) => {
        const isLiar = player.userId === state.liar
        const won = completed && state.active.includes(player.userId) && (state.winner === 'liar') === isLiar
        return {
          userId: player.userId,
          rank: won ? 1 : 2,
          score: won ? 1 : 0,
          role: isLiar ? 'liar' : 'citizen',
          stats: { won: won ? 1 : 0, stayed: state.active.includes(player.userId) ? 1 : 0 },
        }
      }),
      summary: {
        completed,
        reason: state.endReason,
        winner: state.winner,
        category: state.category,
        word: state.word,
        playerCount: state.players.length,
        durationMs: (state.endedAt ?? state.startedAt) - state.startedAt,
      },
    }
  },

  view(state, userId) {
    const done = state.phase === 'done'
    const isLiar = userId === state.liar
    return {
      players: state.players,
      active: state.active,
      phase: state.phase,
      deadline: state.deadline,
      category: state.category,
      // 라이어에게는 제시어를 보내지 않는다
      word: done || !isLiar ? state.word : null,
      iAmLiar: isLiar,
      order: state.order,
      rounds: state.rounds,
      speaker: liarSpeaker(state),
      descriptions: state.descriptions,
      // 투표 중에는 누가 냈는지만, 내용은 끝난 뒤에
      voted: Object.keys(state.votes),
      myVote: state.votes[userId] ?? null,
      votes: state.phase === 'vote' ? null : state.votes,
      accused: state.accused,
      // 보기는 지목된 라이어가 고를 때와 끝난 뒤에만
      choices: (state.phase === 'guess' && isLiar) || done ? state.choices : null,
      liar: done ? state.liar : null,
      liarGuess: done ? state.liarGuess : null,
      winner: state.winner,
      endReason: state.endReason,
    }
  },
}

export type LiarView = ReturnType<typeof liarGame.view> & {
  phase: LiarPhase
  winner: LiarState['winner']
  endReason: LiarState['endReason']
}
