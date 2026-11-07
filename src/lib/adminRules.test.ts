import { describe, expect, it } from 'vitest'
import { isNoticeLive, planAccountLink, validateNoticeInput } from './adminRules'

const account = (overrides: Partial<Parameters<typeof planAccountLink>[0]> = {}) => ({
  id: 'a',
  username: 'a',
  isActive: true,
  ssoSubject: null,
  naverId: null,
  ...overrides,
})

describe('planAccountLink', () => {
  it('moves a Google login from a new account to a legacy account', () => {
    const source = account({ id: 'new', ssoSubject: 'google:1' })
    const target = account({ id: 'old', ssoSubject: 'legacy-subject' })
    expect(planAccountLink(source, target)).toEqual({ ok: true, moveGoogle: true, moveNaver: false })
  })

  it('refuses to overwrite an existing login of the same kind', () => {
    expect(planAccountLink(account({ id: 'n', ssoSubject: 'google:1' }), account({ id: 'o', ssoSubject: 'google:2' })).ok).toBe(false)
    expect(planAccountLink(account({ id: 'n', naverId: 'x' }), account({ id: 'o', naverId: 'y' })).ok).toBe(false)
  })

  it('rejects same account, inactive target, and nothing to move', () => {
    expect(planAccountLink(account({ ssoSubject: 'google:1' }), account()).ok).toBe(false)
    expect(planAccountLink(account({ id: 'n', ssoSubject: 'google:1' }), account({ id: 'o', isActive: false })).ok).toBe(false)
    expect(planAccountLink(account({ id: 'n', ssoSubject: 'legacy' }), account({ id: 'o' })).ok).toBe(false)
  })
})

describe('validateNoticeInput', () => {
  it('accepts a notice with a site link', () => {
    const result = validateNoticeInput({ message: ' 점검 안내 ', linkUrl: '/wiki/공지', tone: 'warning' })
    expect(result).toEqual({
      ok: true,
      value: { message: '점검 안내', linkUrl: '/wiki/공지', tone: 'warning', isActive: true, startsAt: null, endsAt: null },
    })
  })

  it('rejects unsafe links, empty text, and reversed dates', () => {
    expect(validateNoticeInput({ message: 'x', linkUrl: 'javascript:alert(1)' }).ok).toBe(false)
    expect(validateNoticeInput({ message: 'x', linkUrl: '//evil.example' }).ok).toBe(false)
    expect(validateNoticeInput({ message: ' ' }).ok).toBe(false)
    expect(validateNoticeInput({ message: 'x', startsAt: '2026-11-10', endsAt: '2026-11-09' }).ok).toBe(false)
  })
})

describe('isNoticeLive', () => {
  const now = new Date('2026-11-08T00:00:00Z')
  it('respects active flag and time window', () => {
    expect(isNoticeLive({ isActive: true, startsAt: null, endsAt: null }, now)).toBe(true)
    expect(isNoticeLive({ isActive: false, startsAt: null, endsAt: null }, now)).toBe(false)
    expect(isNoticeLive({ isActive: true, startsAt: new Date('2026-11-09'), endsAt: null }, now)).toBe(false)
    expect(isNoticeLive({ isActive: true, startsAt: null, endsAt: new Date('2026-11-07') }, now)).toBe(false)
  })
})
