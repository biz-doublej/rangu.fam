import { mulberry32 } from '../rng'
import type { RoomGame, RoomUser } from '../rooms/base'
import { QUIZ_PENALTIES } from './penalties'
import { QUIZ_MIN_ANSWERS, QUIZ_PROMPTS, findQuizPrompt, quizAnswerLabel, type QuizPrompt } from './prompts'

/**
 * 퀴즈 배틀 — 친구가 미리 적어 둔 자기 답을 맞히는 퀴즈.
 *
 * 문제마다 주인공이 한 명 있다. 주인공은 풀지 않고 "몇 명이 맞힐까"를 예측하고, 나머지가 푼다.
 * 문제 유형: 4지선다, OX, 숫자 근접(가장 가깝게 적은 사람이 정답), 누가 그랬을까.
 *
 * 정답은 이 상태(서버) 안에만 있다. view() 는 공개 단계 전에는 정답도, 남의 답도, 아직 안 나온 문제도 내보내지 않는다.
 * 점수 = round(1000 × (1 − 0.5 × 걸린시간 / 제한시간)) + 연속 정답 보너스, 시간은 서버가 받은 시각 기준.
 * 끝나면 꼴찌가 벌칙 룰렛을 돌리고, 면제권이 있으면 쓸 수 있다.
 */

export const QUIZ_QUESTION_MS = 20_000
export const QUIZ_REVEAL_MS = 6_000
export const QUIZ_PENALTY_MS = 20_000
/** 연속 정답 2개째부터 하나마다 붙는 보너스와 그 상한 */
export const QUIZ_STREAK_STEP = 100
export const QUIZ_STREAK_MAX = 500
/** 주인공이 맞힌 사람 수를 정확히 예측했을 때 */
export const QUIZ_PREDICTION_SCORE = 700
const MIN_ACTIVE = 3

export type QuizKind = 'choice' | 'ox' | 'number' | 'who'
export type QuizPhase = 'question' | 'reveal' | 'penalty' | 'done'
export type QuizAction =
  | { type: 'answer'; value: number }
  | { type: 'predict'; value: number }
  | { type: 'usePass' }
  | { type: 'acceptPenalty' }

/** 본 서버가 시작 전에 넘겨주는 자료 */
export interface QuizData {
  /** userId → { promptId → 자기 답 } */
  answers: Record<string, Record<string, number>>
  /** userId → 벌칙 면제권 수 */
  passes: Record<string, number>
}

export interface QuizQuestion {
  kind: QuizKind
  subject: string
  text: string
  options: string[] | null
  min: number | null
  max: number | null
  unit: string | null
  /** 정답: 보기 번호 / OX(0|1) / 숫자. ‘누가 그랬을까’는 보기(참가자) 번호 */
  truth: number
}

export interface QuizReveal {
  truth: number
  truthLabel: string
  /** userId → 낸 답, 정답 여부, 이번 문제로 얻은 점수 */
  answers: Record<string, { value: number; correct: boolean; gained: number }>
  correctCount: number
  prediction: number | null
  predictionHit: boolean
}

export interface QuizState {
  players: RoomUser[]
  active: string[]
  questions: QuizQuestion[]
  index: number
  phase: QuizPhase
  phaseStartedAt: number
  deadline: number
  /** 이번 문제에 낸 답과 서버가 받은 시각 */
  answers: Record<string, { value: number; at: number }>
  prediction: number | null
  reveal: QuizReveal | null
  scores: Record<string, number>
  streak: Record<string, number>
  correct: Record<string, number>
  predictionHits: Record<string, number>
  asSubject: Record<string, number>
  passes: Record<string, number>
  /** 동점일 때 꼴찌를 정하는 순서 (미리 섞어 둔다) */
  tieOrder: string[]
  penaltyIndex: number
  loser: string | null
  penalty: string | null
  passUsedBy: string | null
  completed: boolean
  startedAt: number
  endedAt: number | null
}

/** 정답 하나의 점수 (연속 정답 보너스 제외) */
export function quizSpeedScore(elapsedMs: number, limitMs: number = QUIZ_QUESTION_MS): number {
  const ratio = Math.min(1, Math.max(0, elapsedMs) / limitMs)
  return Math.round(1000 * (1 - 0.5 * ratio))
}

