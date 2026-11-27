import { describe, expect, it } from 'vitest'
import { rejectionFor } from './auth'

describe('rejectionFor — 이랑위키 로그인과 같은 거절 규칙', () => {
  it('정상 계정은 통과', () => {
    expect(rejectionFor({ isActive: true, banStatus: null })).toBeNull()
    expect(rejectionFor({ isActive: true, banStatus: { isBanned: false } })).toBeNull()
  })

  it('없는 계정 404', () => {
    expect(rejectionFor(undefined)?.status).toBe(404)
  })

  it('비활성 계정 401', () => {
    expect(rejectionFor({ isActive: false, banStatus: null })?.status).toBe(401)
  })

  it('차단 계정 403', () => {
    expect(rejectionFor({ isActive: true, banStatus: { isBanned: true, reason: '도배' } })?.status).toBe(403)
  })
})
