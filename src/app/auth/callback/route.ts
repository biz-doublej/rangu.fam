import { NextRequest, NextResponse } from 'next/server'
import {
  createDesktopHandoffCode,
  createDoubleJToken,
  createWikiToken,
  findOrCreateWikiUserFromOidcProfile,
  sanitizeCallbackPath,
  setDoubleJAuthCookie,
  setWikiAuthCookie,
} from '@/lib/doublejAuth'
import {
  OIDC_STATE_COOKIE,
  exchangeAuthorizationCode,
  extractIdentity,
  fetchOidcUserInfo,
  getMissingOidcEnvKeys,
  getOidcStateCookieOptions,
  parseOidcStateCookieValue,
  resolvePublicOrigin,
} from '@/lib/serviceOidc'

export const dynamic = 'force-dynamic'

function clearOidcStateCookie(response: NextResponse) {
  response.cookies.set(OIDC_STATE_COOKIE, '', {
    ...getOidcStateCookieOptions(),
    maxAge: 0,
  })
}

function redirectWithError(request: NextRequest, code: string) {
  const url = new URL('/login', resolvePublicOrigin(request))
  url.searchParams.set('error', code)
  return NextResponse.redirect(url)
}

export async function GET(request: NextRequest) {
  const missingEnvKeys = getMissingOidcEnvKeys()
  if (missingEnvKeys.length > 0) {
    console.error(`OIDC 설정 누락: ${missingEnvKeys.join(', ')}`)
    return redirectWithError(request, 'oidc_not_configured')
  }

  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const state = requestUrl.searchParams.get('state')
  const oauthError = requestUrl.searchParams.get('error')

  if (oauthError) {
    const response = redirectWithError(request, 'oidc_authorize_failed')
    clearOidcStateCookie(response)
    return response
  }

  if (!code || !state) {
    const response = redirectWithError(request, 'invalid_oauth_callback')
    clearOidcStateCookie(response)
    return response
  }

  const stateCookie = request.cookies.get(OIDC_STATE_COOKIE)?.value
  if (!stateCookie) {
    return redirectWithError(request, 'state_missing')
  }

  const parsedState = parseOidcStateCookieValue(stateCookie)
  if (!parsedState || parsedState.state !== state) {
    const response = redirectWithError(request, 'state_mismatch')
    clearOidcStateCookie(response)
    return response
  }

  const publicOrigin = resolvePublicOrigin(request)

  try {
    const tokenResponse = await exchangeAuthorizationCode({
      origin: publicOrigin,
      code,
      codeVerifier: parsedState.codeVerifier,
    })

    const userInfo = await fetchOidcUserInfo(tokenResponse.access_token)
    const identity = extractIdentity(tokenResponse, userInfo)
    if (!identity) {
      const response = redirectWithError(request, 'identity_not_found')
      clearOidcStateCookie(response)
      return response
    }

    const user = await findOrCreateWikiUserFromOidcProfile(identity)
    if (!user) {
      const response = redirectWithError(request, 'session_sync_failed')
      clearOidcStateCookie(response)
      return response
    }

    if (!user.isActive) {
      const response = redirectWithError(request, 'account_inactive')
      clearOidcStateCookie(response)
      return response
    }

    const isBanned = Boolean((user as any).isBanned || (user as any).banStatus?.isBanned)
    if (isBanned) {
      const response = redirectWithError(request, 'account_banned')
      clearOidcStateCookie(response)
      return response
    }

    // 데스크톱(네이티브 셸) 분기 — 브라우저 쿠키 대신 단명 handoff code 를
    // 앱의 루프백 서버로 돌려준다. host 는 127.0.0.1 고정(오픈 리다이렉트 불가),
    // port 는 서명된 state 쿠키에서만 옴.
    if (parsedState.desktop) {
      const userId = String((user as { _id?: string; id?: string })._id || (user as { id?: string }).id)
      const handoffCode = createDesktopHandoffCode(userId)
      const loopbackUrl =
        `http://127.0.0.1:${parsedState.desktop.port}/callback` +
        `?code=${encodeURIComponent(handoffCode)}` +
        `&state=${encodeURIComponent(parsedState.desktop.state)}`
      const response = NextResponse.redirect(loopbackUrl)
      clearOidcStateCookie(response)
      return response
    }

    const callbackUrl = sanitizeCallbackPath(parsedState.callbackUrl, '/')
    const response = NextResponse.redirect(new URL(callbackUrl, publicOrigin))
    setDoubleJAuthCookie(response, createDoubleJToken(user))
    setWikiAuthCookie(response, createWikiToken(user))
    clearOidcStateCookie(response)
    return response
  } catch (error) {
    console.error('OIDC 콜백 처리 오류:', error)
    const response = redirectWithError(request, 'oidc_callback_failed')
    clearOidcStateCookie(response)
    return response
  }
}
