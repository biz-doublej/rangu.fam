import { NextRequest, NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { getDb } from '@/db/client'
import { wikiUsers } from '@/db/schema/wiki'
import { ACCOUNT_LINK_COOKIE, getAccountLinkCookieOptions, readAccountLinkUserId } from '@/lib/accountLink'
import { recordLoginEvent } from '@/lib/loginEvents'
import {
  AccountLoginError,
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
  const origin = resolvePublicOrigin(request)
  const url = new URL('/wiki/login', origin)
  const stateCookie = request.cookies.get(OIDC_STATE_COOKIE)?.value
  const savedState = stateCookie ? parseOidcStateCookieValue(stateCookie) : null
  if (savedState) url.searchParams.set('callbackUrl', sanitizeCallbackPath(savedState.callbackUrl, '/wiki'))
  url.searchParams.set('error', code)
  return NextResponse.redirect(url)
}

function redirectToAccountSettings(request: NextRequest, params: Record<string, string>) {
  const url = new URL('/settings/account', resolvePublicOrigin(request))
  url.searchParams.set('tab', 'accounts')
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value)
  const response = NextResponse.redirect(url)
  clearOidcStateCookie(response)
  response.cookies.set(ACCOUNT_LINK_COOKIE, '', getAccountLinkCookieOptions(0))
  return response
}

async function linkGoogleAccount(request: NextRequest, userId: string, subject: string) {
  const linkCookie = request.cookies.get(ACCOUNT_LINK_COOKIE)?.value
  if (readAccountLinkUserId(linkCookie) !== userId) {
    return redirectToAccountSettings(request, { linkError: 'link_session_expired' })
  }
  const db = getDb()
  const [owner] = await db
    .select({ id: wikiUsers.id })
    .from(wikiUsers)
    .where(eq(wikiUsers.ssoSubject, subject))
    .limit(1)
  if (owner && owner.id !== userId) {
    return redirectToAccountSettings(request, { linkError: 'provider_already_linked' })
  }
  await db
    .update(wikiUsers)
    .set({ ssoSubject: subject, googleUnlinkedAt: null, updatedAt: new Date() })
    .where(eq(wikiUsers.id, userId))
  return redirectToAccountSettings(request, { linked: 'google' })
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

    const identity = extractIdentity(tokenResponse)
    if (!identity) {
      const response = redirectWithError(request, 'identity_not_found')
      clearOidcStateCookie(response)
      return response
    }

    if (parsedState.linkUserId) {
      return await linkGoogleAccount(request, parsedState.linkUserId, identity.subject)
    }

    if (!identity.email || !identity.emailVerified) {
      const response = redirectWithError(request, 'email_not_verified')
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

    await recordLoginEvent(request, String((user as { _id?: string; id?: string })._id || (user as { id?: string }).id), 'google')

    const callbackUrl = sanitizeCallbackPath(parsedState.callbackUrl, '/')
    const response = NextResponse.redirect(new URL(callbackUrl, publicOrigin))
    setDoubleJAuthCookie(response, createDoubleJToken(user))
    setWikiAuthCookie(response, createWikiToken(user))
    clearOidcStateCookie(response)
    return response
  } catch (error) {
    if (error instanceof AccountLoginError) {
      const response = redirectWithError(request, error.code)
      clearOidcStateCookie(response)
      return response
    }
    console.error('OIDC 콜백 처리 오류:', error)
    const cause = (error as { cause?: { code?: string } })?.cause
    const response = redirectWithError(request, cause?.code === 'ECONNREFUSED' ? 'database_unavailable' : 'oidc_callback_failed')
    clearOidcStateCookie(response)
    return response
  }
}
