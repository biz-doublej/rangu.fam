import { NextRequest, NextResponse } from 'next/server'
import {
  createDoubleJToken,
  createWikiToken,
  findOrCreateWikiUserFromOidcProfile,
  setDoubleJAuthCookie,
  setWikiAuthCookie,
} from '@/lib/doublejAuth'
import { extractIdentity, fetchOidcUserInfo, type OidcTokenResponse } from '@/lib/serviceOidc'

export const dynamic = 'force-dynamic'

/**
 * 웹뷰 세션 브릿지 — 데스크톱/모바일 네이티브 셸 → 내장 웹뷰.
 *
 * 셸이 DoubleJ OIDC 로 받은 access_token 을 제출하면, userinfo 로 검증·식별한 뒤
 * 웹과 동일한 HttpOnly 세션 쿠키(doublej-token / wiki-token)를 세팅한다.
 * 이후 웹뷰(랑구팸/이랑위키)는 평소 웹과 100% 동일하게 동작한다(코드 분기 없음).
 *
 * 호출 방식(택1):
 *   (권장) 웹뷰 JS 가 same-origin 으로 fetch → 브라우저가 Set-Cookie 자동 저장.
 *   (대안) 네이티브가 호출해 응답의 Set-Cookie 를 웹뷰 쿠키스토어에 주입.
 *
 * 하드닝(운영): origin 화이트리스트 + 레이트리밋 권장. access_token 은 본문/Authorization 헤더로만.
 */
function readAccessToken(request: NextRequest, body: unknown): string | null {
  const auth = request.headers.get('authorization')
  if (auth && auth.toLowerCase().startsWith('bearer ')) return auth.slice(7).trim()
  const fromBody = (body as { access_token?: unknown } | null)?.access_token
  if (typeof fromBody === 'string' && fromBody.trim()) return fromBody.trim()
  return null
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null)
  const accessToken = readAccessToken(request, body)
  if (!accessToken) {
    return NextResponse.json({ success: false, error: 'missing_access_token' }, { status: 400 })
  }

  // DoubleJ access_token 검증 = userinfo 호출 성공 여부 (기존 OIDC 콜백과 동일 경로).
  const userInfo = await fetchOidcUserInfo(accessToken)
  if (!userInfo) {
    return NextResponse.json({ success: false, error: 'invalid_access_token' }, { status: 401 })
  }

  // access_token 만 있으므로 id_token 없는 최소 tokenResponse 로 식별 (userInfo 클레임 사용).
  const identity = extractIdentity({ access_token: accessToken } as OidcTokenResponse, userInfo)
  if (!identity) {
    return NextResponse.json({ success: false, error: 'identity_not_found' }, { status: 401 })
  }

  const user = await findOrCreateWikiUserFromOidcProfile(identity)
  if (!user || !user.isActive) {
    return NextResponse.json({ success: false, error: 'account_unavailable' }, { status: 403 })
  }
  const isBanned = Boolean((user as { isBanned?: boolean; banStatus?: { isBanned?: boolean } }).isBanned
    || (user as { banStatus?: { isBanned?: boolean } }).banStatus?.isBanned)
  if (isBanned) {
    return NextResponse.json({ success: false, error: 'account_banned' }, { status: 403 })
  }

  // 웹과 동일한 세션 쿠키 세팅 → 웹뷰가 인증된 상태로 동작.
  const response = NextResponse.json({ success: true })
  setDoubleJAuthCookie(response, createDoubleJToken(user))
  setWikiAuthCookie(response, createWikiToken(user))
  return response
}
