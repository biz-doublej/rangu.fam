import { NextRequest, NextResponse } from 'next/server'
import { getOptionalEnv } from '@/lib/env'
import { gamecenterErrorResponse } from '@/lib/gamecenter/auth'
import { recordMatch } from '@/lib/gamecenter/matches'
import { MATCH_SIGNATURE_HEADER, verifyMatchSignature } from '@/lib/gamecenter/rt'

export const dynamic = 'force-dynamic'

/**
 * POST /api/gamecenter/internal/match-result — 실시간 서버 전용.
 * 헤더 X-GC-Signature = HMAC-SHA256(본문, GC_INTERNAL_SECRET). 서명이 맞지 않으면 401.
 * matchId 가 같은 결과는 한 번만 저장·보상한다.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.text()
    const secret = getOptionalEnv('GC_INTERNAL_SECRET')
    if (!verifyMatchSignature(body, request.headers.get(MATCH_SIGNATURE_HEADER), secret)) {
      return NextResponse.json({ success: false, error: '서명이 올바르지 않습니다.' }, { status: 401 })
    }
    let parsed: unknown
    try {
      parsed = JSON.parse(body)
    } catch {
      return NextResponse.json({ success: false, error: '본문이 JSON 이 아닙니다.' }, { status: 400 })
    }
    return NextResponse.json({ success: true, ...(await recordMatch(parsed)) })
  } catch (error) {
    return gamecenterErrorResponse(error, '판 결과 저장')
  }
}
