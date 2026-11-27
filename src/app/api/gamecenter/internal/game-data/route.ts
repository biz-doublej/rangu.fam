import { NextRequest, NextResponse } from 'next/server'
import { getOptionalEnv } from '@/lib/env'
import { gamecenterErrorResponse } from '@/lib/gamecenter/auth'
import { getQuizData } from '@/lib/gamecenter/quiz'
import { MATCH_SIGNATURE_HEADER, verifyMatchSignature } from '@/lib/gamecenter/rt'

export const dynamic = 'force-dynamic'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * POST /api/gamecenter/internal/game-data { need, userIds } — 실시간 서버 전용.
 * 판을 시작하기 전에 필요한 자료를 내준다 (퀴즈: 참가자들의 자기 답과 면제권 수).
 * 실시간 서버는 DB 에 붙지 않으므로 이 길로만 받아 간다. 서명은 match-result 와 같다.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.text()
    if (!verifyMatchSignature(body, request.headers.get(MATCH_SIGNATURE_HEADER), getOptionalEnv('GC_INTERNAL_SECRET'))) {
      return NextResponse.json({ success: false, error: '서명이 올바르지 않습니다.' }, { status: 401 })
    }
    let parsed: any
    try {
      parsed = JSON.parse(body)
    } catch {
      return NextResponse.json({ success: false, error: '본문이 JSON 이 아닙니다.' }, { status: 400 })
    }
    const userIds = Array.isArray(parsed?.userIds) ? parsed.userIds.filter((id: unknown) => typeof id === 'string' && UUID.test(id)).slice(0, 8) : []
    if (parsed?.need !== 'quiz') {
      return NextResponse.json({ success: false, error: '알 수 없는 자료입니다.' }, { status: 400 })
    }
    return NextResponse.json({ success: true, data: await getQuizData(userIds) })
  } catch (error) {
    return gamecenterErrorResponse(error, '게임 자료 조회')
  }
}
