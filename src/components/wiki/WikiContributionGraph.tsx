'use client'

import React, { useEffect, useMemo, useState } from 'react'

interface Badge {
  id: string
  label: string
  icon: string
  desc: string
}
interface ContribStats {
  totalEdits: number
  createdDocs: number
  pagesTouched: number
  sizeAdded: number
  maxStreak: number
  activeDays: number
}
interface ContribData {
  daily: Record<string, number>
  stats: ContribStats
  badges: Badge[]
}

const WEEKS = 53
const DAY_MS = 86400000
const MONTH_LABELS = ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월']

function toKey(d: Date): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(
    d.getUTCDate()
  ).padStart(2, '0')}`
}

function intensityClass(count: number): string {
  if (count <= 0) return 'fill-[#1b2436]'
  if (count === 1) return 'fill-emerald-900'
  if (count <= 3) return 'fill-emerald-700'
  if (count <= 6) return 'fill-emerald-500'
  return 'fill-emerald-300'
}

/**
 * GitHub식 기여도 히트맵 + 달성 배지. author(위키 username)만 주면 스스로 fetch.
 */
export function WikiContributionGraph({
  author,
  compact = false,
}: {
  author: string
  compact?: boolean
}) {
  const [data, setData] = useState<ContribData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    ;(async () => {
      try {
        const r = await fetch(`/api/wiki/contributions?author=${encodeURIComponent(author)}`)
        const d = await r.json().catch(() => null)
        if (cancelled) return
        if (r.ok && d?.success) {
          setData({ daily: d.daily || {}, stats: d.stats, badges: d.badges || [] })
        } else {
          setError(d?.error || '기여도를 불러오지 못했습니다.')
        }
      } catch {
        if (!cancelled) setError('기여도를 불러오지 못했습니다.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [author])

  // 53주 × 7일 그리드 — 오늘이 포함된 주가 맨 오른쪽
  const grid = useMemo(() => {
    const today = new Date()
    const end = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()))
    // 맨 오른쪽 열의 일요일 기준으로 정렬
    const endSunday = new Date(end.getTime() - end.getUTCDay() * DAY_MS)
    const start = new Date(endSunday.getTime() - (WEEKS - 1) * 7 * DAY_MS)

    const weeks: Array<Array<{ key: string; count: number; date: Date; future: boolean }>> = []
    for (let w = 0; w < WEEKS; w++) {
      const col: Array<{ key: string; count: number; date: Date; future: boolean }> = []
      for (let d = 0; d < 7; d++) {
        const date = new Date(start.getTime() + (w * 7 + d) * DAY_MS)
        const key = toKey(date)
        col.push({
          key,
          count: data?.daily[key] ?? 0,
          date,
          future: date.getTime() > end.getTime(),
        })
      }
      weeks.push(col)
    }
    return { weeks, start }
  }, [data])

  // 월 라벨 위치 (열 인덱스 → 월 시작)
  const monthMarks = useMemo(() => {
    const marks: Array<{ col: number; label: string }> = []
    let lastMonth = -1
    grid.weeks.forEach((col, idx) => {
      const firstDay = col[0].date
      const m = firstDay.getUTCMonth()
      if (m !== lastMonth) {
        marks.push({ col: idx, label: MONTH_LABELS[m] })
        lastMonth = m
      }
    })
    return marks
  }, [grid])

  if (loading) {
    return <div className="py-6 text-center text-sm text-[color:var(--wiki-ink-soft,#94a3b8)]">기여도 불러오는 중…</div>
  }
  if (error || !data) {
    return <div className="py-6 text-center text-sm text-rose-400">{error || '데이터 없음'}</div>
  }

  const cell = 11
  const gap = 2.5
  const width = WEEKS * (cell + gap)
  const height = 7 * (cell + gap)
  const { stats, badges } = data

  return (
    <div className="space-y-4">
      {/* 통계 요약 */}
      <div className="flex flex-wrap gap-x-5 gap-y-1 text-xs text-[color:var(--wiki-ink-soft,#94a3b8)]">
        <span><strong className="text-[color:var(--wiki-ink,#e2e8f0)]">{stats.totalEdits}</strong> 편집</span>
        <span><strong className="text-[color:var(--wiki-ink,#e2e8f0)]">{stats.createdDocs}</strong> 문서 생성</span>
        <span><strong className="text-[color:var(--wiki-ink,#e2e8f0)]">{stats.pagesTouched}</strong> 문서 참여</span>
        <span>최장 <strong className="text-[color:var(--wiki-ink,#e2e8f0)]">{stats.maxStreak}</strong>일 연속</span>
        <span><strong className="text-[color:var(--wiki-ink,#e2e8f0)]">{stats.activeDays}</strong>일 활동</span>
      </div>

      {/* 히트맵 */}
      <div className="overflow-x-auto">
        <svg width={width} height={height + 16} className="block">
          {/* 월 라벨 */}
          {monthMarks.map((mark, i) => (
            <text
              key={i}
              x={mark.col * (cell + gap)}
              y={9}
              fontSize={9}
              fill="#94a3b8"
            >
              {mark.label}
            </text>
          ))}
          <g transform="translate(0,14)">
            {grid.weeks.map((col, wi) =>
              col.map((d, di) => (
                <rect
                  key={`${wi}-${di}`}
                  x={wi * (cell + gap)}
                  y={di * (cell + gap)}
                  width={cell}
                  height={cell}
                  rx={2}
                  className={d.future ? 'fill-transparent' : intensityClass(d.count)}
                >
                  {!d.future && (
                    <title>
                      {d.key} · 편집 {d.count}회
                    </title>
                  )}
                </rect>
              ))
            )}
          </g>
        </svg>
      </div>

      {/* 범례 */}
      <div className="flex items-center gap-1.5 text-[10px] text-[color:var(--wiki-ink-soft,#94a3b8)]">
        <span>적음</span>
        <svg width={64} height={11}>
          {['fill-[#1b2436]', 'fill-emerald-900', 'fill-emerald-700', 'fill-emerald-500', 'fill-emerald-300'].map(
            (c, i) => (
              <rect key={i} x={i * 13} y={0} width={11} height={11} rx={2} className={c} />
            )
          )}
        </svg>
        <span>많음</span>
      </div>

      {/* 배지 */}
      {!compact && (
        <div>
          <p className="mb-2 text-xs font-semibold text-[color:var(--wiki-ink,#e2e8f0)]">
            획득 칭호 {badges.length > 0 && `(${badges.length})`}
          </p>
          {badges.length === 0 ? (
            <p className="text-xs text-[color:var(--wiki-ink-soft,#94a3b8)]">
              아직 획득한 칭호가 없습니다. 편집을 시작해 보세요!
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {badges.map((b) => (
                <span
                  key={b.id}
                  title={b.desc}
                  className="inline-flex items-center gap-1.5 rounded-full border border-[color:var(--wiki-rule,#374151)] bg-[color:var(--wiki-bg-2,#1f2937)] px-2.5 py-1 text-xs text-[color:var(--wiki-ink,#e2e8f0)]"
                >
                  <span className="text-sm leading-none">{b.icon}</span>
                  {b.label}
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