/** 연속 정답 보너스: 2개째 +100, 3개째 +200 … 최대 +500 */
export function quizStreakBonus(streak: number): number {
  return Math.min(QUIZ_STREAK_MAX, Math.max(0, streak - 1) * QUIZ_STREAK_STEP)
}

/** 인원에 따른 문제 수 — 모두가 같은 횟수만큼 주인공이 된다 */
export function quizQuestionCount(players: number): number {
  return players * (players <= 3 ? 3 : players <= 5 ? 2 : 1)
}

function asData(data: unknown): QuizData {
  const raw = (data ?? {}) as Partial<QuizData>
  return { answers: raw.answers ?? {}, passes: raw.passes ?? {} }
}

/** 그 사람이 답해 둔 질문 중 유효한 것 */
function answeredPrompts(data: QuizData, userId: string): Array<{ prompt: QuizPrompt; value: number }> {
  const mine = data.answers[userId] ?? {}
  return QUIZ_PROMPTS.filter((prompt) => Number.isInteger(mine[prompt.id])).map((prompt) => ({ prompt, value: mine[prompt.id] }))
}

function buildQuestion(
  subject: RoomUser,
  players: RoomUser[],
  data: QuizData,
  used: Set<string>,
  rng: () => number
): QuizQuestion | null {
  const pool = answeredPrompts(data, subject.userId).filter((entry) => !used.has(`${subject.userId}:${entry.prompt.id}`))
  if (pool.length === 0) return null

  // 누가 그랬을까: 주인공만 그렇게 답한 질문이 있으면 가끔 낸다
  if (rng() < 0.3) {
    const unique = pool.filter(({ prompt, value }) => {
      if (prompt.type === 'number') return false
      const others = players.filter((player) => player.userId !== subject.userId).map((player) => data.answers[player.userId]?.[prompt.id])
      return others.filter(Number.isInteger).length >= 2 && !others.includes(value)
    })
    if (unique.length > 0) {
      const { prompt, value } = unique[Math.floor(rng() * unique.length)]
      used.add(`${subject.userId}:${prompt.id}`)
      return {
        kind: 'who',
        subject: subject.userId,
        text: `“${prompt.text}”에 ‘${quizAnswerLabel(prompt, value)}’(이)라고 답한 사람은?`,
        options: players.map((player) => player.name),
        min: null,
        max: null,
        unit: null,
        truth: players.findIndex((player) => player.userId === subject.userId),
      }
    }
  }

  const { prompt, value } = pool[Math.floor(rng() * pool.length)]
  used.add(`${subject.userId}:${prompt.id}`)
  const base = { subject: subject.userId, truth: value }
  if (prompt.type === 'choice') {
    return { ...base, kind: 'choice', text: `${subject.name}의 답은? “${prompt.text}”`, options: [...prompt.options], min: null, max: null, unit: null }
  }
  if (prompt.type === 'ox') {
    return { ...base, kind: 'ox', text: `${subject.name}: “${prompt.text}”`, options: ['X', 'O'], min: null, max: null, unit: null }
  }
  return { ...base, kind: 'number', text: `${subject.name}의 답은? “${prompt.text}”`, options: null, min: prompt.min, max: prompt.max, unit: prompt.unit }
}

function truthLabel(question: QuizQuestion): string {
  if (question.kind === 'number') return `${question.truth}${question.unit ?? ''}`
  return question.options?.[question.truth] ?? '?'
}

const current = (state: QuizState): QuizQuestion => state.questions[state.index]
const solvers = (state: QuizState): string[] => state.active.filter((id) => id !== current(state).subject)

