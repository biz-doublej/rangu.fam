'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { AlertCircle, CheckCircle, Clock, Lock, Package, Shield, Sparkles } from 'lucide-react'
import clsx from 'clsx'
import { useAuth } from '@/contexts/AuthContext'
import { CardOpenModal, OpenCard, RarityChip } from '@/components/cards'
import { MultiPullModal } from '@/components/cards/MultiPullModal'
import { CardArtwork } from '@/components/cards/CardArtwork'
import { CaveatText, Pin } from '@/components/scrapbook'
import { DROP_ALLOWED_MEMBER_IDS, RARITY_TOKENS } from '@/lib/cardTheme'

interface CardDropWidgetProps {
  userId?: string
  className?: string
}

interface DropResult {
  success: boolean
  card?: OpenCard
  message: string
  remainingDrops: number
}

const RARITY_DISPLAY = [
  { key: 'basic', chance: 45 },
  { key: 'rare', chance: 30 },
  { key: 'epic', chance: 15 },
  { key: 'legendary', chance: 8 },
  { key: 'material', chance: 2 },
] as const

const MAX_DAILY_DROPS = 10

export function CardDropWidget({ userId, className = '' }: CardDropWidgetProps) {
  const { user } = useAuth()
  const isAuthorized = DROP_ALLOWED_MEMBER_IDS.has(user?.memberId || '')

  const [remainingDrops, setRemainingDrops] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [isDropping, setIsDropping] = useState(false)
  const [dropMessage, setDropMessage] = useState<{ text: string; tone: 'ok' | 'warn' } | null>(null)
  const [lastDroppedCard, setLastDroppedCard] = useState<OpenCard | null>(null)
  const [lastRevealedCard, setLastRevealedCard] = useState<OpenCard | null>(null)
  const [hasPendingReveal, setHasPendingReveal] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [isRevealed, setIsRevealed] = useState(false)
  // 멀티 풀(N연차)
  const [isMultiPulling, setIsMultiPulling] = useState(false)
  const [multiCards, setMultiCards] = useState<OpenCard[]>([])
  const [multiOpen, setMultiOpen] = useState(false)

  const fetchRemaining = useCallback(async () => {
    if (!userId) return
    if (!isAuthorized) {
      setRemainingDrops(0)
      setIsLoading(false)
      return
    }
    try {
      setIsLoading(true)
      const res = await fetch(`/api/cards/drop?userId=${userId}`)
      const data = await res.json().catch(() => null)
      if (res.ok && data?.success) {
        setRemainingDrops(data.remainingDrops ?? 0)
      } else {
        setRemainingDrops(0)
        if (data?.message) setDropMessage({ text: data.message, tone: 'warn' })
      }
    } catch (err) {
      console.error('drop count fetch failed', err)
    } finally {
      setIsLoading(false)
    }
  }, [userId, isAuthorized])

  useEffect(() => {
    fetchRemaining()
  }, [fetchRemaining])

  const handleDrop = async () => {
    if (!userId || isDropping) return
    if (!isAuthorized) {
      setDropMessage({ text: '카드 드랍은 랑구팸 다섯 멤버 전용입니다.', tone: 'warn' })
      return
    }
    if (remainingDrops <= 0) {
      setDropMessage({ text: `오늘의 드랍 ${MAX_DAILY_DROPS}회를 모두 사용했어요.`, tone: 'warn' })
      return
    }

    setIsDropping(true)
    setDropMessage(null)

    try {
      const res = await fetch('/api/cards/drop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      })
      const result: DropResult = await res
        .json()
        .catch(() => ({ success: false, message: '드랍 결과를 확인하지 못했습니다.', remainingDrops: 0 }))

      setRemainingDrops(result.remainingDrops ?? 0)
      setDropMessage({
        text: result.message,
        tone: result.success ? 'ok' : 'warn',
      })

      if (result.success && result.card) {
        setLastDroppedCard(result.card)
        setHasPendingReveal(true)
        setIsRevealed(false)
        setShowModal(true)
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('card-inventory-updated'))
        }
      }
    } catch (err) {
      console.error('drop failed', err)
      setDropMessage({ text: '카드 드랍 중 오류가 발생했어요.', tone: 'warn' })
    } finally {
      setIsDropping(false)
    }
  }

  // 멀티 풀 — 남은 만큼(최대 10) /api/cards/drop 순차 호출 후 MultiPullModal 로 한 번에 공개
  const handleMultiPull = async () => {
    if (!userId || isDropping || isMultiPulling || !isAuthorized) return
    const n = Math.min(remainingDrops, 10)
    if (n <= 0) {
      setDropMessage({ text: `오늘의 드랍 ${MAX_DAILY_DROPS}회를 모두 사용했어요.`, tone: 'warn' })
      return
    }

    setIsMultiPulling(true)
    setDropMessage(null)
    const got: OpenCard[] = []
    let remaining = remainingDrops
    try {
      for (let i = 0; i < n; i++) {
        const res = await fetch('/api/cards/drop', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId }),
        })
        const result: DropResult = await res
          .json()
          .catch(() => ({ success: false, message: '', remainingDrops: remaining }))
        if (result.success && result.card) {
          got.push(result.card)
          remaining = result.remainingDrops ?? remaining
        } else {
          if (result.message) setDropMessage({ text: result.message, tone: 'warn' })
          break // 소진/오류 → 중단
        }
      }
      setRemainingDrops(remaining)
      if (got.length > 0) {
        setMultiCards(got)
        setMultiOpen(true)
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('card-inventory-updated'))
        }
      }
    } catch (err) {
      console.error('multi pull failed', err)
      setDropMessage({ text: '연속 개봉 중 오류가 발생했어요.', tone: 'warn' })
    } finally {
      setIsMultiPulling(false)
    }
  }

  const handleReveal = () => {
    setIsRevealed(true)
    setHasPendingReveal(false)
    if (lastDroppedCard) setLastRevealedCard(lastDroppedCard)
  }

  const handleClose = () => {
    setShowModal(false)
    setIsRevealed(false)
  }

  // ── unauthorized / loading / no-user states ────────────────────
  if (!userId) {
    return (
      <div className={clsx('paper-card flex flex-col items-center gap-2 !p-6 text-center', className)}>
        <Package className="h-7 w-7 text-ink-300" />
        <p className="text-sm text-ink-300">로그인이 필요해요</p>
      </div>
    )
  }

  if (!isAuthorized) {
    return (
      <div className={clsx('paper-card !p-6 text-center', className)}>
        <Shield className="mx-auto h-7 w-7 text-mustard-500" />
        <p className="mt-2 font-display text-base text-ink-500">카드 드랍 멤버 전용</p>
        <p className="mt-1 text-xs text-ink-300">
          랑구팸 5인 (HAN/JAE/JIN/LEE/MIN)만 드랍을 사용할 수 있어요.
        </p>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className={clsx('paper-card flex items-center justify-center gap-2 !p-6 text-center', className)}>
        <span className="h-5 w-5 animate-spin rounded-full border-2 border-coral-500/30 border-t-coral-500" />
        <span className="text-sm text-ink-300">불러오는 중…</span>
      </div>
    )
  }

  // ── main UI ────────────────────────────────────────────────────
  const usedDrops = MAX_DAILY_DROPS - Math.max(0, Math.min(MAX_DAILY_DROPS, remainingDrops))

  return (
    <>
      <div className={clsx('paper-card relative !p-0', className)}>
        <div className="space-y-5 px-6 pb-6 pt-7 sm:px-7">
          {/* Header */}
          <div className="flex items-start justify-between gap-3">
            <div>
              <CaveatText className="text-base text-coral-500">daily drop</CaveatText>
              <h3 className="display-han mt-0.5 text-2xl text-ink-500">카드 드랍</h3>
              <p className="mt-1.5 text-xs leading-relaxed text-ink-300">
                하루 {MAX_DAILY_DROPS}장. 자정에 다시 채워져요.
              </p>
            </div>

            {/* Daily stamp slots */}
            <div className="flex flex-col items-end gap-1">
              <span className="text-[10px] uppercase tracking-[0.2em] text-ink-300">오늘 남은</span>
              <div className="flex gap-1">
                {[...Array(MAX_DAILY_DROPS)].map((_, i) => {
                  const used = i < usedDrops
                  return (
                    <span
                      key={i}
                      className={clsx(
                        'h-2.5 w-2.5 rounded-full border',
                        used
                          ? 'border-ink-500/30 bg-ink-500/30'
                          : 'border-coral-500/40 bg-coral-500/80'
                      )}
                    />
                  )
                })}
              </div>
              <span className="font-mono text-base font-bold text-ink-500">
                {Math.max(0, remainingDrops)} / {MAX_DAILY_DROPS}
              </span>
            </div>
          </div>

          {/* Drop button */}
          <button
            type="button"
            onClick={handleDrop}
            disabled={isDropping || isMultiPulling || remainingDrops <= 0}
            className={clsx(
              'relative flex w-full items-center justify-center gap-2 rounded-2xl px-5 py-4 font-display text-lg transition-all',
              isDropping || isMultiPulling || remainingDrops <= 0
                ? 'cursor-not-allowed bg-ink-500/15 text-ink-300'
                : 'bg-ink-500 text-paper-50 shadow-paper hover:-translate-y-0.5 hover:shadow-polaroid'
            )}
          >
            <AnimatePresence mode="wait">
              {isDropping ? (
                <motion.span
                  key="dropping"
                  className="flex items-center gap-2"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-paper-50/30 border-t-paper-50" />
                  드랍 중…
                </motion.span>
              ) : (
                <motion.span
                  key="ready"
                  className="flex items-center gap-2"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <Sparkles className="h-5 w-5" />
                  {remainingDrops <= 0 ? '오늘 드랍 종료' : '카드 드랍'}
                </motion.span>
              )}
            </AnimatePresence>
          </button>

          {/* Multi-pull (N연차) */}
          {remainingDrops > 1 && (
            <button
              type="button"
              onClick={handleMultiPull}
              disabled={isDropping || isMultiPulling}
              className={clsx(
                'flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed px-5 py-2.5 font-display text-sm transition-all',
                isDropping || isMultiPulling
                  ? 'cursor-not-allowed border-ink-500/15 text-ink-300'
                  : 'border-coral-500/50 text-coral-600 hover:bg-coral-500/5'
              )}
            >
              {isMultiPulling ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-coral-500/30 border-t-coral-500" />
                  연속 개봉 중…
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  여러 장 열기 ({Math.min(remainingDrops, 10)}장)
                </>
              )}
            </button>
          )}

          {/* Notes */}
          <div className="grid grid-cols-2 gap-2 text-[11px] text-ink-300">
            <div className="flex items-center gap-1.5 rounded-lg border border-dashed border-ink-500/15 bg-paper-50/60 px-2.5 py-2">
              <Clock className="h-3 w-3 text-coral-500" />
              <span>24시간 리셋</span>
            </div>
            <div className="flex items-center gap-1.5 rounded-lg border border-dashed border-ink-500/15 bg-paper-50/60 px-2.5 py-2">
              <Lock className="h-3 w-3 text-sage-500" />
              <span>인벤토리 자동 반영</span>
            </div>
          </div>

          {/* Drop message */}
          <AnimatePresence>
            {dropMessage && (
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 6 }}
                className={clsx(
                  'flex items-center gap-2 rounded-lg border px-3 py-2 text-xs',
                  dropMessage.tone === 'ok'
                    ? 'border-sage-500/40 bg-sage-500/10 text-sage-600'
                    : 'border-mustard-500/40 bg-mustard-500/10 text-mustard-600'
                )}
              >
                {dropMessage.tone === 'ok' ? (
                  <CheckCircle className="h-4 w-4 flex-shrink-0" />
                ) : (
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                )}
                <span>{dropMessage.text}</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Probabilities — paper bars */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <p className="text-[11px] uppercase tracking-[0.18em] text-ink-300">등급 확률</p>
              <span className="caveat text-base text-coral-500">odds</span>
            </div>
            <div className="space-y-2">
              {RARITY_DISPLAY.map((tier) => {
                const t = RARITY_TOKENS[tier.key]
                return (
                  <div key={tier.key}>
                    <div className="mb-1 flex items-center justify-between text-[11px]">
                      <span className="flex items-center gap-1.5" style={{ color: t.ink }}>
                        <span className="inline-block h-2 w-2 rounded-full" style={{ background: t.ink }} />
                        {t.label}
                      </span>
                      <span className="font-mono font-bold" style={{ color: t.ink }}>
                        {tier.chance}%
                      </span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-ink-500/8">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: `${tier.chance}%`, background: t.ink, opacity: 0.7 }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Recent drop preview */}
          <div className="border-t border-dashed border-ink-500/15 pt-4">
            <div className="mb-3 flex items-center justify-between">
              <CaveatText className="text-base text-coral-500">latest drop</CaveatText>
              <Pin color="coral" className="-mt-1 h-4 w-4" />
            </div>

            {hasPendingReveal && lastDroppedCard ? (
              <div className="flex items-center gap-3 rounded-lg border border-dashed border-coral-500/40 bg-coral-500/5 p-3">
                <CardArtwork
                  imageUrl={undefined}
                  type={lastDroppedCard.type}
                  member={lastDroppedCard.member}
                  year={lastDroppedCard.year}
                  rarity={lastDroppedCard.rarity}
                  size="xs"
                  hideCaption
                  showRarityChip={false}
                  className="!shadow-none"
                  rotate="left"
                />
                <div className="flex-1">
                  <p className="text-sm font-bold text-coral-600">봉인된 카드 대기 중</p>
                  <p className="mt-1 text-xs text-ink-300">눌러서 카드를 열어보세요.</p>
                  <button
                    onClick={() => {
                      setIsRevealed(false)
                      setShowModal(true)
                    }}
                    className="mt-2 text-xs font-bold text-coral-500 underline"
                  >
                    열기 →
                  </button>
                </div>
              </div>
            ) : lastRevealedCard ? (
              <div className="flex items-center gap-3 rounded-lg border border-ink-500/15 bg-paper-100/60 p-3">
                <div className="-rotate-1">
                  <CardArtwork
                    imageUrl={lastRevealedCard.imageUrl}
                    name={lastRevealedCard.name}
                    rarity={lastRevealedCard.rarity}
                    type={lastRevealedCard.type}
                    member={lastRevealedCard.member}
                    year={lastRevealedCard.year}
                    period={lastRevealedCard.period}
                    size="xs"
                    hideCaption
                    showRarityChip={false}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="truncate font-display text-base text-ink-500">{lastRevealedCard.name}</p>
                  <p className="line-clamp-2 text-[11px] text-ink-300">{lastRevealedCard.description}</p>
                  <div className="mt-1.5 flex items-center gap-1.5">
                    <RarityChip rarity={lastRevealedCard.rarity} size="sm" />
                    {lastRevealedCard.year && lastRevealedCard.period && (
                      <span className="rounded-full border border-ink-500/15 bg-paper-50 px-2 py-0.5 text-[10px] text-ink-300">
                        {lastRevealedCard.year}·{lastRevealedCard.period === 'h1' ? '상' : '하'}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-lg border border-dashed border-ink-500/15 bg-paper-100/40 p-4 text-center text-xs text-ink-300">
                아직 드랍한 카드가 없어요.<br />
                <span className="caveat text-coral-500">위 버튼을 눌러 첫 카드를 열어보세요!</span>
              </div>
            )}
          </div>
        </div>
      </div>

      <CardOpenModal
        open={showModal}
        card={lastDroppedCard}
        isRevealed={isRevealed}
        onReveal={handleReveal}
        onClose={handleClose}
      />

      <MultiPullModal open={multiOpen} cards={multiCards} onClose={() => setMultiOpen(false)} />
    </>
  )
}
