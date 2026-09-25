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

type Milestone = { label: string; at: number }

/**
 * 한국식 기념일 계산 — 시작일이 1일째, 100일 = 시작일 + 99일, N주년 = N년 뒤 같은 날짜.
 * 100일 단위는 1000일까지, 이후엔 1000일 단위.
 */
export function computeAnniversary(date: string, now: Date) {
  const start = parseYmd(date)
  const startTs = utcDay(start)
  const today = kstToday(now)
  const dayCount = Math.round((today - startTs) / DAY_MS) + 1 // 오늘이 몇 일째인지

  let years = 0
  while (today >= utcDay({ ...start, y: start.y + years + 1 })) years += 1

  const upcoming: Milestone[] = []
  const nextYear = years + 1
  upcoming.push({ label: `${nextYear}주년`, at: utcDay({ ...start, y: start.y + nextYear }) })
  const nextDayMilestone =
    dayCount < 1000 ? Math.floor(dayCount / 100) * 100 + 100 : Math.floor(dayCount / 1000) * 1000 + 1000
  upcoming.push({ label: `${nextDayMilestone.toLocaleString('ko-KR')}일`, at: startTs + (nextDayMilestone - 1) * DAY_MS })
  upcoming.sort((a, b) => a.at - b.at)

  const isToday = (ts: number) => ts === today
  const todayMilestone =
    years > 0 && isToday(utcDay({ ...start, y: start.y + years }))
      ? `${years}주년`
      : (dayCount % 100 === 0 && dayCount <= 1000) || dayCount % 1000 === 0
        ? `${dayCount.toLocaleString('ko-KR')}일`
        : null

  return {
    started: today >= startTs,
    dayCount,
    years,
    todayMilestone,
    upcoming: upcoming.map((m) => ({ ...m, daysLeft: Math.round((m.at - today) / DAY_MS), date: formatDate(m.at) })),
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
        const headline = !info
          ? ' '
          : info.todayMilestone
            ? `오늘 ${info.todayMilestone}`
            : info.years > 0
              ? `${info.years}주년`
              : `${info.dayCount.toLocaleString('ko-KR')}일째`
        return (
          <section key={a.label} className={index > 0 ? 'archive-dday__item archive-dday__item--sub' : 'archive-dday__item'}>
            <p className="archive-dday__label">{a.label}</p>
            <p className="archive-dday__value" aria-live="polite">{headline}</p>
            <p className="archive-dday__date">
              {a.date.replace(/-/g, '.')}
              {info && info.years > 0 && ` · ${info.dayCount.toLocaleString('ko-KR')}일째`}
            </p>
            {info && (
              <ul className="archive-dday__rest">
                {info.upcoming.map((m) => (
                  <li key={m.label}>
                    <span>{m.label}</span>
                    <span className="archive-dday__rest-value">D-{m.daysLeft.toLocaleString('ko-KR')}</span>
                    <span>{m.date}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )
      })}
    </div>
  )
}
