'use client'

/**
 * 정재원 (Gabriel) — 풀스택 엔지니어 / DoubleJ Co-founder · CEO.
 *
 * 톤: VS Code / GitHub Dark 영감의 IDE 인터페이스. 코드 hero + tech stack +
 *     contribution heatmap + project showcase. 모노스페이스 우선.
 */

import React, { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'

// ── 색상 토큰 (GitHub Dark) ─────────────────────────────
const BG = '#0d1117'
const BG_ELEV = '#161b22'
const BG_INPUT = '#0d1117'
const BORDER = '#30363d'
const TXT = '#c9d1d9'
const TXT_MUTED = '#8b949e'
const ACC_GREEN = '#3fb950'
const ACC_BLUE = '#58a6ff'
const ACC_PURPLE = '#a371f7'
const ACC_ORANGE = '#ff9e64'

// VS Code Dark+ syntax tokens
const SYN = {
  keyword: '#ff7b72',
  string: '#a5d6ff',
  func: '#d2a8ff',
  comment: '#8b949e',
  number: '#79c0ff',
  type: '#ffa657',
  prop: '#79c0ff',
  variable: '#c9d1d9',
}

// ── 데이터 ──────────────────────────────────────────────
const TECH_STACK: Array<{ name: string; tone: keyof typeof TECH_TONES; sub?: string }> = [
  { name: 'TypeScript', tone: 'blue' },
  { name: 'Python', tone: 'yellow' },
  { name: 'Next.js 14', tone: 'mono' },
  { name: 'React 18', tone: 'cyan' },
  { name: 'Node.js', tone: 'green' },
  { name: 'PostgreSQL', tone: 'blue' },
  { name: 'Drizzle ORM', tone: 'green' },
  { name: 'TensorFlow', tone: 'orange' },
  { name: 'OR-Tools / CP-SAT', tone: 'purple' },
  { name: 'Tailwind CSS', tone: 'cyan' },
  { name: 'Cloud Run / GCP', tone: 'blue' },
  { name: 'OIDC / OAuth 2.0', tone: 'mono' },
]

const TECH_TONES = {
  blue: { bg: 'rgba(56,139,253,0.10)', border: 'rgba(56,139,253,0.40)', text: '#58a6ff' },
  green: { bg: 'rgba(63,185,80,0.10)', border: 'rgba(63,185,80,0.40)', text: '#3fb950' },
  purple: { bg: 'rgba(163,113,247,0.10)', border: 'rgba(163,113,247,0.40)', text: '#a371f7' },
  orange: { bg: 'rgba(255,158,100,0.10)', border: 'rgba(255,158,100,0.40)', text: '#ff9e64' },
  cyan: { bg: 'rgba(56,202,232,0.10)', border: 'rgba(56,202,232,0.40)', text: '#7ee5f8' },
  yellow: { bg: 'rgba(255,212,59,0.10)', border: 'rgba(255,212,59,0.40)', text: '#ffd43b' },
  mono: { bg: 'rgba(139,148,158,0.10)', border: 'rgba(139,148,158,0.40)', text: '#c9d1d9' },
} as const

const PROJECTS = [
  {
    name: 'DoubleJ Platform',
    role: 'Architect · Lead Engineer',
    desc: '이메일·MFA·Passkey·Discord 로그인 통합. OIDC 표준으로 다른 서비스에 SSO 제공.',
    stack: ['Next.js', 'OIDC', 'PostgreSQL', 'Cloud Run'],
    status: 'live',
    href: 'https://accounts.doublej.app',
  },
  {
    name: 'Oniv AI',
    role: 'AI Engineer · Algorithm Design',
    desc: '검색·클릭·구매·체류 다중 시그널 학습 후 시장·언어 가로지르는 랭킹/프로모션 개인화.',
    stack: ['Python', 'TensorFlow', 'PostgreSQL'],
    status: 'live',
  },
  {
    name: 'Timora',
    role: 'AI Engineer · Optimization',
    desc: 'OR-Tools/CP-SAT 기반 대학 강의·강의실 자동 배정. 캘린더·결제 연동, XAI 지원.',
    stack: ['Python', 'OR-Tools', 'CP-SAT', 'Next.js'],
    status: 'pilot',
  },
  {
    name: '이랑위키 (irang.wiki)',
    role: 'Sole Developer',
    desc: '랑구팸의 협업 백과사전. 나무위키 문법 파싱 / 검수 큐 / 기여자 랭킹 직접 구현.',
    stack: ['Next.js', 'Drizzle', 'PostgreSQL'],
    status: 'live',
    href: 'https://irang.wiki',
  },
]

const STATS = [
  { value: 'Co-founder', label: 'DoubleJ', tone: 'purple' as const },
  { value: '5+', label: 'years coding', tone: 'green' as const },
  { value: '∞', label: 'cups of coffee', tone: 'orange' as const },
  { value: '24/7', label: 'shipping mode', tone: 'blue' as const },
]

const CONTACT = [
  { label: 'Email', value: 'doublej.biz01@gmail.com', href: 'mailto:doublej.biz01@gmail.com' },
  { label: 'GitHub', value: 'github.com/GabrielJung0727', href: 'https://github.com/GabrielJung0727' },
  { label: 'DoubleJ', value: 'accounts.doublej.app/company', href: 'https://accounts.doublej.app/company' },
]

const HERO_CODE_LINES: Array<{ tokens: Array<{ text: string; color?: string }> }> = [
  {
    tokens: [
      { text: '// ', color: SYN.comment },
      { text: '인사·이름·역할·미션을 한 객체로 압축', color: SYN.comment },
    ],
  },
  {
    tokens: [
      { text: 'const', color: SYN.keyword },
      { text: ' ' },
      { text: 'gabriel', color: SYN.variable },
      { text: ': ' },
      { text: 'Engineer', color: SYN.type },
      { text: ' = {' },
    ],
  },
  {
    tokens: [
      { text: '  name', color: SYN.prop },
      { text: ': ' },
      { text: "'정재원'", color: SYN.string },
      { text: ',' },
    ],
  },
  {
    tokens: [
      { text: '  alias', color: SYN.prop },
      { text: ': ' },
      { text: "'Gabriel · @gabriel0727'", color: SYN.string },
      { text: ',' },
    ],
  },
  {
    tokens: [
      { text: '  role', color: SYN.prop },
      { text: ': [' },
      { text: "'Co-founder'", color: SYN.string },
      { text: ', ' },
      { text: "'CEO'", color: SYN.string },
      { text: ', ' },
      { text: "'Full-stack'", color: SYN.string },
      { text: ', ' },
      { text: "'AI Researcher'", color: SYN.string },
      { text: '],' },
    ],
  },
  {
    tokens: [
      { text: '  stack', color: SYN.prop },
      { text: ': [' },
      { text: "'TypeScript'", color: SYN.string },
      { text: ', ' },
      { text: "'Python'", color: SYN.string },
      { text: ', ' },
      { text: "'OR-Tools'", color: SYN.string },
      { text: ', ' },
      { text: "'TensorFlow'", color: SYN.string },
      { text: '],' },
    ],
  },
  {
    tokens: [
      { text: '  mission', color: SYN.prop },
      { text: ': ' },
      { text: '() => ', color: SYN.keyword },
      { text: "'AI 와 이커머스로 따뜻하고 지능적인 일상을 만든다'", color: SYN.string },
      { text: ',' },
    ],
  },
  {
    tokens: [
      { text: '  shipping', color: SYN.prop },
      { text: ': ' },
      { text: 'true', color: SYN.keyword },
      { text: ',  ' },
      { text: '// 24/7', color: SYN.comment },
    ],
  },
  { tokens: [{ text: '} as const' }] },
]

// ── 가짜 contribution heatmap (52주 x 7일, deterministic) ─────
function buildHeatmap() {
  // deterministic pseudo-random — i*73 % 100 같은 식
  const cells: number[] = []
  for (let i = 0; i < 52 * 7; i++) {
    const v = (i * 31 + (i % 7) * 11) % 100
    // 0-25: lvl0, 25-50: lvl1, 50-75: lvl2, 75-90: lvl3, 90-100: lvl4
    if (v < 30) cells.push(0)
    else if (v < 55) cells.push(1)
    else if (v < 75) cells.push(2)
    else if (v < 90) cells.push(3)
    else cells.push(4)
  }
  return cells
}

const HEATMAP_LEVELS = [
  '#161b22', // 0
  '#0e4429', // 1
  '#006d32', // 2
  '#26a641', // 3
  '#39d353', // 4
]

// ── 메인 ─────────────────────────────────────────────────
export default function JaewonPage() {
  const heatmap = React.useMemo(() => buildHeatmap(), [])
  const totalContribs = heatmap.reduce((s, v) => s + v * 50, 0)

  return (
    <div className="jaewon min-h-screen text-[#c9d1d9]" style={{ background: BG }}>
      {/* ====== IDE Title Bar ====== */}
      <div
        className="border-b px-3 py-2 sm:px-4"
        style={{ background: BG_ELEV, borderColor: BORDER }}
      >
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="flex gap-1.5">
              <span className="h-3 w-3 rounded-full bg-[#ff5f57]" />
              <span className="h-3 w-3 rounded-full bg-[#febc2e]" />
              <span className="h-3 w-3 rounded-full bg-[#28c840]" />
            </span>
            <span className="ml-2 hidden font-mono text-[11px] text-[#8b949e] sm:inline">
              gabriel@rangu-fam: ~/portfolio
            </span>
          </div>
          <Link
            href="https://rangu-fam.com"
            className="inline-flex items-center gap-1 font-mono text-[11px] text-[#8b949e] transition hover:text-[#58a6ff]"
          >
            ← rangu.fam
          </Link>
        </div>
      </div>

      {/* ====== Hero — 코드 블록 + 사이드 정보 ====== */}
      <section className="border-b px-3 py-10 sm:px-6 sm:py-16" style={{ borderColor: BORDER }}>
        <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[1.1fr_1fr] lg:items-start lg:gap-12">
          {/* 좌측 — 코드 블록 */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <CodeWindow filename="gabriel.ts" lines={HERO_CODE_LINES} />
          </motion.div>

          {/* 우측 — 인삿말 + 메타 */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="space-y-5"
          >
            <p className="font-mono text-xs uppercase tracking-[0.3em] text-[#3fb950]">
              <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-[#3fb950]" />
              {' '}member · jaewon · R27
            </p>
            <h1 className="text-4xl font-black tracking-tight sm:text-5xl md:text-6xl">
              <span className="text-[#c9d1d9]">정재원</span>
              <span className="ml-3 text-3xl font-light italic text-[#8b949e] sm:text-4xl">
                Gabriel
              </span>
            </h1>
            <p className="text-base leading-relaxed text-[#c9d1d9]/80 sm:text-lg">
              <strong className="text-white">DoubleJ Co-founder · CEO</strong>.
              풀스택 엔지니어 겸 AI 연구자.
              <br className="hidden sm:block" />
              {' '}Oniv · Timora · DoubleJ Platform · 이랑위키 — 모든 제품 라인의 아키텍처와 핵심 알고리즘을 직접 짭니다.
            </p>

            <div className="grid grid-cols-2 gap-3">
              {STATS.map((s, i) => (
                <motion.div
                  key={s.label}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.2 + i * 0.05 }}
                  className="rounded-md border p-3"
                  style={{ background: BG_ELEV, borderColor: BORDER }}
                >
                  <p
                    className="font-mono text-2xl font-semibold tabular-nums"
                    style={{ color: TONE_TEXT[s.tone] }}
                  >
                    {s.value}
                  </p>
                  <p className="mt-0.5 text-[11px] text-[#8b949e]">{s.label}</p>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* ====== Tech Stack ====== */}
      <section className="border-b px-3 py-12 sm:px-6 sm:py-16" style={{ borderColor: BORDER }}>
        <div className="mx-auto max-w-6xl">
          <SectionHeader command="$ cat tech-stack.json" title="Tech Stack" />
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
            {TECH_STACK.map((t, i) => {
              const tone = TECH_TONES[t.tone]
              return (
                <motion.div
                  key={t.name}
                  initial={{ opacity: 0, scale: 0.95 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true, margin: '-40px' }}
                  transition={{ duration: 0.3, delay: i * 0.03 }}
                  className="rounded-md border px-3 py-2.5 transition hover:scale-[1.02]"
                  style={{
                    background: tone.bg,
                    borderColor: tone.border,
                  }}
                >
                  <p className="font-mono text-sm font-medium" style={{ color: tone.text }}>
                    {t.name}
                  </p>
                </motion.div>
              )
            })}
          </div>
        </div>
      </section>

      {/* ====== Projects ====== */}
      <section className="border-b px-3 py-12 sm:px-6 sm:py-16" style={{ borderColor: BORDER }}>
        <div className="mx-auto max-w-6xl">
          <SectionHeader command="$ ls projects/" title="Projects" />
          <div className="grid gap-4 md:grid-cols-2">
            {PROJECTS.map((p, i) => (
              <motion.div
                key={p.name}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-40px' }}
                transition={{ duration: 0.4, delay: i * 0.05 }}
                className="group relative overflow-hidden rounded-lg border p-5 transition hover:border-[#58a6ff]/60"
                style={{ background: BG_ELEV, borderColor: BORDER }}
              >
                {/* 좌측 컬러 stripe */}
                <span
                  className="absolute bottom-0 left-0 top-0 w-1"
                  style={{
                    background: p.status === 'live' ? ACC_GREEN : ACC_ORANGE,
                  }}
                />

                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex flex-wrap items-center gap-2">
                      {p.href ? (
                        <a
                          href={p.href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-lg font-bold text-white transition hover:text-[#58a6ff]"
                        >
                          {p.name}
                        </a>
                      ) : (
                        <span className="text-lg font-bold text-white">{p.name}</span>
                      )}
                      <span
                        className="rounded-sm px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-widest"
                        style={{
                          background: p.status === 'live' ? 'rgba(63,185,80,0.15)' : 'rgba(255,158,100,0.15)',
                          color: p.status === 'live' ? ACC_GREEN : ACC_ORANGE,
                        }}
                      >
                        {p.status === 'live' ? '● live' : '○ pilot'}
                      </span>
                    </div>
                    <p className="font-mono text-[11px] text-[#8b949e]">{p.role}</p>
                  </div>
                </div>
                <p className="mt-3 text-sm leading-relaxed text-[#c9d1d9]/80">{p.desc}</p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {p.stack.map((s) => (
                    <span
                      key={s}
                      className="rounded-sm border px-1.5 py-0.5 font-mono text-[10px]"
                      style={{ background: BG_INPUT, borderColor: BORDER, color: '#8b949e' }}
                    >
                      {s}
                    </span>
                  ))}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ====== Contribution Heatmap ====== */}
      <section className="border-b px-3 py-12 sm:px-6 sm:py-16" style={{ borderColor: BORDER }}>
        <div className="mx-auto max-w-6xl">
          <SectionHeader command="$ git log --since='1 year ago' | wc -l" title="Activity" />
          <div
            className="rounded-lg border p-4 sm:p-6"
            style={{ background: BG_ELEV, borderColor: BORDER }}
          >
            <div className="mb-3 flex items-baseline justify-between gap-2">
              <p className="text-sm text-[#c9d1d9]">
                <span className="font-mono text-xl font-semibold text-[#3fb950]">
                  {totalContribs.toLocaleString()}
                </span>{' '}
                <span className="text-[#8b949e]">contributions in the last year</span>
              </p>
              <p className="hidden text-[10px] font-mono text-[#8b949e] sm:block">
                — visualization · pseudo-randomized
              </p>
            </div>

            <div className="overflow-x-auto pb-2">
              <div className="inline-grid grid-flow-col grid-rows-7 gap-[3px]">
                {heatmap.map((lvl, i) => (
                  <div
                    key={i}
                    className="h-3 w-3 rounded-[2px] transition-transform hover:scale-150"
                    style={{ background: HEATMAP_LEVELS[lvl] }}
                    title={`Level ${lvl}`}
                  />
                ))}
              </div>
            </div>

            <div className="mt-3 flex items-center justify-end gap-1.5 text-[10px] text-[#8b949e]">
              <span>Less</span>
              {HEATMAP_LEVELS.map((c, i) => (
                <span
                  key={i}
                  className="block h-3 w-3 rounded-[2px]"
                  style={{ background: c }}
                />
              ))}
              <span>More</span>
            </div>
          </div>
        </div>
      </section>

      {/* ====== Contact / Terminal ====== */}
      <section className="px-3 py-12 sm:px-6 sm:py-16">
        <div className="mx-auto max-w-3xl">
          <SectionHeader command="$ contact --info" title="Contact" />
          <div
            className="rounded-lg border font-mono text-sm"
            style={{ background: BG_ELEV, borderColor: BORDER }}
          >
            <div
              className="border-b px-4 py-2 text-xs text-[#8b949e]"
              style={{ borderColor: BORDER }}
            >
              terminal — bash
            </div>
            <div className="space-y-2 p-4 sm:p-5">
              {CONTACT.map((c, i) => (
                <div key={c.label} className="flex flex-wrap gap-3">
                  <span className="text-[#3fb950]">→</span>
                  <span style={{ color: SYN.prop }}>{c.label.padEnd(7)}</span>
                  <span className="text-[#8b949e]">=</span>
                  <a
                    href={c.href}
                    target={c.href.startsWith('http') ? '_blank' : undefined}
                    rel={c.href.startsWith('http') ? 'noopener noreferrer' : undefined}
                    className="break-all transition hover:underline"
                    style={{ color: SYN.string }}
                  >
                    &quot;{c.value}&quot;
                  </a>
                </div>
              ))}
              <div className="pt-2">
                <span className="text-[#3fb950]">gabriel</span>
                <span className="text-[#c9d1d9]">@</span>
                <span className="text-[#58a6ff]">doublej</span>
                <span className="text-[#c9d1d9]">:~$ </span>
                <BlinkingCursor />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ====== Footer ====== */}
      <footer
        className="border-t px-3 py-6 text-center font-mono text-[11px] text-[#8b949e] sm:px-6"
        style={{ borderColor: BORDER }}
      >
        © {new Date().getFullYear()} Jung Jae-Won (Gabriel) · Built with{' '}
        <span className="text-[#ff7b72]">love</span> and{' '}
        <span className="text-[#58a6ff]">code</span> · part of{' '}
        <a
          href="https://rangu-fam.com"
          className="text-[#58a6ff] hover:underline"
        >
          rangu.fam
        </a>
      </footer>

      <style jsx global>{`
        .jaewon {
          font-family: 'Pretendard', -apple-system, system-ui, sans-serif;
          letter-spacing: -0.005em;
        }
        .jaewon .font-mono,
        .jaewon code,
        .jaewon pre {
          font-family: 'JetBrains Mono', 'Fira Code', ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
          letter-spacing: 0;
        }
        @keyframes blink-caret {
          0%, 49% { opacity: 1; }
          50%, 100% { opacity: 0; }
        }
        .jaewon .blinking-caret {
          animation: blink-caret 1s steps(1) infinite;
        }
      `}</style>
    </div>
  )
}

// ── 톤 텍스트 매핑 ───────────────────────────────────────
const TONE_TEXT = {
  blue: ACC_BLUE,
  green: ACC_GREEN,
  purple: ACC_PURPLE,
  orange: ACC_ORANGE,
} as const

// ── 코드 윈도우 (IDE 카드) ──────────────────────────────
function CodeWindow({
  filename,
  lines,
}: {
  filename: string
  lines: Array<{ tokens: Array<{ text: string; color?: string }> }>
}) {
  return (
    <div
      className="overflow-hidden rounded-lg border shadow-2xl shadow-black/40"
      style={{ background: BG_ELEV, borderColor: BORDER }}
    >
      {/* tab bar */}
      <div
        className="flex items-center justify-between border-b"
        style={{ borderColor: BORDER }}
      >
        <div className="flex">
          <div
            className="flex items-center gap-2 border-r px-4 py-2 text-xs"
            style={{ background: BG, borderColor: BORDER }}
          >
            <span className="text-[#58a6ff]">{'{}'}</span>
            <span className="font-mono text-[#c9d1d9]">{filename}</span>
            <span className="ml-1 inline-block h-1.5 w-1.5 rounded-full bg-[#3fb950]" />
          </div>
        </div>
        <div className="px-4 font-mono text-[10px] text-[#8b949e]">TypeScript · UTF-8</div>
      </div>

      {/* code */}
      <div className="relative flex font-mono text-[13px] leading-[1.7]" style={{ background: BG }}>
        {/* line numbers */}
        <div
          className="select-none border-r py-4 text-right"
          style={{
            background: BG_ELEV,
            borderColor: BORDER,
            color: '#6e7681',
          }}
        >
          {lines.map((_, i) => (
            <div key={i} className="px-3">
              {i + 1}
            </div>
          ))}
        </div>
        {/* content */}
        <div className="overflow-x-auto py-4 pl-3 pr-4">
          {lines.map((line, i) => (
            <div key={i} className="whitespace-pre">
              {line.tokens.map((tk, j) => (
                <span key={j} style={{ color: tk.color || TXT }}>
                  {tk.text}
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── 섹션 헤더 ──────────────────────────────────────────
function SectionHeader({ command, title }: { command: string; title: string }) {
  return (
    <div className="mb-6">
      <p className="font-mono text-[11px] text-[#8b949e]">{command}</p>
      <h2 className="mt-1 text-2xl font-bold tracking-tight text-white sm:text-3xl">{title}</h2>
    </div>
  )
}

// ── 깜빡이는 커서 ──────────────────────────────────────
function BlinkingCursor() {
  return <span className="blinking-caret inline-block w-2 bg-[#c9d1d9] align-middle">_</span>
}
