'use client'

import React, { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import {
  ChevronLeft,
  Hammer,
  Package,
  Sparkles,
  WandSparkles,
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { CardDropWidget } from '@/components/ui/CardDropWidget'
import { CardCollection } from '@/components/ui/CardCollection'
import { AdvancedCardCrafting } from '@/components/ui/AdvancedCardCrafting'
import { RecentMemberCardActivity } from '@/components/ui/RecentMemberCardActivity'
import {
  PaperCard,
  Handwritten,
  CaveatText,
  InkUnderline,
  TapeStrip,
  Pin,
} from '@/components/scrapbook'

const DAY_MS = 24 * 60 * 60 * 1000

const formatCountdown = (ms: number) => {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000))
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  return [hours, minutes, seconds].map((v) => String(v).padStart(2, '0')).join(':')
}

export default function CardsPage() {
  const router = useRouter()
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState<'inventory' | 'crafting'>('inventory')
  const [timeUntilReset, setTimeUntilReset] = useState('24:00:00')
  const [nextResetLabel, setNextResetLabel] = useState('-')

  const tabs = [
    { id: 'inventory' as const, label: '인벤토리', icon: Package, desc: '컬렉션과 재료를 한눈에' },
    { id: 'crafting' as const, label: '제작 랩', icon: Hammer, desc: '소재를 모아 프레스티지로' },
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
          second: '2-digit',
        })
      )
    }
    tick()
    const id = window.setInterval(tick, 1000)
    return () => window.clearInterval(id)
  }, [])

  return (
    <div className="min-h-screen pb-20">
      {/* ── Top bar ── */}
      <div className="border-b border-dashed border-ink-500/15 bg-paper-50/70 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4 sm:px-8">
          <button
            onClick={() => router.push('/')}
            className="inline-flex items-center gap-1 text-sm text-ink-300 hover:text-ink-500"
          >
            <ChevronLeft className="h-4 w-4" />
            홈으로
          </button>
          <CaveatText className="text-lg text-coral-500">{"today's drop"}</CaveatText>
          <div className="w-16" />
        </div>
      </div>

      <main className="mx-auto max-w-6xl px-5 sm:px-8">
        {/* ── Hero ── */}
        <section className="relative grid gap-10 py-12 lg:grid-cols-[1.1fr,1fr] lg:items-center lg:py-20">
          <div className="space-y-5">
            <CaveatText className="text-xl text-coral-500">card drop · daily</CaveatText>
            <h1 className="scrap-h1">
              하루 한 번<br />
              <InkUnderline variant="mustard">새로 열리는</InkUnderline> 카드.
            </h1>
            <p className="max-w-md text-base leading-relaxed text-ink-300">
              뽑고, 모으고, 합쳐서 더 희귀한 카드로.
              <Handwritten size="sm" className="ml-1 text-coral-500">매일 자정에 리셋</Handwritten>됩니다.
            </p>

            <PaperCard className="mt-4 !px-5 !py-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-ink-300">next reset in</p>
                  <p className="font-mono text-2xl font-bold tabular-nums text-ink-500">{timeUntilReset}</p>
                </div>
                <div className="text-right text-xs text-ink-300">
                  <p className="text-ink-300/70">예정 시각</p>
                  <p className="font-medium text-ink-500">{nextResetLabel}</p>
                </div>
              </div>
            </PaperCard>
          </div>

          <div className="relative">
            <RecentMemberCardActivity />
          </div>
        </section>

        {/* ── Rarity guide ── */}
        <section className="border-t border-dashed border-ink-500/15 py-12">
          <div className="mb-8 flex items-end justify-between gap-4">
            <div>
              <CaveatText className="text-lg text-coral-500">rarity guide</CaveatText>
              <h2 className="scrap-h2 mt-1">5가지 카드</h2>
              <p className="mt-2 text-sm text-ink-300">매일 한 장씩, 등급별로 다른 확률로 등장합니다.</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {[
              { name: 'Year', label: '년도', rate: '50%', tone: '베이직', accent: '#9C8E78' },
              { name: 'Special', label: '스페셜', rate: '30%', tone: '희귀', accent: '#3E5C4A' },
              { name: 'Signature', label: '시그니처', rate: '10%', tone: '희귀', accent: '#E0654E' },
              { name: 'Material', label: '재료', rate: '10%', tone: '조합용', accent: '#C28A2D' },
              { name: 'Prestige', label: '프레스티지', rate: '0%', tone: '초희귀 · 조합 한정', accent: '#9A6C20' },
            ].map((r) => (
              <PaperCard key={r.name} className="!p-4 text-center">
                <p className="text-[10px] uppercase tracking-[0.2em] text-ink-300">{r.name}</p>
                <p className="display-han mt-2 text-2xl" style={{ color: r.accent }}>
                  {r.label}
                </p>
                <p className="mt-2 font-mono text-base font-bold text-ink-500">{r.rate}</p>
                <p className="caveat mt-1 text-sm text-ink-300">{r.tone}</p>
              </PaperCard>
            ))}
          </div>

          <p className="caveat mt-6 text-center text-base text-ink-300">
            <Pin color="coral" className="-mt-1 mr-1 inline-block align-middle" />
            재료를 모아 프레스티지로 합성할 수 있어요.
          </p>
        </section>

        {/* ── Tabs ── */}
        <section className="border-t border-dashed border-ink-500/15 pt-10">
          <div className="mb-6 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <CaveatText className="text-lg text-coral-500">workflow</CaveatText>
              <h2 className="scrap-h2 mt-1">카드 작업대</h2>
            </div>

            <div className="flex flex-col gap-2 rounded-2xl border border-ink-500/10 bg-paper-50/80 p-1.5 shadow-paper sm:flex-row">
              {tabs.map((tab) => {
                const Icon = tab.icon
                const active = activeTab === tab.id
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-3 rounded-xl px-4 py-2.5 text-left transition ${
                      active
                        ? 'bg-ink-500 text-paper-50 shadow-paper'
                        : 'text-ink-500 hover:bg-ink-500/5'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    <div>
                      <p className="text-sm font-bold leading-tight">{tab.label}</p>
                      <p className={`text-[11px] leading-tight ${active ? 'text-paper-200' : 'text-ink-300'}`}>
                        {tab.desc}
                      </p>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
            className="min-h-[600px]"
          >
            {activeTab === 'inventory' && (
              <div className="grid gap-6 xl:grid-cols-[360px,1fr]">
                <CardDropWidget userId={user?.id} className="h-fit xl:sticky xl:top-6" />
                <CardCollection userId={user?.id} />
              </div>
            )}

            {activeTab === 'crafting' && <AdvancedCardCrafting userId={user?.id} />}
          </motion.div>
        </section>
      </main>
    </div>
  )
}
