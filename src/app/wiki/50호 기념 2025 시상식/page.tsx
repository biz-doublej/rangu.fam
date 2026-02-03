'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { AnimatePresence, motion, PanInfo } from 'framer-motion'
import { ArrowLeft, ChevronLeft, ChevronRight, Crown, Medal, Quote, Sparkles } from 'lucide-react'
import { workshopAward2025 } from '@/data/wikiWorkshopAward'

export default function WorkshopCeremony2025Page() {
  const awards = workshopAward2025.awards
  const [currentIndex, setCurrentIndex] = useState(0)
  const [direction, setDirection] = useState(1)

  useEffect(() => {
    if (awards.length <= 1) return

    const timer = setInterval(() => {
      setDirection(1)
      setCurrentIndex((prev) => (prev + 1) % awards.length)
    }, 4200)

    return () => clearInterval(timer)
  }, [awards.length])

  const goToPrev = () => {
    setDirection(-1)
    setCurrentIndex((prev) => (prev - 1 + awards.length) % awards.length)
  }

  const goToNext = () => {
    setDirection(1)
    setCurrentIndex((prev) => (prev + 1) % awards.length)
  }

  const goToIndex = (index: number) => {
    if (index === currentIndex) return
    setDirection(index > currentIndex ? 1 : -1)
    setCurrentIndex(index)
  }

  const handleDragEnd = (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    const threshold = 70
    if (info.offset.x <= -threshold) {
      goToNext()
    } else if (info.offset.x >= threshold) {
      goToPrev()
    }
  }

  const currentAward = awards[currentIndex]

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(245,158,11,0.22),_transparent_42%),radial-gradient(circle_at_85%_10%,_rgba(34,211,238,0.14),_transparent_42%),#020617] text-gray-100">
      <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
        <section className="relative overflow-hidden rounded-3xl border border-amber-300/40 bg-slate-900/70 p-7 shadow-[0_25px_90px_-35px_rgba(245,158,11,0.6)]">
          <div className="absolute -top-16 -right-8 h-44 w-44 rounded-full bg-amber-400/20 blur-3xl" />
          <div className="absolute -bottom-20 -left-10 h-52 w-52 rounded-full bg-cyan-400/10 blur-3xl" />
          <div className="relative space-y-4">
            <Link
              href="/wiki/workshop"
              className="inline-flex items-center gap-2 rounded-full border border-slate-700 bg-slate-900/80 px-3 py-1 text-xs text-gray-300 hover:text-white"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              작업공작소 목록으로
            </Link>
            <p className="inline-flex items-center gap-2 rounded-full border border-amber-300/40 bg-amber-500/15 px-3 py-1 text-xs uppercase tracking-[0.2em] text-amber-100">
              <Sparkles className="h-3.5 w-3.5" />
              ceremony
            </p>
            <h1 className="text-3xl font-semibold text-white sm:text-4xl">{workshopAward2025.ceremonyTitle}</h1>
            <p className="text-sm text-gray-300">
              오늘의 발언 아카이브 50호를 기념해 선정한 2025 시상식 페이지입니다.
            </p>
          </div>
        </section>

        <section className="mt-6 rounded-3xl border border-amber-400/35 bg-gradient-to-r from-amber-500/20 via-yellow-500/10 to-transparent p-6">
          <p className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-amber-100">
            <Crown className="h-4 w-4" />
            올해의 발언인
          </p>
          <div className="mt-3 flex flex-wrap items-end gap-3">
            <p className="text-3xl font-bold text-white">{workshopAward2025.winner.name}</p>
            <p className="text-sm text-amber-100/90">{workshopAward2025.year} · {workshopAward2025.winner.issueLabel}</p>
          </div>
          <p className="mt-4 text-lg font-medium leading-relaxed text-gray-100">“{workshopAward2025.winner.quote}”</p>
        </section>

        <section className="mt-6 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm text-gray-300">
              전체 발언 목록 · 자동 스와이프 ({currentIndex + 1}/{awards.length})
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={goToPrev}
                className="rounded-full border border-slate-700 bg-slate-900/80 p-2 text-gray-300 hover:text-white"
                aria-label="이전 수상 내역"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={goToNext}
                className="rounded-full border border-slate-700 bg-slate-900/80 p-2 text-gray-300 hover:text-white"
                aria-label="다음 수상 내역"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="relative overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
            <AnimatePresence mode="wait" custom={direction} initial={false}>
              <motion.article
                key={currentAward.category}
                custom={direction}
                variants={{
                  enter: (d: number) => ({ x: d > 0 ? 100 : -100, opacity: 0 }),
                  center: { x: 0, opacity: 1 },
                  exit: (d: number) => ({ x: d > 0 ? -100 : 100, opacity: 0 })
                }}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.35, ease: 'easeInOut' }}
                drag="x"
                dragConstraints={{ left: 0, right: 0 }}
                dragElastic={0.8}
                onDragEnd={handleDragEnd}
              >
                <p className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.16em] text-amber-100">
                  <Medal className="h-4 w-4 text-amber-300" />
                  [{currentAward.category}]
                </p>
                <p className="mt-3 text-lg font-semibold text-white">
                  {currentAward.issueLabel} - {currentAward.speaker}
                </p>
                <div className="mt-3 space-y-2">
                  {currentAward.quotes.map((quote) => (
                    <p key={`${currentAward.category}-${quote}`} className="flex items-start gap-2 text-sm leading-relaxed text-gray-200">
                      <Quote className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-300" />
                      <span>&quot; {quote} &quot;</span>
                    </p>
                  ))}
                </div>
              </motion.article>
            </AnimatePresence>
          </div>

          <div className="flex flex-wrap gap-2">
            {awards.map((award, index) => (
              <button
                key={award.category}
                type="button"
                onClick={() => goToIndex(index)}
                className={`rounded-full border px-3 py-1 text-xs transition-colors ${
                  index === currentIndex
                    ? 'border-amber-300/60 bg-amber-500/20 text-amber-100'
                    : 'border-slate-700 bg-slate-900/80 text-gray-400 hover:text-gray-200'
                }`}
              >
                {index + 1}
              </button>
            ))}
          </div>
        </section>

        <section className="mt-6 rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
          <p className="text-sm leading-relaxed text-gray-200">
            {workshopAward2025.closingMessage}
          </p>
        </section>
      </main>
    </div>
  )
}
