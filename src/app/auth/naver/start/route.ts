import { NextRequest, NextResponse } from 'next/server'
import { sanitizeCallbackPath } from '@/lib/doublejAuth'
import {
  NAVER_STATE_COOKIE,
  buildNaverAuthorizeUrl,
  getNaverStateCookieOptions,
  isNaverConfigured,
} from '@/lib/naverAuth'
import { resolvePublicOrigin } from '@/lib/serviceOidc'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const origin = resolvePublicOrigin(request)
  const callbackUrl = sanitizeCallbackPath(new URL(request.url).searchParams.get('callbackUrl'), '/wiki')
  if (!isNaverConfigured()) {
    const login = new URL('/wiki/login', origin)
    login.searchParams.set('error', 'naver_not_configured')
    return NextResponse.redirect(login)
  }
  const state = crypto.randomUUID()
  const response = NextResponse.redirect(buildNaverAuthorizeUrl({ origin, state, callbackUrl }))
  response.cookies.set(NAVER_STATE_COOKIE, state, getNaverStateCookieOptions())
  return response
}
