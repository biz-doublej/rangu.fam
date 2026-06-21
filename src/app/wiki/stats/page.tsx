'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Activity, BarChart3, FileText, TrendingUp, Eye, Users, Calendar, Sparkles } from 'lucide-react'
import { WikiShell, WikiPageHeader } from '@/components/wiki'

interface MonthPoint {
  month: string
  edits: number
  newPages: number
  cumulativePages: number
}
interface YearPoint {
  year: number
  edits: number
  newPages: number
  contributors: number
}
interface StatsPayload {
  totals: { pages: number; edits: number; contributors: number; views: number }
  thisYear: { year: number; edits: number; newPages: number }
  byYear: YearPoint[]
  monthly: MonthPoint[]
  peakMonth: { month: string; edits: number } | null
}

function fmtMonth(ym: string): string {
  const [y, m] = ym.split('-')
  return `${y}.${m}`
}
function fmtMonthShort(ym: string): string {
  const [, m] = ym.split('-')
  return `${Number(m)}월`
}
function niceCeil(v: number): number {
  if (v <= 5) return 5
  const mag = Math.pow(10, Math.floor(Math.log10(v)))
  const n = v / mag
  const step = n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10
  return step * mag
}

export default function WikiStatsPage() {
  const router = useRouter()
  const [data, setData] = useState<StatsPayload | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true
    fetch('/api/wiki/stats')
      .then((r) => r.json())
      .then((d) => {
        if (!mounted) return
        if (d.success) setData(d)
        else setError(d.error || '통계를 불러오지 못했습니다.')
      })
      .catch(() => mounted && setError('통계를 불러오지 못했습니다.'))
      .finally(() => mounted && setLoading(false))
    return () => {
      mounted = false
    }
  }, [])

  return (
    <WikiShell
      pageHeader={
        <WikiPageHeader
          title="이랑위키 연보"
          subtitle="이랑위키가 쌓아온 기록 — 편집량과 문서 수의 성장을 한눈에."
          hatnote={
            <>
              매 10분 갱신됩니다. 실시간 인기 문서는{' '}
              <button
                type="button"
                onClick={() => router.push('/wiki')}
                className="text-[color:var(--wiki-link)] hover:underline"
              >
                위키 메인
              </button>{' '}
              에서 확인할 수 있습니다.
            </>
          }
          meta={
            data
              ? [
                  { label: `${data.thisYear.year}년 편집`, value: `${data.thisYear.edits.toLocaleString()}회`, icon: Activity },
                  { label: `${data.thisYear.year}년 새 문서`, value: `${data.thisYear.newPages.toLocaleString()}개`, icon: FileText },
                  ...(data.peakMonth
                    ? [{ label: '최다 편집 월', value: `${fmtMonth(data.peakMonth.month)} (${data.peakMonth.edits.toLocaleString()}회)`, icon: Sparkles }]
                    : []),
                ]
              : []
          }
        />
      }
    >
      {loading ? (
        <section className="wiki-panel py-10 text-center text-sm text-[color:var(--wiki-ink-muted)]">
          연보를 집계하는 중…
        </section>
      ) : error || !data ? (
        <section className="wiki-panel py-10 text-center text-sm text-rose-400">
          {error || '데이터가 없습니다.'}
        </section>
      ) : (
        <div className="space-y-6">
          {/* 총계 카드 */}
          <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatCard icon={FileText} tone="cyan" label="총 문서" value={data.totals.pages} />
            <StatCard icon={Activity} tone="violet" label="총 편집" value={data.totals.edits} />
            <StatCard icon={Users} tone="emerald" label="기여자" value={data.totals.contributors} />
            <StatCard icon={Eye} tone="amber" label="총 조회" value={data.totals.views} />
          </section>

          {/* 월별 편집량 */}
          <section className="wiki-panel">
            <h3 className="wiki-serif mb-1 flex items-center gap-2 text-base font-semibold">
              <BarChart3 className="h-4 w-4 text-[color:var(--wiki-accent)]" />
              월별 편집량
            </h3>
            <p className="mb-3 text-xs text-[color:var(--wiki-ink-muted)]">최근 {data.monthly.length}개월 · 막대에 마우스를 올리면 상세 수치</p>
            <MonthlyBars data={data.monthly} />
          </section>

          {/* 누적 문서 수 성장 */}
          <section className="wiki-panel">
            <h3 className="wiki-serif mb-1 flex items-center gap-2 text-base font-semibold">
              <TrendingUp className="h-4 w-4 text-[color:var(--wiki-violet,#A78BFA)]" />
              문서 수 성장
            </h3>
            <p className="mb-3 text-xs text-[color:var(--wiki-ink-muted)]">누적 문서 수 추이 (최근 {data.monthly.length}개월)</p>
            <GrowthArea data={data.monthly} />
          </section>

          {/* 연도별 요약 */}
          <section className="wiki-panel">
            <h3 className="wiki-serif mb-3 flex items-center gap-2 text-base font-semibold">
              <Calendar className="h-4 w-4 text-[color:var(--wiki-accent)]" />
              연도별 요약
            </h3>
            <YearTable rows={data.byYear} />
          </section>
        </div>
      )}
    </WikiShell>
  )
}

