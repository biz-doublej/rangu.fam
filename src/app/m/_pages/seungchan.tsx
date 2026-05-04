'use client'

/**
 * 이승찬 — 마술 / 헨더랜드 무드 (Crayon Shin-chan: Henderland Adventure).
 *
 * 톤: 어두운 보라 무대 + 황금 + 핫핑크 sparkle, 서커스/카니발 레트로,
 *     마법진·플레잉카드·실크햇·페리스휠 모티프.
 */

import React, { useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { Sparkles } from 'lucide-react'
import Link from 'next/link'

const MAGIC_TRICKS = [
  { name: 'Coin Across', tag: '근접', desc: '한 손에서 다른 손으로 사라지는 동전' },
  { name: 'Ambitious Card', tag: '카드', desc: '서명한 카드가 항상 맨 위로' },
  { name: 'Cup & Balls', tag: '클래식', desc: '컵 사이를 오가는 공의 이동' },
  { name: 'Mind Reader', tag: '멘탈', desc: '관객이 떠올린 카드를 찾기' },
  { name: 'Levitation', tag: '스테이지', desc: '카드와 작은 물건의 부양' },
  { name: 'Henderland Trick', tag: '오리지널', desc: '핸더랜드에서 영감 받은 트릭' },
]

const PARK_AREAS = [
  { id: 'stage', name: 'Main Stage', desc: '오프닝 + 스테이지 트릭', color: '#ff4d8d', emoji: '🎩' },
  { id: 'card-hall', name: 'Card Hall', desc: '플레잉카드 트릭 모음', color: '#d4a017', emoji: '🃏' },
  { id: 'mind-parlor', name: 'Mind Parlor', desc: '멘탈리즘 + 마인드리딩', color: '#9b59b6', emoji: '🔮' },
  { id: 'illusion-grove', name: 'Illusion Grove', desc: '일루전 + 부양', color: '#2dd4bf', emoji: '✨' },
]

export default function SeungchanPage() {
  return (
    <div className="seungchan min-h-screen overflow-hidden text-[#fff8e7]">
      {/* ===== Background layers ===== */}
      <div className="pointer-events-none fixed inset-0 -z-10">
        {/* base radial */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,#3a1d63_0%,#1a0b2e_55%,#0c0518_100%)]" />
        {/* curtain texture */}
        <div className="absolute inset-0 opacity-30 mix-blend-overlay bg-[repeating-linear-gradient(90deg,transparent_0,transparent_28px,rgba(139,26,26,0.18)_28px,rgba(139,26,26,0.18)_30px)]" />
        {/* gold smoke pools */}
        <div className="absolute -top-40 left-1/4 h-[500px] w-[500px] rounded-full bg-[#d4a017] opacity-15 blur-[180px]" />
        <div className="absolute bottom-0 right-1/4 h-[400px] w-[400px] rounded-full bg-[#ff4d8d] opacity-15 blur-[160px]" />

        {/* twinkling stars — SSR/CSR 동일 출력. animation 은 CSS @media 로 reduce motion 처리. */}
        {Array.from({ length: 28 }).map((_, i) => {
          const left = (i * 137) % 100
          const top = (i * 73) % 100
          const delay = (i * 0.31) % 4
          const size = 1 + ((i * 7) % 3)
          return (
            <span
              key={i}
              className="twinkle-star absolute rounded-full bg-white"
              style={{
                left: `${left}%`,
                top: `${top}%`,
                width: size,
                height: size,
                animationDelay: `${delay}s`,
                boxShadow: '0 0 6px #ffd700',
              }}
            />
          )
        })}
      </div>

      {/* ===== Top bar ===== */}
      <header className="relative z-10 mx-auto flex max-w-6xl items-center justify-between px-6 py-6 text-sm">
        <Link href="https://rangu-fam.com" className="opacity-80 hover:opacity-100 transition">
          ← rangu.fam
        </Link>
        <span className="font-serif italic tracking-[0.3em] text-[#d4a017]">
          ✦ HENDERLAND HALL ✦
        </span>
        <span className="opacity-50">vol. 27</span>
      </header>

      {/* ===== Hero / Curtain ===== */}
      <section className="relative z-10 mx-auto max-w-6xl px-6 pb-16 pt-8">
        <CurtainHero />
      </section>

      {/* ===== About ===== */}
      <section className="relative z-10 mx-auto max-w-3xl px-6 py-20 text-center">
        <p className="font-serif text-sm italic tracking-[0.4em] text-[#ff4d8d]">act i — meet the magician</p>
        <h2 className="mt-4 font-serif text-4xl">
          이승찬, <span className="text-[#d4a017]">마술사</span>.
        </h2>
        <p className="mt-6 leading-loose text-[#fff8e7]/80">
          무대 위에서 가장 행복한 사람.
          핸더랜드의 회전목마처럼 끝없이 도는 카드와 동전.
          한 번의 트릭이 사람들의 입을 다물게 만드는 그 순간을 위해 살아갑니다.
        </p>
        <p className="mt-3 caveat text-2xl text-[#ff4d8d]">
          — Welcome to my carnival —
        </p>
      </section>

      {/* ===== Signature Tricks (playing cards) ===== */}
      <section className="relative z-10 mx-auto max-w-6xl px-6 py-20">
        <div className="mb-12 text-center">
          <p className="font-serif text-sm italic tracking-[0.4em] text-[#ff4d8d]">act ii — signature tricks</p>
          <h2 className="mt-4 font-serif text-4xl">시그니처 트릭</h2>
        </div>

        <div className="grid grid-cols-2 gap-6 md:grid-cols-3">
          {MAGIC_TRICKS.map((t, i) => (
            <PlayingCard key={t.name} trick={t} index={i} />
          ))}
        </div>
      </section>

      {/* ===== Henderland Park Map ===== */}
      <section className="relative z-10 mx-auto max-w-6xl px-6 py-20">
        <div className="mb-12 text-center">
          <p className="font-serif text-sm italic tracking-[0.4em] text-[#ff4d8d]">act iii — henderland map</p>
          <h2 className="mt-4 font-serif text-4xl">놀이공원 지도</h2>
          <p className="mt-3 text-sm text-[#fff8e7]/60">각 구역마다 다른 마술이 펼쳐집니다</p>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {PARK_AREAS.map((area, i) => (
            <ParkArea key={area.id} area={area} index={i} />
          ))}
        </div>

        {/* Ferris wheel SVG decoration */}
        <div className="pointer-events-none absolute right-0 top-0 hidden opacity-20 md:block">
          <FerrisWheel />
        </div>
      </section>

      {/* ===== CTA / Booking ===== */}
      <section className="relative z-10 mx-auto max-w-3xl px-6 py-24 text-center">
        <p className="font-serif text-sm italic tracking-[0.4em] text-[#ff4d8d]">act iv — invitation</p>
        <h2 className="mt-4 font-serif text-4xl">공연을 보러 오세요</h2>
        <p className="mt-4 text-[#fff8e7]/70">
          마술 상담 · 출연 문의 · 단순 인사도 환영합니다.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <a
            href="mailto:seungchan@rangu-fam.com"
            className="inline-flex items-center gap-2 rounded-full bg-[#d4a017] px-6 py-3 font-serif text-[#1a0b2e] transition hover:bg-[#ffd700]"
          >
            ✉ 메시지 보내기
          </a>
          <Link
            href="https://rangu-fam.com"
            className="inline-flex items-center gap-2 rounded-full border border-[#d4a017]/60 px-6 py-3 font-serif text-[#d4a017] transition hover:bg-[#d4a017]/10"
          >
            ← 메인으로 돌아가기
          </Link>
        </div>
      </section>

      {/* ===== Footer ===== */}
      <footer className="relative z-10 mx-auto max-w-6xl px-6 py-10 text-center text-xs opacity-50">
        <p className="font-serif italic tracking-[0.3em]">
          ✧ ✦ a magic page on rangu.fam ✦ ✧
        </p>
      </footer>

      {/* Scoped styles */}
      <style jsx>{`
        .seungchan {
          font-family: 'Pretendard', system-ui, sans-serif;
        }
        .seungchan :global(.font-serif) {
          font-family: 'Gowun Batang', 'Playfair Display', serif;
        }
        .seungchan :global(.twinkle-star) {
          animation: magic-twinkle 3s ease-in-out infinite;
        }
        .seungchan :global(.magic-circle-glow) {
          filter: drop-shadow(0 0 12px rgba(212, 160, 23, 0.45));
          animation: circle-pulse 4s ease-in-out infinite;
        }
        .seungchan :global(.park-sparkle) {
          animation: sparkle-spin 3s ease-in-out infinite;
        }
        .seungchan :global(.park-sparkle-2) {
          animation: sparkle-spin 4s ease-in-out infinite reverse;
        }
        @media (prefers-reduced-motion: reduce) {
          .seungchan :global(.twinkle-star),
          .seungchan :global(.magic-circle-glow),
          .seungchan :global(.park-sparkle),
          .seungchan :global(.park-sparkle-2) {
            animation: none;
          }
        }
        @keyframes magic-twinkle {
          0%, 100% { opacity: 0.3; transform: scale(0.8); }
          50% { opacity: 1; transform: scale(1.2); }
        }
        @keyframes circle-pulse {
          0%, 100% { filter: drop-shadow(0 0 8px rgba(212, 160, 23, 0.4)); }
          50% { filter: drop-shadow(0 0 24px rgba(255, 215, 0, 0.7)); }
        }
        @keyframes sparkle-spin {
          0%, 100% { transform: rotate(0deg) scale(1); }
          50% { transform: rotate(180deg) scale(1.3); }
        }
        @keyframes float-card {
          0%, 100% { transform: translateY(0px) rotate(var(--card-rot, 0deg)); }
          50% { transform: translateY(-8px) rotate(var(--card-rot, 0deg)); }
        }
      `}</style>
    </div>
  )
}

// ─────────────── Sub components ───────────────

function CurtainHero() {
  const reduce = useReducedMotion()
  return (
    <div className="relative">
      {/* curtain frames left & right */}
      <motion.div
        initial={{ x: 0 }}
        animate={{ x: '-30%' }}
        transition={{ duration: reduce ? 0 : 1.6, ease: [0.65, 0, 0.35, 1] }}
        className="pointer-events-none absolute -left-12 top-0 hidden h-[420px] w-[40%] origin-left md:block"
        style={{
          background:
            'repeating-linear-gradient(180deg, #5a0d0d 0 18px, #8b1a1a 18px 36px)',
          clipPath: 'polygon(0 0, 100% 0, 70% 100%, 0 100%)',
          boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
        }}
      />
      <motion.div
        initial={{ x: 0 }}
        animate={{ x: '30%' }}
        transition={{ duration: reduce ? 0 : 1.6, ease: [0.65, 0, 0.35, 1] }}
        className="pointer-events-none absolute -right-12 top-0 hidden h-[420px] w-[40%] origin-right md:block"
        style={{
          background:
            'repeating-linear-gradient(180deg, #5a0d0d 0 18px, #8b1a1a 18px 36px)',
          clipPath: 'polygon(0 0, 100% 0, 100% 100%, 30% 100%)',
          boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
        }}
      />

      {/* center content */}
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: reduce ? 0 : 0.9, delay: reduce ? 0 : 1.0 }}
        className="relative z-10 mx-auto max-w-2xl text-center"
      >
        <p className="font-serif text-sm italic tracking-[0.5em] text-[#ff4d8d]">
          ✦ tonight ✦
        </p>
        <h1 className="mt-4 font-serif text-7xl tracking-tight md:text-8xl">
          <span className="block text-[#fff8e7]">SEUNGCHAN</span>
          <span className="mt-2 block text-3xl italic text-[#d4a017] md:text-4xl">
            the magician
          </span>
        </h1>

        {/* magic circle SVG — 천천히 회전 + 글로우 펄스 */}
        <div className="mt-10 flex justify-center">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 60, repeat: Infinity, ease: 'linear' }}
            className="magic-circle-glow"
          >
            <MagicCircle />
          </motion.div>
        </div>

        <p className="mt-8 caveat text-2xl text-[#ff4d8d]">
          step right up — the show begins.
        </p>
      </motion.div>
    </div>
  )
}

