import { NextRequest, NextResponse } from 'next/server'
import { ACCOUNT_LINK_COOKIE, createAccountLinkCookieValue, getAccountLinkCookieOptions } from '@/lib/accountLink'
import { getAuthenticatedWikiUser } from '@/lib/doublejAuth'
import {
  OIDC_STATE_COOKIE,
  buildAuthorizeUrl,
  createAuthState,
  createOidcStateCookieValue,
  createPkcePair,
  getOidcStateCookieOptions,
  resolvePublicOrigin,
} from '@/lib/serviceOidc'

export const dynamic = 'force-dynamic'

const SETTINGS_PATH = '/settings/account?tab=accounts'

/** 로그인한 회원의 계정에 구글을 연결한다. 콜백은 로그인과 같은 /auth/callback 을 쓴다. */
export async function GET(request: NextRequest) {
  const origin = resolvePublicOrigin(request)
  const user = await getAuthenticatedWikiUser(request)
  if (!user) {
    return NextResponse.redirect(new URL(`${SETTINGS_PATH}&linkError=login_required`, origin))
  }

  const userId = String(user._id || user.id)
  const state = createAuthState()
  const { codeVerifier, codeChallenge } = createPkcePair()
  const response = NextResponse.redirect(buildAuthorizeUrl({ origin, state, codeChallenge }))
  response.cookies.set(
    OIDC_STATE_COOKIE,
    createOidcStateCookieValue({ state, codeVerifier, callbackUrl: SETTINGS_PATH, linkUserId: userId }),
    getOidcStateCookieOptions()
  )
  response.cookies.set(ACCOUNT_LINK_COOKIE, createAccountLinkCookieValue(userId), getAccountLinkCookieOptions())
  return response
}