// ── 총계 카드 ──────────────────────────────────────────────────
const TONE: Record<string, { ring: string; text: string; grad: string }> = {
  cyan: { ring: 'ring-cyan-500/20', text: 'text-cyan-300', grad: 'from-cyan-500/15 to-transparent' },
  violet: { ring: 'ring-violet-500/20', text: 'text-violet-300', grad: 'from-violet-500/15 to-transparent' },
  emerald: { ring: 'ring-emerald-500/20', text: 'text-emerald-300', grad: 'from-emerald-500/15 to-transparent' },
  amber: { ring: 'ring-amber-500/20', text: 'text-amber-300', grad: 'from-amber-500/15 to-transparent' },
}
function StatCard({
  icon: Icon,
  tone,
  label,
  value,
}: {
  icon: typeof FileText
  tone: keyof typeof TONE
  label: string
  value: number
}) {
  const t = TONE[tone]
  const [shown, setShown] = useState(0)
  useEffect(() => {
    // 0 → value 카운트업 (가벼운 연출). rAF 가 안 도는 환경(백그라운드 탭 등)에서도
    // 반드시 실제 값으로 안착하도록 setTimeout 안전망을 둔다.
    let raf = 0
    const dur = 700
    const start = typeof performance !== 'undefined' ? performance.now() : Date.now()
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / dur)
      const eased = 1 - Math.pow(1 - p, 3)
      setShown(Math.round(value * eased))
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    const settle = setTimeout(() => setShown(value), dur + 120)
    return () => {
      cancelAnimationFrame(raf)
      clearTimeout(settle)
    }
  }, [value])
  return (
    <div className={`relative overflow-hidden rounded-xl border border-[color:var(--wiki-rule)] bg-gradient-to-br ${t.grad} p-3 ring-1 ${t.ring}`}>
      <Icon className={`mb-1.5 h-4 w-4 ${t.text}`} />
      <div className={`wiki-serif text-2xl font-bold tabular-nums ${t.text}`}>{shown.toLocaleString()}</div>
      <div className="text-[11px] text-[color:var(--wiki-ink-muted)]">{label}</div>
    </div>
  )
}

// ── 월별 편집량 막대 차트 ──────────────────────────────────────
function MonthlyBars({ data }: { data: MonthPoint[] }) {
  const W = 720
  const H = 220
  const padL = 32
  const padR = 8
  const padT = 10
  const padB = 26
  const plotW = W - padL - padR
  const plotH = H - padT - padB

  const maxEdits = useMemo(() => niceCeil(Math.max(1, ...data.map((d) => d.edits))), [data])
  const n = data.length
  const slot = n > 0 ? plotW / n : plotW
  const barW = Math.max(2, Math.min(22, slot * 0.62))

  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((f) => Math.round(maxEdits * f))
  const yearMarks = data
    .map((d, i) => ({ i, ym: d.month }))
    .filter(({ ym, i }) => ym.endsWith('-01') || i === 0)

  return (
    <div className="overflow-x-auto">
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" className="block min-w-[520px]" preserveAspectRatio="xMidYMid meet">
        {/* y 그리드 + 라벨 */}
        {yTicks.map((v, k) => {
          const y = padT + plotH - (v / maxEdits) * plotH
          return (
            <g key={k}>
              <line x1={padL} y1={y} x2={W - padR} y2={y} stroke="var(--wiki-rule, rgba(125,211,252,0.16))" strokeWidth={1} />
              <text x={padL - 5} y={y + 3} textAnchor="end" fontSize={9} fill="var(--wiki-ink-muted, #6E7E9E)">
                {v.toLocaleString()}
              </text>
            </g>
          )
        })}
        {/* 막대 */}
        {data.map((d, i) => {
          const x = padL + i * slot + (slot - barW) / 2
          const h = (d.edits / maxEdits) * plotH
          const y = padT + plotH - h
          return (
            <rect key={d.month} x={x} y={y} width={barW} height={Math.max(0, h)} rx={2} fill="var(--wiki-accent, #22D3EE)" opacity={0.85}>
              <title>
                {fmtMonth(d.month)} · 편집 {d.edits.toLocaleString()}회 · 새 문서 {d.newPages.toLocaleString()}개
              </title>
            </rect>
          )
        })}
        {/* 연도 경계 라벨 */}
        {yearMarks.map(({ i, ym }) => {
          const x = padL + i * slot + slot / 2
          return (
            <text key={ym} x={x} y={H - 8} textAnchor="middle" fontSize={9} fill="var(--wiki-ink-soft, #B8C7E0)">
              {ym.endsWith('-01') ? ym.slice(0, 4) : fmtMonthShort(ym)}
            </text>
          )
        })}
      </svg>
    </div>
  )
}

