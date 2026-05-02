import { NextRequest, NextResponse } from 'next/server'
import { sanitizeCallbackPath } from '@/lib/doublejAuth'
import {
  OIDC_STATE_COOKIE,
  buildAccountsContinueUrl,
  buildAuthorizeUrl,
  createAuthState,
  createOidcStateCookieValue,
  createPkcePair,
  getMissingOidcEnvKeys,
  getOidcStateCookieOptions,
  resolveAuthScreen,
} from '@/lib/serviceOidc'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const requestUrl = new URL(request.url)
    const missingEnvKeys = getMissingOidcEnvKeys()
    if (missingEnvKeys.length > 0) {
      console.error(`OIDC 설정 누락: ${missingEnvKeys.join(', ')}`)
      return NextResponse.redirect(new URL('/login?error=oidc_not_configured', request.url))
    }

    const origin = requestUrl.origin
    const callbackUrl = sanitizeCallbackPath(requestUrl.searchParams.get('callbackUrl'), '/')
    const screen = resolveAuthScreen(requestUrl.searchParams.get('screen'))
    const state = createAuthState()
    const { codeVerifier, codeChallenge } = createPkcePair()
    const authorizeUrl = buildAuthorizeUrl({
      origin,
      state,
      codeChallenge,
    })
    const accountsUrl = buildAccountsContinueUrl(authorizeUrl, screen)

    const response = NextResponse.redirect(accountsUrl)
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
    return NextResponse.redirect(new URL('/login?error=oidc_start_failed', request.url))
  }
}
