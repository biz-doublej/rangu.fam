'use client'

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import clsx from 'clsx'
import { Filter, Heart, Lock, Search, Unlock, X } from 'lucide-react'
import { CardArtwork, EmptyCardSlot } from '@/components/cards/CardArtwork'
import { RarityChip } from '@/components/cards/RarityChip'
import { CaveatText, PaperCard, TapeStrip } from '@/components/scrapbook'
import { handleCardImageError, getRarityToken, getTypeLabel } from '@/lib/cardTheme'

const TOTAL_SLOTS = 48

interface CardCollectionProps {
  userId?: string
  className?: string
}

interface UserCard {
  _id: string
  cardId: string
  quantity: number
  acquiredAt: string
  isFavorite: boolean
  isLocked: boolean
  cardInfo: {
    cardId: string
    name: string
    type: string
    rarity: string
    description: string
    imageUrl: string
    member?: string
    year?: number
    period?: string
  }
}

const TYPE_FILTERS: { id: string; label: string }[] = [
  { id: '', label: '전체' },
  { id: 'year', label: '년도' },
  { id: 'special', label: '스페셜' },
  { id: 'signature', label: '시그니처' },
  { id: 'material', label: '재료' },
  { id: 'prestige', label: '프레스티지' },
]

export function CardCollection({ userId, className = '' }: CardCollectionProps) {
  const [cards, setCards] = useState<UserCard[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterType, setFilterType] = useState('')
  const [favoritesOnly, setFavoritesOnly] = useState(false)
  const [showFilters, setShowFilters] = useState(false)
  const [updatingIds, setUpdatingIds] = useState<Record<string, boolean>>({})
  const [selected, setSelected] = useState<UserCard | null>(null)

  const fetchInventory = useCallback(async () => {
    if (!userId) return
    setIsLoading(true)
    try {
      const params = new URLSearchParams({
        userId,
        page: '1',
        limit: '100',
        ...(filterType && { type: filterType }),
        ...(favoritesOnly && { favorites: 'true' }),
      })
      const res = await fetch(`/api/cards/inventory?${params}`)
      const data = await res.json()
      if (data.success) setCards(data.inventory)
    } catch (err) {
      console.error('inventory fetch failed', err)
    } finally {
      setIsLoading(false)
    }
  }, [userId, filterType, favoritesOnly])

  useEffect(() => {
    fetchInventory()
  }, [fetchInventory])

  useEffect(() => {
    const refresh = () => fetchInventory()
    window.addEventListener('card-inventory-updated', refresh)
    return () => window.removeEventListener('card-inventory-updated', refresh)
  }, [fetchInventory])

  const updateCard = async (cardId: string, updates: { isFavorite?: boolean; isLocked?: boolean }) => {
    if (!userId || updatingIds[cardId]) return

    const prevCards = cards
    const prevSelected = selected

    setUpdatingIds((p) => ({ ...p, [cardId]: true }))
    setCards((cs) => cs.map((c) => (c.cardId === cardId ? { ...c, ...updates } : c)))
    setSelected((c) => (c && c.cardId === cardId ? { ...c, ...updates } : c))

    try {
      const res = await fetch('/api/cards/inventory', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, cardId, ...updates }),
      })
      if (!res.ok) throw new Error('update failed')
    } catch (err) {
      console.error('card state update failed', err)
      setCards(prevCards)
      setSelected(prevSelected)
    } finally {
      setUpdatingIds((p) => {
        const n = { ...p }
        delete n[cardId]
        return n
      })
    }
  }

  const filtered = useMemo(() => {
    if (!searchQuery) return cards
    const q = searchQuery.toLowerCase()
    return cards.filter((c) => {
      return (
        c.cardInfo.name.toLowerCase().includes(q) ||
        c.cardInfo.description.toLowerCase().includes(q) ||
        c.cardInfo.member?.toLowerCase().includes(q)
      )
    })
  }, [cards, searchQuery])

  const ownedCount = cards.length

  if (!userId) {
    return (
      <PaperCard className={clsx('!p-10 text-center', className)}>
        <Heart className="mx-auto h-10 w-10 text-ink-300" />
        <h3 className="display-han mt-3 text-2xl text-ink-500">카드 컬렉션</h3>
        <p className="mt-2 text-sm text-ink-300">로그인 후 컬렉션을 확인할 수 있어요.</p>
      </PaperCard>
    )
  }

  return (
    <>
      <PaperCard className={clsx('relative !p-0 overflow-hidden', className)}>
        <TapeStrip className="tape--top-left" color="coral" />
        {/* Header */}
        <div className="border-b border-dashed border-ink-500/15 px-6 pb-5 pt-7 sm:px-8">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <CaveatText className="text-base text-coral-500">my album</CaveatText>
              <h2 className="display-han mt-0.5 text-3xl text-ink-500">카드 컬렉션</h2>
              <p className="mt-1 text-xs text-ink-300">
                소장 <span className="font-mono font-bold text-ink-500">{ownedCount}</span> / {TOTAL_SLOTS}장
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowFilters((v) => !v)}
              className={clsx(
                'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-bold transition',
                showFilters
                  ? 'border-coral-500/40 bg-coral-500/10 text-coral-600'
                  : 'border-ink-500/15 bg-paper-50 text-ink-300 hover:border-ink-500/30 hover:text-ink-500'
              )}
            >
              <Filter className="h-3.5 w-3.5" />
              필터
            </button>
          </div>

          {/* Search */}
          <div className="relative mt-4">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-300" />
            <input
              type="text"
              placeholder="카드 이름, 멤버로 검색…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-xl border border-ink-500/15 bg-paper-50 py-2 pl-9 pr-3 text-sm text-ink-500 placeholder-ink-300 focus:border-coral-500/40 focus:outline-none focus:ring-1 focus:ring-coral-500/30"
            />
          </div>

          {/* Filters */}
          <AnimatePresence>
            {showFilters && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="mt-4 flex flex-wrap gap-2 border-t border-dashed border-ink-500/15 pt-4">
                  {TYPE_FILTERS.map((f) => (
                    <button
                      key={f.id}
                      onClick={() => setFilterType(f.id)}
                      className={clsx(
                        'rounded-full border px-3 py-1 text-xs font-bold transition',
                        filterType === f.id
                          ? 'border-ink-500 bg-ink-500 text-paper-50'
                          : 'border-ink-500/15 bg-paper-50 text-ink-300 hover:border-ink-500/30 hover:text-ink-500'
                      )}
                    >
                      {f.label}
                    </button>
                  ))}
                  <button
                    onClick={() => setFavoritesOnly((v) => !v)}
                    className={clsx(
                      'inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-bold transition',
                      favoritesOnly
                        ? 'border-coral-500/40 bg-coral-500/10 text-coral-600'
                        : 'border-ink-500/15 bg-paper-50 text-ink-300 hover:border-ink-500/30 hover:text-ink-500'
                    )}
                  >
                    <Heart className="h-3 w-3" fill={favoritesOnly ? 'currentColor' : 'none'} />
                    즐겨찾기만
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Grid */}
        <div className="px-5 pb-6 pt-5 sm:px-7">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center gap-3 py-16">
              <span className="h-8 w-8 animate-spin rounded-full border-2 border-coral-500/30 border-t-coral-500" />
              <p className="caveat text-base text-ink-300">앨범 펼치는 중…</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7">
              {Array.from({ length: TOTAL_SLOTS }).map((_, i) => {
                const card = filtered[i]
                if (!card) {
                  return <EmptyCardSlot key={i} />
                }
                const rotation = ((i * 37) % 5) - 2 // tiny consistent variance per slot
                return (
                  <motion.div
                    key={card._id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: Math.min(i * 0.015, 0.2) }}
                  >
                    <CardArtwork
                      imageUrl={card.cardInfo.imageUrl}
                      name={card.cardInfo.name}
                      rarity={card.cardInfo.rarity}
                      type={card.cardInfo.type}
                      member={card.cardInfo.member}
                      year={card.cardInfo.year}
                      period={card.cardInfo.period}
                      quantity={card.quantity}
                      isFavorite={card.isFavorite}
                      isLocked={card.isLocked}
                      rotate={rotation}
                      size="xs"
                      onClick={() => setSelected(card)}
                    />
                  </motion.div>
                )
              })}
            </div>
          )}
        </div>
      </PaperCard>

      {/* Detail modal */}
      <CardDetailModal
        card={selected}
        onClose={() => setSelected(null)}
        onToggleFavorite={() =>
          selected && updateCard(selected.cardId, { isFavorite: !selected.isFavorite })
        }
        onToggleLock={() =>
          selected && updateCard(selected.cardId, { isLocked: !selected.isLocked })
        }
        isUpdating={selected ? Boolean(updatingIds[selected.cardId]) : false}
      />
    </>
  )
}

