'use client'

import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  AlertTriangle,
  CheckCircle,
  Crown,
  Flame,
  Hammer,
  ShieldCheck,
  Sparkles,
  WandSparkles,
  X,
  Zap
} from 'lucide-react'
import { Button } from './Button'
import { Card, CardContent, CardHeader } from './Card'

interface AdvancedCardCraftingProps {
  userId?: string
  className?: string
}

type CraftingMode = 'standard' | 'catalyst'

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
  modeUsed?: CraftingMode
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

interface PrestigePreviewCard {
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

const FALLBACK_IMAGE = '/images/default-music-cover.jpg'

const STANDARD_REQUIREMENTS = [
  { type: 'year', label: '년도 카드', required: 7, tone: 'from-slate-500 to-slate-700' },
  { type: 'special', label: '스페셜 카드', required: 3, tone: 'from-sky-500 to-indigo-600' },
  { type: 'signature', label: '시그니처 카드', required: 1, tone: 'from-fuchsia-500 to-rose-600' }
] as const

const getRarityBadge = (rarity?: string) => {
  switch ((rarity || '').toLowerCase()) {
    case 'legendary':
      return 'from-amber-400 to-orange-500'
    case 'epic':
      return 'from-fuchsia-500 to-rose-600'
    case 'rare':
      return 'from-sky-500 to-indigo-600'
    case 'material':
      return 'from-emerald-500 to-teal-600'
    default:
      return 'from-slate-500 to-slate-700'
  }
}

const getModeLabel = (mode: CraftingMode) =>
  mode === 'catalyst' ? '강화 촉매' : '정규 조합'

const PRESTIGE_SORT_ORDER = ['jaewon', 'minseok', 'jinkyu', 'hanul', 'seungchan', 'group']

const normalizePrestigeKey = (value?: string) => {
  const normalized = (value || '').replace(/\s+/g, '').toLowerCase()
  if (!normalized) return null

  if (normalized.includes('jaewon') || normalized.includes('정재원') || normalized.includes('재원')) return 'jaewon'
  if (normalized.includes('minseok') || normalized.includes('정민석') || normalized.includes('민석')) return 'minseok'
  if (normalized.includes('jinkyu') || normalized.includes('정진규') || normalized.includes('진규')) return 'jinkyu'
  if (normalized.includes('hanul') || normalized.includes('강한울') || normalized.includes('한울')) return 'hanul'
  if (normalized.includes('seungchan') || normalized.includes('이승찬') || normalized.includes('승찬')) return 'seungchan'
  if (normalized.includes('group') || normalized.includes('랑구')) return 'group'

  return null
}

export function AdvancedCardCrafting({ userId, className = '' }: AdvancedCardCraftingProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [isCrafting, setIsCrafting] = useState(false)
  const [craftingMode, setCraftingMode] = useState<CraftingMode>('standard')
  const [craftingResult, setCraftingResult] = useState<CraftingResult | null>(null)
  const [showResultModal, setShowResultModal] = useState(false)
  const [userStats, setUserStats] = useState<UserStats | null>(null)
  const [userCards, setUserCards] = useState<UserCard[]>([])
  const [prestigeCards, setPrestigeCards] = useState<PrestigePreviewCard[]>([])

  const fetchUserData = useCallback(async () => {
    if (!userId) return

    try {
      setIsLoading(true)
      const [statsResponse, cardsResponse, prestigeResponse] = await Promise.all([
        fetch(`/api/cards/stats?userId=${userId}`),
        fetch(`/api/cards/inventory?userId=${userId}&limit=300&sortBy=recent`),
        fetch('/api/cards?type=prestige&limit=20')
      ])

      const [statsData, cardsData, prestigeData] = await Promise.all([
        statsResponse.json(),
        cardsResponse.json(),
        prestigeResponse.json()
      ])

      if (statsData.success) {
        setUserStats(statsData.stats)
      }

      if (cardsData.success) {
        setUserCards(cardsData.inventory || [])
      }

      if (prestigeData.success) {
        const deduped = new Map<string, PrestigePreviewCard>()
        for (const card of prestigeData.cards || []) {
          const inferredKey =
            normalizePrestigeKey(card.member) ||
            normalizePrestigeKey(card.cardId?.replace(/^prestige_/, '')) ||
            normalizePrestigeKey(card.name) ||
            card.cardId

          const candidate: PrestigePreviewCard = {
            canonicalKey: inferredKey,
            cardId: card.cardId,
            name: card.name,
            imageUrl: card.imageUrl || FALLBACK_IMAGE
          }

          const existing = deduped.get(inferredKey)
          if (!existing) {
            deduped.set(inferredKey, candidate)
            continue
          }

          const existingScore =
            (existing.imageUrl !== FALLBACK_IMAGE ? 2 : 0) + existing.name.length
          const candidateScore =
            (candidate.imageUrl !== FALLBACK_IMAGE ? 2 : 0) + candidate.name.length

          if (candidateScore > existingScore) {
            deduped.set(inferredKey, candidate)
          }
        }

        const sorted = Array.from(deduped.values()).sort((a, b) => {
          const aIndex = PRESTIGE_SORT_ORDER.indexOf(a.canonicalKey)
          const bIndex = PRESTIGE_SORT_ORDER.indexOf(b.canonicalKey)
          const aOrder = aIndex === -1 ? 99 : aIndex
          const bOrder = bIndex === -1 ? 99 : bIndex
          if (aOrder !== bOrder) return aOrder - bOrder
          return a.name.localeCompare(b.name, 'ko')
        })

        setPrestigeCards(sorted)
      }
    } catch (error) {
      console.error('Failed to fetch crafting data:', error)
    } finally {
      setIsLoading(false)
    }
  }, [userId])

  useEffect(() => {
    fetchUserData()
  }, [fetchUserData])

  useEffect(() => {
    const handleInventoryUpdate = () => fetchUserData()
    window.addEventListener('card-inventory-updated', handleInventoryUpdate)
    return () => window.removeEventListener('card-inventory-updated', handleInventoryUpdate)
  }, [fetchUserData])

  const unlockedUserCards = useMemo(
    () => userCards.filter((card) => !card.isLocked),
    [userCards]
  )

  const cardTypeCounts = useMemo(() => {
    return unlockedUserCards.reduce((acc, card) => {
      const type = card.cardInfo.type
      acc[type] = (acc[type] || 0) + card.quantity
      return acc
    }, {} as Record<string, number>)
  }, [unlockedUserCards])

  const requirementProgress = useMemo(
    () =>
      STANDARD_REQUIREMENTS.map((requirement) => {
        const owned = cardTypeCounts[requirement.type] || 0
        const ready = owned >= requirement.required
        const percent = Math.min(100, Math.floor((owned / requirement.required) * 100))
        return { ...requirement, owned, ready, percent }
      }),
    [cardTypeCounts]
  )

  const isStandardReady = requirementProgress.every((item) => item.ready)
  const catalystOwned = cardTypeCounts.material || 0
  const isCatalystReady = catalystOwned >= 1

  const attempts = userStats?.craftingAttempts || 0
  const successes = userStats?.successfulCrafts || 0
  const failures = userStats?.failedCrafts || 0
  const currentSuccessRate = attempts > 0 ? Math.round((successes / attempts) * 100) : 70

  const handleCrafting = async (mode: CraftingMode) => {
    if (!userId || isCrafting) return
    if (mode === 'standard' && !isStandardReady) return
    if (mode === 'catalyst' && !isCatalystReady) return

    setIsCrafting(true)
    setCraftingResult(null)
    setCraftingMode(mode)

    try {
      const response = await fetch('/api/cards/craft', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userId,
          useMaterialCard: mode === 'catalyst'
        })
      })

