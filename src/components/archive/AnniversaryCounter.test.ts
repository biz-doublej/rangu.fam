import { describe, expect, it } from 'vitest'
import { computeAnniversary } from './AnniversaryCounter'

// KST 정오 = UTC 03:00
const kst = (ymd: string) => new Date(`${ymd}T03:00:00Z`)

describe('computeAnniversary', () => {
  it('counts the start day as day 1', () => {
    const info = computeAnniversary('2025-07-27', kst('2025-07-27'))
    expect(info.dayCount).toBe(1)
    expect(info.years).toBe(0)
  })

  it('marks 100일 on start + 99 days', () => {
    const info = computeAnniversary('2025-07-27', kst('2025-11-03'))
    expect(info.dayCount).toBe(100)
    expect(info.todayMilestone).toBe('100일')
  })

  it('marks 1주년 on the same date one year later', () => {
    const info = computeAnniversary('2025-07-27', kst('2026-07-27'))
    expect(info.years).toBe(1)
    expect(info.todayMilestone).toBe('1주년')
  })

  it('lists the next yearly and day milestones in date order', () => {
    const info = computeAnniversary('2025-07-27', kst('2026-09-25'))
    expect(info.dayCount).toBe(426)
    expect(info.years).toBe(1)
    expect(info.upcoming.map((m) => m.label)).toEqual(['500일', '2주년'])
    expect(info.upcoming[0]).toMatchObject({ date: '2026-12-08'.replace(/-/g, '.'), daysLeft: 74 })
    expect(info.upcoming[1]).toMatchObject({ date: '2027.07.27', daysLeft: 305 })
  })

  it('switches to 1000-day steps after 1000일', () => {
    const info = computeAnniversary('2020-01-01', kst('2026-09-25'))
    expect(info.upcoming.some((m) => m.label === '3,000일')).toBe(true)
  })

  it('uses the KST date even when UTC is still the previous day', () => {
    // 2025-11-03 00:30 KST = 2025-11-02 15:30 UTC
    const info = computeAnniversary('2025-07-27', new Date('2025-11-02T15:30:00Z'))
    expect(info.dayCount).toBe(100)
  })
})
