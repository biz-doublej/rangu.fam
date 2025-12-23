'use client'

import React, { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import {
  Activity,
  ArrowLeft,
  Hammer,
  Package,
  Shield,
  Sparkles
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader } from '@/components/ui/Card'
import { CardDropWidget } from '@/components/ui/CardDropWidget'
import { CardCollection } from '@/components/ui/CardCollection'
import { AdvancedCardCrafting } from '@/components/ui/AdvancedCardCrafting'

const featureTiles = [
  {
    title: 'Daily Drop',
    description: '24시간마다 리셋되는 개인 큐레이션 드랍',
    accent: 'from-amber-300/70 to-orange-400/70',
    icon: Package
  },
  {
    title: 'Collection Sync',
    description: '획득 즉시 인벤토리에 반영 & 강화 재료 분리 보관',
    accent: 'from-sky-300/70 to-indigo-400/70',
    icon: Sparkles
  },
  {
    title: 'Craft Ready',
    description: '드랍으로 모은 소재로 바로 합성·업그레이드',
    accent: 'from-emerald-300/70 to-teal-400/70',
    icon: Hammer
  }
]

export default function CardsPage() {
  const router = useRouter()
  const { user, isLoggedIn } = useAuth()
  const [activeTab, setActiveTab] = useState<'inventory' | 'crafting'>('inventory')

  const heroCards = useMemo(
    () => [
      { label: '획득', value: 'CARD DROP', icon: Sparkles, tone: 'from-amber-400/40 to-orange-500/40' },
      { label: '정리', value: 'INVENTORY', icon: Package, tone: 'from-indigo-400/30 to-blue-500/30' },
      { label: '제작', value: 'CRAFT LAB', icon: Hammer, tone: 'from-emerald-400/30 to-teal-500/30' }
    ],
    []
  )

  const tabs = [
    { id: 'inventory', label: '인벤토리', icon: Sparkles, description: '컬렉션 · 재료 한눈에 보기' },
    { id: 'crafting', label: '제작/강화', icon: Hammer, description: '소재를 조합해 업그레이드' }
  ]

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50">
      <div className="pointer-events-none fixed inset-0 opacity-60">
        <div className="absolute left-[15%] top-10 h-56 w-56 rounded-full bg-indigo-500/20 blur-[120px]" />
        <div className="absolute right-[12%] top-40 h-64 w-64 rounded-full bg-amber-400/25 blur-[140px]" />
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
        <div className="mx-auto max-w-6xl space-y-10 px-4">
          {/* 히어로 */}
          <section className="grid items-center gap-8 lg:grid-cols-[1.05fr,0.95fr]">
            <div className="space-y-6">
              <div className="inline-flex items-center space-x-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-semibold text-amber-100">
                <Sparkles className="h-4 w-4" />
                <span>새로운 시즌 드랍이 열렸어요</span>
              </div>
              <div>
                <h2 className="text-4xl font-bold leading-tight text-white md:text-5xl">
                  매일 새로고침되는 <span className="text-amber-300">카드 드랍</span>
                </h2>
                <p className="mt-3 text-base text-slate-200 md:text-lg">
                  단일 드랍 버튼으로 오늘의 카드와 합성 재료를 수집하고, 바로 인벤토리·제작 탭으로 연결되는
                  라우팅을 제공합니다.
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                {heroCards.map((item) => (
                  <div
                    key={item.label}
                    className="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 px-4 py-3"
                  >
                    <div className={`absolute inset-0 bg-gradient-to-br ${item.tone}`} />
                    <div className="relative flex items-center space-x-3 text-white">
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
              <div className="flex flex-wrap items-center gap-3">
                <Button variant="glass" onClick={() => setActiveTab('inventory')}>
                  드랍 바로 실행
                </Button>
                <div className="flex items-center space-x-2 text-sm text-slate-300">
                  <Shield className="h-4 w-4 text-emerald-300" />
                  <span>획득 카드 자동 잠금 및 인벤토리 연동</span>
                </div>
              </div>
            </div>

            <motion.div
              className="relative rounded-3xl border border-white/10 bg-white/5 p-6 shadow-[0_30px_80px_-40px_rgba(0,0,0,0.5)]"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
            >
              <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-indigo-500/10 via-amber-400/10 to-transparent blur-3xl" />
              <div className="relative grid gap-4">
                <div className="flex items-center justify-between text-sm text-slate-200">
                  <span className="font-semibold">드랍 프리뷰</span>
                  <span className="rounded-full bg-white/10 px-3 py-1 text-xs">연출 미리보기</span>
                </div>
                <div className="relative h-64 overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent" />
                  <div className="relative flex h-full items-center justify-center">
                    <div className="absolute inset-10 rounded-3xl bg-gradient-to-r from-amber-500/20 via-rose-500/10 to-indigo-500/20 blur-3xl" />
                    <div className="relative grid grid-cols-2 gap-4">
                      <div className="relative h-40 w-28 rotate-[-6deg] overflow-hidden rounded-2xl bg-gradient-to-br from-amber-200 to-amber-400 shadow-2xl shadow-amber-500/40">
                        <div className="absolute inset-2 rounded-xl bg-white/30 backdrop-blur-md" />
                        <div className="relative flex h-full w-full items-center justify-center text-lg font-bold text-amber-900">
                          Legendary
                        </div>
                      </div>
                      <div className="relative h-40 w-28 rotate-[8deg] overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-200 to-sky-400 shadow-2xl shadow-indigo-600/40">
                        <div className="absolute inset-2 rounded-xl bg-white/30 backdrop-blur-md" />
                        <div className="relative flex h-full w-full items-center justify-center text-lg font-bold text-indigo-900">
                          Epic
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between text-xs text-slate-200">
                  <div className="flex items-center space-x-2">
                    <Activity className="h-4 w-4 text-emerald-300" />
                    <span>드랍 → 인벤토리 → 제작까지 원스톱</span>
                  </div>
                  <span className="text-amber-200">실제 드랍 연출은 카드 등급에 따라 달라집니다</span>
                </div>
              </div>
            </motion.div>
          </section>

          {/* 기능 하이라이트 */}
          <section className="grid gap-4 md:grid-cols-3">
            {featureTiles.map((item, idx) => (
              <motion.div
                key={item.title}
                className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-5"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 * idx }}
              >
                <div className={`absolute inset-0 bg-gradient-to-br ${item.accent}`} />
                <div className="absolute inset-0 bg-slate-950/40" />
                <div className="relative flex items-start space-x-3 text-white">
                  <div className="rounded-2xl bg-white/15 p-3">
                    <item.icon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold">{item.title}</p>
                    <p className="mt-1 text-sm text-slate-100/80">{item.description}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </section>

          {/* 탭 */}
          <section className="space-y-6">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <h3 className="text-xl font-semibold text-white">카드 드랍 워크플로우</h3>
              <div className="flex flex-col gap-2 md:flex-row md:items-center md:gap-3">
                {tabs.map((tab) => (
                  <motion.button
                    key={tab.id}
                    className={`flex items-center space-x-2 rounded-full border px-4 py-2 text-sm transition ${
                      activeTab === tab.id
                        ? 'border-amber-300/70 bg-amber-200/20 text-amber-100 shadow-[0_10px_30px_-12px_rgba(251,191,36,0.6)]'
                        : 'border-white/10 bg-white/5 text-slate-200 hover:border-amber-200/40 hover:text-white'
                    }`}
                    onClick={() => setActiveTab(tab.id as any)}
                    whileHover={{ y: -2 }}
                    whileTap={{ y: 0 }}
                  >
                    <div
                      className={`flex h-9 w-9 items-center justify-center rounded-full ${
                        activeTab === tab.id ? 'bg-amber-300/30' : 'bg-white/5'
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
                <CardCollection userId={user?.id} />
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
