'use client'

import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import clsx from 'clsx'
import { AlertTriangle, Crown, Hammer, ShieldCheck, Sparkles, X } from 'lucide-react'
import { CardArtwork } from '@/components/cards/CardArtwork'
import { RarityChip } from '@/components/cards/RarityChip'
import { CaveatText, Handwritten, PaperCard, Pin, TapeStrip } from '@/components/scrapbook'
import { FALLBACK_CARD_IMAGE, handleCardImageError } from '@/lib/cardTheme'

interface AdvancedCardCraftingProps {
  userId?: string
  className?: string
}

interface CraftingResult {
  success: boolean
  card?: {
    cardId: string
    name: string
    description: string
    rarity: string
    imageUrl?: string
  }
  message: string
  usedCards: { cardId: string; quantity: number }[]
  usedCardDetails?: { cardId: string; name: string; quantity: number; imageUrl?: string }[]
}

interface UserCard {
  _id: string
  cardId: string
  quantity: number
  isLocked: boolean
  cardInfo: {
    cardId: string
    name: string
    type: string
    rarity: string
    imageUrl: string
    member?: string
  }
}

interface PrestigeCard {
  canonicalKey: string
  cardId: string
  name: string
  imageUrl: string
}

interface UserStats {
  craftingAttempts?: number
  successfulCrafts?: number
  failedCrafts?: number
}

const STANDARD_REQUIREMENTS = [
  { type: 'year', label: '년도', required: 7, color: '#5C5046' },
  { type: 'special', label: '스페셜', required: 3, color: '#3E5C4A' },
  { type: 'signature', label: '시그니처', required: 1, color: '#E0654E' },
] as const

const PRESTIGE_SORT_ORDER = ['jaewon', 'minseok', 'jinkyu', 'hanul', 'seungchan', 'group']

const normalizePrestigeKey = (value?: string) => {
  const v = (value || '').replace(/\s+/g, '').toLowerCase()
  if (!v) return null
  if (v.includes('jaewon') || v.includes('정재원') || v.includes('재원')) return 'jaewon'
  if (v.includes('minseok') || v.includes('정민석') || v.includes('민석')) return 'minseok'
  if (v.includes('jinkyu') || v.includes('정진규') || v.includes('진규')) return 'jinkyu'
  if (v.includes('hanul') || v.includes('강한울') || v.includes('한울')) return 'hanul'
  if (v.includes('seungchan') || v.includes('이승찬') || v.includes('승찬')) return 'seungchan'
  if (v.includes('group') || v.includes('랑구')) return 'group'
  return null
}