function MagicCircle() {
  return (
    <svg width="180" height="180" viewBox="0 0 180 180" fill="none" className="opacity-90">
      {/* outer ring */}
      <circle cx="90" cy="90" r="84" stroke="#d4a017" strokeWidth="1" strokeDasharray="2 4" />
      <circle cx="90" cy="90" r="74" stroke="#d4a017" strokeWidth="0.5" />
      {/* inner pentagram-like star */}
      <path
        d="M90 30 L107 80 L160 80 L117 110 L133 160 L90 130 L47 160 L63 110 L20 80 L73 80 Z"
        stroke="#ffd700"
        strokeWidth="1"
        fill="none"
        opacity="0.7"
      />
      <circle cx="90" cy="90" r="4" fill="#ffd700" />
      {/* radial ticks */}
      {Array.from({ length: 12 }).map((_, i) => {
        const a = (i * 30 * Math.PI) / 180
        const x1 = 90 + Math.cos(a) * 80
        const y1 = 90 + Math.sin(a) * 80
        const x2 = 90 + Math.cos(a) * 86
        const y2 = 90 + Math.sin(a) * 86
        return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#d4a017" strokeWidth="1.5" />
      })}
    </svg>
  )
}

function PlayingCard({ trick, index }: { trick: typeof MAGIC_TRICKS[number]; index: number }) {
  const rot = ((index * 11) % 5) - 2 // small consistent variance per card
  const [flipped, setFlipped] = useState(false)
  const [sparkleKey, setSparkleKey] = useState(0)

  const handleClick = () => {
    setFlipped((v) => !v)
    setSparkleKey((k) => k + 1) // sparkle burst trigger
  }

  // 트릭 카드 뒷면 — 마법사 카드백 패턴 + 비밀 한 줄
  const SECRETS: Record<string, string> = {
    근접: '시야의 사각이 모든 것이다',
    카드: '같은 카드는 두 번 같지 않다',
    클래식: '오래된 트릭은 영원히 새롭다',
    멘탈: '관객의 눈이 답을 알려준다',
    스테이지: '한 호흡, 한 무대',
    오리지널: '핸더랜드에서 온 비밀',
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, rotate: rot }}
      whileInView={{ opacity: 1, y: 0, rotate: rot }}
      viewport={{ once: true, margin: '-50px' }}
      transition={{ duration: 0.5, delay: index * 0.07 }}
      whileHover={{ y: -8, rotate: 0, scale: 1.04 }}
      className="group relative cursor-pointer"
      style={{ '--card-rot': `${rot}deg`, perspective: '1200px' } as React.CSSProperties}
      onClick={handleClick}
    >
      {/* sparkle burst (클릭 시마다 새 키로 재실행) */}
      <SparkleBurst trigger={sparkleKey} />

      {/* 3D flip 컨테이너 */}
      <motion.div
        className="relative h-72"
        animate={{ rotateY: flipped ? 180 : 0 }}
        transition={{ duration: 0.7, ease: [0.4, 0.0, 0.2, 1] }}
        style={{ transformStyle: 'preserve-3d' }}
      >
        {/* ── 앞면 ── */}
        <div
          className="absolute inset-0 overflow-hidden rounded-xl border border-[#d4a017]/40 bg-gradient-to-br from-[#fff8e7] to-[#f5e6c8] p-5 text-[#1a0b2e] shadow-[0_20px_50px_-10px_rgba(0,0,0,0.6)]"
          style={{
            backfaceVisibility: 'hidden',
            WebkitBackfaceVisibility: 'hidden',
            backgroundImage:
              'radial-gradient(circle at 30% 0%, rgba(212,160,23,0.12) 0%, transparent 50%), radial-gradient(circle at 100% 100%, rgba(255,77,141,0.12) 0%, transparent 50%)',
          }}
        >
          <div className="flex items-start justify-between">
            <div className="font-serif text-2xl text-[#8b1a1a]">♠</div>
            <span className="font-serif text-[10px] uppercase tracking-widest text-[#8b1a1a]/70">
              {trick.tag}
            </span>
          </div>

          <div className="mt-6 flex justify-center">
            <div className="font-serif text-7xl text-[#1a0b2e]">♠</div>
          </div>

          <h3 className="mt-6 text-center font-serif text-xl text-[#1a0b2e]">{trick.name}</h3>
          <p className="mt-2 text-center text-xs leading-relaxed text-[#1a0b2e]/70">{trick.desc}</p>

          <div className="absolute bottom-4 right-5 rotate-180 font-serif text-2xl text-[#8b1a1a]">
            ♠
          </div>

          {/* hover 시 골드 테두리 + flip 힌트 */}
          <div className="pointer-events-none absolute inset-0 rounded-xl border-2 border-[#d4a017] opacity-0 transition-opacity group-hover:opacity-100" />
          <div className="pointer-events-none absolute bottom-4 left-5 flex items-center gap-1 text-[10px] text-[#8b1a1a]/50 opacity-0 transition-opacity group-hover:opacity-100">
            <Sparkles className="h-3 w-3" />
            tap to reveal
          </div>
        </div>

        {/* ── 뒷면 — 마법사 카드백 ── */}
        <div
          className="absolute inset-0 flex flex-col items-center justify-center overflow-hidden rounded-xl border border-[#d4a017]/60 p-5 text-center shadow-[0_20px_50px_-10px_rgba(0,0,0,0.7)]"
          style={{
            backfaceVisibility: 'hidden',
            WebkitBackfaceVisibility: 'hidden',
            transform: 'rotateY(180deg)',
            background:
              'radial-gradient(circle at 50% 50%, #3a1d63 0%, #1a0b2e 70%), repeating-linear-gradient(45deg, transparent 0 8px, rgba(212,160,23,0.08) 8px 9px)',
          }}
        >
          {/* 작은 마법진 */}
          <svg width="120" height="120" viewBox="0 0 180 180" fill="none" className="opacity-80">
            <circle cx="90" cy="90" r="84" stroke="#d4a017" strokeWidth="1" strokeDasharray="2 4" />
            <circle cx="90" cy="90" r="60" stroke="#ffd700" strokeWidth="0.6" />
            <path
              d="M90 30 L107 80 L160 80 L117 110 L133 160 L90 130 L47 160 L63 110 L20 80 L73 80 Z"
              stroke="#ffd700"
              strokeWidth="1"
              fill="none"
              opacity="0.6"
            />
            <circle cx="90" cy="90" r="3" fill="#ffd700" />
          </svg>

          <p className="caveat mt-3 text-2xl text-[#d4a017]">★ secret ★</p>
          <p className="mt-2 font-serif text-sm italic leading-relaxed text-[#fff8e7]/80">
            {SECRETS[trick.tag] || '비밀은 손끝에 있다'}
          </p>
          <p className="mt-3 text-[10px] uppercase tracking-widest text-[#fff8e7]/40">
            tap again to flip back
          </p>
        </div>
      </motion.div>
    </motion.div>
  )
}

