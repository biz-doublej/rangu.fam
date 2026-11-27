import { describe, expect, it } from 'vitest'
import { QUIZ_PENALTIES } from './penalties'
import { QUIZ_MIN_ANSWERS, QUIZ_PROMPTS, findQuizPrompt, normalizeQuizAnswer, quizAnswerLabel } from './prompts'
import {
  QUIZ_PENALTY_MS,
  QUIZ_PREDICTION_SCORE,
  QUIZ_QUESTION_MS,
  QUIZ_REVEAL_MS,
  quizGame,
  quizQuestionCount,
  quizSpeedScore,
  quizStreakBonus,
  type QuizData,
  type QuizState,
  type QuizView,
} from './rules'

const users = (n: number) => Array.from({ length: n }, (_, i) => ({ userId: `u${i}`, name: `사람${i}` }))
/** 모두가 모든 질문에 답해 둔 자료. 답은 사람·질문마다 다르게 */
function fullData(n: number, passes: Record<string, number> = {}): QuizData {
  const answers: QuizData['answers'] = {}
  users(n).forEach((user, u) => {
    answers[user.userId] = {}
    QUIZ_PROMPTS.forEach((prompt, p) => {
      answers[user.userId][prompt.id] = prompt.type === 'choice' ? (u + p) % 4 : prompt.type === 'ox' ? (u + p) % 2 : prompt.min + ((u * 3 + p) % (prompt.max - prompt.min + 1))
    })
  })
  return { answers, passes }
}
const start = (n = 4, seed = 5, now = 0, passes: Record<string, number> = {}) =>
  quizGame.init(users(n), { now, seed, round: 0, data: fullData(n, passes) })
const view = (state: QuizState, userId: string) => quizGame.view(state, userId) as QuizView
const question = (state: QuizState) => state.questions[state.index]
const solversOf = (state: QuizState) => state.active.filter((id) => id !== question(state).subject)

/** 이번 문제를 모두 풀게 한다. correct 에 든 사람은 정답, 나머지는 오답 */
function playQuestion(state: QuizState, now: number, correct: string[], prediction: number | null = 0) {
  const q = question(state)
  if (prediction !== null) quizGame.apply(state, q.subject, { type: 'predict', value: prediction }, now)
  for (const id of solversOf(state)) {
    const right = correct.includes(id)
    let value: number
    if (q.kind === 'number') value = right ? q.truth : q.truth === q.max ? q.min! : q.max!
    else value = right ? q.truth : (q.truth + 1) % q.options!.length
    expect(quizGame.apply(state, id, { type: 'answer', value }, now)).toEqual({ ok: true })
  }
}

describe('질문 팩', () => {
  it('100개이고 id 가 겹치지 않는다', () => {
    expect(QUIZ_PROMPTS).toHaveLength(100)
    expect(new Set(QUIZ_PROMPTS.map((prompt) => prompt.id)).size).toBe(100)
    for (const prompt of QUIZ_PROMPTS) {
      expect(prompt.text.length).toBeGreaterThan(3)
      if (prompt.type === 'choice') expect(new Set(prompt.options).size).toBe(4)
      if (prompt.type === 'number') expect(prompt.max).toBeGreaterThan(prompt.min)
    }
  })

  it('자기 답을 유형에 맞게 정리한다', () => {
    const choice = findQuizPrompt('c01')!
    const ox = findQuizPrompt('o01')!
    const number = findQuizPrompt('n01')!
    expect(normalizeQuizAnswer(choice, 3)).toBe(3)
    expect(normalizeQuizAnswer(choice, 4)).toBeNull()
    expect(normalizeQuizAnswer(choice, '2')).toBe(2)
    expect(normalizeQuizAnswer(ox, true)).toBe(1)
    expect(normalizeQuizAnswer(ox, 2)).toBeNull()
    expect(normalizeQuizAnswer(number, 7)).toBe(7)
    expect(normalizeQuizAnswer(number, 99)).toBeNull()
    expect(normalizeQuizAnswer(number, 7.5)).toBeNull()
    expect(normalizeQuizAnswer(number, '')).toBeNull()
    expect(normalizeQuizAnswer(number, null)).toBeNull()
    expect(quizAnswerLabel(choice, 1)).toBe('여름')
    expect(quizAnswerLabel(ox, 1)).toBe('O')
    expect(quizAnswerLabel(number, 7)).toBe('7시간')
    expect(findQuizPrompt('nope')).toBeUndefined()
  })
})

