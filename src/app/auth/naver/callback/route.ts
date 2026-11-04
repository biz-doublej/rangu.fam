import { NextRequest, NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { getDb } from '@/db/client'
import { wikiUsers } from '@/db/schema/wiki'
import { ACCOUNT_LINK_COOKIE, getAccountLinkCookieOptions, readAccountLinkUserId } from '@/lib/accountLink'
import { parseNaverState } from '@/lib/accountRules'
import {
  createDoubleJToken,
  createWikiToken,
  enforceUserAccessPolicy,
  sanitizeCallbackPath,
  setDoubleJAuthCookie,
  setWikiAuthCookie,
} from '@/lib/doublejAuth'
import { recordLoginEvent } from '@/lib/loginEvents'
import {
  NAVER_LINK_PREFIX,
  NAVER_STATE_COOKIE,
  fetchNaverProfile,
  getNaverStateCookieOptions,
  isNaverConfigured,
} from '@/lib/naverAuth'
import { resolvePublicOrigin } from '@/lib/serviceOidc'

export const dynamic = 'force-dynamic'

function clearCookies(response: NextResponse) {
  response.cookies.set(NAVER_STATE_COOKIE, '', getNaverStateCookieOptions(0))
  response.cookies.set(ACCOUNT_LINK_COOKIE, '', getAccountLinkCookieOptions(0))
  return response
}

function loginError(origin: string, code: string) {
  const url = new URL('/wiki/login', origin)
  url.searchParams.set('error', code)
  return clearCookies(NextResponse.redirect(url))
}

function settingsResult(origin: string, params: Record<string, string>) {
  const url = new URL('/settings/account', origin)
  url.searchParams.set('tab', 'accounts')
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value)
  return clearCookies(NextResponse.redirect(url))
}

export async function GET(request: NextRequest) {
  const origin = resolvePublicOrigin(request)
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const stateParam = requestUrl.searchParams.get('state')
  const stateCookie = request.cookies.get(NAVER_STATE_COOKIE)?.value || ''
  const isLink = stateCookie.startsWith(NAVER_LINK_PREFIX)
  const expectedState = isLink ? stateCookie.slice(NAVER_LINK_PREFIX.length) : stateCookie
  const fail = (failure: string) =>
    isLink ? settingsResult(origin, { linkError: failure }) : loginError(origin, failure)

  const parsed = parseNaverState(stateParam)
  if (!isNaverConfigured()) return fail('naver_not_configured')
  if (!code || !stateParam || !parsed || !expectedState || parsed.state !== expectedState) {
    return fail(isLink ? 'link_session_expired' : 'state_mismatch')
  }

  try {
    const profile = await fetchNaverProfile(code, stateParam)
    const db = getDb()
    const [owner] = await db.select().from(wikiUsers).where(eq(wikiUsers.naverId, profile.id)).limit(1)

    if (isLink) {
      const userId = readAccountLinkUserId(request.cookies.get(ACCOUNT_LINK_COOKIE)?.value)
      if (!userId) return fail('link_session_expired')
      if (owner && owner.id !== userId) return fail('provider_already_linked')
      await db
        .update(wikiUsers)
        .set({ naverId: profile.id, naverEmail: profile.email, updatedAt: new Date() })
        .where(eq(wikiUsers.id, userId))
      return settingsResult(origin, { linked: 'naver' })
    }

    // 네이버 이메일은 계정 매칭에 쓰지 않는다. 연결한 회원만 로그인할 수 있다.
    if (!owner) return fail('naver_not_linked')
    if (!owner.isActive) return fail('account_inactive')
    if (owner.banStatus?.isBanned) return fail('account_banned')

    const now = new Date()
    const [updated] = await db
      .update(wikiUsers)
      .set({ lastLogin: now, lastActivity: now, updatedAt: now })
      .where(eq(wikiUsers.id, owner.id))
      .returning()
    ;(updated as any)._id = updated.id
    const user = await enforceUserAccessPolicy(updated as any)
    if (!user) return fail('session_sync_failed')

    await recordLoginEvent(request, updated.id, 'naver')
    const callbackUrl = sanitizeCallbackPath(parsed.callbackUrl, '/wiki')
    const response = clearCookies(NextResponse.redirect(new URL(callbackUrl, origin)))
    setDoubleJAuthCookie(response, createDoubleJToken(user))
    setWikiAuthCookie(response, createWikiToken(user))
    return response
  } catch (error) {
    console.error('네이버 콜백 처리 오류:', error)
    return fail(isLink ? 'link_failed' : 'naver_login_failed')
  }
}
