'use client'

import React, { useCallback, useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import clsx from 'clsx'
import toast from 'react-hot-toast'
import { Dices, ShieldCheck, Skull, Swords, X } from 'lucide-react'
import { CardArtwork } from '@/components/cards/CardArtwork'
import { CaveatText, PaperCard, TapeStrip } from '@/components/scrapbook'

interface CardHeistProps {
  userId?: string
  className?: string
}

interface Target {
  userId: string
  name: string
  avatar: string | null
  count: number
}

interface HeistData {
  successRate: number
  myStake: number
  targets: Target[]
}

interface HeistResult {
  result: 'win' | 'lose' | 'miss'
  message: string
  card?: {
    name: string
    imageUrl: string
    rarity: string
    type: string
    member?: string | null
    year?: number | null
    period?: string | null
  }
}

export function CardHeist({ userId, className = '' }: CardHeistProps) {
  const [data, setData] = useState<HeistData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [selected, setSelected] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const [result, setResult] = useState<HeistResult | null>(null)

  const load = useCallback(async () => {
    if (!userId) {
      setIsLoading(false)
      return
    }
    setIsLoading(true)
    try {
      const res = await fetch('/api/cards/steal', { credentials: 'include' })
      const json = await res.json()
      if (json.success) {
        setData({ successRate: json.successRate, myStake: json.myStake, targets: json.targets })
        setSelected((prev) => (json.targets.some((t: Target) => t.userId === prev) ? prev : null))
      }
    } catch (err) {
      console.error('steal load failed', err)
    } finally {
      setIsLoading(false)
    }
  }, [userId])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    const refresh = () => load()
    window.addEventListener('card-inventory-updated', refresh)
    return () => window.removeEventListener('card-inventory-updated', refresh)
  }, [load])

  const attempt = async () => {
    if (!userId || !selected || pending) return
    setPending(true)
    try {
      const res = await fetch('/api/cards/steal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ targetUserId: selected }),
      })
      const json = await res.json()
      if (json.success) {
        setResult({ result: json.result, message: json.message, card: json.card })
        window.dispatchEvent(new Event('card-inventory-updated'))
        await load()
      } else {
        toast.error(json.message || '강탈에 실패했어요.')
      }
    } catch {
      toast.error('강탈 시도 중 오류가 발생했어요.')
    } finally {
      setPending(false)
    }
  }

  if (!userId) {
    return (
      <PaperCard className={clsx('!p-10 text-center', className)}>
        <Swords className="mx-auto h-10 w-10 text-ink-300" />
        <h3 className="display-han mt-3 text-2xl text-ink-500">카드 강탈</h3>
        <p className="mt-2 text-sm text-ink-300">로그인 후 도박장에 입장할 수 있어요.</p>
      </PaperCard>
    )
  }

  const ratePct = data ? Math.round(data.successRate * 100) : 40

  return (
    <>
      <div className={clsx('space-y-5', className)}>
        {/* 헤더 */}
        <PaperCard className="relative !p-7 sm:!p-8">
          <TapeStrip className="tape--top" color="coral" />
          <CaveatText className="text-base text-coral-500">all-in</CaveatText>
          <h2 className="display-han mt-0.5 text-3xl text-ink-500">
            <Dices className="mr-2 inline h-7 w-7 text-coral-500" />
            카드 강탈
          </h2>
          <p className="mt-2 max-w-md text-sm leading-relaxed text-ink-300">
            한 판 걸고 상대 카드를 노립니다. <strong className="text-coral-600">성공 {ratePct}%</strong> —
            실패하면 <strong className="text-coral-600">내 카드</strong>를 뺏겨요.
          </p>
          <div className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-sage-500/30 bg-sage-500/10 px-3 py-1 text-xs font-bold text-sage-600">
            <ShieldCheck className="h-3.5 w-3.5" />
            프레스티지 · 잠금 카드는 강탈 불가(안전)
          </div>
        </PaperCard>

        {isLoading ? (
          <PaperCard className="flex flex-col items-center gap-3 !p-12 text-center">
            <span className="h-8 w-8 animate-spin rounded-full border-2 border-coral-500/30 border-t-coral-500" />
            <p className="caveat text-base text-ink-300">도박장 여는 중…</p>
          </PaperCard>
        ) : data && data.myStake === 0 ? (
          <PaperCard className="!p-10 text-center">
            <Skull className="mx-auto h-9 w-9 text-ink-300" />
            <p className="mt-3 text-sm text-ink-500">
              베팅할 카드가 없어요. 강탈은 <strong>내 카드를 걸고</strong> 하는 도박이라,
            </p>
            <p className="text-sm text-ink-300">먼저 카드를 모아오세요. (프레스티지·잠금 제외)</p>
          </PaperCard>
        ) : !data || data.targets.length === 0 ? (
          <PaperCard className="!p-10 text-center">
            <Swords className="mx-auto h-9 w-9 text-ink-300" />
            <p className="mt-3 text-sm text-ink-300">지금은 강탈할 상대가 없어요. (상대가 카드를 보유해야 등장)</p>
          </PaperCard>
        ) : (
          <PaperCard className="!p-6 sm:!p-7">
            <div className="mb-3 flex items-end justify-between">
              <div>
                <CaveatText className="text-sm text-coral-500">target</CaveatText>
                <h3 className="display-han mt-0.5 text-xl text-ink-500">누구를 털까?</h3>
              </div>
              <span className="text-[11px] text-ink-300">내 베팅 풀 {data.myStake}장</span>
            </div>

            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              {data.targets.map((t) => (
                <button
                  key={t.userId}
                  type="button"
                  onClick={() => setSelected(t.userId)}
                  className={clsx(
                    'flex items-center gap-3 rounded-2xl border px-4 py-3 text-left transition',
                    selected === t.userId
                      ? 'border-coral-500/60 bg-coral-500/10 ring-2 ring-coral-500/40'
                      : 'border-ink-500/12 bg-paper-50 hover:border-ink-500/25'
                  )}
                >
                  <span className="relative h-11 w-11 flex-shrink-0 overflow-hidden rounded-full border border-ink-500/15 bg-paper-200">
                    {t.avatar ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={t.avatar} alt={t.name} className="h-full w-full object-cover" />
                    ) : (
                      <span className="flex h-full w-full items-center justify-center text-sm text-ink-300">
                        {t.name.slice(0, 1)}
                      </span>
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-bold text-ink-500">{t.name}</span>
                    <span className="block text-xs text-ink-300">강탈 가능 {t.count}장</span>
                  </span>
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={attempt}
              disabled={!selected || pending}
              className={clsx(
                'mt-5 flex w-full items-center justify-center gap-2 rounded-2xl px-5 py-4 font-display text-lg transition-all',
                !selected || pending
                  ? 'cursor-not-allowed bg-ink-500/15 text-ink-300'
                  : 'bg-gradient-to-r from-coral-500 to-coral-600 text-paper-50 shadow-paper hover:-translate-y-0.5 hover:shadow-polaroid'
              )}
            >
              {pending ? (
                <>
                  <Dices className="h-5 w-5 animate-spin" />
                  주사위 굴리는 중…
                </>
              ) : (
                <>
                  <Dices className="h-5 w-5" />
                  {selected ? `강탈 시도 (성공 ${ratePct}%)` : '대상을 골라주세요'}
                </>
              )}
            </button>
          </PaperCard>
        )}
      </div>

      <HeistResultModal result={result} onClose={() => setResult(null)} />
    </>
  )
}

function HeistResultModal({ result, onClose }: { result: HeistResult | null; onClose: () => void }) {
  const tone =
    result?.result === 'win'
      ? { label: 'jackpot!', color: '#3E5C4A', title: '강탈 성공!' }
      : result?.result === 'lose'
      ? { label: 'busted…', color: '#C44E36', title: '강탈 실패' }
      : { label: 'phew', color: '#9C8E78', title: '무사 통과' }

  return (
    <AnimatePresence>
      {result && (
        <motion.div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-ink-500/70 p-4 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="relative w-full max-w-xs rounded-[1.5rem] bg-paper-50 p-7 text-center shadow-2xl"
            initial={{ scale: 0.7, opacity: 0, rotate: -6 }}
            animate={{ scale: 1, opacity: 1, rotate: 0 }}
            exit={{ scale: 0.7, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 240, damping: 18 }}
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

            <p className="caveat text-base" style={{ color: tone.color }}>
              {tone.label}
            </p>
            <h3 className="display-han text-2xl text-ink-500">{tone.title}</h3>

            {result.card ? (
              <div className="mt-4 flex justify-center">
                <motion.div
                  initial={{ scale: 0.6, rotate: result.result === 'win' ? -10 : 8 }}
                  animate={{ scale: [0.6, 1.1, 1], rotate: [result.result === 'win' ? -10 : 8, 0, 0] }}
                  transition={{ duration: 0.6 }}
                >
                  <CardArtwork
                    imageUrl={result.card.imageUrl}
                    name={result.card.name}
                    rarity={result.card.rarity}
                    type={result.card.type}
                    member={result.card.member ?? undefined}
                    year={result.card.year ?? undefined}
                    period={result.card.period ?? undefined}
                    size="md"
                    rotate={-1}
                    hideCaption
                    className="w-[170px]"
                  />
                </motion.div>
              </div>
            ) : (
              <div className="mt-4 flex justify-center">
                <span className="text-5xl">😌</span>
              </div>
            )}

            <p className="mt-4 text-sm leading-relaxed text-ink-500">{result.message}</p>

            <button
              type="button"
              onClick={onClose}
              className="mt-6 w-full rounded-xl bg-ink-500 py-2.5 text-sm font-bold text-paper-50 transition hover:bg-ink-600"
            >
              확인
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