      const result: CraftingResult = await response.json()
      result.modeUsed = mode
      setCraftingResult(result)
      setShowResultModal(true)

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('card-inventory-updated'))
      }

      await fetchUserData()
    } catch (error) {
      console.error('Crafting error:', error)
      setCraftingResult({
        success: false,
        message: '조합/강화 중 오류가 발생했습니다.',
        usedCards: [],
        modeUsed: mode
      })
      setShowResultModal(true)
    } finally {
      setIsCrafting(false)
    }
  }

  const closeResultModal = () => setShowResultModal(false)

  if (!userId) {
    return (
      <Card className={className}>
        <CardContent className="p-8 text-center">
          <Hammer className="mx-auto mb-4 h-16 w-16 text-gray-400" />
          <h3 className="mb-2 text-lg font-semibold text-gray-700">제작/강화 스테이션</h3>
          <p className="text-gray-500">로그인 후 프레스티지 제작을 시작할 수 있어요.</p>
        </CardContent>
      </Card>
    )
  }

  if (isLoading) {
    return (
      <Card className={className}>
        <CardContent className="p-8 text-center">
          <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-b-2 border-primary-500" />
          <p className="text-gray-500">제작 데이터를 불러오고 있습니다...</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card variant="flat" className={`overflow-hidden shadow-2xl ${className}`}>
        <CardHeader className="border-b border-gray-200/80 bg-white">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center space-x-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-500 to-rose-500 text-white shadow-lg">
                <Hammer className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">제작 / 강화 랩</h2>
                <p className="text-sm text-gray-600">프레스티지 카드를 조합하거나 촉매 강화로 획득하세요.</p>
              </div>
            </div>
            <div className="inline-flex items-center gap-2 rounded-full border border-amber-300/50 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
              <Sparkles className="h-3.5 w-3.5" />
              <span>기본 성공률 70%</span>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-6 bg-white/95">
          <div className="grid gap-4 md:grid-cols-2">
            <button
              type="button"
              className={`rounded-2xl border p-4 text-left transition ${
                craftingMode === 'standard'
                  ? 'border-indigo-400 bg-indigo-50 shadow-lg shadow-indigo-100'
                  : 'border-gray-200 bg-white hover:border-indigo-200'
              }`}
              onClick={() => setCraftingMode('standard')}
            >
              <div className="mb-2 flex items-center gap-2">
                <div className="rounded-lg bg-indigo-100 p-2 text-indigo-600">
                  <Zap className="h-4 w-4" />
                </div>
                <p className="font-semibold text-gray-900">정규 조합</p>
              </div>
              <p className="text-sm text-gray-600">년도 7 + 스페셜 3 + 시그니처 1 소모</p>
              <p className="mt-2 text-xs font-medium text-indigo-700">
                준비 상태: {isStandardReady ? '조합 가능' : '재료 부족'}
              </p>
            </button>

            <button
              type="button"
              className={`rounded-2xl border p-4 text-left transition ${
                craftingMode === 'catalyst'
                  ? 'border-emerald-400 bg-emerald-50 shadow-lg shadow-emerald-100'
                  : 'border-gray-200 bg-white hover:border-emerald-200'
              }`}
              onClick={() => setCraftingMode('catalyst')}
            >
              <div className="mb-2 flex items-center gap-2">
                <div className="rounded-lg bg-emerald-100 p-2 text-emerald-600">
                  <WandSparkles className="h-4 w-4" />
                </div>
                <p className="font-semibold text-gray-900">강화 촉매</p>
              </div>
              <p className="text-sm text-gray-600">재료 카드 1장 이상 보유 시 즉시 시도 (재료 소모 없음)</p>
              <p className="mt-2 text-xs font-medium text-emerald-700">
                준비 상태: {isCatalystReady ? '강화 가능' : '재료 카드 필요'}
              </p>
            </button>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-gray-50/80 p-4">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-900">
                {craftingMode === 'standard' ? '정규 조합 요구 재료' : '강화 촉매 요구 재료'}
              </h3>
              <span className="text-xs text-gray-500">
                {craftingMode === 'standard'
                  ? '잠금 카드는 계산에서 제외됩니다'
                  : '잠금된 재료 카드는 강화에 사용할 수 없습니다'}
              </span>
            </div>

            {craftingMode === 'standard' ? (
              <div className="space-y-3">
                {requirementProgress.map((item) => (
                  <div key={item.type}>
                    <div className="mb-1 flex items-center justify-between text-xs">
                      <span className="font-medium text-gray-700">{item.label}</span>
                      <span className={item.ready ? 'font-semibold text-emerald-600' : 'font-semibold text-rose-600'}>
                        {item.owned}/{item.required}
                      </span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200">
                      <div
                        className={`h-full bg-gradient-to-r ${item.tone}`}
                        style={{ width: `${item.percent}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-emerald-900">재료 카드 보유량</span>
                  <span className={isCatalystReady ? 'font-bold text-emerald-700' : 'font-bold text-rose-600'}>
                    {catalystOwned} / 1
                  </span>
                </div>
              </div>
            )}

            <Button
              variant="primary"
              size="lg"
              className={`mt-4 w-full ${
                craftingMode === 'standard'
                  ? 'bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700'
                  : 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700'
              }`}
              onClick={() => handleCrafting(craftingMode)}
              disabled={isCrafting || (craftingMode === 'standard' ? !isStandardReady : !isCatalystReady)}
            >
              {isCrafting ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-b-2 border-white" />
                  <span>실행 중...</span>
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  {craftingMode === 'standard' ? <Zap className="h-4 w-4" /> : <Flame className="h-4 w-4" />}
                  <span>{craftingMode === 'standard' ? '정규 조합 실행' : '강화 촉매 실행'}</span>
                </span>
              )}
            </Button>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-gray-200 bg-white p-3 text-center">
              <p className="text-xs text-gray-500">총 시도</p>
              <p className="mt-1 text-2xl font-bold text-gray-900">{attempts}</p>
            </div>
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-center">
              <p className="text-xs text-emerald-700">성공</p>
              <p className="mt-1 text-2xl font-bold text-emerald-700">{successes}</p>
            </div>
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-center">
              <p className="text-xs text-rose-700">실패</p>
              <p className="mt-1 text-2xl font-bold text-rose-700">{failures}</p>
            </div>
          </div>

          <div className="rounded-2xl border border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50 p-4">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="flex items-center gap-2 text-sm font-semibold text-amber-900">
                <Crown className="h-4 w-4" />
                <span>프레스티지 카드 풀</span>
              </h3>
              <span className="text-xs font-medium text-amber-800">현재 성공률 {currentSuccessRate}%</span>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
              {prestigeCards.map((card) => (
                <div key={card.cardId} className="overflow-hidden rounded-xl border border-amber-200 bg-white">
                  <div className="h-28 w-full overflow-hidden bg-amber-100">
                    <img
                      src={card.imageUrl}
                      alt={card.name}
                      onError={(event) => {
                        event.currentTarget.src = FALLBACK_IMAGE
                      }}
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <div className="p-2">
                    <p className="line-clamp-2 text-center text-xs font-semibold text-gray-800">{card.name}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <AnimatePresence>
        {showResultModal && craftingResult && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeResultModal}
          >
            <motion.div
              className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl"
              initial={{ scale: 0.86, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.86, opacity: 0, y: 20 }}
              onClick={(event) => event.stopPropagation()}
            >
              <div
                className={`p-4 text-white ${
                  craftingResult.success
                    ? 'bg-gradient-to-r from-emerald-500 to-teal-600'
                    : 'bg-gradient-to-r from-rose-500 to-red-600'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {craftingResult.success ? <ShieldCheck className="h-5 w-5" /> : <AlertTriangle className="h-5 w-5" />}
                    <span className="font-semibold">{craftingResult.success ? '획득 성공!' : '획득 실패'}</span>
                  </div>
                  <button onClick={closeResultModal} className="rounded p-1 hover:bg-white/20">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="space-y-4 p-5">
                {craftingResult.success && craftingResult.card ? (
                  <div className="text-center">
                    <div className="mx-auto mb-3 h-40 w-28 overflow-hidden rounded-lg border border-gray-200">
                      <img
                        src={craftingResult.card.imageUrl || FALLBACK_IMAGE}
                        alt={craftingResult.card.name}
                        onError={(event) => {
                          event.currentTarget.src = FALLBACK_IMAGE
                        }}
                        className="h-full w-full object-cover"
                      />
                    </div>
                    <p className="text-lg font-bold text-gray-900">{craftingResult.card.name}</p>
                    <p className="mt-1 text-sm text-gray-600">{craftingResult.card.description}</p>
                    <span
                      className={`mt-3 inline-flex rounded-full bg-gradient-to-r px-3 py-1 text-xs font-semibold text-white ${getRarityBadge(
                        craftingResult.card.rarity
                      )}`}
                    >
                      {(craftingResult.card.rarity || 'legendary').toUpperCase()}
                    </span>
                  </div>
                ) : (
                  <div className="text-center">
                    <div className="mx-auto mb-2 flex h-14 w-14 items-center justify-center rounded-full bg-rose-100">
                      <X className="h-7 w-7 text-rose-500" />
                    </div>
                  </div>
                )}

                <div className="rounded-xl border border-gray-200 bg-gray-50 p-3 text-sm text-gray-700">
                  <p className="font-medium text-gray-900">{getModeLabel(craftingResult.modeUsed || craftingMode)}</p>
                  <p className="mt-1">{craftingResult.message}</p>
                </div>

                {((craftingResult.usedCardDetails && craftingResult.usedCardDetails.length > 0) ||
                  craftingResult.usedCards.length > 0) && (
                  <div className="rounded-xl border border-gray-200 bg-white p-3">
                    <p className="mb-2 text-sm font-semibold text-gray-900">소모 카드</p>
                    <div className="space-y-1 text-sm text-gray-700">
                      {(craftingResult.usedCardDetails || []).length > 0
                        ? (craftingResult.usedCardDetails || []).map((used) => (
                            <div key={`${used.cardId}-${used.quantity}`} className="flex items-center justify-between">
                              <span>{used.name || '알 수 없는 카드'}</span>
                              <span className="font-semibold">×{used.quantity}</span>
                            </div>
                          ))
                        : craftingResult.usedCards.map((used) => (
                            <div key={`${used.cardId}-${used.quantity}`} className="flex items-center justify-between">
                              <span>알 수 없는 카드</span>
                              <span className="font-semibold">×{used.quantity}</span>
                            </div>
                          ))}
                    </div>
                  </div>
                )}

                <Button variant="glass" className="w-full" onClick={closeResultModal}>
                  확인
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