describe('점수', () => {
  it('점수 = round(1000 × (1 − 0.5 × 걸린시간 / 제한시간))', () => {
    expect(quizSpeedScore(0)).toBe(1000)
    expect(quizSpeedScore(QUIZ_QUESTION_MS / 2)).toBe(750)
    expect(quizSpeedScore(QUIZ_QUESTION_MS)).toBe(500)
    expect(quizSpeedScore(QUIZ_QUESTION_MS * 3)).toBe(500) // 제한시간을 넘겨도 500 아래로 내려가지 않는다
    expect(quizSpeedScore(3333, 10_000)).toBe(833)
    expect(quizSpeedScore(-5)).toBe(1000)
  })

  it('연속 정답 보너스: 2개째부터 100씩, 최대 500', () => {
    expect([0, 1, 2, 3, 6, 7, 20].map(quizStreakBonus)).toEqual([0, 0, 100, 200, 500, 500, 500])
  })

  it('문제 수: 모두가 같은 횟수만큼 주인공이 된다', () => {
    expect([3, 4, 5, 6, 8].map(quizQuestionCount)).toEqual([9, 8, 10, 6, 8])
    for (const n of [3, 4, 5, 6, 7, 8]) {
      const state = start(n, n * 13)
      expect(state.questions).toHaveLength(quizQuestionCount(n))
      const counts = users(n).map((user) => state.questions.filter((q) => q.subject === user.userId).length)
      expect(new Set(counts).size).toBe(1)
    }
  })
})

