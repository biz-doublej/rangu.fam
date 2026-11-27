/**
 * KST(UTC+9, 서머타임 없음) 날짜·주 계산.
 * 날짜는 'YYYY-MM-DD' 문자열로 다룬다 (Postgres date 열과 같은 모양).
 */

const KST_OFFSET_MS = 9 * 60 * 60 * 1000
const DAY_MS = 24 * 60 * 60 * 1000

export type LimitPeriod = 'day' | 'week' | 'month' | 'once'

/** 그 순간의 KST 날짜 */
export function kstDay(now: Date = new Date()): string {
  return new Date(now.getTime() + KST_OFFSET_MS).toISOString().slice(0, 10)
}

/** 날짜에 n일을 더한 날짜 (음수 가능) */
export function addDays(day: string, n: number): string {
  const base = Date.parse(`${day}T00:00:00Z`)
  return new Date(base + n * DAY_MS).toISOString().slice(0, 10)
}

/** KST 날짜가 시작되는 순간 (KST 0시) */
export function kstDayStart(day: string): Date {
  return new Date(Date.parse(`${day}T00:00:00Z`) - KST_OFFSET_MS)
}

/** 그 날짜가 속한 주의 월요일 (주는 월요일 0시 KST 에 시작) */
export function kstWeekStartDay(day: string): string {
  const weekday = new Date(`${day}T00:00:00Z`).getUTCDay() // 0=일 ... 6=토
  return addDays(day, -((weekday + 6) % 7))
}

/** 그 날짜가 속한 달의 1일 */
export function kstMonthStartDay(day: string): string {
  return `${day.slice(0, 7)}-01`
}

/**
 * 구매 제한 기간이 시작되는 순간.
 * 'once' 는 기간이 없으므로(전체 기간) null.
 */
export function periodStart(period: LimitPeriod, now: Date = new Date()): Date | null {
  const today = kstDay(now)
  if (period === 'day') return kstDayStart(today)
  if (period === 'week') return kstDayStart(kstWeekStartDay(today))
  if (period === 'month') return kstDayStart(kstMonthStartDay(today))
  return null
}

/**
 * 그 날짜가 속한 주의 ISO 주 번호 표기 (예: '2026-W48').
 * 주는 월요일에 시작하고, 그 주의 목요일이 속한 해를 그 주의 해로 본다.
 */
export function isoWeekId(day: string): string {
  const thursday = addDays(kstWeekStartDay(day), 3)
  const year = Number(thursday.slice(0, 4))
  const jan1 = Date.parse(`${year}-01-01T00:00:00Z`)
  const dayOfYear = Math.floor((Date.parse(`${thursday}T00:00:00Z`) - jan1) / DAY_MS)
  return `${year}-W${String(Math.floor(dayOfYear / 7) + 1).padStart(2, '0')}`
}
