import { getOptionalEnv, getRequiredEnv } from '@/lib/env'

export const NAVER_STATE_COOKIE = 'naver-login-state'
/** 연결 흐름은 state 쿠키 값에 이 접두어를 붙여 로그인과 구분한다. */
export const NAVER_LINK_PREFIX = 'link:'

const STATE_TTL_SECONDS = 10 * 60

export function getNaverStateCookieOptions(maxAge: number = STATE_TTL_SECONDS) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    maxAge,
    path: '/',
  }
}

export function isNaverConfigured(): boolean {
  return Boolean(getOptionalEnv('NAVER_CLIENT_ID') && getOptionalEnv('NAVER_CLIENT_SECRET'))
}

export function resolveNaverRedirectUri(origin: string): string {
  return getOptionalEnv('NAVER_REDIRECT_URI') || `${origin}/auth/naver/callback`
}

export function buildNaverAuthorizeUrl(params: { origin: string; state: string; callbackUrl: string }): URL {
  const authorize = new URL('https://nid.naver.com/oauth2.0/authorize')
  authorize.searchParams.set('response_type', 'code')
  authorize.searchParams.set('client_id', getRequiredEnv('NAVER_CLIENT_ID'))
  authorize.searchParams.set('redirect_uri', resolveNaverRedirectUri(params.origin))
  authorize.searchParams.set('state', `${params.state}.${Buffer.from(params.callbackUrl).toString('base64url')}`)
  return authorize
}

export async function fetchNaverProfile(code: string, state: string): Promise<{ id: string; email: string | null }> {
  const tokenUrl = new URL('https://nid.naver.com/oauth2.0/token')
  tokenUrl.searchParams.set('grant_type', 'authorization_code')
  tokenUrl.searchParams.set('client_id', getRequiredEnv('NAVER_CLIENT_ID'))
  tokenUrl.searchParams.set('client_secret', getRequiredEnv('NAVER_CLIENT_SECRET'))
  tokenUrl.searchParams.set('code', code)
  tokenUrl.searchParams.set('state', state)

  const tokenResponse = await fetch(tokenUrl, { cache: 'no-store' })
  const token = await tokenResponse.json().catch(() => null)
  if (!tokenResponse.ok || !token?.access_token) {
    throw new Error(`naver_token_failed: ${tokenResponse.status}`)
  }

  const profileResponse = await fetch('https://openapi.naver.com/v1/nid/me', {
    headers: { authorization: `Bearer ${token.access_token}` },
    cache: 'no-store',
  })
  const profile = await profileResponse.json().catch(() => null)
  const id = profile?.response?.id
  if (!profileResponse.ok || profile?.resultcode !== '00' || !id) {
    throw new Error(`naver_profile_failed: ${profileResponse.status}`)
  }
  return { id: String(id), email: profile.response.email || null }
}
