'use client'

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AnimatePresence, motion, PanInfo } from 'framer-motion'
import { CalendarDays, ChevronLeft, ChevronRight, Crown, Medal, Mic2, Quote, Sparkles, Trophy } from 'lucide-react'
import { workshopAward2025 } from '@/data/wikiWorkshopAward'
import { WikiShell, WikiPageHeader } from '@/components/wiki'

export default function WorkshopCeremony2025Page() {
  const router = useRouter()
  const awards = workshopAward2025.awards
  const speech = workshopAward2025.acceptanceSpeech
  const [currentIndex, setCurrentIndex] = useState(0)
  const [direction, setDirection] = useState(1)

  useEffect(() => {
    if (awards.length <= 1) return
    const timer = setInterval(() => {
      setDirection(1)
      setCurrentIndex(prev => (prev + 1) % awards.length)
    }, 4200)
    return () => clearInterval(timer)
  }, [awards.length])

  const goToPrev = () => {
    setDirection(-1)
    setCurrentIndex(prev => (prev - 1 + awards.length) % awards.length)
  }
  const goToNext = () => {
    setDirection(1)
    setCurrentIndex(prev => (prev + 1) % awards.length)
  }
  const goToIndex = (index: number) => {
    if (index === currentIndex) return
    setDirection(index > currentIndex ? 1 : -1)
    setCurrentIndex(index)
  }
  const handleDragEnd = (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    const threshold = 70
    if (info.offset.x <= -threshold) goToNext()
    else if (info.offset.x >= threshold) goToPrev()
  }

  const currentAward = awards[currentIndex]

  return (
    <WikiShell
      activeNav="workshop"
      pageHeader={
        <WikiPageHeader
          title={workshopAward2025.ceremonyTitle}
          subtitle="오늘의 발언 아카이브 50호를 기념해 선정한 2025 시상식 페이지입니다."
          hatnote={
            <>
              자동으로 슬라이드가 넘어가며, 좌우로 드래그하거나 화살표 버튼으로도 이동할 수 있습니다.
            </>
          }
          meta={[
            { label: '연도', value: workshopAward2025.year, icon: Sparkles },
            { label: '수상자', value: workshopAward2025.winner.name, icon: Crown },
            { label: '시상 부문', value: `${awards.length.toLocaleString()}개`, icon: Medal }
          ]}
          actions={
            <button
              type="button"
              onClick={() => router.push('/wiki/workshop')}
              className="inline-flex items-center gap-1 rounded-sm border border-[color:var(--wiki-rule-strong)] bg-[color:var(--wiki-bg-2)] px-2.5 py-1 text-xs text-[color:var(--wiki-ink-soft)] hover:border-[color:var(--wiki-accent)]"
            >
              ← 작업공작소
            </button>
          }
        />
      }
      rightRail={
        <>
          <table className="wiki-infobox">
            <caption>{workshopAward2025.ceremonyTitle}</caption>
            <tbody>
              <tr>
                <th className="text-left">최고 수상자</th>
                <td>{workshopAward2025.winner.name}</td>
              </tr>
              <tr>
                <th className="text-left">대표 회차</th>
                <td>{workshopAward2025.winner.issueLabel}</td>
              </tr>
              <tr>
                <th className="text-left">총 시상 부문</th>
                <td>{awards.length}개</td>
              </tr>
              <tr>
                <th className="text-left">현재 슬라이드</th>
                <td>{currentIndex + 1} / {awards.length}</td>
              </tr>
            </tbody>
          </table>

          <section className="wiki-panel">
            <h4 className="wiki-display text-sm font-semibold flex items-center gap-1.5">
              <Trophy className="w-4 h-4 text-[color:var(--wiki-warning)]" />
              올해의 한 마디
            </h4>
            <blockquote className="mt-2 text-sm text-[color:var(--wiki-ink-soft)] border-l-2 border-[color:var(--wiki-warning)]/60 pl-3 leading-relaxed">
              “{workshopAward2025.winner.quote}”
            </blockquote>
          </section>
        </>
      }
    >
      {/* 올해의 발언인 — 메인 영광 카드 */}
      <section className="relative wiki-panel overflow-hidden mb-5"
        style={{
          background: 'linear-gradient(120deg, rgba(251,191,36,0.10), rgba(244,114,182,0.06) 60%, transparent)',
          borderColor: 'rgba(251,191,36,0.42)'
        }}
      >
        <div className="absolute -top-12 -right-12 h-40 w-40 rounded-full bg-[color:var(--wiki-warning)]/15 blur-3xl pointer-events-none" />
        <div className="relative">
          <p
            className="text-[10px] uppercase tracking-[0.22em] text-[color:var(--wiki-warning)] inline-flex items-center gap-1"
            style={{ fontFamily: "'JetBrains Mono', monospace" }}
          >
            <Crown className="w-3.5 h-3.5" />
            ANNUAL HONORS · {workshopAward2025.year}
          </p>
          <h2
            className="mt-1 text-3xl font-bold text-[color:var(--wiki-ink)]"
            style={{ fontFamily: "'Space Grotesk', 'Pretendard', sans-serif" }}
          >
            {workshopAward2025.winner.name}
          </h2>
          <p className="mt-1 text-sm text-[color:var(--wiki-ink-muted)]">
            {workshopAward2025.year} · {workshopAward2025.winner.issueLabel}
          </p>
          <p className="mt-3 text-base sm:text-lg leading-relaxed text-[color:var(--wiki-ink)]">
            “{workshopAward2025.winner.quote}”
          </p>
        </div>
      </section>

      {/* 수상 소감 */}
      <section
        className="relative wiki-panel overflow-hidden mb-5"
        style={{
          background: 'linear-gradient(135deg, rgba(34,211,238,0.06), rgba(167,139,250,0.05) 70%, transparent)',
          borderColor: 'rgba(34,211,238,0.32)'
        }}
      >
        <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
          <h3 className="wiki-display text-sm font-semibold flex items-center gap-1.5">
            <Mic2 className="w-4 h-4 text-[color:var(--wiki-cyan)]" />
            수상 소감
          </h3>
          <span
            className="text-[11px] text-[color:var(--wiki-ink-muted)] inline-flex items-center gap-1"
            style={{ fontFamily: "'JetBrains Mono', monospace" }}
          >
            <CalendarDays className="w-3 h-3" />
            {speech.deliveredAtLabel}
          </span>
        </div>
        <p
          className="text-base font-semibold text-[color:var(--wiki-ink)]"
          style={{ fontFamily: "'Space Grotesk', 'Pretendard', sans-serif" }}
        >
          {speech.speakerName}{' '}
          <span className="text-xs font-normal text-[color:var(--wiki-ink-muted)]">
            ({speech.speakerNameLatin})
          </span>
        </p>
        <blockquote className="mt-3 border-l-2 border-[color:var(--wiki-cyan)]/55 pl-3 space-y-2 text-sm leading-relaxed text-[color:var(--wiki-ink-soft)]">
          {speech.paragraphs.map((paragraph, idx) => (
            <p key={idx}>{paragraph}</p>
          ))}
        </blockquote>
      </section>

      {/* 슬라이드 캐러셀 */}
      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p
            className="text-[11px] uppercase tracking-[0.2em] text-[color:var(--wiki-ink-muted)]"
            style={{ fontFamily: "'JetBrains Mono', monospace" }}
          >
            {`// 시상 부문 · ${currentIndex + 1} / ${awards.length}`}
          </p>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={goToPrev}
              className="inline-flex h-7 w-7 items-center justify-center rounded-sm border border-[color:var(--wiki-rule-strong)] bg-[color:var(--wiki-bg-2)] text-[color:var(--wiki-ink-soft)] hover:border-[color:var(--wiki-accent)] hover:text-[color:var(--wiki-cyan)]"
              aria-label="이전 수상 내역"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={goToNext}
              className="inline-flex h-7 w-7 items-center justify-center rounded-sm border border-[color:var(--wiki-rule-strong)] bg-[color:var(--wiki-bg-2)] text-[color:var(--wiki-ink-soft)] hover:border-[color:var(--wiki-accent)] hover:text-[color:var(--wiki-cyan)]"
              aria-label="다음 수상 내역"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <div className="relative wiki-panel overflow-hidden min-h-[200px]">
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
              <p
                className="inline-flex items-center gap-1.5 text-[11px] uppercase tracking-[0.18em] text-[color:var(--wiki-warning)]"
                style={{ fontFamily: "'JetBrains Mono', monospace" }}
              >
                <Medal className="w-3.5 h-3.5" />
                [{currentAward.category}]
              </p>
              <p
                className="mt-2 text-lg font-semibold text-[color:var(--wiki-ink)]"
                style={{ fontFamily: "'Space Grotesk', 'Pretendard', sans-serif" }}
              >
                {currentAward.issueLabel} · {currentAward.speaker}
              </p>
              <div className="mt-3 space-y-1.5">
                {currentAward.quotes.map((quote) => (
                  <p
                    key={`${currentAward.category}-${quote}`}
                    className="flex items-start gap-2 text-sm leading-relaxed text-[color:var(--wiki-ink-soft)]"
                  >
                    <Quote className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[color:var(--wiki-warning)]" />
                    <span>“ {quote} ”</span>
                  </p>
                ))}
              </div>
            </motion.article>
          </AnimatePresence>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {awards.map((award, index) => (
            <button
              key={award.category}
              type="button"
              onClick={() => goToIndex(index)}
              className={`rounded-sm border px-2.5 py-1 text-[11px] transition-colors ${
                index === currentIndex
                  ? 'border-[color:var(--wiki-warning)]/60 bg-[color:var(--wiki-warning)]/15 text-[color:var(--wiki-warning)]'
                  : 'border-[color:var(--wiki-rule)] bg-[color:var(--wiki-bg-2)] text-[color:var(--wiki-ink-muted)] hover:border-[color:var(--wiki-accent)]'
              }`}
              style={{ fontFamily: "'JetBrains Mono', monospace" }}
            >
              {String(index + 1).padStart(2, '0')}
            </button>
          ))}
        </div>
      </section>

      <section className="wiki-mbox wiki-mbox--info mt-5">
        <Sparkles className="w-4 h-4 mt-0.5 text-[color:var(--wiki-cyan)]" />
        <p className="text-sm leading-relaxed">{workshopAward2025.closingMessage}</p>
      </section>
    </WikiShell>
  )
}
