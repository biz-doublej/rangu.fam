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
import { useAuth } from '@/contexts/AuthContext'

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
const DROP_ALLOWED_MEMBER_IDS = new Set(['hanul', 'jaewon', 'jinkyu', 'seungchan', 'minseok'])
const MEMBER_TO_CODE: Record<string, string> = {
  강한울: 'HAN',
  정재원: 'JAE',
  정진규: 'JIN',
  이승찬: 'LEE',
  정민석: 'MIN'
}

const inferShortYear = (card: DroppedCard) => {
  if (card.year) {
    return String(card.year).slice(-2)
  }

  const source = `${card.cardId} ${card.imageUrl}`
  const match = source.match(/_(\d{2})(?:_|\.|$)/)
  return match?.[1]
}

const getPreOpenImage = (card: DroppedCard) => {
  const normalizedType = (card.type || '').toLowerCase()

  if (normalizedType === 'year') {
    const shortYear = inferShortYear(card)
    if (shortYear) {
      const fullYear = Number(shortYear) >= 70 ? `19${shortYear}` : `20${shortYear}`
      return `/images/cards/year/BG_${fullYear}.jpg`
    }
    return '/images/cards/year/BG_2025.jpg'
  }

  if (normalizedType === 'signature') {
    return '/images/cards/signature/BG_SIGNATURE.jpg'
  }

  if (normalizedType === 'special') {
    return '/images/cards/special/BG_SPECIAL.jpg'
  }

  if (normalizedType === 'prestige') {
    const memberCode = card.member ? MEMBER_TO_CODE[card.member] : undefined
    if (memberCode) {
      return `/images/cards/prestige/BG_${memberCode}_PRE.jpg`
    }
    return '/images/cards/prestige/PGBG.jpg'
  }

  return FALLBACK_IMAGE
}

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

type RevealPreset = {
  sealedTintClass: string
  auraClass: string
  buttonClass: string
  buttonLabel: string
  revealHint: string
  revealInitial: any
  revealAnimate: any
  revealTransition: any
  revealStyle?: React.CSSProperties
}

