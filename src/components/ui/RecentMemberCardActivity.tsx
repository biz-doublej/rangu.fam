'use client'

import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Activity, RefreshCcw } from 'lucide-react'
import { Card, CardContent } from './Card'

interface RecentMemberCardActivityProps {
  className?: string
}

type ActivityType = 'drop' | 'craft' | 'upgrade'

interface RecentActivityItem {
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

interface RecentActivityResponse {
  success: boolean
  activities: RecentActivityItem[]
  message?: string
}

const FALLBACK_IMAGE = '/images/default-music-cover.jpg'

const activityTone: Record<ActivityType, string> = {
  drop: 'bg-sky-500/20 text-sky-200 border-sky-300/30',
  craft: 'bg-fuchsia-500/20 text-fuchsia-200 border-fuchsia-300/30',
  upgrade: 'bg-emerald-500/20 text-emerald-200 border-emerald-300/30'
}

const formatTime = (value: string) => {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  return date.toLocaleString('ko-KR', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

export function RecentMemberCardActivity({ className = '' }: RecentMemberCardActivityProps) {
  const [activities, setActivities] = useState<RecentActivityItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')
  const [lastUpdatedAt, setLastUpdatedAt] = useState<string>('')

  const fetchActivities = useCallback(async () => {
    try {
      const response = await fetch('/api/cards/recent-activity?limit=50', {
        cache: 'no-store'
      })
      const data = (await response.json().catch(() => null)) as RecentActivityResponse | null

      if (!response.ok || !data?.success) {
        throw new Error(data?.message || '최근 활동을 불러오지 못했습니다.')
      }

      setActivities(data.activities || [])
      setLastUpdatedAt(new Date().toLocaleTimeString('ko-KR'))
      setErrorMessage('')
    } catch (error) {
      console.error('Failed to fetch recent member card activity:', error)
      setErrorMessage(error instanceof Error ? error.message : '최근 활동 조회 중 오류가 발생했습니다.')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchActivities()
    const intervalId = window.setInterval(fetchActivities, 10000)

    const refreshHandler = () => fetchActivities()
    window.addEventListener('card-inventory-updated', refreshHandler)

    return () => {
      window.clearInterval(intervalId)
      window.removeEventListener('card-inventory-updated', refreshHandler)
    }
  }, [fetchActivities])

  const latestItems = useMemo(() => activities.slice(0, 50), [activities])

  return (
    <Card className={`h-[460px] overflow-hidden border border-white/15 bg-slate-900/60 md:h-[520px] ${className}`}>
      <CardContent className="flex h-full min-h-0 flex-col p-6 md:p-8">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-200/20 bg-cyan-200/10 px-3 py-1 text-xs font-semibold text-cyan-100">
              <Activity className="h-3.5 w-3.5" />
              <span>실시간 획득 피드</span>
            </div>
            <h3 className="mt-3 text-2xl font-bold text-white md:text-3xl">랑구팸 최근 카드 획득</h3>
            <p className="mt-2 text-sm text-slate-300">
              드롭 · 제작 · 강화 이력을 자동 갱신으로 확인할 수 있어요.
            </p>
          </div>
          <div className="rounded-xl border border-white/15 bg-slate-900/70 px-3 py-2 text-right text-[11px] text-slate-300">
            <div className="flex items-center justify-end gap-1">
              <RefreshCcw className="h-3 w-3" />
              <span>자동 갱신</span>
            </div>
            <p className="mt-1 text-cyan-100">{lastUpdatedAt || '-'}</p>
          </div>
        </div>

        <div className="mt-5 min-h-0 flex-1 rounded-2xl border border-white/10 bg-slate-950/45 p-3">
          {isLoading ? (
            <div className="flex h-full items-center justify-center text-sm text-slate-300">
              <div className="h-5 w-5 animate-spin rounded-full border-b-2 border-cyan-300" />
              <span className="ml-2">최근 획득 내역을 불러오는 중...</span>
            </div>
          ) : errorMessage ? (
            <div className="flex h-full items-center justify-center text-center text-sm text-rose-300">
              {errorMessage}
            </div>
          ) : latestItems.length === 0 ? (
            <div className="flex h-full items-center justify-center text-center text-sm text-slate-300">
              아직 표시할 카드 획득 기록이 없습니다.
            </div>
          ) : (
            <div className="h-full min-h-0 space-y-2 overflow-y-auto pr-1">
              <AnimatePresence initial={false}>
                {latestItems.map((item, idx) => (
                  <motion.div
                    key={item.id}
                    className="flex items-center gap-3 rounded-xl border border-white/10 bg-slate-900/70 p-2.5"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: Math.min(idx * 0.015, 0.3), duration: 0.22 }}
                  >
                    <div className="h-14 w-10 overflow-hidden rounded-md border border-white/10 bg-slate-800">
                      <img
                        src={item.cardImageUrl || FALLBACK_IMAGE}
                        alt={item.cardName}
                        onError={(event) => {
                          event.currentTarget.src = FALLBACK_IMAGE
                        }}
                        className="h-full w-full object-cover"
                      />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-xs font-semibold text-cyan-100">{item.memberName}</p>
                        <span
                          className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${
                            activityTone[item.activityType]
                          }`}
                        >
                          {item.activityLabel}
                        </span>
                      </div>
                      <p className="truncate text-sm font-semibold text-slate-100">{item.cardName}</p>
                      <p className="text-[11px] text-slate-400">{formatTime(item.droppedAt)}</p>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
