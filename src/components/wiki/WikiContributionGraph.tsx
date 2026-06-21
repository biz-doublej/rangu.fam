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

// 칭호 카테고리별 테마 — 아이콘 디스크 그라디언트 + 칩 색 + 라벨색 + (상위 티어) 글로우.
// 주의: Tailwind JIT 인식을 위해 클래스는 '완전한 리터럴'이어야 함 (런타임 보간 금지).
type BadgeStyle = { icon: string; chip: string; label: string; glow: string }
const BADGE_THEMES: Record<string, BadgeStyle> = {
  first: { icon: 'from-emerald-300 to-emerald-600', chip: 'border-emerald-500/30 bg-emerald-500/10', label: 'text-emerald-200', glow: 'shadow-[0_0_18px_-4px_rgba(16,185,129,0.55)]' },
  edits: { icon: 'from-amber-300 to-amber-600', chip: 'border-amber-500/30 bg-amber-500/10', label: 'text-amber-200', glow: 'shadow-[0_0_18px_-4px_rgba(245,158,11,0.6)]' },
  creator: { icon: 'from-sky-300 to-sky-600', chip: 'border-sky-500/30 bg-sky-500/10', label: 'text-sky-200', glow: 'shadow-[0_0_18px_-4px_rgba(14,165,233,0.55)]' },
  writer: { icon: 'from-violet-300 to-violet-600', chip: 'border-violet-500/30 bg-violet-500/10', label: 'text-violet-200', glow: 'shadow-[0_0_18px_-4px_rgba(139,92,246,0.55)]' },
  streak: { icon: 'from-orange-300 to-rose-600', chip: 'border-rose-500/30 bg-rose-500/10', label: 'text-rose-200', glow: 'shadow-[0_0_18px_-4px_rgba(244,63,94,0.55)]' },
  active: { icon: 'from-teal-300 to-emerald-600', chip: 'border-teal-500/30 bg-teal-500/10', label: 'text-teal-200', glow: 'shadow-[0_0_18px_-4px_rgba(20,184,166,0.55)]' },
  breadth: { icon: 'from-cyan-300 to-blue-600', chip: 'border-cyan-500/30 bg-cyan-500/10', label: 'text-cyan-200', glow: 'shadow-[0_0_18px_-4px_rgba(6,182,212,0.55)]' },
  default: { icon: 'from-slate-300 to-slate-600', chip: 'border-slate-500/30 bg-slate-500/10', label: 'text-slate-200', glow: '' },
}
const TOP_TIER = new Set(['edits-500', 'creator-30', 'writer-50k', 'streak-7', 'active-30', 'breadth-20'])
function badgeCategory(id: string): keyof typeof BADGE_THEMES {
  if (id.startsWith('first')) return 'first'
  if (id.startsWith('edits')) return 'edits'
  if (id.startsWith('creator')) return 'creator'
  if (id.startsWith('writer')) return 'writer'
  if (id.startsWith('streak')) return 'streak'
  if (id.startsWith('active')) return 'active'
  if (id.startsWith('breadth')) return 'breadth'
  return 'default'
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

      {/* 배지 — 칭호 메달리온 */}
      {!compact && (
        <div>
          <p className="mb-2.5 flex items-center gap-1.5 text-xs font-semibold text-[color:var(--wiki-ink,#e2e8f0)]">
            <span aria-hidden>🏅</span>
            획득 칭호
            {badges.length > 0 && (
              <span className="rounded-full bg-[color:var(--wiki-bg-2,#1f2937)] px-1.5 text-[10px] tabular-nums text-[color:var(--wiki-ink-soft,#94a3b8)]">
                {badges.length}
              </span>
            )}
          </p>
          {badges.length === 0 ? (
            <p className="rounded-lg border border-dashed border-[color:var(--wiki-rule,#374151)] px-3 py-4 text-center text-xs text-[color:var(--wiki-ink-soft,#94a3b8)]">
              아직 획득한 칭호가 없습니다. 편집을 시작해 보세요! 🌱
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {badges.map((b) => {
                const t = BADGE_THEMES[badgeCategory(b.id)]
                const isTop = TOP_TIER.has(b.id)
                return (
                  <div
                    key={b.id}
                    title={b.desc}
                    className={`group relative flex items-center gap-2.5 overflow-hidden rounded-xl border ${t.chip} px-2.5 py-2 transition-all duration-200 hover:-translate-y-0.5 ${isTop ? t.glow : ''}`}
                  >
                    {/* hover 시 빛 스윕 */}
                    <span className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/10 to-transparent transition-transform duration-700 ease-out group-hover:translate-x-full" />
                    <span
                      className={`relative flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br ${t.icon} text-base shadow-md ring-2 ring-white/15`}
                    >
                      <span className="drop-shadow-sm">{b.icon}</span>
                    </span>
                    <span className="relative min-w-0 flex-1">
                      <span className="flex items-center gap-1">
                        <span className={`truncate text-[13px] font-bold leading-tight ${t.label}`}>{b.label}</span>
                        {isTop && <span className="text-[9px] leading-none text-amber-300" title="최고 등급">★</span>}
                      </span>
                      <span className="block truncate text-[10px] leading-tight text-[color:var(--wiki-ink-soft,#94a3b8)]">
                        {b.desc}
                      </span>
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
