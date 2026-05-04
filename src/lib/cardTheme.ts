/**
 * Card system design tokens — paper / ink / scrapbook palette.
 * Used by all card UI components (drop, collection, crafting, feed).
 */

import { Crown, Gem, Hammer, Package, Sparkles, Star, Zap } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

export const FALLBACK_CARD_IMAGE = '/images/default-music-cover.jpg'

export type CardRarity = 'basic' | 'rare' | 'epic' | 'legendary' | 'material' | string
export type CardType = 'year' | 'special' | 'signature' | 'material' | 'prestige' | string

export interface RarityToken {
  key: CardRarity
  label: string
  icon: LucideIcon
  /** Stamp/text color (CSS) */
  ink: string
  /** Soft fill (CSS rgba) */
  wash: string
  /** Border color (CSS rgba) */
  edge: string
  /** Tape color name for <TapeStrip> */
  tape: 'yellow' | 'coral' | 'sage'
}

export const RARITY_TOKENS: Record<string, RarityToken> = {
  basic: {
    key: 'basic',
    label: '베이직',
    icon: Package,
    ink: '#5C5046',
    wash: 'rgba(43, 33, 24, 0.06)',
    edge: 'rgba(43, 33, 24, 0.18)',
    tape: 'yellow',
  },
  rare: {
    key: 'rare',
    label: '레어',
    icon: Star,
    ink: '#3E5C4A',
    wash: 'rgba(62, 92, 74, 0.1)',
    edge: 'rgba(62, 92, 74, 0.32)',
    tape: 'sage',
  },
  epic: {
    key: 'epic',
    label: '에픽',
    icon: Sparkles,
    ink: '#E0654E',
    wash: 'rgba(224, 101, 78, 0.1)',
    edge: 'rgba(224, 101, 78, 0.35)',
    tape: 'coral',
  },
  legendary: {
    key: 'legendary',
    label: '레전더리',
    icon: Crown,
    ink: '#C28A2D',
    wash: 'rgba(194, 138, 45, 0.12)',
    edge: 'rgba(194, 138, 45, 0.4)',
    tape: 'yellow',
  },
  material: {
    key: 'material',
    label: '재료',
    icon: Hammer,
    ink: '#473A28',
    wash: 'rgba(71, 58, 40, 0.08)',
    edge: 'rgba(71, 58, 40, 0.25)',
    tape: 'yellow',
  },
}

const DEFAULT_TOKEN = RARITY_TOKENS.basic

export const getRarityToken = (rarity?: string): RarityToken => {
  if (!rarity) return DEFAULT_TOKEN
  return RARITY_TOKENS[rarity.toLowerCase()] || DEFAULT_TOKEN
}

export interface TypeToken {
  key: CardType
  label: string
  emoji: string
  bgImage?: string
}

export const TYPE_TOKENS: Record<string, TypeToken> = {
  year: { key: 'year', label: '년도', emoji: '📅' },
  special: { key: 'special', label: '스페셜', emoji: '⭐' },
  signature: { key: 'signature', label: '시그니처', emoji: '✨' },
  material: { key: 'material', label: '재료', emoji: '🔧' },
  prestige: { key: 'prestige', label: '프레스티지', emoji: '👑' },
}

export const getTypeLabel = (type?: string) => {
  if (!type) return '카드'
  return TYPE_TOKENS[type.toLowerCase()]?.label || type
}

const MEMBER_TO_CODE: Record<string, string> = {
  강한울: 'HAN',
  정재원: 'JAE',
  정진규: 'JIN',
  이승찬: 'LEE',
  정민석: 'MIN',
}

const inferShortYear = (cardId?: string, imageUrl?: string, year?: number): string | undefined => {
  if (year) return String(year).slice(-2)
  const source = `${cardId || ''} ${imageUrl || ''}`
  const match = source.match(/_(\d{2})(?:_|\.|$)/)
  return match?.[1]
}

export interface PreOpenInput {
  type?: string
  cardId?: string
  imageUrl?: string
  member?: string
  year?: number
}

/** Returns the "sealed" card image for a freshly dropped card */
export const getPreOpenImage = (card: PreOpenInput): string => {
  const t = (card.type || '').toLowerCase()
  if (t === 'year') {
    const sy = inferShortYear(card.cardId, card.imageUrl, card.year)
    if (sy) {
      const fy = Number(sy) >= 70 ? `19${sy}` : `20${sy}`
      return `/images/cards/year/BG_${fy}.jpg`
    }
    return '/images/cards/year/BG_2025.jpg'
  }
  if (t === 'signature') return '/images/cards/signature/BG_SIGNATURE.jpg'
  if (t === 'special') return '/images/cards/special/BG_SPECIAL.jpg'
  if (t === 'prestige') {
    const code = card.member ? MEMBER_TO_CODE[card.member] : undefined
    if (code) return `/images/cards/prestige/BG_${code}_PRE.jpg`
    return '/images/cards/prestige/PGBG.jpg'
  }
  return FALLBACK_CARD_IMAGE
}

/** Members allowed to drop new cards */
export const DROP_ALLOWED_MEMBER_IDS = new Set(['hanul', 'jaewon', 'jinkyu', 'seungchan', 'minseok'])

export const handleCardImageError = (e: React.SyntheticEvent<HTMLImageElement>) => {
  const img = e.currentTarget
  if (!img.src.includes(FALLBACK_CARD_IMAGE)) img.src = FALLBACK_CARD_IMAGE
}