const getRevealPreset = (rarity: string): RevealPreset => {
  const normalizedRarity = (rarity || '').toLowerCase()

  switch (normalizedRarity) {
    case 'legendary':
      return {
        sealedTintClass: 'bg-gradient-to-b from-amber-500/20 via-orange-500/30 to-rose-600/30',
        auraClass: 'bg-gradient-to-br from-amber-300/40 via-orange-300/20 to-rose-300/35',
        buttonClass: 'bg-gradient-to-r from-amber-500 to-orange-500 text-white border-transparent',
        buttonLabel: '전설 카드 개봉',
        revealHint: '강렬한 섬광 연출이 적용됩니다.',
        revealInitial: { opacity: 0, scale: 0.58, rotate: -14, y: 16, filter: 'brightness(2.5) saturate(1.8)' },
        revealAnimate: {
          opacity: 1,
          scale: [0.58, 1.1, 1],
          rotate: [-14, 4, 0],
          y: [16, -2, 0],
          filter: ['brightness(2.5) saturate(1.8)', 'brightness(1.3) saturate(1.2)', 'brightness(1) saturate(1)'],
          boxShadow: [
            '0 0 0 rgba(251,191,36,0)',
            '0 0 45px rgba(251,191,36,0.65)',
            '0 0 20px rgba(251,191,36,0.25)'
          ]
        },
        revealTransition: { duration: 0.92, times: [0, 0.6, 1], ease: 'easeOut' }
      }
    case 'epic':
      return {
        sealedTintClass: 'bg-gradient-to-b from-fuchsia-500/20 via-rose-500/25 to-violet-600/30',
        auraClass: 'bg-gradient-to-br from-fuchsia-300/35 via-pink-300/20 to-violet-300/30',
        buttonClass: 'bg-gradient-to-r from-fuchsia-500 to-rose-500 text-white border-transparent',
        buttonLabel: '에픽 카드 개봉',
        revealHint: '확대 + 색감 증폭 연출이 적용됩니다.',
        revealInitial: { opacity: 0, scale: 0.72, rotate: -8, filter: 'brightness(2) saturate(1.4)' },
        revealAnimate: {
          opacity: 1,
          scale: [0.72, 1.06, 1],
          rotate: [-8, 2, 0],
          filter: ['brightness(2) saturate(1.4)', 'brightness(1.2) saturate(1.2)', 'brightness(1) saturate(1)']
        },
        revealTransition: { duration: 0.72, times: [0, 0.65, 1], ease: 'easeOut' }
      }
    case 'rare':
      return {
        sealedTintClass: 'bg-gradient-to-b from-sky-500/20 via-indigo-500/25 to-blue-700/30',
        auraClass: 'bg-gradient-to-br from-sky-300/35 via-indigo-300/20 to-blue-300/25',
        buttonClass: 'bg-gradient-to-r from-sky-500 to-indigo-500 text-white border-transparent',
        buttonLabel: '레어 카드 개봉',
        revealHint: '측면 플립 연출이 적용됩니다.',
        revealInitial: { opacity: 0, rotateY: -90, scale: 0.88 },
        revealAnimate: { opacity: 1, rotateY: 0, scale: 1 },
        revealTransition: { type: 'spring', stiffness: 190, damping: 18, mass: 0.8 },
        revealStyle: { transformStyle: 'preserve-3d' }
      }
    case 'material':
      return {
        sealedTintClass: 'bg-gradient-to-b from-emerald-500/20 via-teal-500/20 to-green-700/30',
        auraClass: 'bg-gradient-to-br from-emerald-300/30 via-teal-300/20 to-green-300/20',
        buttonClass: 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white border-transparent',
        buttonLabel: '소재 카드 확인',
        revealHint: '안정적인 펄스 연출이 적용됩니다.',
        revealInitial: { opacity: 0, y: 14, scale: 0.9 },
        revealAnimate: { opacity: 1, y: [14, 0], scale: [0.9, 1.03, 1] },
        revealTransition: { duration: 0.56, ease: 'easeOut' }
      }
    case 'basic':
    default:
      return {
        sealedTintClass: 'bg-gradient-to-b from-slate-500/20 via-slate-700/25 to-slate-900/30',
        auraClass: 'bg-gradient-to-br from-slate-300/25 via-slate-400/15 to-slate-500/20',
        buttonClass: 'bg-gradient-to-r from-slate-600 to-slate-700 text-white border-transparent',
        buttonLabel: '카드 열기',
        revealHint: '부드러운 페이드 연출이 적용됩니다.',
        revealInitial: { opacity: 0, y: 10, scale: 0.95 },
        revealAnimate: { opacity: 1, y: 0, scale: 1 },
        revealTransition: { duration: 0.42, ease: 'easeOut' }
      }
  }
}

