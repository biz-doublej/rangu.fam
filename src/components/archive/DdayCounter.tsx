'use client'

import React, { useEffect, useState } from 'react'
import type { ArchiveDday } from '@/config/archive'

const DAY_MS = 24 * 60 * 60 * 1000

/** KST 자정 기준 경과 일수. 기준일 당일 = 0. */
function daysFrom(date: string, now: Date): number {
  const [y, m, d] = date.split('-').map(Number)
  const target = Date.UTC(y, m - 1, d)
  const kstNow = new Date(now.getTime() + 9 * 60 * 60 * 1000)
  const today = Date.UTC(kstNow.getUTCFullYear(), kstNow.getUTCMonth(), kstNow.getUTCDate())
  return Math.round((today - target) / DAY_MS)
}

export function formatDday(days: number): string {
  if (days === 0) return 'D-DAY'
  return days > 0 ? `D+${days.toLocaleString('ko-KR')}` : `D-${Math.abs(days).toLocaleString('ko-KR')}`
}

export function DdayCounter({ ddays }: { ddays: ArchiveDday[] }) {
  // 서버 렌더 시점과 클라이언트 날짜가 달라 생기는 hydration mismatch 를 피하려고 마운트 후 계산
  const [now, setNow] = useState<Date | null>(null)

  useEffect(() => {
    setNow(new Date())
    const timer = setInterval(() => setNow(new Date()), 60 * 1000)
    return () => clearInterval(timer)
  }, [])

  const [primary, ...rest] = ddays
  if (!primary) return null

  return (
    <div className="archive-dday">
      <p className="archive-dday__label">{primary.label}</p>
      <p className="archive-dday__value" aria-live="polite">
        {now ? formatDday(daysFrom(primary.date, now)) : ' '}
      </p>
      <p className="archive-dday__date">{primary.date.replace(/-/g, '.')}</p>
      {rest.length > 0 && (
        <ul className="archive-dday__rest">
          {rest.map((d) => (
            <li key={d.label}>
              <span>{d.label}</span>
              <span className="archive-dday__rest-value">
                {now ? formatDday(daysFrom(d.date, now)) : ' '}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
