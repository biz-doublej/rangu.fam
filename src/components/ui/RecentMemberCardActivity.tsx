'use client'

import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Activity, RefreshCcw } from 'lucide-react'
import clsx from 'clsx'
import { CardArtwork } from '@/components/cards/CardArtwork'
import { CaveatText, PaperCard } from '@/components/scrapbook'
import { handleCardImageError } from '@/lib/cardTheme'

interface RecentMemberCardActivityProps {
  className?: string
}

type ActivityType = 'drop' | 'craft' | 'upgrade'

interface ActivityItem {
  id: string
  memberId: string
  memberName: string
  activityType: ActivityType
  activityLabel: string
  cardId: string
  cardName: string
  cardImageUrl: string
  droppedAt: string
}

interface ActivityResponse {
  success: boolean
  activities: ActivityItem[]
  message?: string
}

const TYPE_TONE: Record<ActivityType, { bg: string; ink: string; edge: string }> = {
  drop: {
    bg: 'rgba(62, 92, 74, 0.1)',
    ink: '#3E5C4A',
    edge: 'rgba(62, 92, 74, 0.32)',
  },
  craft: {
    bg: 'rgba(224, 101, 78, 0.1)',
    ink: '#E0654E',
    edge: 'rgba(224, 101, 78, 0.35)',
  },
  upgrade: {
    bg: 'rgba(194, 138, 45, 0.12)',
    ink: '#C28A2D',
    edge: 'rgba(194, 138, 45, 0.4)',
  },
}

const formatTime = (value: string) => {
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return '-'
  return d.toLocaleString('ko-KR', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function RecentMemberCardActivity({ className = '' }: RecentMemberCardActivityProps) {
  const [activities, setActivities] = useState<ActivityItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [errorMsg, setErrorMsg] = useState('')
  const [updatedAt, setUpdatedAt] = useState('')

  const fetchActivities = useCallback(async () => {
    try {
      const res = await fetch('/api/cards/recent-activity?limit=50', { cache: 'no-store' })
      const data = (await res.json().catch(() => null)) as ActivityResponse | null
      if (!res.ok || !data?.success) {
        throw new Error(data?.message || '최근 활동을 불러오지 못했습니다.')
      }
      setActivities(data.activities || [])
      setUpdatedAt(new Date().toLocaleTimeString('ko-KR'))
      setErrorMsg('')
    } catch (err) {
      console.error('activity fetch failed', err)
      setErrorMsg(err instanceof Error ? err.message : '최근 활동 조회 실패')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchActivities()
    const id = window.setInterval(fetchActivities, 10_000)
    const refresh = () => fetchActivities()
    window.addEventListener('card-inventory-updated', refresh)
    return () => {
      window.clearInterval(id)
      window.removeEventListener('card-inventory-updated', refresh)
    }
  }, [fetchActivities])

  const items = useMemo(() => activities.slice(0, 50), [activities])

  return (
    <PaperCard className={clsx('flex h-full max-h-[560px] flex-col !p-0', className)}>
      {/* Header */}
      <div className="flex items-start justify-between gap-3 border-b border-dashed border-ink-500/15 px-6 pb-4 pt-6">
        <div>
          <CaveatText className="text-base text-coral-500">live feed</CaveatText>
          <h3 className="display-han mt-0.5 text-2xl text-ink-500">
            <Activity className="mr-1.5 inline h-5 w-5 text-coral-500" />
            최근 카드 활동
          </h3>
          <p className="mt-1 text-xs text-ink-300">10초마다 자동 갱신.</p>
        </div>

        <div className="text-right">
          <div className="inline-flex items-center gap-1 rounded-full border border-ink-500/15 bg-paper-50 px-2.5 py-1 text-[10px] uppercase tracking-wider text-ink-300">
            <RefreshCcw className="h-3 w-3" />
            auto
          </div>
          <p className="mt-1 font-mono text-[11px] text-ink-300">{updatedAt || '—'}</p>
        </div>
      </div>

      {/* Body */}
      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
        {isLoading ? (
          <div className="flex h-full items-center justify-center gap-2 text-sm text-ink-300">
            <span className="h-5 w-5 animate-spin rounded-full border-2 border-coral-500/30 border-t-coral-500" />
            불러오는 중…
          </div>
        ) : errorMsg ? (
          <div className="flex h-full items-center justify-center text-center text-sm text-coral-500">
            {errorMsg}
          </div>
        ) : items.length === 0 ? (
          <div className="flex h-full items-center justify-center text-center text-sm text-ink-300">
            아직 표시할 활동이 없어요.
          </div>
        ) : (
          <ul className="space-y-2">
            <AnimatePresence initial={false}>
              {items.map((item, idx) => {
                const tone = TYPE_TONE[item.activityType] || TYPE_TONE.drop
                return (
                  <motion.li
                    key={item.id}
                    initial={{ opacity: 0, y: 8, x: -4 }}
                    animate={{ opacity: 1, y: 0, x: 0 }}
                    transition={{ delay: Math.min(idx * 0.015, 0.25), duration: 0.25 }}
                    className="flex items-center gap-3 rounded-xl border border-ink-500/10 bg-paper-50/80 p-2.5 hover:border-ink-500/25 transition-colors"
                  >
                    {/* mini polaroid */}
                    <div className="-rotate-1 flex-shrink-0">
                      <div className="bg-white p-1 pb-2 shadow-paper" style={{ borderRadius: 3 }}>
                        <div className="h-12 w-9 overflow-hidden bg-paper-200">
                          <img
                            src={item.cardImageUrl}
                            alt={item.cardName}
                            onError={handleCardImageError}
                            className="h-full w-full object-cover"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <p className="text-xs font-bold text-ink-500">{item.memberName}</p>
                        <span
                          className="rounded-full border px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider"
                          style={{ background: tone.bg, color: tone.ink, borderColor: tone.edge }}
                        >
                          {item.activityLabel}
                        </span>
                      </div>
                      <p className="truncate text-sm text-ink-500">{item.cardName}</p>
                      <p className="font-mono text-[10px] text-ink-300">{formatTime(item.droppedAt)}</p>
                    </div>
                  </motion.li>
                )
              })}
            </AnimatePresence>
          </ul>
        )}
      </div>
    </PaperCard>
  )
}
