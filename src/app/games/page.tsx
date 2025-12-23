'use client'

import React, { useMemo } from 'react'
import { motion } from 'framer-motion'
import {
  Activity,
  ArrowLeft,
  BarChart3,
  Brain,
  Flame,
  Gamepad2,
  Layers,
  Star,
  Sparkles,
  Spade,
  Trophy,
  Users,
  Zap
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'

const games = [
  {
    id: 'tetris',
    title: '테트리스 인피니트',
    blurb: '고스트/홀드/하드드랍 커스텀, 타임어택·하드코어 모드 준비 중',
    icon: Zap,
    tone: 'from-cyan-400/70 via-indigo-500/70 to-purple-500/70',
    badge: '리워크',
    players: '1P',
    route: '/games/tetris'
  },
  {
    id: 'wordchain',
    title: '끝말잇기 듀얼',
    blurb: '시간제·무제한, 금칙어/힌트·패스, 듀얼 모드까지 한 큐에',
    icon: Brain,
    tone: 'from-emerald-400/70 via-teal-400/70 to-sky-400/70',
    badge: '업데이트',
    players: '2-4P',
    route: '/games/wordchain'
  },
  {
    id: 'cardgame',
    title: '카드 아레나',
    blurb: '싱글/봇/멀티 지원 목표, 효과/애니메이션/보상 루프 개편',
    icon: Spade,
    tone: 'from-rose-400/70 via-fuchsia-400/70 to-amber-400/70',
    badge: '개발중',
    players: '2-4P',
    route: '/games/cardgame'
  }
]

const quickStats = [
  { label: '예정 빌드', value: 'v0.9 Beta', detail: '공통 UI/음향·모션 정리' },
  { label: '공통 테마', value: 'Neon Arcade', detail: '글라스+그리드+그라데이션' },
  { label: '우선 순위', value: '기능 → UX → 애니메', detail: '버그 0, 속도 최적화' }
]

export default function GamesPage() {
  const router = useRouter()
  const heroCTA = useMemo(() => games[0], [])

  return (
    <div className="relative min-h-screen bg-slate-950 text-white">
      <div className="pointer-events-none absolute inset-0 opacity-60">
        <div className="absolute left-[10%] top-10 h-64 w-64 rounded-full bg-indigo-600/30 blur-[140px]" />
        <div className="absolute right-[8%] top-20 h-56 w-56 rounded-full bg-cyan-400/30 blur-[140px]" />
        <div className="absolute left-1/3 bottom-0 h-72 w-72 rounded-full bg-fuchsia-500/20 blur-[160px]" />
      </div>

      {/* 상단 네비 */}
      <header className="glass-nav fixed left-0 right-0 top-0 z-50 bg-slate-950/70 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
          <motion.button
            className="glass-button flex items-center space-x-2 rounded-full px-3 py-2 text-slate-100"
            onClick={() => router.push('/')}
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.98 }}
          >
            <ArrowLeft className="h-5 w-5" />
            <span className="text-sm font-semibold">메인으로</span>
          </motion.button>
          <h1 className="text-lg font-semibold text-slate-100">Game Center</h1>
          <motion.button
            className="glass-button flex items-center space-x-2 rounded-full px-3 py-2 text-amber-200"
            onClick={() => router.push('/games/leaderboard')}
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.98 }}
          >
            <Trophy className="h-5 w-5" />
            <span className="text-sm font-semibold">리더보드</span>
          </motion.button>
        </div>
      </header>

      <main className="relative mx-auto max-w-6xl px-5 pt-24 pb-16 space-y-10">
        {/* 히어로 */}
        <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-slate-900/80 via-indigo-900/50 to-purple-900/40 p-8 shadow-2xl">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(99,102,241,0.35),transparent_35%),radial-gradient(circle_at_80%_0%,rgba(14,165,233,0.25),transparent_30%)]" />
          <div className="relative grid gap-6 lg:grid-cols-[1.1fr,0.9fr]">
            <div className="space-y-5">
              <p className="inline-flex items-center space-x-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-amber-100">
                <Sparkles className="h-4 w-4" />
                <span>아케이드 전반 리뉴얼 준비</span>
              </p>
              <h2 className="text-4xl font-bold leading-tight text-white md:text-5xl">
                한 곳에서 즐기는 <span className="text-amber-300">Neon Arcade</span>
              </h2>
              <p className="text-base text-slate-200 md:text-lg">
                공통 HUD/컨트롤, 리더보드, 모드·난이도 셀렉터까지 통합된 게임 허브. 테트리스·끝말잇기·카드게임을
                하나의 테마로 묶어 재배치합니다.
              </p>
              <div className="flex flex-wrap gap-3">
                <Button
                  variant="primary"
                  onClick={() => router.push(heroCTA.route)}
                  className="bg-gradient-to-r from-amber-400 to-pink-500 text-slate-950 hover:from-amber-300 hover:to-pink-400"
                >
                  <Gamepad2 className="mr-2 h-4 w-4" />
                  지금 플레이
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => router.push('/games/leaderboard')}
                  className="border-white/20 text-slate-100 hover:bg-white/10"
                >
                  <BarChart3 className="mr-2 h-4 w-4" />
                  리더보드 보기
                </Button>
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                {quickStats.map((item) => (
                  <div
                    key={item.label}
                    className="rounded-2xl border border-white/10 bg-white/5 p-3 text-sm text-slate-200"
                  >
                    <p className="text-xs uppercase tracking-wide text-slate-400">{item.label}</p>
                    <p className="text-lg font-semibold text-white">{item.value}</p>
                    <p className="text-[11px] text-slate-400">{item.detail}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-5">
              <div className="absolute inset-0 bg-gradient-to-br from-amber-400/15 via-fuchsia-500/10 to-cyan-400/10 blur-2xl" />
              <div className="relative space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Flame className="h-5 w-5 text-amber-300" />
                    <p className="text-sm font-semibold text-white">다가올 패치</p>
                  </div>
                  <span className="rounded-full bg-white/10 px-3 py-1 text-[11px] text-slate-200">v0.9 Plan</span>
                </div>
                <div className="space-y-3 text-sm text-slate-200">
                  <div className="flex items-start space-x-2">
                    <Layers className="h-4 w-4 text-cyan-300" />
                    <div>
                      <p className="font-semibold text-white">공통 UI/HUD 세트</p>
                      <p className="text-slate-300">스코어·진행도·타이머·키맵을 통일된 HUD로 제공</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-2">
                    <Activity className="h-4 w-4 text-emerald-300" />
                    <div>
                      <p className="font-semibold text-white">모드 & 난이도 프리셋</p>
                      <p className="text-slate-300">노멀/하드/타임어택·듀얼 옵션을 빠르게 선택</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-2">
                    <Sparkles className="h-4 w-4 text-amber-300" />
                    <div>
                      <p className="font-semibold text-white">에니메이션 & 사운드</p>
                      <p className="text-slate-300">네온 아케이드 톤으로 모션/사운드 효과 정돈</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 게임 셀프 */}
        <section className="space-y-5">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-semibold text-white">Arcade Shelf</h3>
            <Button
              variant="ghost"
              className="text-slate-200 hover:bg-white/10"
              onClick={() => router.push('/games/leaderboard')}
            >
              <Trophy className="mr-2 h-4 w-4" />
              전체 리더보드
            </Button>
          </div>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {games.map((game, idx) => (
              <motion.div
                key={game.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 * idx }}
              >
                <Card
                  hover
                  className="relative overflow-hidden border-white/10 bg-white/5"
                  onClick={() => router.push(game.route)}
                >
                  <div className={`absolute inset-0 bg-gradient-to-br ${game.tone} opacity-60`} />
                  <CardHeader className="relative">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <div className="rounded-2xl bg-white/20 p-3 text-white">
                          <game.icon className="h-6 w-6" />
                        </div>
                        <div>
                          <p className="text-xs uppercase tracking-wide text-white/80">Arcade</p>
                          <h4 className="text-lg font-bold text-white">{game.title}</h4>
                        </div>
                      </div>
                      <span className="rounded-full bg-white/20 px-3 py-1 text-[11px] font-semibold text-white">
                        {game.badge}
                      </span>
                    </div>
                    <p className="mt-3 text-sm text-white/90">{game.blurb}</p>
                  </CardHeader>
                  <CardContent className="relative">
                    <div className="flex items-center justify-between text-xs text-white/80">
                      <div className="flex items-center space-x-2">
                        <Star className="h-4 w-4 text-white/90" />
                        <span>모드 · 난이도 프리셋</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Users className="h-4 w-4 text-white/90" />
                        <span>{game.players}</span>
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter className="relative grid grid-cols-2 gap-2">
                    <Button
                      variant="primary"
                      className="w-full bg-white text-slate-900 hover:bg-slate-100"
                      onClick={(e) => {
                        e.stopPropagation()
                        router.push(game.route)
                      }}
                    >
                      <Gamepad2 className="mr-2 h-4 w-4" />
                      플레이
                    </Button>
                    <Button
                      variant="ghost"
                      className="w-full border-white/30 text-white hover:bg-white/10"
                      onClick={(e) => {
                        e.stopPropagation()
                        router.push(`/games/leaderboard?gameType=${game.id}`)
                      }}
                    >
                      <BarChart3 className="mr-2 h-4 w-4" />
                      리더보드
                    </Button>
                  </CardFooter>
                </Card>
              </motion.div>
            ))}
          </div>
        </section>
      </main>
    </div>
  )
}
