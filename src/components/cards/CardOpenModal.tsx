'use client'

import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'
import { getPreOpenImage, getRarityToken, handleCardImageError } from '@/lib/cardTheme'
import { RarityChip } from './RarityChip'

export interface OpenCard {
  cardId: string
  name: string
  description: string
  rarity: string
  type?: string
  imageUrl?: string
  member?: string
  year?: number
  period?: string
}

interface CardOpenModalProps {
  open: boolean
  card: OpenCard | null
  isRevealed: boolean
  onReveal: () => void
  onClose: () => void
  ctaLabel?: string
}

/**
 * 카드 개봉 모달 — 봉인된 폴라로이드를 테이프와 함께 보여주고,
 * 클릭 시 등급별 reveal 애니메이션이 실행됩니다.
 */
export function CardOpenModal({
  open,
  card,
  isRevealed,
  onReveal,
  onClose,
  ctaLabel,
}: CardOpenModalProps) {
  return (
    <AnimatePresence>
      {open && card && (
        <motion.div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-ink-500/70 p-4 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="relative w-full max-w-md rounded-[1.5rem] bg-paper-50 p-7 shadow-2xl"
            initial={{ scale: 0.92, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.92, opacity: 0, y: 20 }}
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

            <p className="caveat text-center text-lg text-coral-500">
              {isRevealed ? "what's inside" : 'a sealed card'}
            </p>
            <h3 className="display-han mt-1 text-center text-2xl text-ink-500">
              {isRevealed ? card.name : '봉인된 카드'}
            </h3>

            <div className="relative mx-auto mt-6 w-fit">
              {!isRevealed && (
                <>
                  <span
                    className="absolute -top-3 left-1/2 -translate-x-1/2 rotate-[-4deg]"
                    style={{
                      width: 110,
                      height: 22,
                      background:
                        'repeating-linear-gradient(135deg, transparent 0 6px, rgba(255,255,255,0.18) 6px 8px), rgba(238,133,105,0.78)',
                      borderLeft: '1px dashed rgba(180, 140, 60, 0.25)',
                      borderRight: '1px dashed rgba(180, 140, 60, 0.25)',
                      boxShadow: '0 2px 6px -2px rgba(180,140,60,0.4)',
                    }}
                  />
                </>
              )}

              <SealedOrRevealed card={card} isRevealed={isRevealed} />
            </div>

            <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
              <RarityChip rarity={card.rarity} size="md" />
              {isRevealed && card.year && card.period && (
                <span className="rounded-full border border-ink-500/15 bg-paper-100 px-3 py-1 text-xs font-medium text-ink-300">
                  {card.year} · {card.period === 'h1' ? '상반기' : '하반기'}
                </span>
              )}
            </div>

            {isRevealed && (
              <p className="mt-4 text-center text-sm leading-relaxed text-ink-300">
                {card.description}
              </p>
            )}

            <div className="mt-6">
              {!isRevealed ? (
                <button onClick={onReveal} className="ink-button w-full justify-center">
                  {ctaLabel || '카드 열기'}
                </button>
              ) : (
                <button onClick={onClose} className="ghost-button w-full justify-center">
                  확인했어요
                </button>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

function SealedOrRevealed({ card, isRevealed }: { card: OpenCard; isRevealed: boolean }) {
  const token = getRarityToken(card.rarity)
  const sealedSrc = getPreOpenImage(card)
  const revealAnim = getRevealAnimation(card.rarity)

  return (
    <div
      className="relative bg-white p-3 pb-8 shadow-polaroid"
      style={{ width: 220, borderRadius: 4 }}
    >
      <div className="relative h-[260px] w-[196px] overflow-hidden bg-paper-200">
        {/* Aura on reveal for legendary/epic */}
        {isRevealed && (revealAnim.aura || revealAnim.particles) && (
          <motion.div
            className="pointer-events-none absolute -inset-10 blur-2xl"
            style={{ background: revealAnim.aura }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.85 }}
            transition={{ duration: 0.4 }}
          />
        )}

        <AnimatePresence mode="wait">
          {!isRevealed ? (
            <motion.img
              key="sealed"
              src={sealedSrc}
              alt="sealed"
              onError={handleCardImageError}
              className="absolute inset-0 h-full w-full object-cover"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            />
          ) : (
            <motion.img
              key="opened"
              src={card.imageUrl || sealedSrc}
              alt={card.name}
              onError={handleCardImageError}
              className="absolute inset-0 h-full w-full object-cover"
              initial={revealAnim.initial}
              animate={revealAnim.animate}
              transition={revealAnim.transition}
              style={revealAnim.style}
            />
          )}
        </AnimatePresence>

        {/* Sealed overlay — slight tint */}
        {!isRevealed && (
          <div
            className="absolute inset-0 mix-blend-multiply"
            style={{ background: token.wash }}
          />
        )}

        {/* Sealed label badge */}
        {!isRevealed && (
          <div
            className="absolute left-2 top-2 rounded-sm px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider"
            style={{ background: 'rgba(255, 252, 244, 0.92)', color: token.ink, border: `1px solid ${token.edge}` }}
          >
            sealed
          </div>
        )}

        {/* Sparkle particles for legendary */}
        {isRevealed && revealAnim.particles && (
          <div className="pointer-events-none absolute inset-0">
            {[...Array(8)].map((_, i) => (
              <motion.span
                key={i}
                className="absolute h-1.5 w-1.5 rounded-full"
                style={{
                  left: `${10 + (i * 11) % 80}%`,
                  top: `${15 + (i * 17) % 70}%`,
                  background: '#FFE4A8',
                  boxShadow: '0 0 8px #C28A2D',
                }}
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: [0, 1, 0], scale: [0, 1.4, 0] }}
                transition={{ duration: 1.2, delay: i * 0.06, repeat: Infinity, repeatDelay: 0.4 }}
              />
            ))}
          </div>
        )}
      </div>

      <div
        className="absolute bottom-1 left-0 right-0 text-center font-hand text-sm text-ink-soft"
        style={{ fontFamily: 'var(--font-gaegu, var(--font-caveat, cursive))' }}
      >
        {isRevealed ? card.name : '— sealed —'}
      </div>
    </div>
  )
}

function getRevealAnimation(rarity: string) {
  const r = (rarity || '').toLowerCase()
  if (r === 'legendary') {
    return {
      aura: 'radial-gradient(circle, rgba(251,191,36,0.5), transparent 65%)',
      particles: true,
      initial: { opacity: 0, scale: 0.6, rotate: -10, filter: 'brightness(2.4) saturate(1.8)' },
      animate: {
        opacity: 1,
        scale: [0.6, 1.08, 1],
        rotate: [-10, 3, 0],
        filter: ['brightness(2.4)', 'brightness(1.3)', 'brightness(1)'],
      },
      transition: { duration: 0.9, times: [0, 0.6, 1], ease: 'easeOut' },
      style: undefined,
    }
  }
  if (r === 'epic') {
    return {
      aura: 'radial-gradient(circle, rgba(224,101,78,0.45), transparent 65%)',
      particles: false,
      initial: { opacity: 0, scale: 0.72, rotate: -6, filter: 'brightness(1.8) saturate(1.4)' },
      animate: {
        opacity: 1,
        scale: [0.72, 1.05, 1],
        rotate: [-6, 2, 0],
        filter: ['brightness(1.8)', 'brightness(1.2)', 'brightness(1)'],
      },
      transition: { duration: 0.7, ease: 'easeOut' },
      style: undefined,
    }
  }
  if (r === 'rare') {
    return {
      aura: 'radial-gradient(circle, rgba(62,92,74,0.35), transparent 65%)',
      particles: false,
      initial: { opacity: 0, rotateY: -90, scale: 0.88 },
      animate: { opacity: 1, rotateY: 0, scale: 1 },
      transition: { type: 'spring', stiffness: 190, damping: 18, mass: 0.8 },
      style: { transformStyle: 'preserve-3d' as const },
    }
  }
  if (r === 'material') {
    return {
      aura: '',
      particles: false,
      initial: { opacity: 0, y: 12, scale: 0.92 },
      animate: { opacity: 1, y: [12, 0], scale: [0.92, 1.03, 1] },
      transition: { duration: 0.55, ease: 'easeOut' },
      style: undefined,
    }
  }
  return {
    aura: '',
    particles: false,
    initial: { opacity: 0, y: 8, scale: 0.96 },
    animate: { opacity: 1, y: 0, scale: 1 },
    transition: { duration: 0.4, ease: 'easeOut' },
    style: undefined,
  }
}
