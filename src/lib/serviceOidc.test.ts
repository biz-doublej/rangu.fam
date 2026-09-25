import { beforeAll, describe, expect, it, vi } from 'vitest'

const CLIENT_ID = 'test-client.apps.googleusercontent.com'
const NOW = Date.UTC(2026, 8, 25, 12, 0, 0)

let extractIdentity: typeof import('./serviceOidc').extractIdentity

beforeAll(async () => {
  vi.stubEnv('JWT_SECRET', 'test-secret')
  vi.stubEnv('GOOGLE_CLIENT_ID', CLIENT_ID)
  vi.stubEnv('GOOGLE_CLIENT_SECRET', 'test-client-secret')
  ;({ extractIdentity } = await import('./serviceOidc'))
})

function idToken(claims: Record<string, unknown>): string {
  const encode = (value: object) => Buffer.from(JSON.stringify(value)).toString('base64url')
  return `${encode({ alg: 'RS256', typ: 'JWT' })}.${encode(claims)}.signature`
}

const validClaims = {
  iss: 'https://accounts.google.com',
  aud: CLIENT_ID,
  sub: '1234567890',
  email: 'Gabriel@Example.com',
  email_verified: true,
  name: '정재원',
  picture: 'https://lh3.googleusercontent.com/a/photo',
  exp: Math.floor(NOW / 1000) + 3600,
}

const identityFor = (claims: Record<string, unknown>) =>
  extractIdentity({ access_token: 'x', id_token: idToken(claims) }, NOW)

describe('extractIdentity (Google id_token)', () => {
  it('maps verified Google claims to an identity with a namespaced subject', () => {
    expect(identityFor(validClaims)).toEqual({
      subject: 'google:1234567890',
      username: 'gabriel',
      email: 'gabriel@example.com',
      emailVerified: true,
      displayName: '정재원',
      avatar: 'https://lh3.googleusercontent.com/a/photo',
    })
  })

  it('rejects tokens issued for another client', () => {
    expect(identityFor({ ...validClaims, aud: 'someone-else' })).toBeNull()
  })

  it('rejects tokens from another issuer', () => {
    expect(identityFor({ ...validClaims, iss: 'https://auth.doublej.app' })).toBeNull()
  })

  it('rejects expired tokens', () => {
    expect(identityFor({ ...validClaims, exp: Math.floor(NOW / 1000) - 3600 })).toBeNull()
  })

  it('reports unverified email so the caller can refuse it', () => {
    expect(identityFor({ ...validClaims, email_verified: false })?.emailVerified).toBe(false)
  })

  it('returns null without an id_token', () => {
    expect(extractIdentity({ access_token: 'x' }, NOW)).toBeNull()
  })
})
