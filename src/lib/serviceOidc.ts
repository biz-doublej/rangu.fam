import crypto from 'crypto'
import jwt from 'jsonwebtoken'
import { getOptionalEnv, getRequiredEnv } from '@/lib/env'
import { sanitizeCallbackPath } from '@/lib/doublejAuth'

/**
 * 구글 로그인 (OpenID Connect, Authorization Code + PKCE).
 *
 * 2026-09 DoubleJ SSO(auth.doublej.app) 를 완전히 대체. 회원 식별은 구글이 검증한 이메일
 * (`email_verified`) 로 기존 wiki_users.email 과 매칭한다 — doublejAuth.findOrCreateWikiUserFromOidcProfile.
 */

export const OIDC_STATE_COOKIE = 'oidc-service-state'

const JWT_SECRET = getRequiredEnv('JWT_SECRET')
const GOOGLE_AUTHORIZE_ENDPOINT = 'https://accounts.google.com/o/oauth2/v2/auth'
const GOOGLE_TOKEN_ENDPOINT = 'https://oauth2.googleapis.com/token'
const GOOGLE_ISSUERS = new Set(['https://accounts.google.com', 'accounts.google.com'])
const GOOGLE_SCOPE = 'openid email profile'
const STATE_TTL_SECONDS = 10 * 60
/** 구글 서버와 우리 서버의 시계 오차 허용 */
const CLOCK_SKEW_SECONDS = 60

/** ssoSubject 컬럼에 저장되는 구글 subject 접두어 (과거 DoubleJ subject 와 네임스페이스 분리) */
export const GOOGLE_SUBJECT_PREFIX = 'google:'

/**
 * 데스크톱(네이티브 셸) 루프백 핸드오프 타깃.
 * 사용자 조작 불가(서명된 state 쿠키에만 보관). host 는 항상 127.0.0.1 로 고정.
 */
export interface OidcDesktopTarget {
  port: number
  state: string
}

interface OidcStatePayload {
  state: string
  codeVerifier: string
  callbackUrl: string
  desktop?: OidcDesktopTarget
  iat?: number
  exp?: number
}

export interface OidcTokenResponse {
  access_token: string
  id_token?: string
  token_type?: string
  expires_in?: number
  scope?: string
}

export interface OidcIdentity {
  subject: string
  username: string
  email?: string
  /** 구글이 소유를 검증한 이메일인지 — false 면 이메일로 기존 계정과 매칭하지 않는다 */
  emailVerified: boolean
  displayName?: string
  avatar?: string
}

function base64UrlEncode(input: Buffer | string): string {
  const buffer = typeof input === 'string' ? Buffer.from(input, 'utf8') : input
  return buffer
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '')
}

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  const segments = token.split('.')
  if (segments.length < 2) return null

  try {
    const normalized = segments[1].replace(/-/g, '+').replace(/_/g, '/')
    const padded = normalized + '='.repeat((4 - (normalized.length % 4 || 4)) % 4)
    return JSON.parse(Buffer.from(padded, 'base64').toString('utf8'))
  } catch {
    return null
  }
}

function normalizeClaimString(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined
  const trimmed = value.trim()
  return trimmed || undefined
}

function buildUsernameFallback(source: string): string {
  const cleaned = source
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '')

  if (cleaned.length >= 3) return cleaned.slice(0, 20)
  if (!cleaned) return `user-${Date.now().toString().slice(-6)}`
  return `${cleaned}x`.slice(0, 20)
}

export function getOidcClientId(): string {
  return getRequiredEnv('GOOGLE_CLIENT_ID')
}

export function getOidcClientSecret(): string {
  return getRequiredEnv('GOOGLE_CLIENT_SECRET')
}

export function getMissingOidcEnvKeys(): string[] {
  const requiredKeys = ['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET']
  return requiredKeys.filter((key) => !getOptionalEnv(key))
}

export function resolveOidcRedirectUri(origin: string): string {
  return getOptionalEnv('GOOGLE_REDIRECT_URI') || `${origin}/auth/callback`
}

/**
 * Resolve the public-facing origin of the incoming request.
 *
 * Behind a reverse proxy (Cloud Run, Netlify, Cloudflare) the raw `request.url`
 * uses the internal listener (e.g. `https://0.0.0.0:8080`) which would leak
 * into OIDC `redirect_uri`. We trust standard `X-Forwarded-Host` /
 * `X-Forwarded-Proto` headers since Cloud Run terminates TLS upstream.
 */
export function resolvePublicOrigin(request: { url: string; headers: Headers }): string {
  const forwardedHost = request.headers.get('x-forwarded-host')
  const host = forwardedHost?.split(',')[0]?.trim()
  if (host) {
    const proto = request.headers.get('x-forwarded-proto')?.split(',')[0]?.trim() || 'https'
    return `${proto}://${host}`
  }
  return new URL(request.url).origin
}

export function createPkcePair(): { codeVerifier: string; codeChallenge: string } {
  const codeVerifier = base64UrlEncode(crypto.randomBytes(64))
  const codeChallenge = base64UrlEncode(crypto.createHash('sha256').update(codeVerifier).digest())
  return { codeVerifier, codeChallenge }
}

