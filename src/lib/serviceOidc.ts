import crypto from 'crypto'
import jwt from 'jsonwebtoken'
import { getOptionalEnv, getRequiredEnv } from '@/lib/env'
import { sanitizeCallbackPath } from '@/lib/doublejAuth'

export const OIDC_STATE_COOKIE = 'oidc-service-state'

const JWT_SECRET = getRequiredEnv('JWT_SECRET')
const DEFAULT_ISSUER = 'https://auth.doublej.app'
const DEFAULT_ACCOUNTS_BASE = 'https://accounts.doublej.app'
const DEFAULT_SCOPE = 'openid profile email offline_access'
const STATE_TTL_SECONDS = 10 * 60

interface OidcStatePayload {
  state: string
  codeVerifier: string
  callbackUrl: string
  iat?: number
  exp?: number
}

interface OpenIdConfiguration {
  token_endpoint?: string
  userinfo_endpoint?: string
}

export interface OidcTokenResponse {
  access_token: string
  refresh_token?: string
  id_token?: string
  token_type?: string
  expires_in?: number
  scope?: string
}

export interface OidcIdentity {
  subject: string
  username: string
  email?: string
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

function resolveOpenIdConfigurationUrl(issuer: string): string {
  const normalizedIssuer = issuer.replace(/\/+$/, '')
  return `${normalizedIssuer}/.well-known/openid-configuration`
}

function resolveTokenEndpoint(issuer: string, config: OpenIdConfiguration | null): string {
  if (config?.token_endpoint) return config.token_endpoint
  return `${issuer.replace(/\/+$/, '')}/oauth2/token`
}

function resolveUserInfoEndpoint(issuer: string, config: OpenIdConfiguration | null): string {
  if (config?.userinfo_endpoint) return config.userinfo_endpoint
  return `${issuer.replace(/\/+$/, '')}/oauth2/userinfo`
}

export function getOidcIssuer(): string {
  return getOptionalEnv('OIDC_ISSUER') || DEFAULT_ISSUER
}

export function getAccountsBaseUrl(): string {
  return getOptionalEnv('ACCOUNTS_BASE_URL') || DEFAULT_ACCOUNTS_BASE
}

export function getOidcClientId(): string {
  return getRequiredEnv('OIDC_CLIENT_ID')
}

export function getOidcClientSecret(): string {
  return getRequiredEnv('OIDC_CLIENT_SECRET')
}

export function getMissingOidcEnvKeys(): string[] {
  const requiredKeys = ['OIDC_CLIENT_ID', 'OIDC_CLIENT_SECRET']
  return requiredKeys.filter((key) => !getOptionalEnv(key))
}

export function getOidcScope(): string {
  return getOptionalEnv('OIDC_SCOPE') || DEFAULT_SCOPE
}

export function resolveOidcRedirectUri(origin: string): string {
  return getOptionalEnv('OIDC_REDIRECT_URI') || `${origin}/auth/callback`
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
}): string {
  return jwt.sign(
    {
      state: payload.state,
      codeVerifier: payload.codeVerifier,
      callbackUrl: sanitizeCallbackPath(payload.callbackUrl, '/'),
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
  const issuer = getOidcIssuer()
  const clientId = getOidcClientId()
  const redirectUri = resolveOidcRedirectUri(params.origin)
  const authorizeUrl = new URL(`${issuer.replace(/\/+$/, '')}/oauth2/authorize`)
  authorizeUrl.searchParams.set('response_type', 'code')
  authorizeUrl.searchParams.set('client_id', clientId)
  authorizeUrl.searchParams.set('redirect_uri', redirectUri)
  authorizeUrl.searchParams.set('scope', getOidcScope())
  authorizeUrl.searchParams.set('state', params.state)
  authorizeUrl.searchParams.set('code_challenge', params.codeChallenge)
  authorizeUrl.searchParams.set('code_challenge_method', 'S256')
  authorizeUrl.searchParams.set('consent_action', 'approve')
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

export async function fetchOpenIdConfiguration(issuer: string): Promise<OpenIdConfiguration | null> {
  try {
    const response = await fetch(resolveOpenIdConfigurationUrl(issuer), {
      cache: 'no-store',
    })
    if (!response.ok) return null
    return (await response.json()) as OpenIdConfiguration
  } catch {
    return null
  }
}

export async function exchangeAuthorizationCode(params: {
  origin: string
  code: string
  codeVerifier: string
}): Promise<OidcTokenResponse> {
  const issuer = getOidcIssuer()
  const clientId = getOidcClientId()
  const clientSecret = getOidcClientSecret()
  const openIdConfig = await fetchOpenIdConfiguration(issuer)
  const tokenEndpoint = resolveTokenEndpoint(issuer, openIdConfig)
  const redirectUri = resolveOidcRedirectUri(params.origin)

  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code: params.code,
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: redirectUri,
    code_verifier: params.codeVerifier,
  })

  const response = await fetch(tokenEndpoint, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
    cache: 'no-store',
  })

  const payload = await response.json().catch(() => null)
  if (!response.ok || !payload?.access_token) {
    throw new Error(
      `oidc_token_exchange_failed: ${response.status}${
        payload?.error ? `:${String(payload.error)}` : ''
      }`
    )
  }

  return payload as OidcTokenResponse
}

export async function fetchOidcUserInfo(accessToken: string): Promise<Record<string, unknown> | null> {
  const issuer = getOidcIssuer()
  const openIdConfig = await fetchOpenIdConfiguration(issuer)
  const userInfoEndpoint = resolveUserInfoEndpoint(issuer, openIdConfig)

  try {
    const response = await fetch(userInfoEndpoint, {
      headers: {
        authorization: `Bearer ${accessToken}`,
      },
      cache: 'no-store',
    })

    if (!response.ok) return null
    return (await response.json()) as Record<string, unknown>
  } catch {
    return null
  }
}

export function extractIdentity(
  tokenResponse: OidcTokenResponse,
  userInfo: Record<string, unknown> | null
): OidcIdentity | null {
  const idTokenClaims = tokenResponse.id_token ? decodeJwtPayload(tokenResponse.id_token) : null
  const claims = {
    ...(idTokenClaims || {}),
    ...(userInfo || {}),
  }

  const subject = normalizeClaimString(claims.sub)
  if (!subject) return null

  const email = normalizeClaimString(claims.email)
  const preferredUsername =
    normalizeClaimString(claims.preferred_username) ||
    normalizeClaimString(claims.username) ||
    normalizeClaimString(claims.nickname)
  const displayName =
    normalizeClaimString(claims.name) ||
    normalizeClaimString(claims.display_name) ||
    preferredUsername
  const avatar =
    normalizeClaimString(claims.picture) ||
    normalizeClaimString(claims.avatar_url) ||
    normalizeClaimString(claims.avatar)

  const emailLocal = email ? email.split('@')[0] : undefined
  const usernameSeed = preferredUsername || emailLocal || `user-${subject.slice(0, 8)}`

  return {
    subject,
    username: buildUsernameFallback(usernameSeed),
    email,
    displayName,
    avatar,
  }
}