/** 문제를 닫고 채점한다 */
function revealQuestion(state: QuizState, now: number) {
  const question = current(state)
  const entries = solvers(state)
    .filter((id) => state.answers[id])
    .map((id) => ({ id, ...state.answers[id] }))

  let correctIds: string[]
  if (question.kind === 'number') {
    // 숫자 근접: 정답에 가장 가깝게 적은 사람(들)이 정답
    const best = Math.min(...entries.map((entry) => Math.abs(entry.value - question.truth)))
    correctIds = entries.filter((entry) => Math.abs(entry.value - question.truth) === best).map((entry) => entry.id)
  } else {
    correctIds = entries.filter((entry) => entry.value === question.truth).map((entry) => entry.id)
  }

  const answers: QuizReveal['answers'] = {}
  for (const entry of entries) {
    const isCorrect = correctIds.includes(entry.id)
    let gained = 0
    if (isCorrect) {
      state.streak[entry.id] = (state.streak[entry.id] ?? 0) + 1
      state.correct[entry.id] = (state.correct[entry.id] ?? 0) + 1
      gained = quizSpeedScore(entry.at - state.phaseStartedAt) + quizStreakBonus(state.streak[entry.id])
      state.scores[entry.id] = (state.scores[entry.id] ?? 0) + gained
    } else {
      state.streak[entry.id] = 0
    }
    answers[entry.id] = { value: entry.value, correct: isCorrect, gained }
  }
  // 답을 내지 않은 사람은 연속 정답이 끊긴다
  for (const id of solvers(state)) if (!state.answers[id]) state.streak[id] = 0

  const subjectPresent = state.active.includes(question.subject)
  const predictionHit = subjectPresent && state.prediction !== null && state.prediction === correctIds.length
  if (predictionHit) {
    state.scores[question.subject] = (state.scores[question.subject] ?? 0) + QUIZ_PREDICTION_SCORE
    state.predictionHits[question.subject] = (state.predictionHits[question.subject] ?? 0) + 1
  }
  state.asSubject[question.subject] = (state.asSubject[question.subject] ?? 0) + 1

  state.reveal = {
    truth: question.truth,
    truthLabel: truthLabel(question),
    answers,
    correctCount: correctIds.length,
    prediction: state.prediction,
    predictionHit,
  }
  state.phase = 'reveal'
  state.phaseStartedAt = now
  state.deadline = now + QUIZ_REVEAL_MS
}

/** 순위 (점수 내림차순, 동점은 같은 순위) */
export function quizRanks(state: QuizState): Record<string, number> {
  const sorted = [...state.players].sort((a, b) => (state.scores[b.userId] ?? 0) - (state.scores[a.userId] ?? 0))
  const ranks: Record<string, number> = {}
  sorted.forEach((player, index) => {
    const previous = sorted[index - 1]
    ranks[player.userId] =
      previous && (state.scores[previous.userId] ?? 0) === (state.scores[player.userId] ?? 0) ? ranks[previous.userId] : index + 1
  })
  return ranks
}

function startPenalty(state: QuizState, now: number) {
  // 꼴찌: 남아 있는 사람 중 점수가 가장 낮은 사람. 동점이면 미리 섞어 둔 순서로.
  const lowest = Math.min(...state.active.map((id) => state.scores[id] ?? 0))
  state.loser = state.tieOrder.find((id) => state.active.includes(id) && (state.scores[id] ?? 0) === lowest) ?? null
  state.penalty = QUIZ_PENALTIES[state.penaltyIndex]
  state.completed = true
  state.phase = 'penalty'
  state.phaseStartedAt = now
  state.deadline = now + QUIZ_PENALTY_MS
}

function nextQuestion(state: QuizState, now: number) {
  let index = state.index + 1
  // 주인공이 나간 문제는 건너뛴다
  while (index < state.questions.length && !state.active.includes(state.questions[index].subject)) index++
  if (index >= state.questions.length) {
    startPenalty(state, now)
    return
  }
  state.index = index
  state.answers = {}
  state.prediction = null
  state.reveal = null
  state.phase = 'question'
  state.phaseStartedAt = now
  state.deadline = now + QUIZ_QUESTION_MS
}

function finish(state: QuizState, now: number) {
  state.phase = 'done'
  state.endedAt = now
}

function everyoneDone(state: QuizState): boolean {
  const subject = current(state).subject
  const predicted = !state.active.includes(subject) || state.prediction !== null
  return predicted && solvers(state).every((id) => state.answers[id])
}

