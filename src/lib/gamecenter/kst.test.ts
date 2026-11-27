import { describe, expect, it } from 'vitest'
import { addDays, kstDay, kstDayStart, kstMonthStartDay, kstWeekStartDay, periodStart } from './kst'

describe('kst', () => {
  it('UTC 15시가 지나면 KST 날짜가 넘어간다', () => {
    expect(kstDay(new Date('2026-11-27T14:59:59Z'))).toBe('2026-11-27')
    expect(kstDay(new Date('2026-11-27T15:00:00Z'))).toBe('2026-11-28')
  })

  it('날짜 더하기는 달과 해를 넘긴다', () => {
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01')
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28')
  })

  it('KST 날짜의 시작은 전날 UTC 15시', () => {
    expect(kstDayStart('2026-11-27').toISOString()).toBe('2026-11-26T15:00:00.000Z')
  })

  it('주는 월요일에 시작한다', () => {
    // 2026-11-27 은 금요일
    expect(kstWeekStartDay('2026-11-27')).toBe('2026-11-23')
    expect(kstWeekStartDay('2026-11-23')).toBe('2026-11-23')
    expect(kstWeekStartDay('2026-11-29')).toBe('2026-11-23') // 일요일
    expect(kstWeekStartDay('2026-11-30')).toBe('2026-11-30')
  })

  it('달의 시작', () => {
    expect(kstMonthStartDay('2026-11-27')).toBe('2026-11-01')
  })

  it('구매 제한 기간의 시작', () => {
    const now = new Date('2026-11-27T03:00:00Z') // KST 금요일 낮 12시
    expect(periodStart('day', now)?.toISOString()).toBe('2026-11-26T15:00:00.000Z')
    expect(periodStart('week', now)?.toISOString()).toBe('2026-11-22T15:00:00.000Z')
    expect(periodStart('month', now)?.toISOString()).toBe('2026-10-31T15:00:00.000Z')
    expect(periodStart('once', now)).toBeNull()
  })
})