export function createAuthState(): string {
  return base64UrlEncode(crypto.randomBytes(32))
}

export function createOidcStateCookieValue(payload: {
  state: string
  codeVerifier: string
  callbackUrl: string
  desktop?: OidcDesktopTarget
}): string {
  return jwt.sign(
    {
      state: payload.state,
      codeVerifier: payload.codeVerifier,
      callbackUrl: sanitizeCallbackPath(payload.callbackUrl, '/'),
      ...(payload.desktop ? { desktop: payload.desktop } : {}),
    },
    JWT_SECRET,
    { expiresIn: `${STATE_TTL_SECONDS}s` }
  )
}

export function parseOidcStateCookieValue(token: string): OidcStatePayload | null {
  try {
    const payload = jwt.verify(token, JWT_SECRET) as OidcStatePayload
    if (!payload?.state || !payload?.codeVerifier) return null
    return {
      ...payload,
      callbackUrl: sanitizeCallbackPath(payload.callbackUrl, '/'),
    }
  } catch {
    return null
  }
}

export function buildAuthorizeUrl(params: {
  origin: string
  state: string
  codeChallenge: string
}): string {
  const authorizeUrl = new URL(GOOGLE_AUTHORIZE_ENDPOINT)
  authorizeUrl.searchParams.set('response_type', 'code')
  authorizeUrl.searchParams.set('client_id', getOidcClientId())
  authorizeUrl.searchParams.set('redirect_uri', resolveOidcRedirectUri(params.origin))
  authorizeUrl.searchParams.set('scope', GOOGLE_SCOPE)
  authorizeUrl.searchParams.set('state', params.state)
  authorizeUrl.searchParams.set('code_challenge', params.codeChallenge)
  authorizeUrl.searchParams.set('code_challenge_method', 'S256')
  // 여러 구글 계정을 쓰는 사람이 매번 계정을 고를 수 있게
  authorizeUrl.searchParams.set('prompt', 'select_account')
  return authorizeUrl.toString()
}

export function getOidcStateCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    maxAge: STATE_TTL_SECONDS,
    path: '/',
  }
}

export async function exchangeAuthorizationCode(params: {
  origin: string
  code: string
  codeVerifier: string
}): Promise<OidcTokenResponse> {
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code: params.code,
    client_id: getOidcClientId(),
    client_secret: getOidcClientSecret(),
    redirect_uri: resolveOidcRedirectUri(params.origin),
    code_verifier: params.codeVerifier,
  })

  const response = await fetch(GOOGLE_TOKEN_ENDPOINT, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
    cache: 'no-store',
  })

  const payload = await response.json().catch(() => null)
  if (!response.ok || !payload?.id_token) {
    throw new Error(
      `oidc_token_exchange_failed: ${response.status}${
        payload?.error ? `:${String(payload.error)}` : ''
      }`
    )
  }

  return payload as OidcTokenResponse
}

/**
 * 토큰 엔드포인트 응답의 id_token 에서 신원을 꺼낸다.
 *
 * id_token 은 클라이언트 시크릿으로 인증한 TLS 요청의 응답으로 구글에서 직접 받았으므로
 * 서명 검증 대신 발급자/대상/만료 클레임만 확인한다 (OpenID Connect Core 3.1.3.7 항목 6).
 * 다른 경로(브라우저, 제3자)로 받은 토큰에는 절대 이 함수를 쓰지 말 것.
 */
export function extractIdentity(
  tokenResponse: OidcTokenResponse,
  now: number = Date.now()
): OidcIdentity | null {
  const claims = tokenResponse.id_token ? decodeJwtPayload(tokenResponse.id_token) : null
  if (!claims) return null

  const issuer = normalizeClaimString(claims.iss)
  if (!issuer || !GOOGLE_ISSUERS.has(issuer)) return null

  const audience = claims.aud
  const clientId = getOidcClientId()
  const audienceOk = Array.isArray(audience) ? audience.includes(clientId) : audience === clientId
  if (!audienceOk) return null

  const nowSeconds = Math.floor(now / 1000)
  if (typeof claims.exp !== 'number' || claims.exp + CLOCK_SKEW_SECONDS < nowSeconds) return null

  const googleSubject = normalizeClaimString(claims.sub)
  if (!googleSubject) return null

  const email = normalizeClaimString(claims.email)?.toLowerCase()
  const emailVerified = claims.email_verified === true || claims.email_verified === 'true'
  const displayName = normalizeClaimString(claims.name) || normalizeClaimString(claims.given_name)
  const avatar = normalizeClaimString(claims.picture)

  const emailLocal = email ? email.split('@')[0] : undefined
  const usernameSeed = emailLocal || `user-${googleSubject.slice(0, 8)}`

  return {
    subject: `${GOOGLE_SUBJECT_PREFIX}${googleSubject}`,
    username: buildUsernameFallback(usernameSeed),
    email,
    emailVerified,
    displayName,
    avatar,
  }
}
