import { and, eq, inArray } from 'drizzle-orm'
import { getDb, type DB } from '@/db/client'
import { gcInventory, gcQuizSelfAnswers } from '@/db/schema/gamecenter'
import { QUIZ_PROMPTS, findQuizPrompt, normalizeQuizAnswer } from '@/games/quiz/prompts'
import type { QuizData } from '@/games/quiz/rules'
import { QUIZ_PASS_KEY } from './matches'
import { GamecenterError } from './points'

/** 퀴즈 배틀의 자기 답 은행 (gc_quiz_self_answers) */

/** 내 답: promptId → 값. 팩에서 빠진 질문의 답은 내보내지 않는다. */
export async function getMyQuizAnswers(userId: string, db: DB = getDb()): Promise<Record<string, number>> {
  const rows = await db
    .select({ promptId: gcQuizSelfAnswers.promptId, answer: gcQuizSelfAnswers.answer })
    .from(gcQuizSelfAnswers)
    .where(eq(gcQuizSelfAnswers.userId, userId))
  const answers: Record<string, number> = {}
  for (const row of rows) {
    const prompt = findQuizPrompt(row.promptId)
    const value = prompt ? normalizeQuizAnswer(prompt, row.answer) : null
    if (value !== null) answers[row.promptId] = value
  }
  return answers
}

/** 답 하나를 저장한다. answer 가 null 이면 그 답을 지운다. */
export async function saveQuizAnswer(input: { userId: string; promptId: unknown; answer: unknown; now?: Date }, db: DB = getDb()) {
  const prompt = findQuizPrompt(input.promptId)
  if (!prompt) throw new GamecenterError('unknown_prompt', '없는 질문입니다.', 404)
  if (input.answer === null) {
    await db.delete(gcQuizSelfAnswers).where(and(eq(gcQuizSelfAnswers.userId, input.userId), eq(gcQuizSelfAnswers.promptId, prompt.id)))
    return { promptId: prompt.id, answer: null }
  }
  const value = normalizeQuizAnswer(prompt, input.answer)
  if (value === null) throw new GamecenterError('invalid_answer', '답이 올바르지 않습니다.')
  const now = input.now ?? new Date()
  await db
    .insert(gcQuizSelfAnswers)
    .values({ userId: input.userId, promptId: prompt.id, answer: value, updatedAt: now })
    .onConflictDoUpdate({ target: [gcQuizSelfAnswers.userId, gcQuizSelfAnswers.promptId], set: { answer: value, updatedAt: now } })
  return { promptId: prompt.id, answer: value }
}

/** 실시간 서버가 퀴즈를 시작할 때 받아 가는 자료: 참가자들의 자기 답과 면제권 수 */
export async function getQuizData(userIds: string[], db: DB = getDb()): Promise<QuizData> {
  const data: QuizData = { answers: {}, passes: {} }
  if (userIds.length === 0) return data
  const known = new Set(QUIZ_PROMPTS.map((prompt) => prompt.id))
  const rows = await db
    .select({ userId: gcQuizSelfAnswers.userId, promptId: gcQuizSelfAnswers.promptId, answer: gcQuizSelfAnswers.answer })
    .from(gcQuizSelfAnswers)
    .where(inArray(gcQuizSelfAnswers.userId, userIds))
  for (const row of rows) {
    if (!known.has(row.promptId)) continue
    const value = normalizeQuizAnswer(findQuizPrompt(row.promptId)!, row.answer)
    if (value === null) continue
    ;(data.answers[row.userId] ??= {})[row.promptId] = value
  }
  const passes = await db
    .select({ userId: gcInventory.userId, quantity: gcInventory.quantity })
    .from(gcInventory)
    .where(and(inArray(gcInventory.userId, userIds), eq(gcInventory.itemKey, QUIZ_PASS_KEY)))
  for (const row of passes) data.passes[row.userId] = row.quantity
  return data
}
