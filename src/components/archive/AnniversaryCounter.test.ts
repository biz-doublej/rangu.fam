import { describe, expect, it } from 'vitest'
import { computeAnniversary } from './AnniversaryCounter'

// KST 정오 = UTC 03:00
const kst = (ymd: string) => new Date(`${ymd}T03:00:00Z`)

describe('computeAnniversary', () => {
  it('counts completed years since the founding date', () => {
    const info = computeAnniversary('2023-06-06', kst('2026-09-26'))
    expect(info.years).toBe(3)
    expect(info.isAnniversaryToday).toBe(false)
    expect(info.next).toEqual({ years: 4, date: '2027.06.06', daysLeft: 253 })
  })

  it('marks the anniversary day itself', () => {
    const info = computeAnniversary('2023-06-06', kst('2026-06-06'))
    expect(info.years).toBe(3)
    expect(info.isAnniversaryToday).toBe(true)
  })

  it('does not count a year until the anniversary arrives', () => {
    const info = computeAnniversary('2023-06-06', kst('2026-06-05'))
    expect(info.years).toBe(2)
    expect(info.next.daysLeft).toBe(1)
  })

  it('uses the KST date even when UTC is still the previous day', () => {
    // 2026-06-06 00:30 KST = 2026-06-05 15:30 UTC
    const info = computeAnniversary('2023-06-06', new Date('2026-06-05T15:30:00Z'))
    expect(info.isAnniversaryToday).toBe(true)
  })
})
