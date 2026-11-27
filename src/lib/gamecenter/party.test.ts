import { randomUUID } from 'crypto'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { QUIZ_PROMPTS } from '@/games/quiz/prompts'
import { quizGame } from '@/games/quiz/rules'
import { recordMatch } from './matches'
import { awardPoints } from './points'
import { getMyQuizAnswers, getQuizData, saveQuizAnswer } from './quiz'
import { TEST_DATABASE_URL, openTestDb, type TestDb } from './testDb'

describe.skipIf(!TEST_DATABASE_URL)('라이어·퀴즈 결과와 자기 답 (Postgres)', () => {
  let t: TestDb
  beforeAll(async () => {
    t = await openTestDb()
  })
  afterAll(async () => {
    await t?.close()
  })

  const NOW = new Date('2026-11-27T03:00:00Z')
  const people = (n: number) => Promise.all(Array.from({ length: n }, () => t.createUser()))
  const ledgerOf = async (userId: string) =>
    (await t.pool.query('SELECT amount, reason FROM gc_point_ledger WHERE user_id = $1 ORDER BY id', [userId])).rows
  const balanceOf = async (userId: string) =>
    (await t.pool.query('SELECT balance FROM gc_wallets WHERE user_id = $1', [userId])).rows[0]?.balance ?? 0
  const passesOf = async (userId: string) =>
    (await t.pool.query(`SELECT quantity FROM gc_inventory WHERE user_id = $1 AND item_key = 'quiz-penalty-pass'`, [userId])).rows[0]?.quantity ?? 0

  describe('라이어 게임 보상', () => {
    const liarReport = (ids: string[], winner: 'liar' | 'citizens', extra: object = {}) => ({
      matchId: randomUUID(),
      game: 'liar',
      players: ids.map((userId, i) => {
        const role = i === 0 ? 'liar' : 'citizen'
        const won = (winner === 'liar') === (role === 'liar')
        return { userId, rank: won ? 1 : 2, score: won ? 1 : 0, role, stats: { won: won ? 1 : 0, stayed: 1 } }
      }),
      summary: { completed: true, winner, reason: 'escaped', playerCount: ids.length },
      ...extra,
    })

    it('참가 +10P, 라이어로 승리 +40P', async () => {
      const ids = await people(4)
      const result = await recordMatch(liarReport(ids, 'liar'), NOW, t.db)
      expect(result.rewards).toEqual({ [ids[0]]: 50, [ids[1]]: 10, [ids[2]]: 10, [ids[3]]: 10 })
      expect(await ledgerOf(ids[0])).toEqual([
        { amount: 10, reason: 'liar.play' },
        { amount: 40, reason: 'liar.win' },
      ])
    })

    it('시민으로 승리 +20P', async () => {
      const ids = await people(3)
      const result = await recordMatch(liarReport(ids, 'citizens'), NOW, t.db)
      expect(result.rewards).toEqual({ [ids[0]]: 10, [ids[1]]: 30, [ids[2]]: 30 })
    })

    it('승부 없이 끝난 판, 도중에 나간 사람은 보상이 없다', async () => {
      const ids = await people(3)
      const aborted = liarReport(ids, 'liar', { summary: { completed: false, reason: 'aborted' } })
      expect(await recordMatch(aborted, NOW, t.db)).toEqual({ duplicate: false, rewards: {}, noRewardReason: 'not_completed' })

      const four = await people(4)
      const report = liarReport(four, 'citizens')
      report.players[3].stats = { won: 0, stayed: 0 }
      const result = await recordMatch(report, NOW, t.db)
      expect(result.rewards[four[3]]).toBeUndefined()
      expect(await ledgerOf(four[3])).toEqual([])
    })

    it('같은 결과를 다시 보내도 한 번만 지급한다', async () => {
      const ids = await people(3)
      const report = liarReport(ids, 'liar')
      await recordMatch(report, NOW, t.db)
      const again = await Promise.all(Array.from({ length: 4 }, () => recordMatch(report, NOW, t.db)))
      expect(again.every((result) => result.duplicate)).toBe(true)
      expect(await balanceOf(ids[0])).toBe(50)
    })
  })

  describe('퀴즈 배틀 보상', () => {
    const quizReport = (ids: string[], extra: { summary?: object } = {}) => ({
      matchId: randomUUID(),
      game: 'quiz',
      players: [
        { userId: ids[0], rank: 1, score: 5200, stats: { correct: 5, predictionHits: 2, asSubject: 3, stayed: 1 } },
        { userId: ids[1], rank: 2, score: 3100, stats: { correct: 3, predictionHits: 0, asSubject: 3, stayed: 1 } },
        { userId: ids[2], rank: 3, score: 900, stats: { correct: 1, predictionHits: 1, asSubject: 3, stayed: 1 } },
        ...ids.slice(3).map((userId) => ({ userId, rank: 4, score: 0, stats: { correct: 0, predictionHits: 0, asSubject: 3, stayed: 1 } })),
      ],
      summary: { completed: true, questions: 9, playerCount: ids.length, loser: ids[ids.length - 1], passUsedBy: null, ...extra.summary },
    })

    it('참가 +10, 정답 +2씩, 1·2·3위 +50/+30/+15, 예측 적중 +10씩, 내 문제 +3씩', async () => {
      const ids = await people(4)
      const result = await recordMatch(quizReport(ids), NOW, t.db)
      // 1위: 10 + 5×2 + 50 + 2×10 + 3×3 = 99
      expect(result.rewards).toEqual({ [ids[0]]: 99, [ids[1]]: 55, [ids[2]]: 46, [ids[3]]: 19 })
      expect(await ledgerOf(ids[0])).toEqual([
        { amount: 10, reason: 'quiz.play' },
        { amount: 10, reason: 'quiz.correct' },
        { amount: 50, reason: 'quiz.rank' },
        { amount: 20, reason: 'quiz.predict' },
        { amount: 9, reason: 'quiz.used' },
      ])
      // 4위는 순위 보상이 없다
      expect((await ledgerOf(ids[3])).map((row) => row.reason)).toEqual(['quiz.play', 'quiz.used'])
    })

    it('‘내 문제가 게임에 쓰임’은 하루 30P 까지', async () => {
      const ids = await people(3)
      for (let i = 0; i < 4; i++) await recordMatch(quizReport(ids), NOW, t.db)
      const used = (await ledgerOf(ids[2])).filter((row) => row.reason === 'quiz.used').map((row) => row.amount)
      expect(used).toEqual([9, 9, 9, 3])
    })

    it('전원 0점 동률이면 순위 보상이 없다', async () => {
      const ids = await people(3)
      const report = quizReport(ids)
      report.players = ids.map((userId) => ({ userId, rank: 1, score: 0, stats: { correct: 0, predictionHits: 0, asSubject: 3, stayed: 1 } }))
      const result = await recordMatch(report, NOW, t.db)
      expect(result.rewards[ids[0]]).toBe(19)
    })

    it('보고된 숫자가 문제 수를 넘으면 문제 수까지만 인정한다', async () => {
      const ids = await people(3)
      const report = quizReport(ids)
      report.players[0].stats = { correct: 999, predictionHits: 999, asSubject: 999, stayed: 1 }
      const result = await recordMatch(report, NOW, t.db)
      // 10 + 9×2 + 50 + 9×10 + min(9×3, 30) = 195
      expect(result.rewards[ids[0]]).toBe(195)
    })

    it('승부 없이 끝난 판은 보상이 없다', async () => {
      const ids = await people(3)
      const result = await recordMatch(quizReport(ids, { summary: { completed: false } }), NOW, t.db)
      expect(result).toEqual({ duplicate: false, rewards: {}, noRewardReason: 'not_completed' })
    })

    it('면제권을 썼으면 한 장 차감하고, 같은 결과를 다시 보내도 한 번만 차감한다', async () => {
      const ids = await people(3)
      await t.pool.query(`INSERT INTO gc_inventory (user_id, item_key, quantity) VALUES ($1, 'quiz-penalty-pass', 2)`, [ids[2]])
      const report = quizReport(ids, { summary: { passUsedBy: ids[2] } })
      await recordMatch(report, NOW, t.db)
      await recordMatch(report, NOW, t.db)
      await Promise.all([recordMatch(report, NOW, t.db), recordMatch(report, NOW, t.db)])
      expect(await passesOf(ids[2])).toBe(1)
      // 면제권이 없는 사람 이름으로 와도 음수가 되지 않는다
      await recordMatch(quizReport(ids, { summary: { passUsedBy: ids[0] } }), NOW, t.db)
      expect(await passesOf(ids[0])).toBe(0)
    })

    it('퀴즈 보상도 하루 상한 300P 안에서만 나온다', async () => {
      const ids = await people(3)
      await awardPoints({ userId: ids[0], amount: 250, reason: 'tetris.clear', idempotencyKey: `cap:${ids[0]}`, now: NOW }, t.db)
      const result = await recordMatch(quizReport(ids), NOW, t.db)
      expect(result.rewards[ids[0]]).toBe(50)
      expect(await balanceOf(ids[0])).toBe(300)
    })
  })

  describe('자기 답 은행', () => {
    it('유형에 맞는 답만 저장하고, 다시 저장하면 덮는다', async () => {
      const user = await t.createUser()
      expect(await saveQuizAnswer({ userId: user, promptId: 'c01', answer: 2 }, t.db)).toEqual({ promptId: 'c01', answer: 2 })
      await saveQuizAnswer({ userId: user, promptId: 'c01', answer: 3 }, t.db)
      await saveQuizAnswer({ userId: user, promptId: 'o01', answer: true }, t.db)
      await saveQuizAnswer({ userId: user, promptId: 'n01', answer: 7 }, t.db)
      expect(await getMyQuizAnswers(user, t.db)).toEqual({ c01: 3, o01: 1, n01: 7 })

      await expect(saveQuizAnswer({ userId: user, promptId: 'c01', answer: 9 }, t.db)).rejects.toMatchObject({ code: 'invalid_answer' })
      await expect(saveQuizAnswer({ userId: user, promptId: 'n01', answer: 999 }, t.db)).rejects.toMatchObject({ code: 'invalid_answer' })
      await expect(saveQuizAnswer({ userId: user, promptId: 'zzz', answer: 1 }, t.db)).rejects.toMatchObject({ code: 'unknown_prompt' })
      expect(await getMyQuizAnswers(user, t.db)).toEqual({ c01: 3, o01: 1, n01: 7 })

      await saveQuizAnswer({ userId: user, promptId: 'o01', answer: null }, t.db)
      expect(await getMyQuizAnswers(user, t.db)).toEqual({ c01: 3, n01: 7 })
    })

    it('실시간 서버에 넘기는 자료: 참가자들의 답과 면제권 수 — 이 자료로 퀴즈를 시작할 수 있다', async () => {
      const ids = await people(3)
      for (const [u, userId] of ids.entries()) {
        for (const [p, prompt] of QUIZ_PROMPTS.slice(0, 12).entries()) {
          await saveQuizAnswer({ userId, promptId: prompt.id, answer: (u + p) % 4 }, t.db)
        }
      }
      // 팩에 없는 옛 질문의 답은 내보내지 않는다
      await t.pool.query(`INSERT INTO gc_quiz_self_answers (user_id, prompt_id, answer) VALUES ($1, 'retired', '1')`, [ids[0]])
      await t.pool.query(`INSERT INTO gc_inventory (user_id, item_key, quantity) VALUES ($1, 'quiz-penalty-pass', 2)`, [ids[1]])

      const data = await getQuizData(ids, t.db)
      expect(Object.keys(data.answers).sort()).toEqual([...ids].sort())
      expect(Object.keys(data.answers[ids[0]])).toHaveLength(12)
      expect(data.answers[ids[0]]).not.toHaveProperty('retired')
      expect(data.passes).toEqual({ [ids[1]]: 2 })

      const players = ids.map((userId, i) => ({ userId, name: `사람${i}` }))
      expect(quizGame.validate!(players, data)).toBeNull()
      const state = quizGame.init(players, { now: 0, seed: 1, round: 0, data })
      expect(state.questions).toHaveLength(9)
      expect(state.passes[ids[1]]).toBe(2)
      expect(await getQuizData([], t.db)).toEqual({ answers: {}, passes: {} })
    })
  })
})
