'use client'

/**
 * 정민석 — 음악 / 모노크롬 미니멀.
 *
 * 톤: 순흑백 + 미세 silver, 거대한 serif 타이포, vinyl 회전, waveform SVG,
 *     레코드샵/매거진 톤. SoundCloud / Spotify 등 스트리밍 자리만 우선 잡음.
 */

import React from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import Link from 'next/link'

const RELEASES = [
  { id: '01', title: 'Untitled #1', date: '2025.11', kind: 'demo', length: '3:47' },
  { id: '02', title: 'Bloom', date: '2025.09', kind: 'single', length: '4:12' },
  { id: '03', title: 'Late Bus', date: '2025.06', kind: 'single', length: '3:08' },
  { id: '04', title: 'Zürich', date: '2025.03', kind: 'instrumental', length: '5:21' },
  { id: '05', title: 'Coda', date: '2024.11', kind: 'sketch', length: '2:34' },
]

const ROLES = [
  { label: 'Composing', desc: 'piano-led songwriting' },
  { label: 'Lyrics', desc: 'observational, in two languages' },
  { label: 'Producing', desc: 'lo-fi, ambient, indie' },
  { label: 'Mixing', desc: 'in-the-box, headphone-first' },
]

const LINKS = [
  { name: 'SoundCloud', handle: '@minseok', href: '#' },
  { name: 'Spotify', handle: '@minseok-jung', href: '#' },
  { name: 'YouTube', handle: '@minseokmusic', href: '#' },
  { name: 'Instagram', handle: '@minseok.audio', href: '#' },
]

