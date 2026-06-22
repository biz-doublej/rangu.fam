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

const PACK_FX = '/assets/fx/fx_ui_pack_opening.png'
const AURA_FX = '/assets/fx/fx_ui_rare_aura.png'

/** 등급 → 연출 강도. legendary 또는 prestige = 특수(오라 PNG + 반짝이 + 폭발). */
function rarityTier(rarity: string, type?: string): 'special' | 'epic' | 'rare' | 'basic' {
  const r = (rarity || '').toLowerCase()
  if (r === 'legendary' || type === 'prestige') return 'special'
  if (r === 'epic') return 'epic'
  if (r === 'rare') return 'rare'
  return 'basic'
}

/**
 * 봉인↔공개 — 폴라로이드 사진이 RotateY 180° 로 뒤집히며 공개된다(뒷면=봉인, 앞면=카드).
 * 개봉 순간 fx_ui_pack_opening 이 1회 폭발하고, legendary/prestige 는 fx_ui_rare_aura 가
 * 뒤에서 회전·펄스 + 반짝이가 흩날린다. (좌표/타이밍은 라이브 튜닝 가능.)
 */
export function SealedOrRevealed({
  card,
  isRevealed,
  scale = 1,
}: {
  card: OpenCard
  isRevealed: boolean
  scale?: number
}) {
  const token = getRarityToken(card.rarity)
  const sealedSrc = getPreOpenImage(card)
  const tier = rarityTier(card.rarity, card.type)
  const special = tier === 'special'

  return (
    <div style={{ width: 220 * scale, height: 308 * scale }}>
      <div className="relative" style={{ width: 220, transform: `scale(${scale})`, transformOrigin: 'top left' }}>
      {/* ① 레어 오라(legendary/prestige) — 폴라로이드 뒤에서 회전·펄스 */}
      {isRevealed && special && (
        <motion.img
          src={AURA_FX}
          alt=""
          aria-hidden
          onError={handleCardImageError}
          className="pointer-events-none absolute"
          style={{ left: -70, top: -28, width: 360, height: 360 }}
          initial={{ opacity: 0, scale: 0.6 }}
          animate={{ opacity: [0, 0.95, 0.8], scale: [0.6, 1.12, 1], rotate: 360 }}
          transition={{
            opacity: { duration: 0.5, times: [0, 0.4, 1] },
            scale: { duration: 0.5, ease: 'easeOut' },
            rotate: { duration: 14, repeat: Infinity, ease: 'linear' },
          }}
        />
      )}

      {/* ② 폴라로이드 — 안쪽 사진이 180° 플립 */}
      <div className="relative bg-white p-3 pb-8 shadow-polaroid" style={{ width: 220, borderRadius: 4 }}>
        <div className="relative h-[260px] w-[196px]" style={{ perspective: 900 }}>
          <motion.div
            className="relative h-full w-full"
            style={{ transformStyle: 'preserve-3d' }}
            animate={{ rotateY: isRevealed ? 180 : 0 }}
            transition={isRevealed ? { duration: 0.6, ease: [0.2, 0.7, 0.2, 1] } : { duration: 0 }}
          >
            {/* 뒷면 = 봉인 */}
            <div
              className="absolute inset-0 overflow-hidden bg-paper-200"
              style={{ backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden', borderRadius: 2 }}
            >
              <img src={sealedSrc} alt="sealed" onError={handleCardImageError} className="absolute inset-0 h-full w-full object-cover" />
              <div className="absolute inset-0 mix-blend-multiply" style={{ background: token.wash }} />
              <div
                className="absolute left-2 top-2 rounded-sm px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider"
                style={{ background: 'rgba(255, 252, 244, 0.92)', color: token.ink, border: `1px solid ${token.edge}` }}
              >
                sealed
              </div>
            </div>

            {/* 앞면 = 공개 (180° 뒤집힌 면) */}
            <div
              className="absolute inset-0 overflow-hidden bg-paper-200"
              style={{ backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden', transform: 'rotateY(180deg)', borderRadius: 2 }}
            >
              <img
                src={card.imageUrl || sealedSrc}
                alt={card.name}
                onError={handleCardImageError}
                className="absolute inset-0 h-full w-full object-cover"
              />
              {special && (
                <div className="pointer-events-none absolute inset-0">
                  {[...Array(8)].map((_, i) => (
                    <motion.span
                      key={i}
                      className="absolute h-1.5 w-1.5 rounded-full"
                      style={{
                        left: `${10 + ((i * 11) % 80)}%`,
                        top: `${15 + ((i * 17) % 70)}%`,
                        background: '#FFE4A8',
                        boxShadow: '0 0 8px #C28A2D',
                      }}
                      initial={{ opacity: 0, scale: 0 }}
                      animate={{ opacity: [0, 1, 0], scale: [0, 1.4, 0] }}
                      transition={{ duration: 1.2, delay: 0.4 + i * 0.06, repeat: Infinity, repeatDelay: 0.4 }}
                    />
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        </div>

        <div
          className="absolute bottom-1 left-0 right-0 text-center font-hand text-sm text-ink-soft"
          style={{ fontFamily: 'var(--font-gaegu, var(--font-caveat, cursive))' }}
        >
          {isRevealed ? card.name : '— sealed —'}
        </div>
      </div>

      {/* ③ 팩 개봉 폭발 — 개봉 순간 1회(위에 덮임) */}
      {isRevealed && (
        <motion.img
          src={PACK_FX}
          alt=""
          aria-hidden
          onError={handleCardImageError}
          className="pointer-events-none absolute"
          style={{ left: -40, top: -8, width: 300, height: 300, zIndex: 5 }}
          initial={{ opacity: 0, scale: 0.3 }}
          animate={{ opacity: [0, 1, 0], scale: [0.3, 1.5, 1.85] }}
          transition={{ duration: 0.55, ease: 'easeOut', times: [0, 0.35, 1] }}
        />
      )}
      </div>
    </div>
  )
}
