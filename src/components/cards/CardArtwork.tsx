'use client'

import React from 'react'
import clsx from 'clsx'
import { Heart, Lock } from 'lucide-react'
import { getRarityToken, handleCardImageError } from '@/lib/cardTheme'

export interface CardArtworkProps {
  imageUrl?: string
  name?: string
  rarity?: string
  type?: string
  member?: string
  year?: number
  period?: string
  quantity?: number
  isFavorite?: boolean
  isLocked?: boolean
  rotate?: number | 'none' | 'left' | 'right' | 'extra'
  size?: 'xs' | 'sm' | 'md' | 'lg'
  caption?: string | null
  hideCaption?: boolean
  showRarityChip?: boolean
  onClick?: () => void
  className?: string
}

const sizeMap = {
  xs: { padding: 'p-1.5 pb-5', captionSize: 'text-[10px]' },
  sm: { padding: 'p-2 pb-6', captionSize: 'text-xs' },
  md: { padding: 'p-2.5 pb-8', captionSize: 'text-sm' },
  lg: { padding: 'p-3 pb-10', captionSize: 'text-base' },
}

function rotationStyle(rotate: CardArtworkProps['rotate']): React.CSSProperties {
  if (rotate === undefined || rotate === 'none') return {}
  if (typeof rotate === 'number') return { transform: `rotate(${rotate}deg)` }
  if (rotate === 'left') return { transform: 'rotate(-2deg)' }
  if (rotate === 'right') return { transform: 'rotate(2deg)' }
  if (rotate === 'extra') return { transform: 'rotate(-3.5deg)' }
  return {}
}

/**
 * 폴라로이드 스타일 카드. 이미지 + 등급 chip + 수량/즐겨찾기/잠금 stickers.
 */
export function CardArtwork({
  imageUrl,
  name,
  rarity,
  member,
  year,
  period,
  quantity,
  isFavorite,
  isLocked,
  rotate,
  size = 'md',
  caption,
  hideCaption,
  showRarityChip = true,
  onClick,
  className,
}: CardArtworkProps) {
  const token = getRarityToken(rarity)
  const sz = sizeMap[size]
  const captionLine = caption ?? name ?? ''

  return (
    <div
      className={clsx(
        'group relative inline-block bg-white shadow-polaroid transition-transform duration-300',
        onClick && 'cursor-pointer hover:!translate-y-[-3px] hover:!rotate-0',
        sz.padding,
        className
      )}
      style={{ ...rotationStyle(rotate), borderRadius: 4 }}
      onClick={onClick}
    >
      {/* photo area with rarity tint */}
      <div className="relative aspect-[3/4] w-full overflow-hidden bg-paper-200">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={name || 'card'}
            onError={handleCardImageError}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-3xl text-ink-300">
            {member?.[0] || name?.[0] || '★'}
          </div>
        )}

        {/* Subtle rarity wash */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{ background: token.wash }}
        />

        {/* Rarity stamp (top-left) */}
        {showRarityChip && (
          <div
            className="absolute left-1.5 top-1.5 rounded-sm px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider"
            style={{ background: 'rgba(255, 252, 244, 0.92)', color: token.ink, border: `1px solid ${token.edge}` }}
          >
            {token.label}
          </div>
        )}

        {/* Quantity stamp (top-right) */}
        {quantity && quantity > 1 && (
          <div className="absolute right-1.5 top-1.5 rounded-sm bg-ink-500/85 px-1.5 py-0.5 text-[10px] font-bold text-paper-50">
            ×{quantity}
          </div>
        )}

        {/* status icons (bottom-left) */}
        {(isFavorite || isLocked) && (
          <div className="absolute bottom-1.5 left-1.5 flex gap-1">
            {isFavorite && (
              <span className="rounded-full bg-paper-50/90 p-1 text-coral-500">
                <Heart className="h-3 w-3" fill="currentColor" />
              </span>
            )}
            {isLocked && (
              <span className="rounded-full bg-paper-50/90 p-1 text-mustard-600">
                <Lock className="h-3 w-3" />
              </span>
            )}
          </div>
        )}

        {/* year/period stamp (bottom-right) */}
        {year && period && (
          <div
            className="absolute bottom-1.5 right-1.5 rounded-sm border bg-paper-50/90 px-1.5 py-0.5 text-[9px] font-mono font-semibold"
            style={{ color: token.ink, borderColor: token.edge }}
          >
            {String(year).slice(-2)}·{period.toUpperCase()}
          </div>
        )}
      </div>

      {/* caption */}
      {!hideCaption && (
        <div
          className={clsx(
            'absolute bottom-1 left-0 right-0 text-center font-hand text-ink-soft',
            sz.captionSize
          )}
          style={{ fontFamily: 'var(--font-gaegu, var(--font-caveat, cursive))' }}
        >
          {captionLine || '—'}
        </div>
      )}
    </div>
  )
}

/**
 * 작은 빈 슬롯 — 컬렉션 그리드 placeholder.
 */
export function EmptyCardSlot({ className, label }: { className?: string; label?: string }) {
  return (
    <div
      className={clsx(
        'flex aspect-[3/4] w-full items-center justify-center rounded-md border-2 border-dashed border-ink-500/15 bg-paper-100/60 transition-colors hover:border-ink-500/30',
        className
      )}
    >
      <span className="caveat text-sm text-ink-300">{label || '—'}</span>
    </div>
  )
}