export default function MinseokPage() {
  const reduce = useReducedMotion()

  return (
    <div className="minseok min-h-screen bg-black text-white antialiased">
      {/* film grain overlay */}
      <div
        className="pointer-events-none fixed inset-0 z-50 opacity-[0.06] mix-blend-overlay"
        style={{
          backgroundImage:
            'url("data:image/svg+xml;utf8,<svg xmlns=\'http://www.w3.org/2000/svg\' width=\'120\' height=\'120\'><filter id=\'n\'><feTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'2\' stitchTiles=\'stitch\'/></filter><rect width=\'100%25\' height=\'100%25\' filter=\'url(%23n)\' opacity=\'0.5\'/></svg>")',
        }}
      />

      {/* ===== Top bar ===== */}
      <header className="mx-auto flex max-w-6xl items-center justify-between px-8 pt-8 text-xs uppercase tracking-[0.3em]">
        <Link href="https://rangu-fam.com" className="opacity-50 hover:opacity-100 transition">
          ← rangu.fam
        </Link>
        <span className="opacity-60">side a · vol. 27</span>
        <span className="opacity-30 font-mono">033</span>
      </header>

      {/* ===== Hero ===== */}
      <section className="mx-auto max-w-6xl px-8 pt-32 pb-24">
        <div className="grid gap-16 lg:grid-cols-[1.5fr,1fr] lg:items-center">
          {/* Title */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: reduce ? 0 : 0.9 }}
          >
            <p className="font-serif italic text-zinc-500">vol. 27 — independent musician</p>
            <h1 className="mt-6 font-serif text-[10rem] leading-[0.85] tracking-[-0.04em] md:text-[14rem]">
              TAM<span className="block">PLNAT</span>
            </h1>
            <div className="mt-10 flex items-center gap-4 text-sm">
              <span className="h-px w-16 bg-white" />
              <span className="font-mono uppercase tracking-[0.3em] text-zinc-400">
                composer · lyricist · producer
              </span>
            </div>
          </motion.div>

          {/* Vinyl */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: reduce ? 0 : 1.2, delay: 0.2 }}
            className="relative mx-auto aspect-square w-full max-w-[420px]"
          >
            <Vinyl />
          </motion.div>
        </div>
      </section>

      {/* ===== Roles ===== */}
      <section className="border-t border-zinc-900">
        <div className="mx-auto max-w-6xl px-8 py-24">
          <div className="mb-16 flex items-baseline justify-between">
            <p className="font-mono text-xs uppercase tracking-[0.3em] text-zinc-500">— what i do</p>
            <p className="font-serif italic text-zinc-600">credits</p>
          </div>
          <div className="grid grid-cols-2 gap-px bg-zinc-900 md:grid-cols-4">
            {ROLES.map((r, i) => (
              <motion.div
                key={r.label}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.08 }}
                className="bg-black p-8"
              >
                <p className="font-mono text-xs text-zinc-600">0{i + 1}</p>
                <h3 className="mt-4 font-serif text-3xl">{r.label}</h3>
                <p className="mt-3 text-sm text-zinc-500">{r.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== Discography ===== */}
      <section className="border-t border-zinc-900 bg-zinc-950">
        <div className="mx-auto max-w-6xl px-8 py-24">
          <div className="mb-16">
            <p className="font-mono text-xs uppercase tracking-[0.3em] text-zinc-500">— discography</p>
            <h2 className="mt-4 font-serif text-6xl">recent works</h2>
          </div>

          <div className="divide-y divide-zinc-900 border-t border-b border-zinc-900">
            {RELEASES.map((rel, i) => (
              <motion.div
                key={rel.id}
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.05 }}
                className="group grid cursor-pointer grid-cols-[40px,1fr,auto,80px] items-center gap-6 py-6 transition hover:bg-zinc-900/50"
              >
                <span className="font-mono text-xs text-zinc-600">{rel.id}</span>
                <div>
                  <h3 className="font-serif text-2xl transition group-hover:translate-x-2">
                    {rel.title}
                  </h3>
                  <p className="mt-1 font-mono text-xs uppercase tracking-wider text-zinc-500">
                    {rel.kind} · {rel.date}
                  </p>
                </div>
                <Waveform />
                <span className="text-right font-mono text-sm text-zinc-400">{rel.length}</span>
              </motion.div>
            ))}
          </div>

          <p className="mt-10 font-serif italic text-zinc-500">
            full archive coming — these are recent sketches.
          </p>
        </div>
      </section>

      {/* ===== Listen / Streaming ===== */}
      <section className="border-t border-zinc-900">
        <div className="mx-auto max-w-6xl px-8 py-24">
          <div className="grid gap-16 lg:grid-cols-2 lg:items-end">
            <div>
              <p className="font-mono text-xs uppercase tracking-[0.3em] text-zinc-500">— listen</p>
              <h2 className="mt-4 font-serif text-6xl">find me on</h2>
              <p className="mt-6 max-w-md text-zinc-500">
                현재 SoundCloud + Spotify를 메인 채널로 운영합니다.
                커미션 작업물은 인스타에 짧게 올려요.
              </p>
            </div>
            <ul className="space-y-px bg-zinc-900">
              {LINKS.map((l) => (
                <li key={l.name}>
                  <a
                    href={l.href}
                    className="group flex items-center justify-between bg-black px-6 py-5 transition hover:bg-zinc-950"
                  >
                    <div>
                      <p className="font-serif text-2xl">{l.name}</p>
                      <p className="mt-1 font-mono text-xs text-zinc-500">{l.handle}</p>
                    </div>
                    <span className="font-mono text-xl text-zinc-700 transition group-hover:translate-x-1 group-hover:text-white">
                      →
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* ===== Process / Studio ===== */}
      <section className="border-t border-zinc-900 bg-zinc-950">
        <div className="mx-auto max-w-6xl px-8 py-24">
          <p className="font-mono text-xs uppercase tracking-[0.3em] text-zinc-500">— process</p>
          <h2 className="mt-4 font-serif text-6xl">how a track is born</h2>

          <div className="mt-16 grid gap-12 md:grid-cols-3">
            {[
              { step: '01', title: '메모', desc: 'voice memo · 노트 한 줄' },
              { step: '02', title: '스케치', desc: 'piano + vocal demo' },
              { step: '03', title: '프로덕션', desc: 'arrange · mix · master' },
            ].map((s, i) => (
              <motion.div
                key={s.step}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
              >
                <div className="font-serif text-7xl text-zinc-700">{s.step}</div>
                <h3 className="mt-6 font-serif text-3xl">{s.title}</h3>
                <p className="mt-3 text-sm text-zinc-500">{s.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== Contact ===== */}
      <section className="border-t border-zinc-900">
        <div className="mx-auto max-w-6xl px-8 py-32 text-center">
          <p className="font-mono text-xs uppercase tracking-[0.3em] text-zinc-500">— get in touch</p>
          <h2 className="mt-4 font-serif text-7xl italic">let&apos;s make something.</h2>
          <a
            href="mailto:05alstjr@gmail.com"
            className="mt-12 inline-block border-b border-white pb-1 font-serif text-2xl tracking-wide transition hover:text-zinc-400"
          >
            05alstjr@gmail.com
          </a>
          <div className="mt-16">
            <Link
              href="https://rangu-fam.com"
              className="font-mono text-xs uppercase tracking-[0.3em] text-zinc-500 hover:text-white"
            >
              ← back to rangu.fam
            </Link>
          </div>
        </div>
      </section>

      {/* ===== Footer ===== */}
      <footer className="border-t border-zinc-900">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-8 py-8 font-mono text-xs uppercase tracking-[0.3em] text-zinc-700">
          <span>side b — 2026</span>
          <span>♪ rangu-fam.com / minseok</span>
        </div>
      </footer>

      <style jsx>{`
        .minseok :global(.font-serif) {
          font-family: 'Gowun Batang', 'Playfair Display', serif;
        }
        .minseok :global(.font-mono) {
          font-family: 'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, monospace;
        }
        .minseok :global(.vinyl-disc) {
          animation: spin-vinyl 8s linear infinite;
        }
        @media (prefers-reduced-motion: reduce) {
          .minseok :global(.vinyl-disc) {
            animation: none;
          }
        }
        @keyframes spin-vinyl {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}

function Vinyl() {
  return (
    <div className="relative h-full w-full">
      {/* sleeve */}
      <div className="absolute inset-0 rounded-sm border border-zinc-800 bg-zinc-950 shadow-[0_30px_80px_-20px_rgba(0,0,0,0.9)]" />
      {/* vinyl — animation 은 CSS @media (prefers-reduced-motion) 로 처리 (SSR/CSR 일치) */}
      <div className="vinyl-disc absolute inset-6 rounded-full bg-gradient-to-br from-zinc-900 via-black to-zinc-900">
        {/* grooves */}
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full border border-zinc-800"
            style={{ inset: `${(i + 1) * 6}%` }}
          />
        ))}
        {/* label */}
        <div className="absolute inset-[35%] rounded-full bg-white">
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <p className="font-serif text-[10px] tracking-widest text-black">MIN — SEOK</p>
            <p className="mt-1 font-mono text-[7px] text-zinc-600">side a · 33⅓</p>
          </div>
          {/* center hole */}
          <div className="absolute left-1/2 top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-black" />
        </div>
      </div>
      {/* sleeve cutout indicator */}
      <div className="absolute right-3 top-3 font-mono text-[10px] uppercase tracking-widest text-zinc-700">
        LP · 2026
      </div>
    </div>
  )
}

function Waveform() {
  // deterministic pseudo-random heights so SSR matches client
  const bars = Array.from({ length: 38 }, (_, i) => 4 + (((i * 31) % 17) + ((i * 7) % 11)) % 22)
  return (
    <div className="hidden items-end gap-[2px] sm:flex">
      {bars.map((h, i) => (
        <span
          key={i}
          className="w-[2px] bg-zinc-600 transition-colors group-hover:bg-white"
          style={{ height: `${h}px` }}
        />
      ))}
    </div>
  )
}
