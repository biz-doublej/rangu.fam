import { describe, expect, it } from 'vitest'
import {
  classifyGoogleEmailMatch,
  countLoginMethods,
  maskIp,
  nextDisplayNameChangeAt,
  parseNaverState,
  summarizeUserAgent,
  validateDisplayName,
} from './accountRules'

describe('validateDisplayName', () => {
  it('trims and accepts a normal name', () => {
    expect(validateDisplayName('  재원  ')).toEqual({ ok: true, value: '재원' })
  })

  it('rejects length, characters, and reserved words', () => {
    expect(validateDisplayName('a').ok).toBe(false)
    expect(validateDisplayName('a'.repeat(21)).ok).toBe(false)
    expect(validateDisplayName('이름<script>').ok).toBe(false)
    expect(validateDisplayName('이랑위키 운영자').ok).toBe(false)
    expect(validateDisplayName('Real Admin').ok).toBe(false)
  })

  it('lets admins use reserved words', () => {
    expect(validateDisplayName('운영자', { isAdmin: true }).ok).toBe(true)
  })
})

describe('nextDisplayNameChangeAt', () => {
  const now = new Date('2026-11-05T00:00:00Z')

  it('allows the first change and changes after seven days', () => {
    expect(nextDisplayNameChangeAt(null, now)).toBeNull()
    expect(nextDisplayNameChangeAt(new Date('2026-10-29T00:00:00Z'), now)).toBeNull()
  })

  it('blocks a change inside seven days', () => {
    expect(nextDisplayNameChangeAt(new Date('2026-11-04T00:00:00Z'), now)?.toISOString()).toBe(
      '2026-11-11T00:00:00.000Z'
    )
  })
})

describe('login methods', () => {
  it('counts only Google subjects and Naver', () => {
    expect(countLoginMethods({ ssoSubject: 'google:1', naverId: 'n' })).toBe(2)
    expect(countLoginMethods({ ssoSubject: 'legacy-subject', naverId: null })).toBe(0)
    expect(countLoginMethods({ ssoSubject: null, naverId: 'n' })).toBe(1)
  })
})

describe('classifyGoogleEmailMatch', () => {
  it('links legacy accounts on first Google login', () => {
    expect(classifyGoogleEmailMatch({ ssoSubject: 'legacy-subject' })).toBe('link')
    expect(classifyGoogleEmailMatch({ ssoSubject: null })).toBe('link')
  })

  it('never replaces another Google link', () => {
    expect(classifyGoogleEmailMatch({ ssoSubject: 'google:other' })).toBe('google_account_mismatch')
  })

  it('does not silently relink after a deliberate unlink', () => {
    expect(classifyGoogleEmailMatch({ ssoSubject: null, googleUnlinkedAt: new Date() })).toBe('google_not_linked')
  })
})

describe('maskIp', () => {
  it('hides the last parts of IPv4 and IPv6 addresses', () => {
    expect(maskIp('49.164.140.8')).toBe('49.164.*.*')
    expect(maskIp('2a09:bac1:72c0:20::3d6:4')).toBe('2a09:bac1:…')
    expect(maskIp(null)).toBe('알 수 없음')
  })
})

describe('summarizeUserAgent', () => {
  it('summarizes browser and OS', () => {
    expect(
      summarizeUserAgent('Mozilla/5.0 (Windows NT 10.0) AppleWebKit/537.36 Chrome/150.0 Safari/537.36')
    ).toBe('Chrome · Windows')
    expect(summarizeUserAgent('')).toBe('알 수 없는 브라우저 · 알 수 없는 기기')
  })
})

describe('parseNaverState', () => {
  it('splits state and callback path', () => {
    const encoded = Buffer.from('/settings/account').toString('base64url')
    expect(parseNaverState(`abc.${encoded}`)).toEqual({ state: 'abc', callbackUrl: '/settings/account' })
    expect(parseNaverState('abc')).toBeNull()
  })
})
