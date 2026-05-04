'use client'

/**
 * 강한울 — 철도 / 한국 도시철도 노선도 스타일 (남색).
 *
 * 톤: 짙은 남색 + 정보 디자인 (Seoul Metro 시그니지 영감), Helvetica/Pretendard 굵은 산세리프,
 *     역명판 / 노선도 모티프, 차량 SVG 일러스트.
 */

import React from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'

const NAVY = '#0b1d3a'
const NAVY_DEEP = '#06122a'
const NAVY_LIGHT = '#1d3a6e'
const ACCENT = '#5ba1ff'
const RAIL_RED = '#ef4135' // KORAIL 빨강 (현재 강조용)

// ── 선호 노선 ─────────────────────────────────────────
const FAVORITE_LINES = [
  { code: '1', name: '1호선', color: '#0d3692', desc: '대한민국 최초의 지하철' },
  { code: '7', name: '7호선', color: '#5b6c33', desc: '동서울과 강남을 잇는 주요 철도망' },
  { code: '경부', name: '경부선', color: '#005bac', desc: '서울–부산을 오가는 대표 노선' },
  { code: '경의', name: '경의·중앙선', color: '#73c3a4', desc: '서울을 빠르게 훑는 노선' },
  { code: '경춘', name: '경춘선', color: '#0c8e72', desc: '꿈과 희망을 담은 청춘들의 노선' },
  { code: '호남', name: '호남선', color: '#e57c00', desc: '서울–광주를 오가는 대표 노선' },
]

// ── 학력 타임라인 ─────────────────────────────────────
const EDUCATION_TIMELINE = [
  { date: '2005.03.02', label: '출생' },
  { date: '2012.03.02', label: '신묵초등학교 입학' },
  { date: '2018.03.02', label: '중랑중학교 입학' },
  { date: '2021.03.02', label: '태릉고등학교 입학' },
  { date: '2024.03.04', label: '경남대학교 사범대학 입학' },
  { date: '2026.03.03', label: '우송대학교 철도대학 입학', current: true },
]

// ── 활동 타임라인 ─────────────────────────────────────
const ACTIVITY_TIMELINE = [
  { date: '2020.03.02', label: '중랑중학교 44대 학생회장' },
  { date: '2021.04.01', label: '태릉고등학교 36대 부학생회장' },
  { date: '2021.10.16', label: '이랑 설립 및 대표 취임' },
  { date: '2021.11.19', label: '작업공작소 설립' },
  { date: '2022.04.01', label: '태릉고등학교 37대 학생회장' },
  { date: '2022.05.01', label: '동부교육지원청 학생인권위원회 부위원장' },
  { date: '2025.11.29', label: '이랑 초대 CEO' },
  { date: '2026.', label: '현재', current: true },
]

// ── Hero 메타 카드 ────────────────────────────────────
const HERO_META = [
  { label: '현재 학적', value: '우송대 철도대학', sub: '철도차량시스템학과' },
  { label: '관심 분야', value: '철도 차량·도시철도', sub: 'EMU · KTX · 도시철도' },
  { label: '현 직책', value: '이랑 초대 CEO', sub: '2025.11.29 ~' },
  { label: '랑구 라인', value: 'R17', sub: 'STATION 17' },
]

