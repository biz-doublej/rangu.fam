'use client'

import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import toast from 'react-hot-toast'
import { Gift, Shield, Sparkles, Ticket, X } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { GIFT_BOX_COUNT, giftBoxPositions } from '@/lib/giftbox'

interface GiftState {
  enabled: boolean
  date: string
  count: number
  openedIndexes: number[]
}

interface GiftRewardResult {
  key: string
  label: string
  kind: 'none' | 'drops' | 'protect'
  amount: number
  flavor?: string
}

export function GiftBoxLayer() {
  const { user, isLoggedIn } = useAuth()
  const userId = user?.id
  const [state, setState] = useState<GiftState | null>(null)
  const [opened, setOpened] = useState<Set<number>>(new Set())
  const [pending, setPending] = useState<number | null>(null)
  const [reveal, setReveal] = useState<GiftRewardResult | null>(null)

  const load = useCallback(async () => {
    if (!userId) {
      setState(null)
      return
    }
    try {
      const res = await fetch('/api/gift', { credentials: 'include' })
      if (!res.ok) {
        setState(null)
        return
      }
      const data = await res.json()
      if (data?.success && data.enabled) {
        setState({
          enabled: true,
          date: data.date,
          count: data.count ?? GIFT_BOX_COUNT,
          openedIndexes: data.openedIndexes ?? [],
        })
        setOpened(new Set<number>(data.openedIndexes ?? []))
      } else {
        setState(null)
      }
    } catch {
      setState(null)
    }
  }, [userId])

  useEffect(() => {
    load()
  }, [load])

  const positions = useMemo(() => {
    if (!state || !userId) return []
    return giftBoxPositions(`${userId}:${state.date}`, state.count)
  }, [state, userId])

  const openBox = async (index: number) => {
    if (!userId || pending !== null || opened.has(index)) return
    setPending(index)
    try {
      const res = await fetch('/api/gift', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ index }),
      })
      const data = await res.json()
      // 이미 열렸거나 성공 → 해당 상자 숨김
      setOpened((prev) => new Set(prev).add(index))
      if (data?.success && data.reward) {
        setReveal(data.reward as GiftRewardResult)
        if (data.reward.kind === 'drops') {
          toast.success(`${data.reward.label} 획득! 🎟️`, { duration: 4000 })
          window.dispatchEvent(new Event('card-inventory-updated'))
        } else if (data.reward.kind === 'protect') {
          toast.success(`${data.reward.label} 획득! 🛡️`, { duration: 4000 })
        }
      } else if (!data?.success && !data?.already) {
        toast.error(data?.message || '상자를 열 수 없어요.')
      }
    } catch {
      toast.error('상자를 여는 중 오류가 발생했어요.')
    } finally {
      setPending(null)
    }
  }

  if (!isLoggedIn || !state?.enabled) return null

  const visible = positions.filter((p) => !opened.has(p.index))

  return (
    <>
      {/* 떠다니는 선물상자 (오버레이는 클릭 통과, 상자만 클릭됨) */}
      <div className="pointer-events-none fixed inset-0 z-40">
        <AnimatePresence>
          {visible.map((p) => (
            <motion.button
              key={p.index}
              type="button"
              onClick={() => openBox(p.index)}
              disabled={pending !== null}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1, y: [0, -7, 0] }}
              exit={{ scale: 0, opacity: 0, rotate: 20 }}
              transition={{
                scale: { duration: 0.3 },
                opacity: { duration: 0.3 },
                y: { duration: 2.4, repeat: Infinity, ease: 'easeInOut' },
              }}
              whileHover={{ scale: 1.15, rotate: -4 }}
              whileTap={{ scale: 0.9 }}
              className="pointer-events-auto absolute flex h-12 w-12 items-center justify-center rounded-2xl border-2 border-mustard-500/70 bg-gradient-to-br from-coral-400 to-coral-500 text-white shadow-[0_8px_20px_-6px_rgba(224,101,78,0.6)]"
              style={{ top: `${p.top}%`, left: `${p.left}%` }}
              aria-label="선물상자 열기"
            >
              <Gift className="h-6 w-6 drop-shadow" />
              <motion.span
                className="absolute -right-1 -top-1 text-mustard-300"
                animate={{ scale: [1, 1.4, 1], opacity: [0.6, 1, 0.6] }}
                transition={{ duration: 1.6, repeat: Infinity }}
              >
                <Sparkles className="h-3.5 w-3.5" />
              </motion.span>
            </motion.button>
          ))}
        </AnimatePresence>
      </div>

      {/* 보상 공개 모달 */}
      <RewardModal reward={reveal} onClose={() => setReveal(null)} />
    </>
  )
}

function RewardModal({
  reward,
  onClose,
}: {
  reward: GiftRewardResult | null
  onClose: () => void
}) {
  const isGood = reward ? reward.kind !== 'none' : false
  const Icon = reward?.kind === 'protect' ? Shield : reward?.kind === 'drops' ? Ticket : null

  return (
    <AnimatePresence>
      {reward && (
        <motion.div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-ink-500/70 p-4 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="relative w-full max-w-xs rounded-[1.5rem] bg-paper-50 p-7 text-center shadow-2xl"
            initial={{ scale: 0.6, opacity: 0, y: 30 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.7, opacity: 0, y: 20 }}
            transition={{ type: 'spring', stiffness: 260, damping: 20 }}
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

            <motion.div
              className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl"
              style={{
                background: isGood
                  ? 'linear-gradient(135deg, #E2B047, #C28A2D)'
                  : 'rgba(43,33,24,0.08)',
              }}
              initial={{ rotate: -12, scale: 0.7 }}
              animate={{ rotate: [0, -8, 8, 0], scale: [0.7, 1.12, 1] }}
              transition={{ duration: 0.7 }}
            >
              {Icon ? (
                <Icon className="h-10 w-10 text-white drop-shadow" />
              ) : (
                <Gift className="h-10 w-10 text-ink-300" />
              )}
            </motion.div>

            <p className="caveat mt-4 text-base text-coral-500">
              {isGood ? 'congratulations!' : 'oops…'}
            </p>
            <h3 className="display-han mt-0.5 text-2xl text-ink-500">{reward.label}</h3>
            {reward.flavor && <p className="mt-1.5 text-sm text-ink-300">{reward.flavor}</p>}

            {isGood && (
              <div className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-mustard-500/15 px-3 py-1 text-xs font-bold text-mustard-600">
                <Sparkles className="h-3.5 w-3.5" />
                {reward.kind === 'drops'
                  ? `드랍 ${reward.amount}회 추가 적립`
                  : `조합 보호 ${reward.amount}회 적립`}
              </div>
            )}

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
