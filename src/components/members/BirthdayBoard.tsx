'use client'

import React, { useMemo } from 'react'
import { Cake } from 'lucide-react'
import { PaperCard, CaveatText } from '@/components/scrapbook'
import { getUpcomingBirthdays } from '@/lib/birthdays'

interface Props {
  limit?: number
  showHeader?: boolean
  className?: string
}

/**
 * 다가오는 멤버 생일 보드 (스크랩북 톤). 클라이언트에서 오늘 날짜 기준으로 D-day 계산.
 * /members, 홈 등 여러 곳에서 재사용.
 */
export function BirthdayBoard({ limit = 5, showHeader = true, className }: Props) {
  const upcoming = useMemo(() => getUpcomingBirthdays(new Date(), limit), [limit])
  if (upcoming.length === 0) return null

  return (
    <PaperCard className={className}>
      {showHeader && (
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <CaveatText className="text-lg text-coral-500">cake day</CaveatText>
            <h3 className="display-han mt-0.5 text-xl text-ink-500">다가오는 생일</h3>
          </div>
          <Cake className="h-6 w-6 text-coral-500" />
        </div>
      )}
      <ul className="space-y-3">
        {upcoming.map((b) => (
          <li key={b.id} className="flex items-center gap-3">
            <div className="relative h-11 w-11 flex-shrink-0 overflow-hidden rounded-full border border-ink-500/15 bg-paper-200">
              {b.avatar ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={b.avatar} alt={b.name} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-sm text-ink-300">
                  {b.name.slice(0, 1)}
                </div>
              )}
              {b.isToday && <span className="absolute -right-0.5 -top-1 text-base">🎂</span>}
            </div>

            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-ink-500">
                {b.name} <span className="text-[11px] font-normal text-ink-300">{b.cardCode}</span>
              </p>
              <p className="text-xs text-ink-300">
                {b.month}월 {b.day}일 · 만 {b.turningAge}세
              </p>
            </div>

            <span
              className={`pill-tag flex-shrink-0 ${b.isToday ? 'pill-tag--coral' : ''}`}
              title={b.isToday ? '오늘 생일!' : `${b.daysUntil}일 남음`}
            >
              {b.isToday ? '오늘 🎉' : `D-${b.daysUntil}`}
            </span>
          </li>
        ))}
      </ul>
    </PaperCard>
  )
}

export default BirthdayBoard