export default function HanulPage() {
  return (
    <div className="hanul min-h-screen text-white" style={{ background: NAVY_DEEP }}>
      {/* ===== Top bar (역명판 톤) ===== */}
      <header
        className="border-b-4 px-4 py-4 sm:px-6 sm:py-5"
        style={{ background: NAVY, borderColor: ACCENT }}
      >
        <div className="mx-auto flex max-w-6xl items-center justify-between text-xs sm:text-sm">
          <Link href="https://rangu-fam.com" className="opacity-70 hover:opacity-100 transition">
            ← rangu.fam
          </Link>
          <span className="font-mono tracking-[0.2em] sm:tracking-[0.3em] text-[10px] sm:text-xs opacity-80 hidden sm:inline">
            RANGU LINE · STATION 17
          </span>
          <span className="font-mono opacity-60">R17</span>
        </div>
      </header>

      {/* ===== Hero — 좌측 역명판/소개 + 우측 메타 카드 ===== */}
      <section className="border-b border-white/10 px-4 sm:px-6 py-14 sm:py-20">
        <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[1.1fr_1fr] lg:items-start lg:gap-16">
          {/* 좌측: 역명판 + 소개 */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
          >
            <p className="font-mono text-[10px] sm:text-xs uppercase tracking-[0.3em] text-blue-300">
              line · rangu — station 17
            </p>

            {/* 역명판 */}
            <div
              className="mt-6 sm:mt-8 inline-flex flex-wrap items-center rounded-md border-2 px-5 py-3 sm:px-8 sm:py-4"
              style={{ borderColor: ACCENT, background: NAVY }}
            >
              <span className="text-4xl font-black tracking-tight sm:text-5xl md:text-6xl">강한울</span>
              <span className="mt-1 sm:mt-0 ml-0 sm:ml-6 sm:border-l sm:border-white/30 sm:pl-6 font-mono text-xs sm:text-sm uppercase tracking-widest opacity-70">
                Kang Han·ul
              </span>
            </div>

            {/* 이전/다음 역 */}
            <div className="mt-3 sm:mt-4 flex flex-wrap items-center gap-3 sm:gap-6 text-xs sm:text-sm">
              <span className="opacity-60">← R20 정민석</span>
              <span className="opacity-30 hidden sm:inline">·</span>
              <span className="opacity-60">R7 정진규 →</span>
            </div>

            <p className="mt-8 max-w-xl text-base sm:text-lg leading-relaxed text-blue-100/80">
              <strong className="text-white">우송대학교 철도차량시스템학과</strong>에 재학 중이며,
              철도 분야의 전문가가 되기 위해 노력하고 있습니다.
            </p>
          </motion.div>

          {/* 우측: 메타 카드 + 미니 노선도 */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.15 }}
            className="flex flex-col gap-4"
          >
            <div className="grid grid-cols-2 gap-3">
              {HERO_META.map((m) => (
                <div
                  key={m.label}
                  className="rounded-md border p-4 transition hover:border-blue-400/50"
                  style={{ background: NAVY, borderColor: 'rgba(91,161,255,0.25)' }}
                >
                  <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-blue-300/80">
                    {m.label}
                  </p>
                  <p className="mt-2 text-sm font-bold leading-snug text-white sm:text-base">
                    {m.value}
                  </p>
                  <p className="mt-1 text-[11px] text-blue-200/60">{m.sub}</p>
                </div>
              ))}
            </div>

            {/* 미니 노선도 — 한울 위치 강조 */}
            <div
              className="rounded-md border p-4 sm:p-5"
              style={{ background: NAVY, borderColor: 'rgba(91,161,255,0.25)' }}
            >
              <div className="mb-2 flex items-baseline justify-between">
                <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-blue-300/80">
                  rangu line
                </p>
                <p className="font-mono text-[10px] text-blue-200/40">5 stations</p>
              </div>
              <RanguLineMap compact />
            </div>
          </motion.div>
        </div>
      </section>

      {/* ===== 선호 노선 ===== */}
      <section className="border-b border-white/10 px-4 sm:px-6 py-16 sm:py-24" style={{ background: NAVY }}>
        <div className="mx-auto max-w-6xl">
          <div className="mb-8 sm:mb-12 flex items-baseline justify-between gap-4">
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">선호 노선</h2>
            <p className="font-mono text-[10px] sm:text-xs uppercase tracking-[0.3em] opacity-50 shrink-0">
              my lines
            </p>
          </div>

          <div className="grid gap-3 sm:gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FAVORITE_LINES.map((line, i) => (
              <motion.div
                key={line.code}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-40px' }}
                transition={{ duration: 0.4, delay: i * 0.05 }}
                className="group rounded-lg border border-white/10 p-4 sm:p-5 transition hover:border-white/30"
                style={{ background: NAVY_DEEP }}
              >
                <div className="flex items-center gap-3 sm:gap-4">
                  <span
                    className="flex h-11 w-11 sm:h-12 sm:w-12 shrink-0 items-center justify-center rounded-full text-[11px] sm:text-sm font-black text-white"
                    style={{ background: line.color }}
                  >
                    {line.code}
                  </span>
                  <div className="min-w-0">
                    <p className="text-lg sm:text-xl font-bold">{line.name}</p>
                    <p className="mt-0.5 text-[11px] sm:text-xs text-blue-200/60">{line.desc}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== 지금까지 걸어온 길 — 학력 / 활동 두 트랙 ===== */}
      <section className="border-b border-white/10 px-4 sm:px-6 py-16 sm:py-24">
        <div className="mx-auto max-w-6xl">
          <div className="mb-10 sm:mb-14 flex items-baseline justify-between gap-4">
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">지금까지 걸어온 길</h2>
            <p className="font-mono text-[10px] sm:text-xs uppercase tracking-[0.3em] opacity-50 shrink-0">
              record · timeline
            </p>
          </div>

          <div className="grid gap-10 lg:grid-cols-2 lg:gap-12">
            <TimelineColumn
              title="학력"
              subtitle="education"
              items={EDUCATION_TIMELINE}
              color={ACCENT}
            />
            <TimelineColumn
              title="활동"
              subtitle="activities"
              items={ACTIVITY_TIMELINE}
              color="#76b900"
            />
          </div>
        </div>
      </section>

      {/* ===== 랑구 라인 노선도 ===== */}
      <section className="border-b border-white/10 px-4 sm:px-6 py-16 sm:py-24" style={{ background: NAVY }}>
        <div className="mx-auto max-w-6xl">
          <div className="mb-8 sm:mb-10 flex items-baseline justify-between gap-4">
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">랑구 라인 노선도</h2>
            <p className="font-mono text-[10px] sm:text-xs uppercase tracking-[0.3em] opacity-50 shrink-0">
              rangu line map
            </p>
          </div>
          <div
            className="overflow-x-auto rounded-xl border border-white/10 p-5 sm:p-8"
            style={{ background: NAVY_DEEP }}
          >
            <div className="min-w-[600px]">
              <RanguLineMap />
            </div>
          </div>
          <p className="mt-3 sm:mt-4 font-mono text-[10px] sm:text-xs uppercase tracking-widest opacity-50">
            scale 1:N · 환승역 표기는 동그라미
          </p>
        </div>
      </section>

      {/* ===== 통계 카운터 ===== */}
      <section className="border-b border-white/10 px-4 sm:px-6 py-16 sm:py-24">
        <div className="mx-auto max-w-6xl">
          <div className="grid grid-cols-2 gap-px overflow-hidden rounded-lg bg-white/10 md:grid-cols-4">
            {[
              { v: FAVORITE_LINES.length.toString(), l: '선호 노선' },
              { v: EDUCATION_TIMELINE.length.toString(), l: '학력 단계' },
              { v: ACTIVITY_TIMELINE.length.toString(), l: '주요 활동' },
              { v: '∞', l: '계획 중인 답사' },
            ].map((s) => (
              <div key={s.l} className="px-4 py-8 sm:px-6 sm:py-12 text-center" style={{ background: NAVY }}>
                <p className="text-4xl sm:text-6xl font-black tracking-tight" style={{ color: ACCENT }}>
                  {s.v}
                </p>
                <p className="mt-2 sm:mt-3 text-[11px] sm:text-sm uppercase tracking-widest text-blue-200/70">
                  {s.l}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== Contact / 종착역 ===== */}
      <section className="px-4 sm:px-6 py-20 sm:py-32" style={{ background: NAVY_DEEP }}>
        <div className="mx-auto max-w-3xl text-center">
          <p className="font-mono text-[10px] sm:text-xs uppercase tracking-[0.3em] text-blue-300">
            terminus
          </p>
          <h2 className="mt-3 sm:mt-4 text-3xl sm:text-5xl font-black tracking-tight">
            함께 노선 답사 가실래요?
          </h2>
          <p className="mt-3 sm:mt-4 text-sm sm:text-base text-blue-100/70">
            철도/도시 이야기는 항상 환영입니다.
          </p>

          <div className="mt-8 sm:mt-12 flex flex-wrap justify-center gap-2 sm:gap-3">
            <a
              href="mailto:hanul@rangu-fam.com"
              className="inline-flex items-center gap-2 rounded-full px-5 sm:px-7 py-2.5 sm:py-3 text-xs sm:text-sm font-bold uppercase tracking-widest text-white transition"
              style={{ background: ACCENT }}
            >
              메일 보내기
            </a>
            <Link
              href="https://rangu-fam.com"
              className="inline-flex items-center gap-2 rounded-full border border-white/30 px-5 sm:px-7 py-2.5 sm:py-3 text-xs sm:text-sm font-bold uppercase tracking-widest text-white/80 transition hover:bg-white/10"
            >
              ← 메인
            </Link>
          </div>
        </div>
      </section>

      {/* ===== Footer ===== */}
      <footer className="border-t border-white/10 px-4 sm:px-6 py-6 sm:py-8 text-[10px] sm:text-xs">
        <div className="mx-auto flex max-w-6xl items-center justify-between font-mono uppercase tracking-widest text-blue-200/40">
          <span>RANGU LINE · 2026</span>
          <span>강한울 · R17</span>
        </div>
      </footer>

      <style jsx>{`
        .hanul {
          font-family: 'Pretendard', 'Helvetica Neue', system-ui, sans-serif;
          letter-spacing: -0.005em;
        }
        .hanul :global(.font-mono) {
          font-family: 'JetBrains Mono', ui-monospace, monospace;
        }
      `}</style>
    </div>
  )
}

// ── 타임라인 컬럼 (학력/활동 공용) — 세로 카드 ─────────
function TimelineColumn({
  title,
  subtitle,
  items,
  color,
}: {
  title: string
  subtitle: string
  items: Array<{ date: string; label: string; current?: boolean }>
  color: string
}) {
  return (
    <div>
      <div className="mb-5 flex items-baseline justify-between gap-3 border-b border-white/10 pb-3">
        <h3 className="text-xl sm:text-2xl font-bold tracking-tight">{title}</h3>
        <p className="font-mono text-[10px] sm:text-xs uppercase tracking-[0.3em] opacity-50">
          {subtitle}
        </p>
      </div>

      <div className="relative pl-8">
        {/* 수직 라인 */}
        <div
          className="absolute left-[10px] top-2 bottom-2 w-[3px] rounded-full"
          aria-hidden
          style={{ background: `${color}55` }}
        />
        <ul className="space-y-3">
          {items.map((item, i) => (
            <li key={i} className="relative">
              {/* 점 */}
              <span className="absolute -left-[20px] top-3 flex h-5 w-5 items-center justify-center">
                {item.current ? (
                  <>
                    <span
                      className="relative z-10 flex h-5 w-5 items-center justify-center rounded-full"
                      style={{ background: NAVY_DEEP, border: `3px solid ${RAIL_RED}` }}
                    >
                      <span
                        className="absolute h-2 w-2 rounded-full"
                        style={{ background: RAIL_RED }}
                      />
                    </span>
                    <span
                      aria-hidden
                      className="absolute h-5 w-5 rounded-full opacity-40 animate-ping"
                      style={{ background: RAIL_RED }}
                    />
                  </>
                ) : (
                  <span
                    className="block h-3.5 w-3.5 rounded-full"
                    style={{ background: NAVY_DEEP, border: `3px solid ${color}` }}
                  />
                )}
              </span>

              {/* 카드 */}
              <div
                className="rounded-md border px-3.5 py-2.5 transition hover:border-white/25"
                style={{
                  background: NAVY,
                  borderColor: item.current ? `${RAIL_RED}55` : 'rgba(255,255,255,0.08)',
                }}
              >
                <div className="flex items-baseline justify-between gap-2">
                  <p className="text-sm sm:text-[15px] font-bold leading-snug text-white">
                    {item.label}
                  </p>
                  {item.current && (
                    <span
                      className="font-mono text-[9px] uppercase tracking-widest"
                      style={{ color: RAIL_RED }}
                    >
                      now
                    </span>
                  )}
                </div>
                <p className="mt-1 font-mono text-[11px] text-blue-300">{item.date}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

function RanguLineMap({ compact = false }: { compact?: boolean }) {
  const stops = [
    { name: '재원', code: 'R27', color: '#E0654E' },
    { name: '민석', code: 'R20', color: '#3E5C4A' },
    { name: '한울', code: 'R17', color: '#5ba1ff', current: true },
    { name: '진규', code: 'R7', color: '#7dd3fc' },
    { name: '승찬', code: 'R1', color: '#d4a017' },
  ]
  // compact = Hero 우측에 들어가는 작은 버전
  const height = compact ? 100 : 140
  const labelY = compact ? 28 : 36
  const codeY = compact ? 88 : 118
  const labelSize = compact ? 13 : 16
  const codeSize = compact ? 9 : 11
  const cy = compact ? 55 : 70
  const lineY = compact ? 55 : 70
  const r = compact ? 10 : 12
  const rCurrent = compact ? 14 : 18
  const innerR = compact ? 5 : 6

  return (
    <svg viewBox={`0 0 1000 ${height}`} width="100%" height={height} fill="none">
      {/* main line */}
      <line
        x1="60"
        y1={lineY}
        x2="940"
        y2={lineY}
        stroke="#5ba1ff"
        strokeWidth={compact ? 4 : 6}
        strokeLinecap="round"
      />
      {stops.map((s, i) => {
        const x = 60 + (i * (940 - 60)) / (stops.length - 1)
        return (
          <g key={s.code}>
            <circle
              cx={x}
              cy={cy}
              r={s.current ? rCurrent : r}
              fill="#0b1d3a"
              stroke={s.color}
              strokeWidth="3"
            />
            {s.current && <circle cx={x} cy={cy} r={innerR} fill={s.color} />}
            <text
              x={x}
              y={labelY}
              fill="white"
              fontSize={labelSize}
              fontWeight="700"
              textAnchor="middle"
              fontFamily="Pretendard, sans-serif"
            >
              {s.name}
            </text>
            <text
              x={x}
              y={codeY}
              fill="#5ba1ff"
              fontSize={codeSize}
              textAnchor="middle"
              fontFamily="JetBrains Mono, monospace"
            >
              {s.code}
            </text>
          </g>
        )
      })}
    </svg>
  )
}