// 클릭 시 카드 위로 12개 별이 사방으로 퍼지는 폭죽 효과
function SparkleBurst({ trigger }: { trigger: number }) {
  if (trigger === 0) return null
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={trigger}
        className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center"
        initial={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        {Array.from({ length: 12 }).map((_, i) => {
          const angle = ((i * 30) * Math.PI) / 180
          const distance = 100
          const x = Math.cos(angle) * distance
          const y = Math.sin(angle) * distance
          const color = i % 3 === 0 ? '#ffd700' : i % 3 === 1 ? '#ff4d8d' : '#d4a017'
          return (
            <motion.span
              key={i}
              className="absolute h-1.5 w-1.5 rounded-full"
              style={{ background: color, boxShadow: `0 0 8px ${color}` }}
              initial={{ x: 0, y: 0, opacity: 1, scale: 0 }}
              animate={{ x, y, opacity: 0, scale: 1.8 }}
              transition={{ duration: 0.7, ease: [0.2, 0.8, 0.4, 1] }}
            />
          )
        })}
        {/* 중앙 폭발 글로우 */}
        <motion.span
          className="absolute h-16 w-16 rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(255,215,0,0.6) 0%, transparent 70%)' }}
          initial={{ scale: 0, opacity: 1 }}
          animate={{ scale: 2.5, opacity: 0 }}
          transition={{ duration: 0.5 }}
        />
      </motion.div>
    </AnimatePresence>
  )
}