export const quizGame: RoomGame<QuizState, QuizAction> = {
  id: 'quiz',
  name: '퀴즈 배틀',
  minPlayers: 3,
  maxPlayers: 8,
  needs: 'quiz',

  validate(players, raw) {
    const data = asData(raw)
    const lacking = players.filter((player) => answeredPrompts(data, player.userId).length < QUIZ_MIN_ANSWERS)
    if (lacking.length === 0) return null
    return `${lacking.map((player) => player.name).join(', ')} 님은 ‘내 답 채우기’에서 ${QUIZ_MIN_ANSWERS}개 이상 답해야 시작할 수 있습니다.`
  },

  init(players, { now, seed, data: raw }) {
    const data = asData(raw)
    const rng = mulberry32(seed)
    const shuffle = <T>(items: T[]): T[] => {
      const copy = [...items]
      for (let i = copy.length - 1; i > 0; i--) {
        const j = Math.floor(rng() * (i + 1))
        ;[copy[i], copy[j]] = [copy[j], copy[i]]
      }
      return copy
    }

    const perPlayer = quizQuestionCount(players.length) / players.length
    const used = new Set<string>()
    const questions: QuizQuestion[] = []
    for (let lap = 0; lap < perPlayer; lap++) {
      for (const subject of shuffle(players)) {
        const question = buildQuestion(subject, players, data, used, rng)
        if (question) questions.push(question)
      }
    }
    const zero = () => Object.fromEntries(players.map((player) => [player.userId, 0]))

    return {
      players,
      active: players.map((player) => player.userId),
      questions,
      index: 0,
      phase: 'question',
      phaseStartedAt: now,
      deadline: now + QUIZ_QUESTION_MS,
      answers: {},
      prediction: null,
      reveal: null,
      scores: zero(),
      streak: zero(),
      correct: zero(),
      predictionHits: zero(),
      asSubject: zero(),
      passes: Object.fromEntries(players.map((player) => [player.userId, Math.max(0, Math.floor(Number(data.passes[player.userId]) || 0))])),
      tieOrder: shuffle(players).map((player) => player.userId),
      penaltyIndex: Math.floor(rng() * QUIZ_PENALTIES.length),
      loser: null,
      penalty: null,
      passUsedBy: null,
      completed: false,
      startedAt: now,
      endedAt: null,
    }
  },

  apply(state, userId, action, now) {
    if (state.phase === 'done') return { ok: false, error: '이미 끝난 판입니다.' }
    if (!state.active.includes(userId)) return { ok: false, error: '이 판의 참가자가 아닙니다.' }

    if (action?.type === 'answer' || action?.type === 'predict') {
      if (state.phase !== 'question') return { ok: false, error: '답을 낼 때가 아닙니다.' }
      if (now > state.deadline) return { ok: false, error: '시간이 끝났습니다.' }
      const question = current(state)
      const value = Number(action.value)
      if (!Number.isInteger(value)) return { ok: false, error: '답이 올바르지 않습니다.' }

      if (action.type === 'predict') {
        if (userId !== question.subject) return { ok: false, error: '이 문제의 주인공만 예측할 수 있습니다.' }
        if (state.prediction !== null) return { ok: false, error: '이미 예측했습니다.' }
        if (value < 0 || value > solvers(state).length) return { ok: false, error: '예측이 올바르지 않습니다.' }
        state.prediction = value
      } else {
        if (userId === question.subject) return { ok: false, error: '주인공은 풀지 않고 예측합니다.' }
        if (state.answers[userId]) return { ok: false, error: '이미 답을 냈습니다.' }
        const valid =
          question.kind === 'number'
            ? value >= (question.min ?? 0) && value <= (question.max ?? 0)
            : value >= 0 && value < (question.options?.length ?? 0)
        if (!valid) return { ok: false, error: '답이 올바르지 않습니다.' }
        state.answers[userId] = { value, at: now }
      }
      if (everyoneDone(state)) revealQuestion(state, now)
      return { ok: true }
    }

    if (action?.type === 'usePass' || action?.type === 'acceptPenalty') {
      if (state.phase !== 'penalty') return { ok: false, error: '벌칙을 정할 때가 아닙니다.' }
      if (userId !== state.loser) return { ok: false, error: '벌칙을 받은 사람만 고를 수 있습니다.' }
      if (action.type === 'usePass') {
        if ((state.passes[userId] ?? 0) <= 0) return { ok: false, error: '벌칙 면제권이 없습니다.' }
        state.passUsedBy = userId
      }
      finish(state, now)
      return { ok: true }
    }
    return { ok: false, error: '알 수 없는 동작입니다.' }
  },

  tick(state, now) {
    if (state.phase === 'done' || now < state.deadline) return false
    if (state.phase === 'question') revealQuestion(state, now)
    else if (state.phase === 'reveal') nextQuestion(state, now)
    else finish(state, now) // 벌칙을 고르지 않으면 그대로 받는다
    return true
  },

  abandon(state, userId, now) {
    if (state.phase === 'done' || !state.active.includes(userId)) return
    state.active = state.active.filter((id) => id !== userId)
    delete state.answers[userId]
    if (state.active.length < MIN_ACTIVE) {
      // 3명 미만이면 승부 없이 끝낸다 (보상 없음)
      state.completed = false
      finish(state, now)
      return
    }
    if (state.phase === 'question' && everyoneDone(state)) revealQuestion(state, now)
    else if (state.phase === 'penalty' && state.loser === userId) finish(state, now)
  },

  result(state) {
    if (state.phase !== 'done') return null
    const ranks = quizRanks(state)
    return {
      players: state.players.map((player) => ({
        userId: player.userId,
        rank: ranks[player.userId],
        score: state.scores[player.userId] ?? 0,
        stats: {
          correct: state.correct[player.userId] ?? 0,
          predictionHits: state.predictionHits[player.userId] ?? 0,
          asSubject: state.asSubject[player.userId] ?? 0,
          stayed: state.active.includes(player.userId) ? 1 : 0,
        },
      })),
      summary: {
        completed: state.completed,
        questions: state.questions.length,
        playerCount: state.players.length,
        loser: state.loser,
        penalty: state.passUsedBy ? null : state.penalty,
        passUsedBy: state.passUsedBy,
        durationMs: (state.endedAt ?? state.startedAt) - state.startedAt,
      },
    }
  },

  view(state, userId) {
    const question = current(state)
    const asking = state.phase === 'question' || state.phase === 'reveal'
    return {
      players: state.players,
      active: state.active,
      phase: state.phase,
      index: state.index,
      total: state.questions.length,
      phaseStartedAt: state.phaseStartedAt,
      deadline: state.deadline,
      // 정답(truth)은 넣지 않는다 — 공개 단계의 reveal 로만 나간다
      question: asking
        ? { kind: question.kind, subject: question.subject, text: question.text, options: question.options, min: question.min, max: question.max, unit: question.unit }
        : null,
      // 누가 냈는지만. 무엇을 냈는지는 공개 단계에서.
      answered: Object.keys(state.answers),
      predicted: state.prediction !== null,
      myAnswer: state.answers[userId]?.value ?? null,
      myPrediction: userId === question.subject ? state.prediction : null,
      reveal: state.phase === 'reveal' ? state.reveal : null,
      scores: state.scores,
      streak: state.streak,
      ranks: quizRanks(state),
      loser: state.loser,
      penalty: state.penalty,
      passUsedBy: state.passUsedBy,
      myPasses: state.passes[userId] ?? 0,
      completed: state.completed,
    }
  },
}

export interface QuizView {
  players: RoomUser[]
  active: string[]
  phase: QuizPhase
  index: number
  total: number
  phaseStartedAt: number
  deadline: number
  question: Omit<QuizQuestion, 'truth'> | null
  answered: string[]
  predicted: boolean
  myAnswer: number | null
  myPrediction: number | null
  reveal: QuizReveal | null
  scores: Record<string, number>
  streak: Record<string, number>
  ranks: Record<string, number>
  loser: string | null
  penalty: string | null
  passUsedBy: string | null
  myPasses: number
  completed: boolean
}

export { findQuizPrompt }