describe('퀴즈 배틀', () => {
  it('자기 답을 10개 이상 채우지 않은 사람이 있으면 시작할 수 없다', () => {
    const data = fullData(3)
    expect(quizGame.validate!(users(3), data)).toBeNull()
    data.answers.u1 = Object.fromEntries(Object.entries(data.answers.u1).slice(0, QUIZ_MIN_ANSWERS - 1))
    delete data.answers.u2
    expect(quizGame.validate!(users(3), data)).toBe('사람1, 사람2 님은 ‘내 답 채우기’에서 10개 이상 답해야 시작할 수 있습니다.')
    expect(quizGame.validate!(users(3), undefined)).toContain('사람0')
    expect(quizGame.needs).toBe('quiz')
  })

  it('같은 시드와 자료는 같은 문제를 만든다. 네 가지 유형이 모두 나온다', () => {
    expect(start(4, 9).questions).toEqual(start(4, 9).questions)
    const kinds = new Set<string>()
    for (let seed = 0; seed < 40; seed++) for (const q of start(5, seed).questions) kinds.add(q.kind)
    expect([...kinds].sort()).toEqual(['choice', 'number', 'ox', 'who'])
  })

  it('문제의 정답은 주인공이 적어 둔 답이다', () => {
    const data = fullData(4)
    for (let seed = 0; seed < 20; seed++) {
      const state = quizGame.init(users(4), { now: 0, seed, round: 0, data })
      for (const q of state.questions) {
        if (q.kind === 'who') {
          expect(q.options![q.truth]).toBe(users(4).find((user) => user.userId === q.subject)!.name)
          continue
        }
        const prompt = QUIZ_PROMPTS.find((entry) => q.text.includes(`“${entry.text}”`))!
        expect(q.truth).toBe(data.answers[q.subject][prompt.id])
      }
    }
  })

  it('공개 단계 전에는 정답도, 남의 답도, 뒤에 나올 문제도 보내지 않는다', () => {
    const state = start(4)
    const q = question(state)
    const [first, second] = solversOf(state)
    quizGame.apply(state, first, { type: 'answer', value: q.kind === 'number' ? q.min! : 0 }, 1000)
    quizGame.apply(state, q.subject, { type: 'predict', value: 2 }, 1000)

    for (const player of state.players) {
      const seen = view(state, player.userId)
      expect(seen.reveal).toBeNull()
      expect(seen.question).not.toHaveProperty('truth')
      expect(seen).not.toHaveProperty('questions')
      expect(seen).not.toHaveProperty('answers')
      expect(seen).not.toHaveProperty('prediction')
      expect(seen.answered).toEqual([first]) // 누가 냈는지만
      const json = JSON.stringify(seen)
      for (const later of state.questions.slice(1)) expect(json).not.toContain(later.text)
    }
    expect(view(state, first).myAnswer).not.toBeNull()
    expect(view(state, second).myAnswer).toBeNull()
    // 예측 값은 주인공 본인에게만
    expect(view(state, q.subject).myPrediction).toBe(2)
    expect(view(state, first).myPrediction).toBeNull()
    expect(view(state, first).predicted).toBe(true)
  })

  it('모두 내면 바로 공개되고, 그때 정답과 각자의 답이 나온다', () => {
    const state = start(4)
    const q = question(state)
    const [a, b, c] = solversOf(state)
    playQuestion(state, 4000, [a, b], 2)
    expect(state.phase).toBe('reveal')
    const seen = view(state, c)
    expect(seen.reveal).toMatchObject({ truth: q.truth, correctCount: 2, prediction: 2, predictionHit: true })
    expect(seen.reveal!.answers[a]).toMatchObject({ correct: true, gained: quizSpeedScore(4000) })
    expect(seen.reveal!.answers[c]).toMatchObject({ correct: false, gained: 0 })
    expect(state.scores[a]).toBe(900)
    expect(state.scores[c]).toBe(0)
    expect(state.scores[q.subject]).toBe(QUIZ_PREDICTION_SCORE)
  })

  it('걸린 시간은 서버가 답을 받은 시각으로 잰다 — 빨리 낼수록 점수가 높다', () => {
    const state = start(4)
    const q = question(state)
    const [fast, slow, last] = solversOf(state)
    const right = q.truth
    quizGame.apply(state, fast, { type: 'answer', value: right }, 2000)
    quizGame.apply(state, slow, { type: 'answer', value: right }, 16_000)
    quizGame.apply(state, last, { type: 'answer', value: right }, QUIZ_QUESTION_MS + 1) // 시간이 끝난 뒤
    quizGame.tick(state, QUIZ_QUESTION_MS)
    expect(state.scores[fast]).toBe(950)
    expect(state.scores[slow]).toBe(600)
    expect(state.scores[last]).toBe(0)
  })

  it('주인공은 풀 수 없고 예측만, 한 번만 낼 수 있다', () => {
    const state = start(4)
    const q = question(state)
    const [solver] = solversOf(state)
    expect(quizGame.apply(state, q.subject, { type: 'answer', value: 0 }, 10)).toEqual({ ok: false, error: '주인공은 풀지 않고 예측합니다.' })
    expect(quizGame.apply(state, solver, { type: 'predict', value: 1 }, 10).ok).toBe(false)
    expect(quizGame.apply(state, q.subject, { type: 'predict', value: 4 }, 10).ok).toBe(false) // 풀 사람은 3명
    expect(quizGame.apply(state, q.subject, { type: 'predict', value: 3 }, 10)).toEqual({ ok: true })
    expect(quizGame.apply(state, q.subject, { type: 'predict', value: 1 }, 10).ok).toBe(false)
    const value = q.kind === 'number' ? q.min! : 0
    expect(quizGame.apply(state, solver, { type: 'answer', value }, 10)).toEqual({ ok: true })
    expect(quizGame.apply(state, solver, { type: 'answer', value }, 10)).toEqual({ ok: false, error: '이미 답을 냈습니다.' })
    expect(quizGame.apply(state, solver, { type: 'answer', value: 9999 }, 10).ok).toBe(false)
    expect(quizGame.apply(state, 'stranger', { type: 'answer', value: 0 }, 10).ok).toBe(false)
  })

  it('숫자 근접: 가장 가깝게 적은 사람이 정답', () => {
    let state: QuizState | null = null
    for (let seed = 0; seed < 200 && !state; seed++) {
      const candidate = start(4, seed)
      if (candidate.questions[0].kind === 'number' && candidate.questions[0].max! - candidate.questions[0].min! >= 6) state = candidate
    }
    const q = question(state!)
    const [near, far, farther] = solversOf(state!)
    const clamp = (value: number) => Math.max(q.min!, Math.min(q.max!, value))
    const up = q.truth + 3 <= q.max! ? 1 : -1
    quizGame.apply(state!, near, { type: 'answer', value: clamp(q.truth + up) }, 100)
    quizGame.apply(state!, far, { type: 'answer', value: clamp(q.truth + up * 2) }, 100)
    quizGame.apply(state!, farther, { type: 'answer', value: clamp(q.truth + up * 3) }, 100)
    quizGame.tick(state!, QUIZ_QUESTION_MS)
    expect(state!.reveal).toMatchObject({ correctCount: 1 })
    expect(state!.reveal!.answers[near].correct).toBe(true)
    expect(state!.reveal!.answers[far].correct).toBe(false)
  })

  it('연속 정답 보너스가 붙고, 틀리면 끊긴다 (주인공 차례는 끊지 않는다)', () => {
    const state = start(3, 2)
    const hero = 'u0'
    const gains: number[] = []
    let now = 0
    for (let i = 0; i < 6; i++) {
      const q = question(state)
      const wasSolver = q.subject !== hero
      const before = state.scores[hero]
      // 다섯 번째로 푸는 문제만 틀린다
      const solvedSoFar = gains.length
      playQuestion(state, now, wasSolver && solvedSoFar !== 4 ? [hero] : [], null)
      quizGame.tick(state, now + QUIZ_QUESTION_MS)
      if (wasSolver) gains.push(state.scores[hero] - before)
      now += QUIZ_QUESTION_MS + QUIZ_REVEAL_MS
      quizGame.tick(state, now)
      if (state.phase !== 'question') break
    }
    // 정답 4연속: 1000, 1100, 1200, 1300 → 다섯 번째 오답 0
    expect(gains.slice(0, 4)).toEqual([1000, 1100, 1200, 1300])
    if (gains.length > 4) expect(gains[4]).toBe(0)
  })

  it('시간이 끝나면 공개 → 다음 문제 → 마지막 문제 뒤에는 벌칙 룰렛', () => {
    const state = start(3, 4)
    let now = 0
    expect(quizGame.tick(state, QUIZ_QUESTION_MS - 1)).toBe(false)
    for (let i = 0; i < state.questions.length; i++) {
      expect(state.phase).toBe('question')
      expect(state.index).toBe(i)
      now += QUIZ_QUESTION_MS
      expect(quizGame.tick(state, now)).toBe(true)
      expect(state.phase).toBe('reveal')
      now += QUIZ_REVEAL_MS
      quizGame.tick(state, now)
    }
    expect(state.phase).toBe('penalty')
    expect(state.completed).toBe(true)
    expect(QUIZ_PENALTIES).toContain(state.penalty)
    expect(state.active).toContain(state.loser)
    expect(quizGame.result(state)).toBeNull()
    quizGame.tick(state, now + QUIZ_PENALTY_MS)
    expect(state.phase).toBe('done')
  })

  /** 한 사람만 계속 맞혀서 끝까지 진행한다 */
  function finishGame(state: QuizState, winner: string) {
    let now = 0
    while (state.phase === 'question' || state.phase === 'reveal') {
      if (state.phase === 'question') playQuestion(state, now, [winner], null)
      now += QUIZ_QUESTION_MS + QUIZ_REVEAL_MS
      quizGame.tick(state, now)
      if (state.phase === 'question' && now > 10_000_000) throw new Error('끝나지 않음')
    }
    return now
  }

  it('꼴찌가 벌칙을 받고, 면제권이 있으면 쓸 수 있다', () => {
    const state = start(4, 6, 0, { u0: 1, u1: 1, u2: 1, u3: 1 })
    const now = finishGame(state, 'u0')
    const loser = state.loser!
    expect(loser).not.toBe('u0')
    expect(view(state, loser)).toMatchObject({ phase: 'penalty', loser, myPasses: 1 })
    const other = state.active.find((id) => id !== loser)!
    expect(quizGame.apply(state, other, { type: 'usePass' }, now).ok).toBe(false)
    expect(quizGame.apply(state, loser, { type: 'usePass' }, now)).toEqual({ ok: true })
    const result = quizGame.result(state)!
    expect(result.summary).toMatchObject({ completed: true, loser, passUsedBy: loser, penalty: null, playerCount: 4 })
  })

  it('면제권이 없으면 쓸 수 없고, 받아들이면 벌칙이 결과에 남는다', () => {
    const state = start(4, 6)
    const now = finishGame(state, 'u0')
    const loser = state.loser!
    expect(quizGame.apply(state, loser, { type: 'usePass' }, now)).toEqual({ ok: false, error: '벌칙 면제권이 없습니다.' })
    expect(quizGame.apply(state, loser, { type: 'acceptPenalty' }, now)).toEqual({ ok: true })
    expect(quizGame.result(state)!.summary).toMatchObject({ passUsedBy: null, penalty: state.penalty })
  })

  it('결과: 점수순 순위(동점은 같은 순위)와 정답 수·예측 적중·주인공 횟수', () => {
    const state = start(4, 6)
    finishGame(state, 'u0')
    quizGame.tick(state, 99_999_999)
    const result = quizGame.result(state)!
    const winner = result.players.find((player) => player.userId === 'u0')!
    expect(winner.rank).toBe(1)
    expect(winner.stats).toMatchObject({ correct: 6, asSubject: 2, stayed: 1 })
    // 나머지 셋은 0점 동점 → 모두 2위
    expect(result.players.filter((player) => player.userId !== 'u0').map((player) => player.rank)).toEqual([2, 2, 2])
    expect(result.summary.questions).toBe(8)
  })

  it('도중에 나가서 3명 미만이 되면 승부 없이 끝난다', () => {
    const state = start(3)
    quizGame.abandon(state, 'u1', 500)
    expect(state.phase).toBe('done')
    expect(quizGame.result(state)!.summary.completed).toBe(false)
  })

  it('나간 사람을 기다리지 않고, 나간 사람이 주인공인 문제는 건너뛴다', () => {
    const state = start(5, 3)
    const q = question(state)
    const [leaver, ...rest] = solversOf(state)
    quizGame.apply(state, q.subject, { type: 'predict', value: 0 }, 10)
    for (const id of rest) quizGame.apply(state, id, { type: 'answer', value: q.kind === 'number' ? q.min! : 0 }, 10)
    expect(state.phase).toBe('question')
    quizGame.abandon(state, leaver, 20)
    expect(state.phase).toBe('reveal') // 남은 사람이 다 냈으므로 바로 공개

    let now = 20
    while (state.phase !== 'penalty' && state.phase !== 'done') {
      now += QUIZ_QUESTION_MS + QUIZ_REVEAL_MS
      quizGame.tick(state, now)
      if (state.phase === 'question') expect(question(state).subject).not.toBe(leaver)
    }
    expect(state.loser).not.toBe(leaver)
  })
})
