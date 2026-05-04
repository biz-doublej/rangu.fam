'use client'

/**
 * 정진규 — 군인 / 군 서류 + dog tag 톤 (하늘색 + 올리브).
 *
 * 톤: 하늘색 base + 올리브/카키 accent + 군 서류 monospace, 큼직한 D-day 카운터,
 *     dog tag SVG, 보직표/명령서 레이아웃. 매초 업데이트되는 정밀 카운터.
 */

import React, { useEffect, useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import Link from 'next/link'

const SKY = '#7dd3fc'
const SKY_DEEP = '#0c4a6e'
const OLIVE = '#556b2f'
const KHAKI = '#a08b5c'

// 실 데이터 — 정진규 입대/전역
const ENLIST_DATE = new Date('2025-07-21T00:00:00+09:00')
const DISCHARGE_DATE = new Date('2027-01-20T00:00:00+09:00')

// 한국군 육군 현역 진급 (입대 후 개월 기준 — 2024 이후 표준 18개월)
const RANK_MILESTONES = [
  { rank: '이등병', months: 0, label: '입대 · 훈련소' },
  { rank: '일병', months: 2, label: '자대 배치 · 적응' },
  { rank: '상병', months: 8, label: '중간 단계' },
  { rank: '병장', months: 14, label: '고참 단계' },
  { rank: '전역', months: 18, label: '복무 만료' },
]

const SERVICE_INFO = [
  { label: '소속', value: '대한민국 육군' },
  { label: '병과', value: '보병' },
  { label: '주특기', value: '소총수' },
  { label: '근무지', value: '강원도' },
  { label: '복무 형태', value: '현역' },
  { label: '입대일', value: '2025년 7월 21일' },
  { label: '전역 예정', value: '2027년 1월 20일' },
]

const POST_DISCHARGE = [
  { title: '복학', desc: '학교 복귀 + 학기 적응' },
  { title: '운전면허', desc: '미뤘던 거 일단 따기' },
  { title: '여행', desc: '친구들과 부산 / 여수' },
  { title: '체력 유지', desc: '군에서 만든 루틴 유지' },
]

// ── 시간 계산 헬퍼 ────────────────────────────────────────
function diffDetail(from: Date, to: Date) {
  const ms = Math.max(0, to.getTime() - from.getTime())
  const days = Math.floor(ms / 86_400_000)
  const hours = Math.floor((ms % 86_400_000) / 3_600_000)
  const minutes = Math.floor((ms % 3_600_000) / 60_000)
  const seconds = Math.floor((ms % 60_000) / 1000)
  return { days, hours, minutes, seconds, totalMs: ms }
}

function addMonths(date: Date, months: number) {
  const d = new Date(date)
  d.setMonth(d.getMonth() + months)
  return d
}

function currentRank(now: Date) {
  // 가장 최근 통과한 milestone 의 rank 반환
  let current = RANK_MILESTONES[0]
  for (const m of RANK_MILESTONES) {
    const t = addMonths(ENLIST_DATE, m.months)
    if (now.getTime() >= t.getTime()) current = m
  }
  return current
}

export default function JingyuPage() {
  const reduce = useReducedMotion()
  const [now, setNow] = useState<Date | null>(null)

  useEffect(() => {
    setNow(new Date())
    const id = setInterval(() => setNow(new Date()), 1000) // 매초 업데이트
    return () => clearInterval(id)
  }, [])

  const totalMs = DISCHARGE_DATE.getTime() - ENLIST_DATE.getTime()
  const totalDays = Math.ceil(totalMs / 86_400_000)

  const left = now ? diffDetail(now, DISCHARGE_DATE) : null
  const served = now ? diffDetail(ENLIST_DATE, now) : null
  const progress = now
    ? Math.min(100, Math.max(0, ((now.getTime() - ENLIST_DATE.getTime()) / totalMs) * 100))
    : 0

  const rank = now ? currentRank(now) : RANK_MILESTONES[0]

  return (
    <div className="jingyu min-h-screen bg-sky-50 text-sky-950">
      {/* ===== Top bar ===== */}
      <header className="border-b-4 bg-sky-100 px-4 py-3 sm:px-6 sm:py-4" style={{ borderColor: OLIVE }}>
        <div className="mx-auto flex max-w-6xl items-center justify-between text-[10px] sm:text-xs">
          <Link href="https://rangu-fam.com" className="opacity-70 hover:opacity-100 transition">
            ← rangu.fam
          </Link>
          <span className="font-mono uppercase tracking-[0.2em] sm:tracking-[0.3em] text-sky-700 hidden sm:inline">
            personal record · CLASSIFIED
          </span>
          <span className="font-mono opacity-60">FILE #007</span>
        </div>
      </header>

      {/* ===== Hero ===== */}
      <section className="border-b border-sky-200 px-4 py-12 sm:px-6 sm:py-20">
        <div className="mx-auto grid max-w-6xl gap-10 md:grid-cols-[1.3fr,1fr] md:items-center md:gap-12">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: reduce ? 0 : 0.7 }}
          >
            <p className="font-mono text-[10px] sm:text-xs uppercase tracking-[0.3em] text-sky-600">
              service record · republic of korea
            </p>
            <h1 className="mt-4 text-6xl font-black leading-none tracking-tight sm:text-7xl md:text-8xl">
              <span className="text-sky-950">정진규</span>
            </h1>
            <p className="mt-3 font-mono uppercase tracking-[0.2em] sm:tracking-[0.25em] text-sky-700 text-xs sm:text-sm">
              JUNG JIN·KYU · {rank.rank.toUpperCase()} · ROK ARMY
            </p>

            <div className="mt-5 inline-flex items-center gap-2 rounded-full border-2 px-3 py-1.5"
              style={{ borderColor: OLIVE, background: 'rgba(85,107,47,0.08)' }}>
              <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full" style={{ background: OLIVE }} />
              <span className="font-mono text-xs font-bold" style={{ color: OLIVE }}>
                현재 계급: {rank.rank}
              </span>
              <span className="text-xs text-sky-700/70">— {rank.label}</span>
            </div>

            <p className="mt-8 max-w-md text-base leading-relaxed text-sky-900/80">
              현재 강원도에서 복무 중. 매일이 비슷한 듯 다르고, 친구들 보고 싶지만 잘 견디고 있어요.
              전역하면 한 번 더 만나서 술 한 잔 하기로.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.85, rotate: -6 }}
            animate={{ opacity: 1, scale: 1, rotate: -6 }}
            transition={{ duration: reduce ? 0 : 0.9, delay: 0.15 }}
            className="mx-auto"
          >
            <DogTag rank={rank.rank} />
          </motion.div>
        </div>
      </section>

      {/* ===== Mission Timer (D-day) ===== */}
      <section className="relative border-b border-sky-200 overflow-hidden" style={{ background: SKY_DEEP }}>
        {/* grid pattern bg */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.08]"
          style={{
            backgroundImage:
              'linear-gradient(0deg, white 1px, transparent 1px), linear-gradient(90deg, white 1px, transparent 1px)',
            backgroundSize: '32px 32px',
          }}
        />
        <div className="relative mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-20 text-white">
          <div className="mb-6 flex flex-wrap items-baseline justify-between gap-2 sm:mb-8">
            <p className="font-mono text-[10px] sm:text-xs uppercase tracking-[0.3em] text-sky-300">
              ─ mission timer · live
              <span className="ml-2 inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
            </p>
            <p className="font-mono text-[10px] sm:text-xs uppercase tracking-[0.3em] text-sky-300">
              discharge · {DISCHARGE_DATE.toISOString().slice(0, 10)}
            </p>
          </div>

          <div className="grid items-center gap-10 lg:grid-cols-[1fr,1fr] lg:gap-12">
            {/* 좌측 — 큰 D-day */}
            <div>
              <p className="text-xl font-bold tracking-tight text-sky-100 sm:text-2xl">전역까지</p>
              <p className="mt-2 font-mono text-[6rem] font-black leading-[0.85] tracking-tighter text-white sm:text-[10rem] md:text-[14rem]">
                {left ? `D-${left.days}` : 'D-…'}
              </p>

              {/* 정밀 카운터 — 시간/분/초 */}
              <div className="mt-4 grid grid-cols-3 gap-2 sm:gap-3">
                <TimeUnit label="hours" value={left?.hours} />
                <TimeUnit label="minutes" value={left?.minutes} />
                <TimeUnit label="seconds" value={left?.seconds} pulse />
              </div>
            </div>

            {/* 우측 — 진행률 + 통계 */}
            <div className="space-y-5">
              {/* 진행률 바 */}
              <div className="rounded-lg border border-sky-700/40 bg-sky-900/40 p-4 sm:p-5">
                <div className="flex items-baseline justify-between text-xs sm:text-sm">
                  <span className="font-mono uppercase tracking-widest text-sky-300">복무 진행률</span>
                  <span className="font-mono text-2xl font-black sm:text-3xl">{progress.toFixed(2)}%</span>
                </div>
                <div className="relative mt-3 h-3 w-full overflow-hidden rounded-full bg-sky-950 ring-1 ring-sky-800">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: reduce ? 0 : 1.2, ease: 'easeOut' }}
                    className="h-full rounded-full"
                    style={{
                      background: `linear-gradient(90deg, ${OLIVE} 0%, ${SKY} 60%, #fde68a 100%)`,
                      boxShadow: `0 0 12px ${SKY}88`,
                    }}
                  />
                </div>
                <div className="mt-2 flex justify-between font-mono text-[10px] uppercase tracking-widest text-sky-400">
                  <span>입대 25.07.21</span>
                  <span>전역 27.01.20</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <StatBox label="복무" value={served ? `D+${served.days}` : 'D+…'} highlight />
                <StatBox label="총 기간" value={`${totalDays}일`} />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== 진급 마일스톤 ===== */}
      <section className="border-b border-sky-200 px-4 py-12 sm:px-6 sm:py-20">
        <div className="mx-auto max-w-6xl">
          <div className="mb-8 sm:mb-10 flex items-baseline justify-between gap-4">
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight">진급 타임라인</h2>
            <p className="font-mono text-[10px] sm:text-xs uppercase tracking-[0.3em] text-sky-600">promotion</p>
          </div>

          <div className="space-y-2 sm:space-y-3">
            {RANK_MILESTONES.map((m, i) => {
              const t = addMonths(ENLIST_DATE, m.months)
              const past = now ? now.getTime() >= t.getTime() : false
              const current = rank.rank === m.rank
              return (
                <motion.div
                  key={m.rank}
                  initial={{ opacity: 0, x: -16 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: i * 0.05 }}
                  className={`flex flex-wrap items-center gap-3 rounded-lg border-l-4 px-4 py-3 ${
                    current ? 'bg-white shadow-md' : past ? 'bg-sky-100/60' : 'bg-white/40'
                  }`}
                  style={{
                    borderColor: current ? OLIVE : past ? SKY : '#cbd5e1',
                    opacity: past || current ? 1 : 0.55,
                  }}
                >
                  <span
                    className="flex h-12 w-20 shrink-0 items-center justify-center rounded font-mono text-sm font-black text-white"
                    style={{ background: current ? OLIVE : past ? SKY_DEEP : '#94a3b8' }}
                  >
                    {m.rank}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold sm:text-base">
                      {m.label}
                      {current && (
                        <span className="ml-2 inline-block rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-mono uppercase tracking-widest text-emerald-700">
                          ● now
                        </span>
                      )}
                    </p>
                    <p className="mt-0.5 font-mono text-[11px] text-sky-700/70">
                      {t.toISOString().slice(0, 10)}
                      {' · '}
                      {past ? '통과' : '예정'}
                    </p>
                  </div>
                </motion.div>
              )
            })}
          </div>
        </div>
      </section>

      {/* ===== Service info — 군 서류 표 ===== */}
      <section className="border-b border-sky-200 bg-sky-100 px-4 py-12 sm:px-6 sm:py-20">
        <div className="mx-auto max-w-6xl">
          <div className="mb-8 sm:mb-10 flex items-baseline justify-between gap-4">
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight">복무 정보</h2>
            <p className="font-mono text-[10px] sm:text-xs uppercase tracking-[0.3em] text-sky-600">
              service record
            </p>
          </div>

          <div className="overflow-hidden rounded-lg border-2" style={{ borderColor: OLIVE }}>
            <table className="w-full">
              <tbody className="divide-y divide-sky-200">
                {SERVICE_INFO.map((item) => (
                  <tr key={item.label}>
                    <th
                      className="w-32 px-4 py-3 text-left font-mono text-[10px] uppercase tracking-widest sm:w-40 sm:px-6 sm:py-4 sm:text-xs"
                      style={{ background: 'rgba(85,107,47,0.1)', color: OLIVE }}
                    >
                      {item.label}
                    </th>
                    <td className="bg-white px-4 py-3 text-sm font-bold sm:px-6 sm:py-4 sm:text-base">
                      {item.value}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ===== 전역 후 계획 ===== */}
      <section className="border-b border-sky-200 px-4 py-12 sm:px-6 sm:py-20">
        <div className="mx-auto max-w-6xl">
          <div className="mb-8 sm:mb-10 flex items-baseline justify-between gap-4">
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight">전역 후 계획</h2>
            <p className="font-mono text-[10px] sm:text-xs uppercase tracking-[0.3em] text-sky-600">
              post-discharge plan
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4">
            {POST_DISCHARGE.map((p, i) => (
              <motion.div
                key={p.title}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.06 }}
                className="rounded-lg border-2 border-dashed bg-white p-5"
                style={{ borderColor: KHAKI }}
              >
                <p className="font-mono text-[10px] uppercase tracking-widest sm:text-xs" style={{ color: OLIVE }}>
                  obj {String(i + 1).padStart(2, '0')}
                </p>
                <h3 className="mt-2 text-lg font-black sm:text-xl">{p.title}</h3>
                <p className="mt-2 text-sm text-sky-900/70">{p.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== Contact ===== */}
      <section className="px-4 py-16 sm:px-6 sm:py-24" style={{ background: SKY_DEEP }}>
        <div className="mx-auto max-w-3xl text-center text-white">
          <p className="font-mono text-[10px] sm:text-xs uppercase tracking-[0.3em] text-sky-300">— contact</p>
          <h2 className="mt-3 sm:mt-4 text-3xl sm:text-5xl font-black tracking-tight">전역하면 보자</h2>
          <p className="mt-3 sm:mt-4 text-sm sm:text-base text-sky-100/80">
            면회 / 메시지 / 위문편지 — 모두 환영. 기다리고 있을게요.
          </p>

          <div className="mt-8 sm:mt-12 flex flex-wrap justify-center gap-3">
            <a
              href="mailto:jingyu@rangu-fam.com"
              className="inline-flex items-center gap-2 rounded-md px-5 py-2.5 text-xs font-bold uppercase tracking-widest text-sky-950 transition sm:px-7 sm:py-3 sm:text-sm"
              style={{ background: SKY }}
            >
              메시지 보내기
            </a>
            <Link
              href="https://rangu-fam.com"
              className="inline-flex items-center gap-2 rounded-md border border-sky-300 px-5 py-2.5 text-xs font-bold uppercase tracking-widest text-sky-100 transition hover:bg-sky-900 sm:px-7 sm:py-3 sm:text-sm"
            >
              ← 메인
            </Link>
          </div>
        </div>
      </section>

      {/* ===== Footer ===== */}
      <footer className="bg-sky-100 px-4 py-5 text-[10px] sm:px-6 sm:py-6 sm:text-xs">
        <div className="mx-auto flex max-w-6xl items-center justify-between font-mono uppercase tracking-widest text-sky-700/70">
          <span>FILE #007 · {new Date().getFullYear()}</span>
          <span>jingyu / rangu-fam.com</span>
        </div>
      </footer>

      <style jsx>{`
        .jingyu {
          font-family: 'Pretendard', system-ui, sans-serif;
        }
        .jingyu :global(.font-mono) {
          font-family: 'JetBrains Mono', ui-monospace, monospace;
        }
      `}</style>
    </div>
  )
}

// ── 시간 단위 카드 (전역까지 카운터) ──────────────────────
function TimeUnit({
  label,
  value,
  pulse = false,
}: {
  label: string
  value: number | undefined
  pulse?: boolean
}) {
  return (
    <div
      className={`rounded-md border border-sky-700/40 bg-sky-900/40 px-3 py-3 text-center sm:py-4 ${
        pulse ? 'ring-1 ring-emerald-400/30' : ''
      }`}
    >
      <p className="font-mono text-2xl font-black tabular-nums text-white sm:text-3xl">
        {value !== undefined ? String(value).padStart(2, '0') : '—'}
      </p>
      <p className="mt-1 font-mono text-[10px] uppercase tracking-widest text-sky-300">{label}</p>
    </div>
  )
}

function StatBox({
  label,
  value,
  highlight = false,
}: {
  label: string
  value: string
  highlight?: boolean
}) {
  return (
    <div
      className="rounded-lg border bg-sky-900/40 px-4 py-4 text-center sm:py-5"
      style={{
        borderColor: highlight ? OLIVE : 'rgba(56,189,248,0.4)',
        background: highlight ? 'rgba(85,107,47,0.18)' : 'rgba(7,89,133,0.4)',
      }}
    >
      <p className="font-mono text-[10px] uppercase tracking-widest text-sky-300 sm:text-xs">
        {label}
      </p>
      <p className="mt-1.5 font-mono text-2xl font-black text-white sm:text-3xl">{value}</p>
    </div>
  )
}

function DogTag({ rank }: { rank: string }) {
  return (
    <svg viewBox="0 0 280 380" width="220" height="300" fill="none" className="drop-shadow-2xl">
      {/* chain hole */}
      <circle cx="140" cy="22" r="9" fill="none" stroke="#94a3b8" strokeWidth="2" />
      {/* tag body */}
      <rect
        x="40"
        y="50"
        width="200"
        height="280"
        rx="22"
        fill="#cbd5e1"
        stroke="#475569"
        strokeWidth="2"
      />
      {/* embossed lines */}
      <line x1="60" y1="100" x2="220" y2="100" stroke="#475569" strokeWidth="0.5" />
      <line x1="60" y1="170" x2="220" y2="170" stroke="#475569" strokeWidth="0.5" />
      <line x1="60" y1="220" x2="220" y2="220" stroke="#475569" strokeWidth="0.5" />
      <line x1="60" y1="270" x2="220" y2="270" stroke="#475569" strokeWidth="0.5" />

      {/* text */}
      <text x="140" y="86" fill="#0f172a" fontSize="22" fontWeight="900" textAnchor="middle" fontFamily="JetBrains Mono, monospace">
        JUNG JIN·KYU
      </text>
      <text x="140" y="135" fill="#0f172a" fontSize="14" fontFamily="JetBrains Mono, monospace" textAnchor="middle">
        ROK ARMY
      </text>
      <text x="140" y="155" fill="#556b2f" fontSize="14" fontWeight="700" fontFamily="JetBrains Mono, monospace" textAnchor="middle">
        {rank.toUpperCase()}
      </text>
      <text x="140" y="200" fill="#0f172a" fontSize="13" fontFamily="JetBrains Mono, monospace" textAnchor="middle">
        SVC# 25-07-21
      </text>
      <text x="140" y="250" fill="#0f172a" fontSize="13" fontFamily="JetBrains Mono, monospace" textAnchor="middle">
        BLOOD: O+
      </text>
      <text x="140" y="300" fill="#0f172a" fontSize="11" fontFamily="JetBrains Mono, monospace" textAnchor="middle">
        rangu-fam · R7
      </text>

      {/* small star */}
      <text x="140" y="325" fill="#556b2f" fontSize="14" textAnchor="middle">★</text>
    </svg>
  )
}