// ── 누적 문서 수 성장 영역 차트 ───────────────────────────────
function GrowthArea({ data }: { data: MonthPoint[] }) {
  const W = 720
  const H = 200
  const padL = 32
  const padR = 12
  const padT = 12
  const padB = 26
  const plotW = W - padL - padR
  const plotH = H - padT - padB

  const vals = data.map((d) => d.cumulativePages)
  const vMax = Math.max(1, ...vals)
  const vMin = Math.min(...vals)
  const span = Math.max(1, vMax - vMin)
  const n = data.length

  const xAt = (i: number) => padL + (n <= 1 ? plotW / 2 : (i / (n - 1)) * plotW)
  const yAt = (v: number) => padT + plotH - ((v - vMin) / span) * plotH

  const linePts = data.map((d, i) => `${xAt(i)},${yAt(d.cumulativePages)}`).join(' ')
  const areaPath = `M ${xAt(0)},${padT + plotH} L ${data
    .map((d, i) => `${xAt(i)},${yAt(d.cumulativePages)}`)
    .join(' L ')} L ${xAt(n - 1)},${padT + plotH} Z`

  const yearMarks = data
    .map((d, i) => ({ i, ym: d.month }))
    .filter(({ ym, i }) => ym.endsWith('-01') || i === 0 || i === n - 1)

  const last = data[n - 1]
  const violet = 'var(--wiki-violet, #A78BFA)'

  return (
    <div className="overflow-x-auto">
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" className="block min-w-[520px]" preserveAspectRatio="xMidYMid meet">
        <defs>
          <linearGradient id="growthFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={violet} stopOpacity={0.28} />
            <stop offset="100%" stopColor={violet} stopOpacity={0.02} />
          </linearGradient>
        </defs>
        {/* 시작/끝 가이드 라벨 */}
        <text x={padL} y={padT - 2} fontSize={9} fill="var(--wiki-ink-muted, #6E7E9E)">
          {vMin.toLocaleString()}
        </text>
        <text x={W - padR} y={padT - 2} textAnchor="end" fontSize={9} fill={violet}>
          {vMax.toLocaleString()}개
        </text>
        <path d={areaPath} fill="url(#growthFill)" />
        <polyline points={linePts} fill="none" stroke={violet} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
        {/* 데이터 포인트 (hover 정보) */}
        {data.map((d, i) => (
          <circle key={d.month} cx={xAt(i)} cy={yAt(d.cumulativePages)} r={n > 30 ? 1.6 : 2.4} fill={violet}>
            <title>
              {fmtMonth(d.month)} · 누적 {d.cumulativePages.toLocaleString()}개 (+{d.newPages.toLocaleString()})
            </title>
          </circle>
        ))}
        {/* 끝점 강조 */}
        {last && (
          <circle cx={xAt(n - 1)} cy={yAt(last.cumulativePages)} r={3.5} fill={violet} stroke="var(--wiki-bg, #080d18)" strokeWidth={1.5} />
        )}
        {/* x 라벨 */}
        {yearMarks.map(({ i, ym }) => (
          <text key={`${ym}-${i}`} x={xAt(i)} y={H - 8} textAnchor={i === 0 ? 'start' : i === n - 1 ? 'end' : 'middle'} fontSize={9} fill="var(--wiki-ink-soft, #B8C7E0)">
            {ym.endsWith('-01') ? ym.slice(0, 4) : fmtMonth(ym)}
          </text>
        ))}
      </svg>
    </div>
  )
}

// ── 연도별 요약 표 ────────────────────────────────────────────
function YearTable({ rows }: { rows: YearPoint[] }) {
  if (rows.length === 0) {
    return <p className="text-sm text-[color:var(--wiki-ink-muted)]">아직 집계된 연도가 없습니다.</p>
  }
  const maxEdits = Math.max(1, ...rows.map((r) => r.edits))
  return (
    <div className="overflow-hidden rounded-md border border-[color:var(--wiki-rule)]">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-[color:var(--wiki-rule)] text-left text-[11px] uppercase tracking-wider text-[color:var(--wiki-ink-muted)]">
            <th className="px-3 py-2 font-medium">연도</th>
            <th className="px-3 py-2 font-medium">편집</th>
            <th className="px-3 py-2 font-medium">새 문서</th>
            <th className="hidden px-3 py-2 font-medium sm:table-cell">기여자</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[color:var(--wiki-rule)]">
          {rows.map((r) => (
            <tr key={r.year} className="hover:bg-[color:var(--wiki-paper-2)]/40">
              <td className="px-3 py-2 wiki-serif font-semibold text-[color:var(--wiki-ink)]">{r.year}</td>
              <td className="px-3 py-2">
                <div className="flex items-center gap-2">
                  <span className="tabular-nums text-[color:var(--wiki-ink-soft)]">{r.edits.toLocaleString()}</span>
                  <span className="hidden h-1.5 flex-1 overflow-hidden rounded-full bg-[color:var(--wiki-rule)] sm:block">
                    <span className="block h-full rounded-full bg-[color:var(--wiki-accent)]" style={{ width: `${(r.edits / maxEdits) * 100}%` }} />
                  </span>
                </div>
              </td>
              <td className="px-3 py-2 tabular-nums text-[color:var(--wiki-ink-soft)]">{r.newPages.toLocaleString()}</td>
              <td className="hidden px-3 py-2 tabular-nums text-[color:var(--wiki-ink-muted)] sm:table-cell">{r.contributors.toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