export function AdvancedCardCrafting({ userId, className = '' }: AdvancedCardCraftingProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [isCrafting, setIsCrafting] = useState(false)
  const [result, setResult] = useState<CraftingResult | null>(null)
  const [showResult, setShowResult] = useState(false)
  const [stats, setStats] = useState<UserStats | null>(null)
  const [userCards, setUserCards] = useState<UserCard[]>([])
  const [prestigeCards, setPrestigeCards] = useState<PrestigeCard[]>([])

  const fetchData = useCallback(async () => {
    if (!userId) return
    try {
      setIsLoading(true)
      const [statsRes, cardsRes, prestigeRes] = await Promise.all([
        fetch(`/api/cards/stats?userId=${userId}`),
        fetch(`/api/cards/inventory?userId=${userId}&limit=300&sortBy=recent`),
        fetch('/api/cards?type=prestige&limit=20'),
      ])

      const [statsData, cardsData, prestigeData] = await Promise.all([
        statsRes.json(),
        cardsRes.json(),
        prestigeRes.json(),
      ])

      if (statsData.success) setStats(statsData.stats)
      if (cardsData.success) setUserCards(cardsData.inventory || [])

      if (prestigeData.success) {
        const dedupe = new Map<string, PrestigeCard>()
        for (const c of prestigeData.cards || []) {
          const key =
            normalizePrestigeKey(c.member) ||
            normalizePrestigeKey(c.cardId?.replace(/^prestige_/, '')) ||
            normalizePrestigeKey(c.name) ||
            c.cardId
          const cand: PrestigeCard = {
            canonicalKey: key,
            cardId: c.cardId,
            name: c.name,
            imageUrl: c.imageUrl || FALLBACK_CARD_IMAGE,
          }
          const existing = dedupe.get(key)
          if (!existing) {
            dedupe.set(key, cand)
            continue
          }
          const existingScore = (existing.imageUrl !== FALLBACK_CARD_IMAGE ? 2 : 0) + existing.name.length
          const candScore = (cand.imageUrl !== FALLBACK_CARD_IMAGE ? 2 : 0) + cand.name.length
          if (candScore > existingScore) dedupe.set(key, cand)
        }
        const sorted = Array.from(dedupe.values()).sort((a, b) => {
          const ai = PRESTIGE_SORT_ORDER.indexOf(a.canonicalKey)
          const bi = PRESTIGE_SORT_ORDER.indexOf(b.canonicalKey)
          const ao = ai === -1 ? 99 : ai
          const bo = bi === -1 ? 99 : bi
          if (ao !== bo) return ao - bo
          return a.name.localeCompare(b.name, 'ko')
        })
        setPrestigeCards(sorted)
      }
    } catch (err) {
      console.error('crafting data fetch failed', err)
    } finally {
      setIsLoading(false)
    }
  }, [userId])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  useEffect(() => {
    const refresh = () => fetchData()
    window.addEventListener('card-inventory-updated', refresh)
    return () => window.removeEventListener('card-inventory-updated', refresh)
  }, [fetchData])

  const unlocked = useMemo(() => userCards.filter((c) => !c.isLocked), [userCards])
  const typeCounts = useMemo(
    () => unlocked.reduce<Record<string, number>>((acc, c) => {
      const t = c.cardInfo.type
      acc[t] = (acc[t] || 0) + c.quantity
      return acc
    }, {}),
    [unlocked]
  )

  const reqs = useMemo(
    () =>
      STANDARD_REQUIREMENTS.map((r) => {
        const owned = typeCounts[r.type] || 0
        const ready = owned >= r.required
        const percent = Math.min(100, Math.floor((owned / r.required) * 100))
        return { ...r, owned, ready, percent }
      }),
    [typeCounts]
  )

  const missing = useMemo(
    () => reqs.reduce((s, r) => s + Math.max(0, r.required - r.owned), 0),
    [reqs]
  )

  const jokerOwned = useMemo(
    () =>
      unlocked.reduce((sum, c) => {
        return String(c.cardId || '').toLowerCase() === 'joker_card' ? sum + c.quantity : sum
      }, 0),
    [unlocked]
  )

  const isReady = missing === 0 || jokerOwned >= missing

  const attempts = stats?.craftingAttempts || 0
  const successes = stats?.successfulCrafts || 0
  const failures = stats?.failedCrafts || 0
  const rate = attempts > 0 ? Math.round((successes / attempts) * 100) : 70

  const handleCraft = async () => {
    if (!userId || isCrafting || !isReady) return
    setIsCrafting(true)
    setResult(null)

    try {
      const res = await fetch('/api/cards/craft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, useMaterialCard: true }),
      })
      const data: CraftingResult = await res.json()
      setResult(data)
      setShowResult(true)
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('card-inventory-updated'))
      }
      await fetchData()
    } catch (err) {
      console.error('craft failed', err)
      setResult({ success: false, message: '제작 중 오류가 발생했어요.', usedCards: [] })
      setShowResult(true)
    } finally {
      setIsCrafting(false)
    }
  }

  if (!userId) {
    return (
      <PaperCard className={clsx('!p-10 text-center', className)}>
        <Hammer className="mx-auto h-10 w-10 text-ink-300" />
        <h3 className="display-han mt-3 text-2xl text-ink-500">프레스티지 작업대</h3>
        <p className="mt-2 text-sm text-ink-300">로그인 후 카드 제작을 시작할 수 있어요.</p>
      </PaperCard>
    )
  }

  if (isLoading) {
    return (
      <PaperCard className={clsx('flex flex-col items-center gap-3 !p-12 text-center', className)}>
        <span className="h-8 w-8 animate-spin rounded-full border-2 border-coral-500/30 border-t-coral-500" />
        <p className="caveat text-base text-ink-300">작업대 정리 중…</p>
      </PaperCard>
    )
  }

  return (
    <>
      <div className={clsx('space-y-6', className)}>
        {/* Header card */}
        <PaperCard className="relative !p-7 sm:!p-8">
          <TapeStrip className="tape--top" color="coral" />
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <CaveatText className="text-base text-coral-500">workshop</CaveatText>
              <h2 className="display-han mt-0.5 text-3xl text-ink-500">프레스티지 작업대</h2>
              <p className="mt-2 max-w-md text-sm leading-relaxed text-ink-300">
                <Handwritten size="sm" className="text-coral-500">년도 7 + 스페셜 3 + 시그니처 1</Handwritten>로
                프레스티지 카드를 제작합니다. 부족한 재료는 조커 카드로 대체할 수 있어요.
              </p>
            </div>
            <div className="rounded-full border border-mustard-500/40 bg-mustard-500/10 px-3 py-1 text-xs font-bold text-mustard-600">
              <Sparkles className="mr-1 inline h-3.5 w-3.5" />
              기본 성공률 {rate}%
            </div>
          </div>
        </PaperCard>

        {/* Recipe + craft action */}
        <PaperCard className="paper-card--lined !p-6 sm:!p-8">
          <div className="mb-5 flex items-end justify-between gap-3">
            <div>
              <CaveatText className="text-sm text-coral-500">recipe</CaveatText>
              <h3 className="display-han mt-0.5 text-2xl text-ink-500">필요 재료</h3>
            </div>
            <span className="text-[11px] text-ink-300">잠금 카드는 제외</span>
          </div>

          <div className="space-y-4">
            {reqs.map((r) => (
              <div key={r.type}>
                <div className="mb-1.5 flex items-center justify-between text-sm">
                  <span className="font-bold" style={{ color: r.color }}>
                    {r.label} 카드
                  </span>
                  <span
                    className={clsx('font-mono font-bold', r.ready ? 'text-sage-500' : 'text-coral-500')}
                  >
                    {r.owned} / {r.required}
                  </span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-ink-500/8">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${r.percent}%` }}
                    transition={{ duration: 0.6, ease: 'easeOut' }}
                    className="h-full rounded-full"
                    style={{ background: r.color, opacity: 0.7 }}
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Joker section */}
          <div className="mt-5 rounded-xl border border-dashed border-mustard-500/40 bg-mustard-500/5 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-2xl">🃏</span>
                <span className="text-sm font-bold text-mustard-600">조커 카드 보유</span>
              </div>
              <span
                className={clsx(
                  'font-mono text-lg font-bold',
                  jokerOwned > 0 ? 'text-sage-600' : 'text-coral-500'
                )}
              >
                {jokerOwned}장
              </span>
            </div>
            <p className="mt-2 text-xs leading-relaxed text-ink-300">
              {missing === 0
                ? '✓ 모든 기본 재료가 준비됐어요. 바로 제작 가능합니다.'
                : jokerOwned >= missing
                ? `부족한 재료 ${missing}장을 조커 카드로 대체합니다.`
                : `부족: 재료 ${missing}장. 조커 ${missing - jokerOwned}장이 더 필요해요.`}
            </p>
          </div>

          {/* Craft button */}
          <button
            type="button"
            onClick={handleCraft}
            disabled={isCrafting || !isReady}
            className={clsx(
              'mt-5 flex w-full items-center justify-center gap-2 rounded-2xl px-5 py-4 font-display text-lg transition-all',
              !isReady || isCrafting
                ? 'cursor-not-allowed bg-ink-500/15 text-ink-300'
                : 'bg-gradient-to-r from-coral-500 to-mustard-500 text-paper-50 shadow-paper hover:-translate-y-0.5 hover:shadow-polaroid'
            )}
          >
            {isCrafting ? (
              <>
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-paper-50/30 border-t-paper-50" />
                제작 중…
              </>
            ) : (
              <>
                <Hammer className="h-5 w-5" />
                {isReady ? '프레스티지 제작 실행' : '재료가 부족해요'}
              </>
            )}
          </button>
        </PaperCard>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          <PaperCard className="!p-4 text-center">
            <p className="text-[10px] uppercase tracking-[0.2em] text-ink-300">총 시도</p>
            <p className="mt-1 font-display text-2xl text-ink-500">{attempts}</p>
          </PaperCard>
          <PaperCard className="!p-4 text-center">
            <p className="text-[10px] uppercase tracking-[0.2em] text-sage-600">성공</p>
            <p className="mt-1 font-display text-2xl text-sage-500">{successes}</p>
          </PaperCard>
          <PaperCard className="!p-4 text-center">
            <p className="text-[10px] uppercase tracking-[0.2em] text-coral-600">실패</p>
            <p className="mt-1 font-display text-2xl text-coral-500">{failures}</p>
          </PaperCard>
        </div>

        {/* Prestige pool preview */}
        {prestigeCards.length > 0 && (
          <PaperCard className="!p-6 sm:!p-8">
            <div className="mb-5 flex items-end justify-between gap-3">
              <div>
                <CaveatText className="text-sm text-coral-500">drop pool</CaveatText>
                <h3 className="display-han mt-0.5 text-2xl text-ink-500">
                  <Crown className="mr-2 inline h-5 w-5 text-mustard-500" />
                  프레스티지 카드 풀
                </h3>
              </div>
              <Pin color="coral" />
            </div>

            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
              {prestigeCards.map((c, i) => (
                <div key={c.cardId} className="text-center">
                  <CardArtwork
                    imageUrl={c.imageUrl}
                    name={c.name}
                    rarity="legendary"
                    size="xs"
                    rotate={((i * 41) % 7) - 3}
                    showRarityChip={false}
                    hideCaption
                    className="mx-auto"
                  />
                  <p className="mt-2 text-xs font-bold text-ink-500 line-clamp-1">{c.name}</p>
                </div>
              ))}
            </div>
          </PaperCard>
        )}
      </div>

      <CraftResultModal
        open={showResult}
        result={result}
        onClose={() => setShowResult(false)}
      />
    </>
  )
}

function CraftResultModal({
  open,
  result,
  onClose,
}: {
  open: boolean
  result: CraftingResult | null
  onClose: () => void
}) {
  return (
    <AnimatePresence>
      {open && result && (
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

            {result.success && result.card ? (
              <>
                <CaveatText className="text-center text-lg text-sage-500">success!</CaveatText>
                <h3 className="display-han mt-1 text-center text-2xl text-ink-500">
                  <ShieldCheck className="mr-2 inline h-5 w-5 text-sage-500" />
                  프레스티지 획득
                </h3>

                <div className="mt-6 flex justify-center">
                  <motion.div
                    initial={{ scale: 0.7, rotate: -8 }}
                    animate={{ scale: [0.7, 1.06, 1], rotate: [-8, 2, 0] }}
                    transition={{ duration: 0.7, ease: 'easeOut' }}
                  >
                    <CardArtwork
                      imageUrl={result.card.imageUrl}
                      name={result.card.name}
                      rarity={result.card.rarity || 'legendary'}
                      size="md"
                      rotate={-1}
                      hideCaption
                      className="w-[210px]"
                    />
                  </motion.div>
                </div>

                <p className="mt-4 text-center font-display text-xl text-ink-500">{result.card.name}</p>
                <p className="mt-1 text-center text-sm text-ink-300">{result.card.description}</p>
                <div className="mt-3 flex justify-center">
                  <RarityChip rarity={result.card.rarity || 'legendary'} size="md" />
                </div>
              </>
            ) : (
              <>
                <CaveatText className="text-center text-lg text-coral-500">fail.</CaveatText>
                <h3 className="display-han mt-1 text-center text-2xl text-ink-500">
                  <AlertTriangle className="mr-2 inline h-5 w-5 text-coral-500" />
                  제작 실패
                </h3>

                <div className="mt-6 flex justify-center">
                  <div
                    className="relative flex h-32 w-32 items-center justify-center rounded-md border-4 border-coral-500/60 bg-paper-50"
                    style={{ transform: 'rotate(-6deg)' }}
                  >
                    <span className="caveat text-3xl text-coral-500">FAIL</span>
                  </div>
                </div>
              </>
            )}

            <div className="mt-5 rounded-xl border border-dashed border-ink-500/15 bg-paper-100/60 p-3 text-sm text-ink-300">
              {result.message}
            </div>

            {((result.usedCardDetails && result.usedCardDetails.length > 0) ||
              result.usedCards.length > 0) && (
              <div className="mt-4 rounded-xl border border-ink-500/15 bg-paper-50 p-3">
                <p className="mb-2 text-xs font-bold uppercase tracking-wider text-ink-300">
                  소모된 카드
                </p>
                <ul className="space-y-1 text-sm text-ink-500">
                  {(result.usedCardDetails || []).length > 0
                    ? result.usedCardDetails!.map((u) => (
                        <li key={`${u.cardId}-${u.quantity}`} className="flex items-center justify-between">
                          <span className="truncate">{u.name || '알 수 없는 카드'}</span>
                          <span className="font-mono font-bold">×{u.quantity}</span>
                        </li>
                      ))
                    : result.usedCards.map((u) => (
                        <li key={`${u.cardId}-${u.quantity}`} className="flex items-center justify-between">
                          <span>알 수 없는 카드</span>
                          <span className="font-mono font-bold">×{u.quantity}</span>
                        </li>
                      ))}
                </ul>
              </div>
            )}

            <button onClick={onClose} className="ink-button mt-6 w-full justify-center">
              확인
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
