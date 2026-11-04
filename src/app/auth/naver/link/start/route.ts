import { NextRequest, NextResponse } from 'next/server'
import { ACCOUNT_LINK_COOKIE, createAccountLinkCookieValue, getAccountLinkCookieOptions } from '@/lib/accountLink'
import { getAuthenticatedWikiUser } from '@/lib/doublejAuth'
import {
  NAVER_LINK_PREFIX,
  NAVER_STATE_COOKIE,
  buildNaverAuthorizeUrl,
  getNaverStateCookieOptions,
  isNaverConfigured,
} from '@/lib/naverAuth'
import { resolvePublicOrigin } from '@/lib/serviceOidc'

export const dynamic = 'force-dynamic'

const SETTINGS_PATH = '/settings/account?tab=accounts'

export async function GET(request: NextRequest) {
  const origin = resolvePublicOrigin(request)
  if (!isNaverConfigured()) {
    return NextResponse.redirect(new URL(`${SETTINGS_PATH}&linkError=naver_not_configured`, origin))
  }
  const user = await getAuthenticatedWikiUser(request)
  if (!user) {
    return NextResponse.redirect(new URL(`${SETTINGS_PATH}&linkError=login_required`, origin))
  }

  const state = crypto.randomUUID()
  const response = NextResponse.redirect(buildNaverAuthorizeUrl({ origin, state, callbackUrl: SETTINGS_PATH }))
  response.cookies.set(NAVER_STATE_COOKIE, `${NAVER_LINK_PREFIX}${state}`, getNaverStateCookieOptions())
  response.cookies.set(
    ACCOUNT_LINK_COOKIE,
    createAccountLinkCookieValue(String(user._id || user.id)),
    getAccountLinkCookieOptions()
  )
  return response
}