export function CardDropWidget({ userId, className = '' }: CardDropWidgetProps) {
  const { user } = useAuth()
  const [remainingDrops, setRemainingDrops] = useState(0)
  const [isDropping, setIsDropping] = useState(false)
  const [lastDroppedCard, setLastDroppedCard] = useState<DroppedCard | null>(null)
  const [lastRevealedCard, setLastRevealedCard] = useState<DroppedCard | null>(null)
  const [hasPendingReveal, setHasPendingReveal] = useState(false)
  const [showCardModal, setShowCardModal] = useState(false)
  const [isCardRevealed, setIsCardRevealed] = useState(false)
  const [dropMessage, setDropMessage] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const isAuthorizedDropMember = DROP_ALLOWED_MEMBER_IDS.has(user?.memberId || '')

  // 오늘 남은 드랍 횟수 조회
  const fetchRemainingDrops = async () => {
    if (!userId) return
    if (!isAuthorizedDropMember) {
      setRemainingDrops(0)
      setIsLoading(false)
      return
    }

    try {
      setIsLoading(true)
      const response = await fetch(`/api/cards/drop?userId=${userId}`)
      const data = await response.json().catch(() => null)

      if (response.ok && data?.success) {
        setRemainingDrops(data.remainingDrops ?? 0)
      } else {
        setRemainingDrops(0)
        if (data?.message) {
          setDropMessage(data.message)
        }
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
  }, [userId, isAuthorizedDropMember])

  // 카드 드랍 실행
  const handleCardDrop = async () => {
    if (!userId || isDropping) return
    if (!isAuthorizedDropMember) {
      setDropMessage('카드 드랍은 랑구팸 다섯 멤버 전용입니다.')
      return
    }
    if (remainingDrops <= 0) {
      setDropMessage('24시간 동안 사용 가능한 드랍 5회를 모두 사용했어요.')
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

      const result: DropResult = await response.json().catch(() => ({
        success: false,
        message: '카드 드랍 결과를 확인하지 못했습니다.',
        remainingDrops: 0
      }))

      setDropMessage(result.message)
      setRemainingDrops(result.remainingDrops ?? 0)

      if (result.success && result.card) {
        const safeCard = {
          ...result.card,
          imageUrl: result.card.imageUrl || FALLBACK_IMAGE
        }
        setLastDroppedCard(safeCard)
        setHasPendingReveal(true)
        setIsCardRevealed(false)
        setShowCardModal(true)
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('card-inventory-updated'))
        }
      }

      if (!response.ok && !result.success && !result.message) {
        setDropMessage('카드 드랍을 진행할 수 없습니다.')
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

  const normalizedRemainingDrops = Math.max(0, Math.min(5, Number(remainingDrops || 0)))
  const formattedRemaining = `${normalizedRemainingDrops} / 5회`
  const revealPreset = getRevealPreset(lastDroppedCard?.rarity || 'basic')

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

  if (!isAuthorizedDropMember) {
    return (
      <Card className={`${className} opacity-90`}>
        <CardContent className="space-y-2 p-5 text-center">
          <Shield className="mx-auto h-7 w-7 text-amber-400" />
          <p className="text-sm font-semibold text-slate-100">카드 드랍 멤버 전용</p>
          <p className="text-xs text-slate-300">
            랑구팸 5인 멤버(HAN/JAE/JIN/LEE/MIN)만 카드 드랍을 사용할 수 있어요.
          </p>
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
      <Card className={`${className} relative overflow-hidden border border-white/15 bg-slate-900/80 text-slate-100 backdrop-blur-xl`}>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(56,189,248,0.18),transparent_45%),radial-gradient(circle_at_bottom_left,rgba(251,191,36,0.15),transparent_45%)]" />
        <div className="absolute inset-0 bg-gradient-to-b from-slate-900/20 via-slate-900/45 to-slate-950/80" />
        <CardContent className="relative space-y-5 p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center space-x-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500 to-indigo-600 text-white shadow-lg shadow-cyan-900/40">
                  <Package className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-xs uppercase tracking-widest text-cyan-100/70">Daily Drop</p>
                  <h3 className="text-xl font-bold text-white">카드 드랍 스테이션</h3>
                </div>
              </div>
              <p className="mt-2 text-sm leading-relaxed text-slate-200/85">
                드랍 버튼 한 번으로 오늘의 카드 획득부터 인벤토리 반영까지 바로 연결됩니다.
              </p>
            </div>
            <div className="rounded-2xl border border-cyan-200/20 bg-slate-900/80 px-3 py-2 text-right">
              <div className="flex items-center justify-end gap-1 text-[11px] text-slate-300">
                <Clock className="h-3 w-3" />
                <span>오늘 남은 드랍</span>
              </div>
              <div className="mt-1 flex items-center justify-end gap-2 text-base font-bold text-cyan-100">
                <span>{formattedRemaining}</span>
                <Shield className="h-4 w-4 text-amber-300" />
              </div>
            </div>
          </div>

          <Button
            variant="glass"
            className="relative h-14 w-full overflow-hidden border-none bg-gradient-to-r from-cyan-500 via-indigo-500 to-amber-500 text-white shadow-xl shadow-cyan-900/40 hover:brightness-110"
            onClick={handleCardDrop}
            disabled={isDropping || remainingDrops <= 0}
          >
            <div className="absolute inset-0 bg-white/10 blur-lg" />
            <div className="relative flex items-center justify-center gap-2 text-base font-semibold">
              <AnimatePresence mode="wait">
                {isDropping ? (
                  <motion.div
                    key="dropping"
                    className="flex items-center gap-2"
                    initial={{ opacity: 0, scale: 0.94 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                  >
                    <div className="h-4 w-4 animate-spin rounded-full border-b-2 border-white" />
                    <span>드랍 전송 중...</span>
                  </motion.div>
                ) : (
                  <motion.div
                    key="ready"
                    className="flex items-center gap-2"
                    initial={{ opacity: 0, scale: 0.94 }}
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

          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-xl border border-slate-700/70 bg-slate-900/75 px-3 py-2">
              <div className="flex items-center gap-2 text-[11px] text-slate-300">
                <Timer className="h-3.5 w-3.5 text-cyan-300" />
                <span>쿨다운 24시간 리셋</span>
              </div>
            </div>
            <div className="rounded-xl border border-slate-700/70 bg-slate-900/75 px-3 py-2">
              <div className="flex items-center gap-2 text-[11px] text-slate-300">
                <Shield className="h-3.5 w-3.5 text-emerald-300" />
                <span>안전 드랍 보호</span>
              </div>
            </div>
            <div className="col-span-2 rounded-xl border border-slate-700/70 bg-slate-900/75 px-3 py-2">
              <div className="flex items-center gap-2 text-[11px] text-slate-300">
                <Activity className="h-3.5 w-3.5 text-amber-300" />
                <span>드랍 즉시 인벤토리 반영 · 제작 탭 연동</span>
              </div>
            </div>
          </div>

          <AnimatePresence>
            {dropMessage && (
              <motion.div
                className={`rounded-xl border px-3 py-2 text-xs ${
                  dropMessage.includes('성공') || dropMessage.includes('획득')
                    ? 'border-emerald-300/30 bg-emerald-500/10 text-emerald-100'
                    : 'border-amber-300/30 bg-amber-500/10 text-amber-100'
                }`}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 6 }}
              >
                <div className="flex items-center gap-2">
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

          <div className="rounded-2xl border border-slate-700/80 bg-slate-900/70 p-3">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-xs font-semibold text-slate-100">등급 도전 확률</p>
              <span className="text-[11px] text-slate-400">실시간 확률표</span>
            </div>
            <div className="space-y-2">
              {rarityTiers.map((tier) => {
                const chance = Number(tier.chance.replace('%', '')) || 0
                return (
                  <div key={tier.key}>
                    <div className="mb-1 flex items-center justify-between text-[11px]">
                      <div className="flex items-center gap-2 text-slate-200">
                        <div className={`h-2.5 w-2.5 rounded-full bg-gradient-to-br ${tier.accent}`} />
                        <span>{tier.label}</span>
                      </div>
                      <span className="font-semibold text-slate-100">{tier.chance}</span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-slate-800">
                      <div
                        className={`h-full rounded-full bg-gradient-to-r ${tier.accent}`}
                        style={{ width: `${chance}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-700/80 bg-slate-900/70 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-amber-300" />
                <h4 className="text-sm font-semibold text-slate-100">최근 드랍 미리보기</h4>
              </div>
              <span className="text-xs text-slate-400">실시간 반영</span>
            </div>

            {hasPendingReveal && lastDroppedCard ? (
              <div className="mt-3 flex items-center gap-3 rounded-xl border border-amber-300/35 bg-slate-900/70 p-3">
                <div className="relative h-14 w-10 overflow-hidden rounded-md border border-amber-200/30 bg-slate-800 shadow-sm">
                  <img
                    src={getPreOpenImage(lastDroppedCard)}
                    alt="봉인된 카드 미리보기"
                    onError={handleImageError}
                    className="h-full w-full object-cover"
                  />
                  <div className="absolute inset-0 bg-slate-900/35" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-amber-100">봉인된 카드가 대기 중입니다</p>
                  <p className="text-xs text-slate-300">카드 오픈 후 이름과 연도가 공개됩니다.</p>
                </div>
              </div>
            ) : lastRevealedCard ? (
              <div className="mt-3 flex items-center gap-3 rounded-xl border border-slate-700 bg-slate-900/70 p-3">
                <div className="relative h-14 w-10 overflow-hidden rounded-md border border-slate-700 bg-slate-800 shadow-sm">
                  {lastRevealedCard.imageUrl ? (
                    <img
                      src={lastRevealedCard.imageUrl}
                      alt={lastRevealedCard.name}
                      onError={handleImageError}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-sm font-bold text-slate-500">
                      {lastRevealedCard.name?.charAt(0) ?? '★'}
                    </div>
                  )}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-slate-100">{lastRevealedCard.name}</p>
                  <p className="line-clamp-2 text-xs text-slate-400">{lastRevealedCard.description}</p>
                  <div className="mt-1 flex items-center gap-2">
                    <span
                      className={`rounded-full bg-gradient-to-r ${getRarityColor(
                        lastRevealedCard.rarity
                      )} px-2 py-1 text-[11px] font-semibold text-white`}
                    >
                      {lastRevealedCard.rarity.toUpperCase()}
                    </span>
                    {lastRevealedCard.year && lastRevealedCard.period && (
                      <span className="rounded-full bg-slate-800 px-2 py-1 text-[11px] text-slate-300">
                        {lastRevealedCard.year} · {lastRevealedCard.period === 'h1' ? '상반기' : '하반기'}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="mt-3 flex items-center justify-between rounded-xl border border-dashed border-slate-600 bg-slate-900/70 p-3 text-sm text-slate-400">
                <span>아직 드랍된 카드가 없어요. 첫 드랍을 시작해 보세요!</span>
                <Sparkles className="h-4 w-4 text-cyan-300" />
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
            onClick={() => {
              setShowCardModal(false)
              setIsCardRevealed(false)
            }}
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
                    onClick={() => {
                      setShowCardModal(false)
                      setIsCardRevealed(false)
                    }}
                    className="rounded-full p-1 hover:bg-white/20"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="px-6 py-5">
                <div className="text-center">
                  <div className="relative mx-auto mb-3 h-40 w-28 overflow-hidden rounded-lg border border-gray-200 bg-gradient-to-br from-slate-50 to-white shadow-inner">
                    {isCardRevealed && (
                      <motion.div
                        className={`pointer-events-none absolute -inset-8 ${revealPreset.auraClass} blur-2xl`}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.35 }}
                      />
                    )}
                    <AnimatePresence mode="wait">
                      {!isCardRevealed ? (
                        <motion.div
                          key="sealed-card"
                          className="relative h-full w-full"
                          initial={{ opacity: 0, scale: 0.94 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.94 }}
                        >
                          <img
                            src={getPreOpenImage(lastDroppedCard)}
                            alt="카드 개봉 전 배경"
                            onError={handleImageError}
                            className="h-full w-full object-cover"
                          />
                          <div className={`absolute inset-0 ${revealPreset.sealedTintClass}`} />
                          <div className="absolute left-2 top-2 rounded-full border border-white/60 bg-white/80 px-2 py-0.5 text-[10px] font-semibold text-slate-700">
                            {lastDroppedCard.rarity.toUpperCase()} PREVIEW
                          </div>
                          <div className="absolute bottom-2 left-2 right-2 rounded-md bg-white/80 px-2 py-1 text-[11px] font-semibold text-slate-700">
                            봉인된 카드
                          </div>
                        </motion.div>
                      ) : (
                        <motion.div
                          key="opened-card"
                          className="h-full w-full"
                          initial={revealPreset.revealInitial}
                          animate={revealPreset.revealAnimate}
                          exit={{ opacity: 0, scale: 0.96 }}
                          transition={revealPreset.revealTransition}
                          style={revealPreset.revealStyle}
                        >
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
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  <h3 className="text-xl font-bold text-gray-900">
                    {isCardRevealed ? lastDroppedCard.name : '봉인된 카드'}
                  </h3>
                  <p className="mt-1 text-sm text-gray-600">
                    {isCardRevealed ? lastDroppedCard.description : '카드를 오픈하면 이름과 정보가 공개됩니다.'}
                  </p>
                  <div className="mt-3 flex items-center justify-center space-x-2">
                    <span
                      className={`rounded-full bg-gradient-to-r ${getRarityColor(
                        lastDroppedCard.rarity
                      )} px-3 py-1 text-xs font-semibold text-white`}
                    >
                      {lastDroppedCard.rarity.toUpperCase()}
                    </span>
                    {isCardRevealed && lastDroppedCard.year && lastDroppedCard.period && (
                      <span className="rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-700">
                        {lastDroppedCard.year} · {lastDroppedCard.period === 'h1' ? '상반기' : '하반기'}
                      </span>
                    )}
                  </div>
                </div>

                {!isCardRevealed ? (
                  <Button
                    variant="glass"
                    className={`mt-5 w-full ${revealPreset.buttonClass}`}
                    onClick={() => {
                      setIsCardRevealed(true)
                      setHasPendingReveal(false)
                      setLastRevealedCard(lastDroppedCard)
                    }}
                  >
                    {revealPreset.buttonLabel}
                  </Button>
                ) : (
                  <Button
                    variant="glass"
                    className="mt-5 w-full"
                    onClick={() => {
                      setShowCardModal(false)
                      setIsCardRevealed(false)
                    }}
                  >
                    확인했어요
                  </Button>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
