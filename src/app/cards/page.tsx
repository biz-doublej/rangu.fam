'use client'

import React, { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import {
  ArrowLeft,
  Hammer,
  Package,
  Sparkles,
  WandSparkles
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { CardDropWidget } from '@/components/ui/CardDropWidget'
import { CardCollection } from '@/components/ui/CardCollection'
import { AdvancedCardCrafting } from '@/components/ui/AdvancedCardCrafting'
import { RecentMemberCardActivity } from '@/components/ui/RecentMemberCardActivity'

const DAY_MS = 24 * 60 * 60 * 1000

const formatCountdown = (ms: number) => {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000))
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  return [hours, minutes, seconds].map((value) => String(value).padStart(2, '0')).join(':')
}

export default function CardsPage() {
  const router = useRouter()
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState<'inventory' | 'crafting'>('inventory')
  const [timeUntilReset, setTimeUntilReset] = useState('24:00:00')
  const [nextResetLabel, setNextResetLabel] = useState('-')

  const heroCards = [
    { label: '획득', value: 'CARD DROP', icon: Sparkles, tone: 'from-amber-400/40 to-orange-500/40' },
    { label: '정리', value: 'INVENTORY', icon: Package, tone: 'from-indigo-400/30 to-blue-500/30' },
    { label: '제작', value: 'CRAFT LAB', icon: Hammer, tone: 'from-emerald-400/30 to-teal-500/30' }
  ]

  const tabs = [
    { id: 'inventory', label: '인벤토리', icon: Sparkles, description: '컬렉션 · 재료 한눈에 보기' },
    { id: 'crafting', label: '제작/강화', icon: Hammer, description: '소재를 조합해 업그레이드' }
  ]

  useEffect(() => {
    const storageKey = 'cards-next-drop-reset-at'
    let resetAt = Number(window.localStorage.getItem(storageKey))

    if (!Number.isFinite(resetAt) || resetAt <= Date.now()) {
      resetAt = Date.now() + DAY_MS
      window.localStorage.setItem(storageKey, String(resetAt))
    }

    const tick = () => {
      const now = Date.now()
      if (now >= resetAt) {
        resetAt = now + DAY_MS
        window.localStorage.setItem(storageKey, String(resetAt))
      }

      setTimeUntilReset(formatCountdown(resetAt - now))
      setNextResetLabel(
        new Date(resetAt).toLocaleString('ko-KR', {
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit'
        })
      )
    }

    tick()
    const timerId = window.setInterval(tick, 1000)
    return () => window.clearInterval(timerId)
  }, [])

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50">
      <div className="pointer-events-none fixed inset-0 opacity-70">
        <div className="absolute left-[12%] top-10 h-60 w-60 rounded-full bg-cyan-500/20 blur-[120px]" />
        <div className="absolute right-[12%] top-32 h-72 w-72 rounded-full bg-amber-400/25 blur-[150px]" />
        <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-slate-950 via-slate-950/70" />
      </div>

      {/* 상단 네비 */}
      <header className="glass-nav fixed left-0 right-0 top-0 z-50 bg-slate-950/60 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
          <motion.button
            className="glass-button flex items-center space-x-2 rounded-full px-3 py-2 text-slate-100"
            onClick={() => router.push('/')}
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.98 }}
          >
            <ArrowLeft className="h-5 w-5" />
            <span className="text-sm font-semibold">메인으로</span>
          </motion.button>
          <h1 className="text-lg font-semibold text-slate-100">카드 드랍 랩</h1>
          <div className="w-20" />
        </div>
      </header>

      {/* 메인 */}
      <main className="relative pt-24 pb-16">
        <div className="mx-auto max-w-7xl space-y-10 px-4">
          <section className="rounded-2xl border border-cyan-200/20 bg-slate-900/65 p-4 text-slate-100 backdrop-blur-xl">
            <p className="text-sm font-semibold text-cyan-100">다음 드랍 초기화까지 {timeUntilReset}</p>
            <p className="mt-1 text-xs text-slate-300">초기화 예정 시각: {nextResetLabel} (초기화 후 다시 24시간)</p>
          </section>

          {/* 히어로 */}
          <section className="grid items-stretch gap-6 lg:grid-cols-2">
            <div className="space-y-6 rounded-3xl border border-white/15 bg-slate-900/60 p-6 backdrop-blur-xl md:min-h-[440px] md:p-8">
              <div className="inline-flex items-center space-x-2 rounded-full border border-cyan-200/20 bg-cyan-200/10 px-3 py-1 text-xs font-semibold text-cyan-100">
                <WandSparkles className="h-4 w-4" />
                <span>새로운 시즌 드랍이 열렸어요</span>
              </div>
              <div>
                <h2 className="text-3xl font-bold leading-tight text-white md:text-5xl">
                  매일 새로고침되는 <span className="text-amber-300">카드</span>
                </h2>
                <p className="mt-4 text-base leading-relaxed text-slate-100/90 md:text-lg">
                  카드 드랍부터 카드 오픈, 인벤토리 반영, 제작까지 한 화면에서 이어집니다.
                  가독성을 높여 현재 단계가 어디인지 바로 파악할 수 있게 구성했습니다.
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                {heroCards.map((item) => (
                  <div
                    key={item.label}
                    className="group relative overflow-hidden rounded-2xl border border-white/15 bg-slate-900/70 px-4 py-3"
                  >
                    <div className={`absolute inset-0 bg-gradient-to-br ${item.tone}`} />
                    <div className="absolute inset-0 bg-slate-950/30" />
                    <div className="relative flex items-center space-x-3 text-white/95">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10">
                        <item.icon className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-wide text-slate-200">{item.label}</p>
                        <p className="text-sm font-semibold">{item.value}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <RecentMemberCardActivity />
          </section>

          {/* 탭 */}
          <section className="space-y-6">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <h3 className="text-xl font-semibold text-white">카드 드랍 워크플로우</h3>
              <div className="flex flex-col gap-2 rounded-2xl border border-white/10 bg-slate-900/60 p-2 md:flex-row md:items-center md:gap-3">
                {tabs.map((tab) => (
                  <motion.button
                    key={tab.id}
                    className={`flex items-center space-x-2 rounded-full border px-4 py-2 text-sm transition ${
                      activeTab === tab.id
                        ? 'border-cyan-200/70 bg-cyan-200/20 text-cyan-100 shadow-[0_10px_30px_-12px_rgba(34,211,238,0.55)]'
                        : 'border-white/10 bg-white/5 text-slate-200 hover:border-cyan-200/40 hover:text-white'
                    }`}
                    onClick={() => setActiveTab(tab.id as any)}
                    whileHover={{ y: -2 }}
                    whileTap={{ y: 0 }}
                  >
                    <div
                      className={`flex h-9 w-9 items-center justify-center rounded-full ${
                        activeTab === tab.id ? 'bg-cyan-300/30' : 'bg-white/5'
                      }`}
                    >
                      <tab.icon className="h-4 w-4" />
                    </div>
                    <div className="text-left">
                      <p className="font-semibold">{tab.label}</p>
                      <p className="text-[11px] text-slate-300">{tab.description}</p>
                    </div>
                  </motion.button>
                ))}
              </div>
            </div>

            <motion.div
              key={activeTab}
              className="min-h-[620px]"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
            >
              {activeTab === 'inventory' && (
                <div className="grid gap-6 xl:grid-cols-[360px,1fr]">
                  <CardDropWidget userId={user?.id} className="h-fit xl:sticky xl:top-24" />
                  <CardCollection userId={user?.id} />
                </div>
              )}

              {activeTab === 'crafting' && (
                <AdvancedCardCrafting userId={user?.id} />
              )}
            </motion.div>
          </section>
        </div>
      </main>
    </div>
  )
}
