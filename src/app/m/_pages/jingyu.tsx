'use client'

/**
 * 정진규 — 군인 / 군 서류 + dog tag 톤 (하늘색 + 올리브).
 *
 * 톤: 하늘색 base + 올리브/카키 accent + 군 서류 monospace, 큼직한 D-day 카운터,
 *     dog tag SVG, 보직표/명령서 레이아웃.
 */

import React, { useEffect, useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import Link from 'next/link'

const SKY = '#7dd3fc'
const SKY_DEEP = '#0c4a6e'
const OLIVE = '#556b2f'
const KHAKI = '#a08b5c'

// 가상 입대일/전역일 (실 데이터로 교체 가능)
const ENLIST_DATE = new Date('2024-09-23T00:00:00+09:00')
const DISCHARGE_DATE = new Date('2026-03-22T00:00:00+09:00')

const SERVICE_INFO = [
  { label: '소속', value: '대한민국 육군' },
  { label: '계급', value: '병장' },
  { label: '병과', value: '보병' },
  { label: '주특기', value: '소총수' },
  { label: '근무지', value: '강원도' },
  { label: '복무 형태', value: '현역' },
]

const DAILY_LOG = [
  { date: 'D+498', note: '오늘도 무사. 근무 끝나고 PX' },
  { date: 'D+486', note: '훈련 — 야간 행군 30km' },
  { date: 'D+471', note: '면회 다녀감. 친구들 다 건강' },
  { date: 'D+450', note: '병장 진급. 짬밥 늘어나는 중' },
]

const POST_DISCHARGE = [
  { title: '복학', desc: '학교 복귀 + 학기 적응' },
  { title: '운전면허', desc: '미뤘던 거 일단 따기' },
  { title: '여행', desc: '친구들과 부산 / 여수' },
  { title: '체력 유지', desc: '군에서 만든 루틴 유지' },
]

function calcDays(target: Date) {
  const now = new Date()
  const diff = target.getTime() - now.getTime()
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}
function calcServed(start: Date) {
  const now = new Date()
  return Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
}

export default function JingyuPage() {
  const reduce = useReducedMotion()
  const [now, setNow] = useState<Date | null>(null)
  useEffect(() => {
    setNow(new Date())
    const id = setInterval(() => setNow(new Date()), 60_000)
    return () => clearInterval(id)
  }, [])

  const daysLeft = now ? calcDays(DISCHARGE_DATE) : null
  const daysServed = now ? calcServed(ENLIST_DATE) : null
  const totalDays = Math.ceil((DISCHARGE_DATE.getTime() - ENLIST_DATE.getTime()) / (1000 * 60 * 60 * 24))
  const progress = daysServed !== null ? Math.min(100, Math.max(0, (daysServed / totalDays) * 100)) : 0

  return (
    <div className="jingyu min-h-screen bg-sky-50 text-sky-950">
      {/* ===== Top bar — 군 서류 헤더 ===== */}
      <header className="border-b-4 bg-sky-100 px-6 py-4" style={{ borderColor: OLIVE }}>
        <div className="mx-auto flex max-w-6xl items-center justify-between text-xs">
          <Link href="https://rangu-fam.com" className="opacity-70 hover:opacity-100 transition">
            ← rangu.fam
          </Link>
          <span className="font-mono uppercase tracking-[0.3em] text-sky-700">
            personal record · CLASSIFIED
          </span>
          <span className="font-mono opacity-60">FILE #007</span>
        </div>
      </header>

      {/* ===== Hero — Dog Tag + 이름표 ===== */}
      <section className="border-b border-sky-200 px-6 py-20">
        <div className="mx-auto grid max-w-6xl gap-12 md:grid-cols-[1.3fr,1fr] md:items-center">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: reduce ? 0 : 0.7 }}
          >
            <p className="font-mono text-xs uppercase tracking-[0.3em] text-sky-600">
              service record · republic of korea
            </p>
            <h1 className="mt-4 text-7xl font-black leading-none tracking-tight md:text-8xl">
              <span className="text-sky-950">정진규</span>
            </h1>
            <p className="mt-3 font-mono uppercase tracking-[0.25em] text-sky-700">
              JUNG JIN·KYU · sgt. ROK ARMY
            </p>

            <p className="mt-10 max-w-md text-base leading-relaxed text-sky-900/80">
              현재 강원도에서 복무 중.
              매일이 비슷한 듯 다르고, 친구들 보고 싶지만 잘 견디고 있어요.
              전역하면 한 번 더 만나서 술 한 잔 하기로.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.85, rotate: -6 }}
            animate={{ opacity: 1, scale: 1, rotate: -6 }}
            transition={{ duration: reduce ? 0 : 0.9, delay: 0.15 }}
            className="mx-auto"
          >
            <DogTag />
          </motion.div>
        </div>
      </section>

      {/* ===== D-day Counter (가장 큰 영역) ===== */}
      <section className="border-b border-sky-200 px-6 py-20" style={{ background: SKY_DEEP }}>
        <div className="mx-auto max-w-6xl text-white">
          <div className="mb-8 flex items-baseline justify-between">
            <p className="font-mono text-xs uppercase tracking-[0.3em] text-sky-300">— countdown</p>
            <p className="font-mono text-xs uppercase tracking-[0.3em] text-sky-300">
              discharge · {DISCHARGE_DATE.toISOString().slice(0, 10)}
            </p>
          </div>

          <div className="grid items-center gap-12 md:grid-cols-[1fr,1fr]">
            <div>
              <p className="text-2xl font-bold tracking-tight text-sky-100">전역까지</p>
              <p className="mt-2 font-mono text-[12rem] font-black leading-[0.85] tracking-tighter text-white md:text-[16rem]">
                {daysLeft !== null ? `D-${Math.max(0, daysLeft)}` : 'D-…'}
              </p>
            </div>

            <div className="space-y-6">
              <div>
                <div className="flex items-baseline justify-between text-sm">
                  <span className="opacity-70">복무 진행률</span>
                  <span className="font-mono">{progress.toFixed(1)}%</span>
                </div>
                <div className="mt-2 h-3 w-full overflow-hidden rounded-full bg-sky-900">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: reduce ? 0 : 1.2, ease: 'easeOut' }}
                    className="h-full rounded-full"
                    style={{ background: SKY }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-center">
                <div className="rounded-lg border border-sky-800 bg-sky-900/40 px-4 py-5">
                  <p className="font-mono text-xs uppercase tracking-widest text-sky-300">복무</p>
                  <p className="mt-2 font-mono text-3xl font-black">
                    {daysServed !== null ? `D+${daysServed}` : 'D+…'}
                  </p>
                </div>
                <div className="rounded-lg border border-sky-800 bg-sky-900/40 px-4 py-5">
                  <p className="font-mono text-xs uppercase tracking-widest text-sky-300">총 기간</p>
                  <p className="mt-2 font-mono text-3xl font-black">{totalDays}일</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== Service info — 군 서류 표 ===== */}
      <section className="border-b border-sky-200 px-6 py-20">
        <div className="mx-auto max-w-6xl">
          <div className="mb-10 flex items-baseline justify-between">
            <h2 className="text-3xl font-black tracking-tight">복무 정보</h2>
            <p className="font-mono text-xs uppercase tracking-[0.3em] text-sky-600">
              service record
            </p>
          </div>

          <div className="overflow-hidden rounded-lg border-2" style={{ borderColor: OLIVE }}>
            <table className="w-full">
              <tbody className="divide-y divide-sky-200">
                {SERVICE_INFO.map((item) => (
                  <tr key={item.label}>
                    <th
                      className="w-40 px-6 py-4 text-left font-mono text-xs uppercase tracking-widest"
                      style={{ background: 'rgba(85, 107, 47, 0.1)', color: OLIVE }}
                    >
                      {item.label}
                    </th>
                    <td className="bg-white px-6 py-4 text-base font-bold">{item.value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="mt-4 font-mono text-xs uppercase tracking-widest text-sky-700/60">
            * stamped by ROK / 본 정보는 demo 입니다.
          </p>
        </div>
      </section>

      {/* ===== Daily log ===== */}
      <section className="border-b border-sky-200 bg-sky-100 px-6 py-20">
        <div className="mx-auto max-w-6xl">
          <div className="mb-10 flex items-baseline justify-between">
            <h2 className="text-3xl font-black tracking-tight">일지</h2>
            <p className="font-mono text-xs uppercase tracking-[0.3em] text-sky-600">field log</p>
          </div>

          <ul className="space-y-3">
            {DAILY_LOG.map((entry, i) => (
              <motion.li
                key={entry.date}
                initial={{ opacity: 0, x: -16 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.06 }}
                className="flex items-center gap-6 border-l-4 bg-white p-4 shadow-sm"
                style={{ borderColor: SKY }}
              >
                <span
                  className="flex h-14 w-20 flex-shrink-0 items-center justify-center rounded font-mono font-black text-white"
                  style={{ background: SKY_DEEP }}
                >
                  {entry.date}
                </span>
                <p className="text-base">{entry.note}</p>
              </motion.li>
            ))}
          </ul>
        </div>
      </section>

      {/* ===== 전역 후 계획 ===== */}
      <section className="border-b border-sky-200 px-6 py-20">
        <div className="mx-auto max-w-6xl">
          <div className="mb-10 flex items-baseline justify-between">
            <h2 className="text-3xl font-black tracking-tight">전역 후 계획</h2>
            <p className="font-mono text-xs uppercase tracking-[0.3em] text-sky-600">
              post-discharge plan
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {POST_DISCHARGE.map((p, i) => (
              <motion.div
                key={p.title}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.06 }}
                className="rounded-lg border-2 border-dashed bg-white p-6"
                style={{ borderColor: KHAKI }}
              >
                <p className="font-mono text-xs uppercase tracking-widest" style={{ color: OLIVE }}>
                  obj {String(i + 1).padStart(2, '0')}
                </p>
                <h3 className="mt-2 text-xl font-black">{p.title}</h3>
                <p className="mt-2 text-sm text-sky-900/70">{p.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== Contact ===== */}
      <section className="px-6 py-24" style={{ background: SKY_DEEP }}>
        <div className="mx-auto max-w-3xl text-center text-white">
          <p className="font-mono text-xs uppercase tracking-[0.3em] text-sky-300">— contact</p>
          <h2 className="mt-4 text-5xl font-black tracking-tight">전역하면 보자</h2>
          <p className="mt-4 text-sky-100/80">
            면회 / 메시지 / 위문편지 — 모두 환영. 기다리고 있을게요.
          </p>

          <div className="mt-12 flex flex-wrap justify-center gap-3">
            <a
              href="mailto:jingyu@rangu-fam.com"
              className="inline-flex items-center gap-2 rounded-md px-7 py-3 text-sm font-bold uppercase tracking-widest text-sky-950 transition"
              style={{ background: SKY }}
            >
              메시지 보내기
            </a>
            <Link
              href="https://rangu-fam.com"
              className="inline-flex items-center gap-2 rounded-md border border-sky-300 px-7 py-3 text-sm font-bold uppercase tracking-widest text-sky-100 transition hover:bg-sky-900"
            >
              ← 메인
            </Link>
          </div>
        </div>
      </section>

      {/* ===== Footer ===== */}
      <footer className="bg-sky-100 px-6 py-6 text-xs">
        <div className="mx-auto flex max-w-6xl items-center justify-between font-mono uppercase tracking-widest text-sky-700/70">
          <span>FILE #007 · 2026</span>
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

function DogTag() {
  return (
    <svg viewBox="0 0 280 380" width="220" height="300" fill="none">
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
      <text x="140" y="155" fill="#0f172a" fontSize="14" fontFamily="JetBrains Mono, monospace" textAnchor="middle">
        SGT
      </text>
      <text x="140" y="200" fill="#0f172a" fontSize="13" fontFamily="JetBrains Mono, monospace" textAnchor="middle">
        SVC# 24-09-23
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
