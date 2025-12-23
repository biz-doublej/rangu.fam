'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Activity,
  AlertCircle,
  CheckCircle,
  Clock,
  Gift,
  Package,
  Shield,
  Sparkles,
  Star,
  Timer,
  X,
  Zap
} from 'lucide-react'
import { Button } from './Button'
import { Card, CardContent } from './Card'

interface CardDropWidgetProps {
  userId?: string
  className?: string
}

interface DroppedCard {
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

interface DropResult {
  success: boolean
  card?: DroppedCard
  message: string
  remainingDrops: number
}

const FALLBACK_IMAGE = '/images/default-music-cover.jpg'

const rarityTiers = [
  { key: 'basic', label: '베이직', chance: '45%', accent: 'from-slate-400 to-slate-600' },
  { key: 'rare', label: '레어', chance: '30%', accent: 'from-sky-400 to-indigo-500' },
  { key: 'epic', label: '에픽', chance: '15%', accent: 'from-rose-400 to-fuchsia-500' },
  { key: 'legendary', label: '레전더리', chance: '8%', accent: 'from-amber-400 to-orange-500' },
  { key: 'material', label: '소재', chance: '2%', accent: 'from-emerald-400 to-teal-500' }
]

const getRarityColor = (rarity: string) => {
  switch (rarity) {
    case 'basic':
      return 'from-gray-400 to-gray-600'
    case 'rare':
      return 'from-blue-400 to-purple-600'
    case 'epic':
      return 'from-pink-400 to-rose-600'
    case 'legendary':
      return 'from-yellow-400 to-orange-600'
    case 'material':
      return 'from-green-400 to-teal-600'
    default:
      return 'from-gray-400 to-gray-600'
  }
}

const getRarityIcon = (rarity: string) => {
  switch (rarity) {
    case 'basic':
      return Package
    case 'rare':
      return Star
    case 'epic':
      return Sparkles
    case 'legendary':
      return Zap
    case 'material':
      return Gift
    default:
      return Package
  }
}

export function CardDropWidget({ userId, className = '' }: CardDropWidgetProps) {
  const [remainingDrops, setRemainingDrops] = useState(0)
  const [isDropping, setIsDropping] = useState(false)
  const [lastDroppedCard, setLastDroppedCard] = useState<DroppedCard | null>(null)
  const [showCardModal, setShowCardModal] = useState(false)
  const [dropMessage, setDropMessage] = useState('')
  const [isLoading, setIsLoading] = useState(true)

  // 오늘 남은 드랍 횟수 조회
  const fetchRemainingDrops = async () => {
    if (!userId) return

    try {
      setIsLoading(true)
      const response = await fetch(`/api/cards/drop?userId=${userId}`)
      const data = await response.json()

      if (data.success) {
        setRemainingDrops(data.remainingDrops ?? 0)
      }
    } catch (error) {
      console.error('Failed to fetch remaining drops:', error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchRemainingDrops()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId])

  // 카드 드랍 실행
  const handleCardDrop = async () => {
    if (!userId || isDropping) return
    if (remainingDrops <= 0) {
      setDropMessage('오늘 사용 가능한 드랍을 모두 소진했어요.')
      return
    }

    setIsDropping(true)
    setDropMessage('')

    try {
      const response = await fetch('/api/cards/drop', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ userId })
      })

      const result: DropResult = await response.json()

      setDropMessage(result.message)
      setRemainingDrops(result.remainingDrops)

      if (result.success && result.card) {
        const safeCard = {
          ...result.card,
          imageUrl: !result.card.imageUrl || result.card.imageUrl.includes('/images/cards/')
            ? FALLBACK_IMAGE
            : result.card.imageUrl
        }
        setLastDroppedCard(safeCard)
        setShowCardModal(true)
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('card-inventory-updated'))
        }
      }
    } catch (error) {
      console.error('Card drop error:', error)
      setDropMessage('카드 드랍 중 오류가 발생했어요.')
    } finally {
      setIsDropping(false)
    }
  }

  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget
    if (!img.src.includes(FALLBACK_IMAGE)) {
      img.src = FALLBACK_IMAGE
    }
  }

  const formattedRemaining =
    remainingDrops > 900 ? '∞' : `${remainingDrops.toLocaleString()}회`

  if (!userId) {
    return (
      <Card className={`${className} opacity-50`}>
        <CardContent className="p-4 text-center">
          <Package className="w-8 h-8 mx-auto mb-2 text-gray-400" />
          <p className="text-sm text-gray-500">로그인이 필요해요</p>
        </CardContent>
      </Card>
    )
  }

  if (isLoading) {
    return (
      <Card className={className}>
        <CardContent className="p-4 text-center">
          <div className="mx-auto mb-2 h-8 w-8 animate-spin rounded-full border-b-2 border-primary-500"></div>
          <p className="text-sm text-gray-500">불러오는 중...</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card className={`${className} relative overflow-hidden`}>
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-50 via-white to-amber-50" />
        <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-amber-200/40 blur-3xl" />
        <div className="absolute -left-8 top-16 h-28 w-28 rounded-full bg-indigo-200/30 blur-3xl" />
        <CardContent className="relative space-y-4 p-5">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center space-x-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-amber-500 text-white shadow-lg">
                  <Package className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-gray-500">Daily Drop</p>
                  <h3 className="text-lg font-semibold text-gray-800">카드 드랍 스테이션</h3>
                </div>
              </div>
              <p className="mt-2 text-sm text-gray-600">
                매일 쌓이는 룰렛으로 새로운 카드와 소재를 수집해 보세요.
              </p>
            </div>
            <div className="text-right">
              <div className="flex items-center justify-end space-x-2 text-xs text-gray-500">
                <Clock className="h-3.5 w-3.5" />
                <span>오늘 남은 드랍</span>
              </div>
              <div className="mt-1 inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-sm font-semibold text-gray-800 shadow-inner">
                <span>{formattedRemaining}</span>
                <Shield className="h-4 w-4 text-amber-500" />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-[1.2fr,0.8fr]">
            <Button
              variant="glass"
              className="relative w-full overflow-hidden bg-gradient-to-r from-indigo-500 via-violet-500 to-amber-400 text-white shadow-lg shadow-indigo-200"
              onClick={handleCardDrop}
              disabled={isDropping || remainingDrops <= 0}
            >
              <div className="absolute inset-0 bg-white/15 blur-lg" />
              <div className="relative flex items-center justify-center space-x-2 text-base font-semibold">
                <AnimatePresence mode="wait">
                  {isDropping ? (
                    <motion.div
                      key="dropping"
                      className="flex items-center space-x-2"
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                    >
                      <div className="h-4 w-4 animate-spin rounded-full border-b-2 border-white" />
                      <span>드랍을 전송 중...</span>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="ready"
                      className="flex items-center space-x-2"
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                    >
                      <Sparkles className="h-5 w-5" />
                      <span>{remainingDrops <= 0 ? '오늘 드랍 종료' : '카드 드랍 실행'}</span>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </Button>

            <div className="rounded-2xl border border-white/70 bg-white/70 p-3 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Timer className="h-4 w-4 text-indigo-500" />
                  <span className="text-xs font-medium text-gray-600">쿨다운</span>
                </div>
                <span className="text-xs text-gray-500">24시간 리셋</span>
              </div>
              <div className="mt-3 flex items-center justify-between">
                <div className="text-sm text-gray-600">안전 드랍 보호</div>
                <div className="flex items-center space-x-1 rounded-full bg-indigo-50 px-2 py-1 text-xs font-semibold text-indigo-600">
                  <Shield className="h-3.5 w-3.5" />
                  <span>페널티 없음</span>
                </div>
              </div>
              <div className="mt-3 flex items-center space-x-2 text-xs text-gray-500">
                <Activity className="h-3.5 w-3.5 text-amber-500" />
                <span>드랍된 카드는 즉시 인벤토리에 반영돼요.</span>
              </div>
            </div>
          </div>

          <AnimatePresence>
            {dropMessage && (
              <motion.div
                className={`rounded-xl border px-3 py-2 text-xs shadow-sm ${
                  dropMessage.includes('성공') || dropMessage.includes('획득')
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                    : 'border-amber-200 bg-amber-50 text-amber-700'
                }`}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 6 }}
              >
                <div className="flex items-center space-x-2">
                  {dropMessage.includes('성공') || dropMessage.includes('획득') ? (
                    <CheckCircle className="h-4 w-4 flex-shrink-0" />
                  ) : (
                    <AlertCircle className="h-4 w-4 flex-shrink-0" />
                  )}
                  <span>{dropMessage}</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {rarityTiers.map((tier) => (
              <div
                key={tier.key}
                className="flex items-center justify-between rounded-xl border border-white/70 bg-white/60 px-3 py-2 text-xs text-gray-700"
              >
                <div className="flex items-center space-x-2">
                  <div className={`flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br ${tier.accent} text-[10px] font-bold text-white`}>
                    {tier.label.slice(0, 2)}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-800">{tier.label}</p>
                    <p className="text-[11px] text-gray-500">등급 도전 확률</p>
                  </div>
                </div>
                <span className="text-sm font-bold">{tier.chance}</span>
              </div>
            ))}
          </div>

          <div className="rounded-2xl border border-white/80 bg-white/70 p-4 shadow-inner">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Sparkles className="h-4 w-4 text-amber-500" />
                <h4 className="text-sm font-semibold text-gray-800">최근 드랍 미리보기</h4>
              </div>
              <span className="text-xs text-gray-500">실시간 반영</span>
            </div>

            {lastDroppedCard ? (
              <div className="mt-3 flex items-center space-x-3 rounded-xl bg-gradient-to-r from-white via-white to-amber-50 p-3">
                <div className="relative h-14 w-10 overflow-hidden rounded-md border border-gray-200 bg-gradient-to-br from-slate-100 to-white shadow-sm">
                  {lastDroppedCard.imageUrl ? (
                    <img
                      src={lastDroppedCard.imageUrl}
                      alt={lastDroppedCard.name}
                      onError={handleImageError}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-sm font-bold text-gray-400">
                      {lastDroppedCard.name?.charAt(0) ?? '★'}
                    </div>
                  )}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-gray-800">{lastDroppedCard.name}</p>
                  <p className="text-xs text-gray-500 line-clamp-2">{lastDroppedCard.description}</p>
                  <div className="mt-1 flex items-center space-x-2">
                    <span
                      className={`rounded-full bg-gradient-to-r ${getRarityColor(
                        lastDroppedCard.rarity
                      )} px-2 py-1 text-[11px] font-semibold text-white`}
                    >
                      {lastDroppedCard.rarity.toUpperCase()}
                    </span>
                    {lastDroppedCard.year && (
                      <span className="rounded-full bg-gray-100 px-2 py-1 text-[11px] text-gray-600">
                        {lastDroppedCard.year} · {lastDroppedCard.period === 'h1' ? '상반기' : '하반기'}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="mt-3 flex items-center justify-between rounded-xl border border-dashed border-gray-200 bg-white/60 p-3 text-sm text-gray-500">
                <span>아직 드랍된 카드가 없어요. 첫 드랍을 시작해 보세요!</span>
                <Sparkles className="h-4 w-4 text-amber-500" />
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 카드 획득 모달 */}
      <AnimatePresence>
        {showCardModal && lastDroppedCard && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowCardModal(false)}
          >
            <motion.div
              className="relative w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl"
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className={`bg-gradient-to-r ${getRarityColor(lastDroppedCard.rarity)} px-5 py-4 text-white`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    {React.createElement(getRarityIcon(lastDroppedCard.rarity), {
                      className: 'h-5 w-5'
                    })}
                    <span className="text-sm font-semibold">새 카드 획득</span>
                  </div>
                  <button
                    onClick={() => setShowCardModal(false)}
                    className="rounded-full p-1 hover:bg-white/20"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="px-6 py-5">
                <div className="text-center">
                  <div className="mx-auto mb-3 h-32 w-24 overflow-hidden rounded-lg border border-gray-200 bg-gradient-to-br from-slate-50 to-white shadow-inner">
                    {lastDroppedCard.imageUrl ? (
                    <img
                      src={lastDroppedCard.imageUrl}
                      alt={lastDroppedCard.name}
                      onError={handleImageError}
                      className="h-full w-full object-cover"
                    />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-2xl font-bold text-gray-400">
                        {lastDroppedCard.name?.charAt(0) ?? '★'}
                      </div>
                    )}
                  </div>
                  <h3 className="text-xl font-bold text-gray-900">{lastDroppedCard.name}</h3>
                  <p className="mt-1 text-sm text-gray-600">{lastDroppedCard.description}</p>
                  <div className="mt-3 flex items-center justify-center space-x-2">
                    <span
                      className={`rounded-full bg-gradient-to-r ${getRarityColor(
                        lastDroppedCard.rarity
                      )} px-3 py-1 text-xs font-semibold text-white`}
                    >
                      {lastDroppedCard.rarity.toUpperCase()}
                    </span>
                    {lastDroppedCard.year && (
                      <span className="rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-700">
                        {lastDroppedCard.year} · {lastDroppedCard.period === 'h1' ? '상반기' : '하반기'}
                      </span>
                    )}
                  </div>
                </div>

                <Button variant="glass" className="mt-5 w-full" onClick={() => setShowCardModal(false)}>
                  확인했어요
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
