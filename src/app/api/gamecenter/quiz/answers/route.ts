import { NextRequest, NextResponse } from 'next/server'
import { gamecenterErrorResponse, requireGamecenterUser } from '@/lib/gamecenter/auth'
import { getMyQuizAnswers, saveQuizAnswer } from '@/lib/gamecenter/quiz'
import { QUIZ_MIN_ANSWERS, QUIZ_PROMPTS } from '@/games/quiz/prompts'

export const dynamic = 'force-dynamic'

/** GET /api/gamecenter/quiz/answers — 내가 채운 자기 답 */
export async function GET(request: NextRequest) {
  try {
    const auth = await requireGamecenterUser(request)
    if (!auth.ok) return auth.response
    const answers = await getMyQuizAnswers(auth.user.id)
    return NextResponse.json({ success: true, answers, total: QUIZ_PROMPTS.length, required: QUIZ_MIN_ANSWERS })
  } catch (error) {
    return gamecenterErrorResponse(error, '퀴즈 답 조회')
  }
}

/** PUT /api/gamecenter/quiz/answers { promptId, answer } — 답 하나 저장 (answer: null 이면 지움) */
export async function PUT(request: NextRequest) {
  try {
    const auth = await requireGamecenterUser(request)
    if (!auth.ok) return auth.response
    const body = await request.json().catch(() => null)
    const saved = await saveQuizAnswer({ userId: auth.user.id, promptId: body?.promptId, answer: body?.answer })
    return NextResponse.json({ success: true, ...saved })
  } catch (error) {
    return gamecenterErrorResponse(error, '퀴즈 답 저장')
  }
}