function ParkArea({ area, index }: { area: typeof PARK_AREAS[number]; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: index % 2 === 0 ? -30 : 30 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true, margin: '-50px' }}
      transition={{ duration: 0.6, delay: index * 0.1 }}
      whileHover={{ y: -4 }}
      className="park-area group relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-white/5 to-white/0 p-8 backdrop-blur-sm transition-all hover:border-[#d4a017]/40"
    >
      {/* hover 시 모서리 sparkle */}
      <span
        aria-hidden
        className="park-sparkle pointer-events-none absolute right-3 top-3 text-lg opacity-0 transition-opacity duration-500 group-hover:opacity-100"
        style={{ color: '#ffd700', textShadow: '0 0 8px #ffd700' }}
      >
        ✦
      </span>
      <span
        aria-hidden
        className="park-sparkle-2 pointer-events-none absolute bottom-4 left-4 text-sm opacity-0 transition-opacity duration-700 group-hover:opacity-100"
        style={{ color: '#ff4d8d', textShadow: '0 0 6px #ff4d8d' }}
      >
        ✧
      </span>

      <div
        className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full opacity-30 transition-opacity group-hover:opacity-50"
        style={{ background: `radial-gradient(circle, ${area.color}, transparent 70%)` }}
      />

      <div className="relative">
        <div className="text-5xl">{area.emoji}</div>
        <h3 className="mt-4 font-serif text-2xl text-[#fff8e7]">{area.name}</h3>
        <p className="mt-2 text-sm text-[#fff8e7]/70">{area.desc}</p>
        <div
          className="mt-5 inline-flex items-center gap-2 text-xs font-serif italic"
          style={{ color: area.color }}
        >
          enter — soon
        </div>
      </div>
    </motion.div>
  )
}

