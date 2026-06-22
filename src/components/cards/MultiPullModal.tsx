'use client'

import React, { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Sparkles, X } from 'lucide-react'
import clsx from 'clsx'
import { getRarityToken } from '@/lib/cardTheme'
import { SealedOrRevealed, type OpenCard } from './CardOpenModal'

interface MultiPullModalProps {
  open: boolean
  cards: OpenCard[]
  onClose: () => void
}

const CARD_SCALE = 0.55
const STAGGER_MS = 220

/**
 * 멀티 풀(N연차) 개봉 — N장이 봉인 상태로 한 번에 스폰되고, 카드를 클릭하거나
 * "전체 공개"로 순차 플립(+폭발/오라)된다. 단일 개봉(CardOpenModal)의 SealedOrRevealed 재사용.
 */
export function MultiPullModal({ open, cards, onClose }: MultiPullModalProps) {
  const [revealed, setRevealed] = useState<Set<number>>(new Set())

  // 모달이 새로 열릴 때마다 공개 상태 초기화(전부 봉인)
  useEffect(() => {
    if (open) setRevealed(new Set())
  }, [open])

  const reveal = (i: number) => setRevealed((prev) => (prev.has(i) ? prev : new Set(prev).add(i)))
  const revealAll = () => cards.forEach((_, i) => setTimeout(() => reveal(i), i * STAGGER_MS))
  const allRevealed = revealed.size >= cards.length

  // 등급 집계(요약 칩)
  const tally = cards.reduce<Record<string, number>>((m, c) => {
    const r = (c.rarity || '').toLowerCase()
    m[r] = (m[r] || 0) + 1
    return m
  }, {})

  return (
    <AnimatePresence>
      {open && cards.length > 0 && (
        <motion.div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-ink-500/70 p-4 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="relative max-h-[88vh] w-full max-w-3xl overflow-y-auto rounded-[1.5rem] bg-paper-50 p-6 shadow-2xl"
            initial={{ scale: 0.94, opacity: 0, y: 16 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.94, opacity: 0, y: 16 }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={onClose}
              className="absolute right-3 top-3 rounded-full p-1.5 text-ink-300 hover:bg-ink-500/10 hover:text-ink-500"
              aria-label="닫기"
            >
              <X className="h-4 w-4" />
            </button>

            {/* Header */}
            <div className="text-center">
              <p className="caveat text-lg text-coral-500">pack opening</p>
              <h3 className="display-han mt-0.5 text-2xl text-ink-500">{cards.length}연차 개봉</h3>
              <p className="mt-1 text-xs text-ink-300">
                {allRevealed ? '모두 공개했어요!' : '카드를 눌러 열거나, 아래 “전체 공개”를 누르세요.'}
              </p>
            </div>

            {/* Cards grid */}
            <div className="mt-5 grid grid-cols-2 justify-items-center gap-3 sm:grid-cols-3 lg:grid-cols-5">
              {cards.map((c, i) => (
                <div
                  key={`${c.cardId}-${i}`}
                  role="button"
                  onClick={() => reveal(i)}
                  className={clsx('outline-none', !revealed.has(i) && 'cursor-pointer transition-transform hover:-translate-y-1')}
                >
                  <SealedOrRevealed card={c} isRevealed={revealed.has(i)} scale={CARD_SCALE} />
                </div>
              ))}
            </div>

            {/* Footer — summary + actions */}
            <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-1.5">
                {Object.entries(tally).map(([rarity, n]) => {
                  const t = getRarityToken(rarity)
                  return (
                    <span
                      key={rarity}
                      className="rounded-full border px-2.5 py-0.5 text-[11px] font-bold"
                      style={{ color: t.ink, borderColor: t.edge, background: 'rgba(255,252,244,0.7)' }}
                    >
                      {t.label} {n}
                    </span>
                  )
                })}
              </div>
              {allRevealed ? (
                <button onClick={onClose} className="ghost-button justify-center">
                  확인했어요
                </button>
              ) : (
                <button onClick={revealAll} className="ink-button justify-center gap-2">
                  <Sparkles className="h-4 w-4" />
                  전체 공개
                </button>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
