import { NextRequest, NextResponse } from 'next/server'
import { sanitizeCallbackPath } from '@/lib/doublejAuth'
import {
  OIDC_STATE_COOKIE,
  buildAuthorizeUrl,
  createAuthState,
  createOidcStateCookieValue,
  createPkcePair,
  getMissingOidcEnvKeys,
  getOidcStateCookieOptions,
  resolvePublicOrigin,
} from '@/lib/serviceOidc'

export const dynamic = 'force-dynamic'

/**
 * 구글 로그인 진입점. OAuth 2.0 Authorization Code + PKCE 로 구글 동의 화면에 보낸다.
 */
function loginPathFor(callbackUrl: string): string {
  return callbackUrl.startsWith('/wiki') ? '/wiki/login' : '/login'
}

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const callbackUrl = sanitizeCallbackPath(requestUrl.searchParams.get('callbackUrl'), '/')
  try {
    const origin = resolvePublicOrigin(request)
    const missingEnvKeys = getMissingOidcEnvKeys()
    if (missingEnvKeys.length > 0) {
      console.error(`구글 로그인 설정 누락: ${missingEnvKeys.join(', ')}`)
      return NextResponse.redirect(new URL(`${loginPathFor(callbackUrl)}?error=oidc_not_configured`, origin))
    }

    const state = createAuthState()
    const { codeVerifier, codeChallenge } = createPkcePair()
    const authorizeUrl = buildAuthorizeUrl({
      origin,
      state,
      codeChallenge,
    })

    const response = NextResponse.redirect(authorizeUrl)
    response.cookies.set(
      OIDC_STATE_COOKIE,
      createOidcStateCookieValue({
        state,
        codeVerifier,
        callbackUrl,
      }),
      getOidcStateCookieOptions()
    )

    return response
  } catch (error) {
    console.error('OIDC 시작 처리 오류:', error)
    const origin = resolvePublicOrigin(request)
    return NextResponse.redirect(new URL(`${loginPathFor(callbackUrl)}?error=oidc_start_failed`, origin))
  }
}