function FerrisWheel() {
  return (
    <svg width="200" height="240" viewBox="0 0 200 240" fill="none">
      {/* legs */}
      <line x1="100" y1="120" x2="40" y2="220" stroke="#d4a017" strokeWidth="1" />
      <line x1="100" y1="120" x2="160" y2="220" stroke="#d4a017" strokeWidth="1" />
      <line x1="40" y1="220" x2="160" y2="220" stroke="#d4a017" strokeWidth="1" />
      {/* wheel */}
      <circle cx="100" cy="100" r="80" stroke="#d4a017" strokeWidth="1" fill="none" />
      <circle cx="100" cy="100" r="3" fill="#d4a017" />
      {/* spokes + cars */}
      {Array.from({ length: 8 }).map((_, i) => {
        const a = (i * 45 * Math.PI) / 180
        const x = 100 + Math.cos(a) * 80
        const y = 100 + Math.sin(a) * 80
        return (
          <g key={i}>
            <line x1="100" y1="100" x2={x} y2={y} stroke="#d4a017" strokeWidth="0.8" />
            <rect
              x={x - 6}
              y={y - 4}
              width="12"
              height="8"
              fill="#ff4d8d"
              opacity="0.7"
              stroke="#d4a017"
              strokeWidth="0.5"
            />
          </g>
        )
      })}
    </svg>
  )
}
