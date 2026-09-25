'use client'

import React, { useEffect, useState } from 'react'
import type { ArchiveAnniversary } from '@/config/archive'

const DAY_MS = 24 * 60 * 60 * 1000

type Ymd = { y: number; m: number; d: number }

function parseYmd(date: string): Ymd {
  const [y, m, d] = date.split('-').map(Number)
  return { y, m, d }
}

function utcDay({ y, m, d }: Ymd): number {
  return Date.UTC(y, m - 1, d)
}

/** 오늘(KST) 날짜의 UTC 자정 타임스탬프 */
function kstToday(now: Date): number {
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000)
  return Date.UTC(kst.getUTCFullYear(), kst.getUTCMonth(), kst.getUTCDate())
}

function formatDate(ts: number): string {
  const d = new Date(ts)
  return `${d.getUTCFullYear()}.${String(d.getUTCMonth() + 1).padStart(2, '0')}.${String(d.getUTCDate()).padStart(2, '0')}`
}

/** 몇 주년인지, 오늘이 주년 당일인지, 다음 주년까지 며칠인지 (KST 기준) */
export function computeAnniversary(date: string, now: Date) {
  const start = parseYmd(date)
  const today = kstToday(now)

  let years = 0
  while (today >= utcDay({ ...start, y: start.y + years + 1 })) years += 1

  const isAnniversaryToday = years > 0 && today === utcDay({ ...start, y: start.y + years })
  const nextAt = utcDay({ ...start, y: start.y + years + 1 })

  return {
    years,
    isAnniversaryToday,
    next: { years: years + 1, date: formatDate(nextAt), daysLeft: Math.round((nextAt - today) / DAY_MS) },
  }
}

export function AnniversaryCounter({ anniversaries }: { anniversaries: ArchiveAnniversary[] }) {
  // 서버 렌더 시점과 클라이언트 날짜가 달라 생기는 hydration mismatch 를 피하려고 마운트 후 계산
  const [now, setNow] = useState<Date | null>(null)

  useEffect(() => {
    setNow(new Date())
    const timer = setInterval(() => setNow(new Date()), 60 * 1000)
    return () => clearInterval(timer)
  }, [])

  return (
    <div className="archive-dday">
      {anniversaries.map((a, index) => {
        const info = now ? computeAnniversary(a.date, now) : null
        return (
          <section key={a.label} className={index > 0 ? 'archive-dday__item archive-dday__item--sub' : 'archive-dday__item'}>
            <p className="archive-dday__label">{a.label}</p>
            <p className="archive-dday__value" aria-live="polite">
              {!info ? ' ' : info.isAnniversaryToday ? `오늘 ${info.years}주년` : info.years > 0 ? `${info.years}주년` : '곧 1주년'}
            </p>
            <p className="archive-dday__date">{a.date.replace(/-/g, '.')}</p>
            {info && !info.isAnniversaryToday && (
              <ul className="archive-dday__rest">
                <li>
                  <span>{info.next.years}주년까지</span>
                  <span className="archive-dday__rest-value">D-{info.next.daysLeft.toLocaleString('ko-KR')}</span>
                  <span>{info.next.date}</span>
                </li>
              </ul>
            )}
          </section>
        )
      })}
    </div>
  )
}
