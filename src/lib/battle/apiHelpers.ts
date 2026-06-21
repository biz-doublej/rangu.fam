/**
 * 전투 API 라우트 공용 헬퍼 — 멤버 인증 가드 + 에러 → HTTP 응답 변환.
 */
import { NextRequest, NextResponse } from 'next/server'
import { buildClientUser, getAuthenticatedWikiUser, resolveMemberIdForUser } from '@/lib/doublejAuth'
import { BattleError, isMissingBattleTableError } from './service'

export type MemberAuth = { userId: string } | { error: NextResponse }

/** 랑구팸 5인 멤버만 통과. 그 외엔 401/403 응답을 담아 반환. */
export async function requireMember(request: NextRequest): Promise<MemberAuth> {
  const wikiUser = await getAuthenticatedWikiUser(request)
  if (!wikiUser) {
    return { error: NextResponse.json({ success: false, message: '카드 배틀은 로그인 후 이용할 수 있습니다.' }, { status: 401 }) }
  }
  if (!resolveMemberIdForUser(wikiUser)) {
    return { error: NextResponse.json({ success: false, message: '카드 배틀은 랑구팸 5인 멤버 전용입니다.' }, { status: 403 }) }
  }
  return { userId: buildClientUser(wikiUser).id }
}

export function battleErrorResponse(error: unknown): NextResponse {
  if (error instanceof BattleError) {
    return NextResponse.json({ success: false, message: error.message }, { status: error.status })
  }
  if (isMissingBattleTableError(error)) {
    return NextResponse.json(
      { success: false, needsMigration: true, message: '카드 배틀이 아직 활성화되지 않았습니다. 관리자에게 문의하세요.' },
      { status: 503 }
    )
  }
  console.error('battle route error:', error)
  return NextResponse.json({ success: false, message: '전투 처리 중 오류가 발생했습니다.' }, { status: 500 })
}
