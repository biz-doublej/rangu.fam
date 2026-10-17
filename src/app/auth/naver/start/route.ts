import { NextRequest, NextResponse } from 'next/server'
import { sanitizeCallbackPath } from '@/lib/doublejAuth'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const url = new URL(request.url)
  const callbackUrl = sanitizeCallbackPath(url.searchParams.get('callbackUrl'), '/wiki')
  const clientId = process.env.NAVER_CLIENT_ID
  const redirectUri = process.env.NAVER_REDIRECT_URI || `${url.origin}/auth/naver/callback`
  if (!clientId || !process.env.NAVER_CLIENT_SECRET) {
    const login = new URL('/wiki/login', url.origin)
    login.searchParams.set('error', 'naver_not_configured')
    return NextResponse.redirect(login)
  }
  const state = crypto.randomUUID()
  const authorize = new URL('https://nid.naver.com/oauth2.0/authorize')
  authorize.searchParams.set('response_type', 'code')
  authorize.searchParams.set('client_id', clientId)
  authorize.searchParams.set('redirect_uri', redirectUri)
  authorize.searchParams.set('state', `${state}.${Buffer.from(callbackUrl).toString('base64url')}`)
  const response = NextResponse.redirect(authorize)
  response.cookies.set('naver-login-state', state, { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', maxAge: 600, path: '/' })
  return response
}