function CardDetailModal({
  card,
  onClose,
  onToggleFavorite,
  onToggleLock,
  isUpdating,
}: {
  card: UserCard | null
  onClose: () => void
  onToggleFavorite: () => void
  onToggleLock: () => void
  isUpdating: boolean
}) {
  return (
    <AnimatePresence>
      {card && (
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

            <CaveatText className="text-base text-coral-500">{getTypeLabel(card.cardInfo.type)} card</CaveatText>
            <h3 className="display-han mt-0.5 text-2xl text-ink-500">{card.cardInfo.name}</h3>

            <div className="mt-5 flex justify-center">
              <CardArtwork
                imageUrl={card.cardInfo.imageUrl}
                name={card.cardInfo.name}
                rarity={card.cardInfo.rarity}
                type={card.cardInfo.type}
                member={card.cardInfo.member}
                year={card.cardInfo.year}
                period={card.cardInfo.period}
                quantity={card.quantity}
                size="md"
                rotate={-1}
                hideCaption
                className="w-[210px]"
              />
            </div>

            <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
              <RarityChip rarity={card.cardInfo.rarity} size="md" />
              <span className="rounded-full border border-ink-500/15 bg-paper-100 px-3 py-1 text-xs font-bold text-ink-300">
                ×{card.quantity}장
              </span>
            </div>

            <p className="mt-4 text-center text-sm leading-relaxed text-ink-300">
              {card.cardInfo.description}
            </p>

            {/* Action buttons */}
            <div className="mt-6 flex justify-center gap-3">
              <button
                type="button"
                onClick={onToggleFavorite}
                disabled={isUpdating}
                className={clsx(
                  'inline-flex items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-bold transition',
                  card.isFavorite
                    ? 'border-coral-500/40 bg-coral-500/10 text-coral-600'
                    : 'border-ink-500/15 bg-paper-50 text-ink-300 hover:border-coral-500/30 hover:text-coral-500'
                )}
              >
                <Heart className="h-4 w-4" fill={card.isFavorite ? 'currentColor' : 'none'} />
                {card.isFavorite ? '즐겨찾기 해제' : '즐겨찾기'}
              </button>
              <button
                type="button"
                onClick={onToggleLock}
                disabled={isUpdating}
                className={clsx(
                  'inline-flex items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-bold transition',
                  card.isLocked
                    ? 'border-mustard-500/40 bg-mustard-500/10 text-mustard-600'
                    : 'border-ink-500/15 bg-paper-50 text-ink-300 hover:border-mustard-500/30 hover:text-mustard-500'
                )}
              >
                {card.isLocked ? <Lock className="h-4 w-4" /> : <Unlock className="h-4 w-4" />}
                {card.isLocked ? '잠금 해제' : '잠금'}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
