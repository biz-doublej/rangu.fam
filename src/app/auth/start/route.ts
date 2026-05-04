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
 * OIDC sign-in entry point. Standard OAuth 2.0 Authorization Code + PKCE.
 *
 * We redirect the browser straight to `/oauth2/authorize` on the identity
 * server. The identity server is responsible for bouncing unauthenticated
 * users through the accounts sign-in UI and then back to the redirect_uri.
 * (Implemented by the platform's `parkAuthorizeForLogin` flow.)
 */
export async function GET(request: NextRequest) {
  try {
    const requestUrl = new URL(request.url)
    const origin = resolvePublicOrigin(request)
    const missingEnvKeys = getMissingOidcEnvKeys()
    if (missingEnvKeys.length > 0) {
      console.error(`OIDC 설정 누락: ${missingEnvKeys.join(', ')}`)
      return NextResponse.redirect(new URL('/login?error=oidc_not_configured', origin))
    }

    const callbackUrl = sanitizeCallbackPath(requestUrl.searchParams.get('callbackUrl'), '/')
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
    return NextResponse.redirect(new URL('/login?error=oidc_start_failed', origin))
  }
}
