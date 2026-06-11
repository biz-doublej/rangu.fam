'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { motion } from 'framer-motion'
import { useRouter } from 'next/navigation'
import {
  ChevronLeft,
  Star,
  Users,
  BookOpen,
  Coffee,
  Plane,
  Shield,
  Clock,
  Package,
  Activity,
  Sparkles,
  Globe,
  ArrowRight,
} from 'lucide-react'
import {
  PaperCard,
  Polaroid,
  Handwritten,
  CaveatText,
  InkUnderline,
  TapeStrip,
  Pin,
  DoodleArrow,
  DoodleCircle,
} from '@/components/scrapbook'
import { BRANDING } from '@/config/branding'

interface UpcomingEvent {
  name: string
  type: 'formation' | 'complete'
  targetDays: number
  targetDate: Date
  daysLeft: number
  emoji: string
}

interface HistoryEvent {
  id?: string
  date: string
  title: string
  description: string
  category?: string
  type?: string
  emoji?: string
  location?: string
}

const members = [
  {
    name: '정재원',
    role: '개발 · 패션 · 기록',
    desc: '코딩과 기술에 열정을 가진 랑구팸의 기술 리더',
    pic: '/images/profile/jw.jpg',
    rot: 'left' as const,
    tape: 'top-left' as const,
    color: 'coral' as const,
  },
  {
    name: '정민석',
    role: '루체른 · 유학 · 탐험',
    desc: '새로운 경험과 도전을 즐기는 자유로운 영혼',
    pic: '/images/profile/ms.png',
    rot: 'right' as const,
    tape: 'top-right' as const,
    color: 'sage' as const,
  },
  {
    name: '정진규',
    role: '수호자 (군 복무 중)',
    desc: '든든한 믿음직한 랑구팸의 보호자',
    pic: '/images/profile/jq.jpg',
    rot: 'extra' as const,
    tape: 'top' as const,
    color: 'yellow' as const,
  },
  {
    name: '강한울',
    role: '게이머 · 진학 예정',
    desc: '게임과 엔터테인먼트, 새로운 취미의 전문가',
    pic: '/images/profile/hu.jpg',
    rot: 'left' as const,
    tape: 'top-right' as const,
    color: 'coral' as const,
  },
  {
    name: '이승찬',
    role: '마술사 · 임시 멤버',
    desc: '카드 한 장에 마법을 담아 보여준다',
    pic: '/images/profile/sc.jpg',
    rot: 'right' as const,
    tape: 'top-left' as const,
    color: 'sage' as const,
  },
]

const labFeatures = [
  {
    title: '이랑위키',
    desc: '우리만의 지식과 추억을 기록하는 백과사전',
    href: BRANDING.wikiPublicUrl,
    icon: BookOpen,
    accent: 'sage' as const,
  },
  {
    title: '카드 드랍',
    desc: '랜덤 미션과 수집 카드를 확인하는 공간',
    href: '/cards',
    icon: Package,
    accent: 'mustard' as const,
  },
  {
    title: '멤버 카드',
    desc: '서로 다른 도시, 다섯 개의 한 줄 소개',
    href: '/members',
    icon: Users,
    accent: 'coral' as const,
  },
]

const rituals = [
  {
    title: 'Night Sync',
    desc: '하루를 마무리하며 감정과 근황을 나누는 시간',
    schedule: '매주 금요일 22:30',
    focus: '감정 공유',
    icon: Coffee,
    pin: 'coral' as const,
  },
  {
    title: 'Remote Drive',
    desc: '각자의 도시를 느끼며 진행하는 드라이브 라이브',
    schedule: '격주 토요일 오후',
    focus: '거리 두지 않는 연결',
    icon: Plane,
    pin: 'sage' as const,
  },
  {
    title: 'Project Stand-up',
    desc: '진행중인 프로젝트를 공유하고 서로 피드백',
    schedule: '매주 수요일 21:00',
    focus: '협업 & 성장',
    icon: Shield,
    pin: 'mustard' as const,
  },
]

const formationMilestones = [
  { days: 600, name: '600일 기념', emoji: '🎊' },
  { days: 700, name: '700일 기념', emoji: '🎈' },
  { days: 730, name: '2주년', emoji: '🎂' },
  { days: 800, name: '800일 기념', emoji: '🌟' },
  { days: 900, name: '900일 기념', emoji: '🎯' },
  { days: 1000, name: '1000일 기념', emoji: '🏆' },
  { days: 1095, name: '3주년', emoji: '🎉' },
  { days: 1200, name: '1200일 기념', emoji: '💎' },
  { days: 1460, name: '4주년', emoji: '🎊' },
  { days: 1500, name: '1500일 기념', emoji: '🌈' },
  { days: 1825, name: '5주년', emoji: '👑' },
  { days: 2000, name: '2000일 기념', emoji: '🚀' },
]

const completeMilestones = [
  { days: 600, name: '완전체 600일', emoji: '💫' },
  { days: 700, name: '완전체 700일', emoji: '⭐' },
  { days: 730, name: '완전체 2주년', emoji: '🎭' },
  { days: 800, name: '완전체 800일', emoji: '✨' },
  { days: 1000, name: '완전체 1000일', emoji: '🎆' },
  { days: 1095, name: '완전체 3주년', emoji: '🎊' },
]

const formatNumber = (value?: number | null) => {
  if (typeof value !== 'number' || Number.isNaN(value)) return '0'
  return value.toLocaleString('ko-KR')
}

export default function AboutPage() {
  const router = useRouter()
  const [isClient, setIsClient] = useState(false)
  const [timeStats, setTimeStats] = useState({
    formationDays: 0,
    formationYears: 0,
    completeDays: 0,
    completeYears: 0,
  })
  const [upcomingEvents, setUpcomingEvents] = useState<UpcomingEvent[]>([])
  const [siteHistory, setSiteHistory] = useState<any>(null)
  const [historyEvents, setHistoryEvents] = useState<HistoryEvent[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    setIsClient(true)
  }, [])

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch('/api/site-history')
        if (res.ok) {
          const data = await res.json()
          if (data.success) {
            setSiteHistory(data.data)
            const sorted = [...data.data.events].sort(
              (a: HistoryEvent, b: HistoryEvent) => new Date(b.date).getTime() - new Date(a.date).getTime()
            )
            setHistoryEvents(sorted)
          }
        }
      } catch (e) {
        console.error('site history load failed', e)
      } finally {
        setIsLoading(false)
      }
    }
    load()
  }, [])

  useEffect(() => {
    if (!siteHistory) return
    const compute = () => {
      const now = new Date()
      const formationDate = new Date(siteHistory.formationDate)
      const completeDate = new Date(siteHistory.completeDate)
      const formationDays = Math.floor((now.getTime() - formationDate.getTime()) / 86_400_000)
      const completeDays = Math.floor((now.getTime() - completeDate.getTime()) / 86_400_000)
      setTimeStats({
        formationDays,
        formationYears: Math.floor(formationDays / 365),
        completeDays,
        completeYears: Math.floor(completeDays / 365),
      })

      const upcoming: UpcomingEvent[] = []
      formationMilestones.forEach((m) => {
        const target = new Date(formationDate.getTime() + m.days * 86_400_000)
        const left = Math.ceil((target.getTime() - now.getTime()) / 86_400_000)
        if (left > 0)
          upcoming.push({ name: m.name, type: 'formation', targetDays: m.days, targetDate: target, daysLeft: left, emoji: m.emoji })
      })
      completeMilestones.forEach((m) => {
        const target = new Date(completeDate.getTime() + m.days * 86_400_000)
        const left = Math.ceil((target.getTime() - now.getTime()) / 86_400_000)
        if (left > 0)
          upcoming.push({ name: m.name, type: 'complete', targetDays: m.days, targetDate: target, daysLeft: left, emoji: m.emoji })
      })
      upcoming.sort((a, b) => a.daysLeft - b.daysLeft)
      setUpcomingEvents(upcoming.slice(0, 4))
    }
    compute()
    const id = setInterval(compute, 60_000)
    return () => clearInterval(id)
  }, [siteHistory])

  const heroStats = useMemo(
    () => [
      { label: '함께한 시간', value: `D+${formatNumber(timeStats.formationDays)}`, detail: timeStats.formationYears > 0 ? `${timeStats.formationYears}년째` : '막 시작', icon: Activity },
      { label: '완전체', value: `D+${formatNumber(timeStats.completeDays)}`, detail: timeStats.completeYears > 0 ? `${timeStats.completeYears}년차` : '따끈한 완전체', icon: Users },
      { label: '기록된 순간', value: formatNumber(historyEvents.length), detail: '타임라인 이벤트', icon: Clock },
      { label: '운영 기능', value: formatNumber(labFeatures.length), detail: '랩에서 확장 중', icon: Sparkles },
    ],
    [timeStats, historyEvents.length]
  )

  const snapshotCards = useMemo(() => {
    const stats = siteHistory?.stats || {}
    return [
      { label: '누적 방문', value: formatNumber(stats.totalVisits || 1280), detail: '우리 공간을 찾은 횟수', icon: Globe, color: 'coral' as const },
      { label: '등록 문서', value: formatNumber(stats.totalPages || 8), detail: '이랑위키 컨텐츠', icon: BookOpen, color: 'sage' as const },
      { label: '함께한 멤버', value: formatNumber(stats.totalUsers || members.length), detail: '현재 & 임시 멤버', icon: Users, color: 'mustard' as const },
      { label: '누적 기록', value: formatNumber(stats.totalPages || 0), detail: '위키 기록', icon: BookOpen, color: 'coral' as const },
    ]
  }, [siteHistory])

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
          <CaveatText className="text-lg text-coral-500">our story</CaveatText>
          <div className="w-16" />
        </div>
      </div>

      <main className="mx-auto max-w-6xl px-5 sm:px-8">
        {/* ─────── 1. Hero / Cover ─────── */}
        <section className="relative grid gap-12 py-14 lg:grid-cols-[1.1fr,1fr] lg:items-center lg:gap-16 lg:py-24">
          <div className="space-y-6">
            <CaveatText className="text-xl text-coral-500">vol. 27 · about issue</CaveatText>
            <h1 className="scrap-h1">
              네 도시,<br />
              <InkUnderline variant="coral">한 페이지</InkUnderline>의<br />
              친구들.
            </h1>
            <p className="max-w-md text-lg leading-relaxed text-ink-300">
              Rangu.fam은 서로 다른 도시에서 살아가는 친구들이 만든 작은 잡지이자 실험실이에요.
              <Handwritten size="sm" className="ml-1 text-coral-500">함께 있는 감각</Handwritten>을
              온라인으로 다시 만들어 가는 중입니다.
            </p>

            <div className="flex flex-wrap gap-2 pt-1">
              <span className="pill-tag pill-tag--coral">remote-first</span>
              <span className="pill-tag pill-tag--sage">since 2023.06.06</span>
              <span className="pill-tag pill-tag--mustard">{members.length}명 + α</span>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              {heroStats.map((s) => {
                const Icon = s.icon
                return (
                  <div key={s.label} className="paper-card relative !p-4">
                    <Icon className="absolute right-3 top-3 h-3.5 w-3.5 text-ink-300/70" />
                    <p className="text-[10px] uppercase tracking-[0.2em] text-ink-300">
                      {s.label}
                    </p>
                    <p className="mt-1.5 font-display text-2xl leading-none text-ink-500">
                      {s.value}
                    </p>
                    <p className="mt-1.5 text-xs text-ink-300">{s.detail}</p>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Right: photo collage (lg+ 4-collage / mobile: single hero polaroid) */}
          <div className="relative flex h-[320px] items-center justify-center lg:block lg:h-[520px]">
            <div className="lg:absolute lg:left-0 lg:top-0">
              <Polaroid src={members[0].pic} alt="" rotate="left" tape="top-left" tapeColor="coral" width={200} height={250} aspect="portrait" />
            </div>
            <div className="hidden lg:absolute lg:right-0 lg:top-12 lg:block">
              <Polaroid src={members[1].pic} alt="" rotate="right" tape="top-right" tapeColor="sage" width={200} height={250} aspect="portrait" />
            </div>
            <div className="hidden lg:absolute lg:bottom-0 lg:left-12 lg:block">
              <Polaroid src={members[2].pic} alt="" rotate="extra" tape="top" tapeColor="yellow" width={200} height={250} aspect="portrait" />
            </div>
            <div className="hidden lg:absolute lg:bottom-12 lg:right-12 lg:block">
              <Polaroid src={members[4].pic} alt="" rotate="right" tape="top-right" tapeColor="coral" width={180} height={220} aspect="portrait" />
            </div>
            <DoodleCircle className="absolute left-1/2 top-1/2 hidden -translate-x-1/2 -translate-y-1/2 text-coral-500 lg:block" />
          </div>
        </section>

        {/* ─────── 2. 랑구팸이란? ─────── */}
        <section className="border-t border-dashed border-ink-500/15 py-16">
          <div className="grid gap-6 lg:grid-cols-[1fr,1fr] lg:gap-10">
            <PaperCard className="!p-8 sm:!p-10">
              <CaveatText className="text-lg text-coral-500">what is it</CaveatText>
              <h2 className="display-han mt-1 text-3xl text-ink-500">
                <InkUnderline variant="mustard">랑구팸</InkUnderline>이란?
              </h2>
              <p className="mt-5 text-base leading-relaxed text-ink-300">
                <strong className="font-bold text-ink-500">Rangu.fam</strong>은 서로 다른 도시에서 살아가는
                네 명의 친구들이 만든 독립 커뮤니티예요. 실시간 통화, 협업 프로젝트, 기록 문화가
                자연스럽게 이어지도록 직접 서비스와 툴을 구축해 나가는 실험실이기도 합니다.
              </p>
              <p className="mt-3 text-base leading-relaxed text-ink-300">
                우리는 <Handwritten size="sm" className="text-coral-500">함께 있는 감각</Handwritten>을 온라인으로
                재현하기 위해 위키, 카드, 일정 관리 등 다양한 기능을 직접 만들고 다듬어 가고 있어요.
              </p>
            </PaperCard>

            <PaperCard className="paper-card--lined !p-8 sm:!p-10">
              <CaveatText className="text-lg text-coral-500">days together</CaveatText>
              <h2 className="display-han mt-1 text-3xl text-ink-500">기념일 카운터</h2>

              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl border border-coral-500/30 bg-coral-500/5 p-5">
                  <p className="text-xs uppercase tracking-[0.2em] text-coral-600">결성 D+</p>
                  <p className="mt-1 font-display text-3xl text-ink-500">{formatNumber(timeStats.formationDays)}</p>
                  <p className="mt-1 text-sm text-ink-300">
                    {timeStats.formationYears > 0 && `${timeStats.formationYears}년 `}
                    {timeStats.formationDays % 365}일째
                  </p>
                </div>
                <div className="rounded-2xl border border-sage-500/30 bg-sage-500/5 p-5">
                  <p className="text-xs uppercase tracking-[0.2em] text-sage-600">완전체 D+</p>
                  <p className="mt-1 font-display text-3xl text-ink-500">{formatNumber(timeStats.completeDays)}</p>
                  <p className="mt-1 text-sm text-ink-300">
                    {timeStats.completeYears > 0 && `${timeStats.completeYears}년 `}
                    {timeStats.completeDays % 365}일째
                  </p>
                </div>
              </div>

              <p className="caveat mt-4 text-base text-ink-300">
                {isClient ? `last sync: ${new Date().toLocaleString('ko-KR')}` : 'syncing…'}
              </p>
            </PaperCard>
          </div>
        </section>

        {/* ─────── 3. 다가오는 기념일 ─────── */}
        {upcomingEvents.length > 0 && (
          <section className="border-t border-dashed border-ink-500/15 py-16">
            <div className="mb-8 flex items-end justify-between gap-4">
              <div>
                <CaveatText className="text-lg text-coral-500">save the date</CaveatText>
                <h2 className="scrap-h2 mt-1">다가오는 기념일</h2>
              </div>
              <DoodleArrow direction="down-right" className="hidden text-ink-300 sm:block" />
            </div>

            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {upcomingEvents.map((event, idx) => (
                <motion.div
                  key={`${event.name}-${event.targetDays}`}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: idx * 0.06 }}
                >
                  <PaperCard className="!p-5 h-full">
                    <div className="flex items-start justify-between">
                      <span className="text-3xl">{event.emoji}</span>
                      <span className={`pill-tag ${event.type === 'formation' ? 'pill-tag--coral' : 'pill-tag--sage'}`}>
                        {event.type === 'formation' ? '결성' : '완전체'}
                      </span>
                    </div>
                    <h3 className="mt-4 font-display text-xl text-ink-500">{event.name}</h3>
                    <p className="mt-1 text-xs text-ink-300">{event.targetDate.toLocaleDateString('ko-KR')}</p>

                    <div className="mt-5 border-t border-dashed border-ink-500/15 pt-4">
                      <p className="text-[11px] uppercase tracking-[0.2em] text-ink-300">D-{event.daysLeft}</p>
                      <p className="font-display text-2xl text-coral-500">{event.daysLeft.toLocaleString()}일 남음</p>
                    </div>
                  </PaperCard>
                </motion.div>
              ))}
            </div>
          </section>
        )}

        {/* ─────── 4. 커뮤니티 스냅샷 ─────── */}
        <section className="border-t border-dashed border-ink-500/15 py-16">
          <div className="mb-8">
            <CaveatText className="text-lg text-coral-500">by the numbers</CaveatText>
            <h2 className="scrap-h2 mt-1">커뮤니티 스냅샷</h2>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4">
            {snapshotCards.map((c) => {
              const Icon = c.icon
              return (
                <PaperCard key={c.label} className="!p-5">
                  <div className="flex items-center gap-2">
                    <span
                      className="rounded-full p-2"
                      style={{
                        background:
                          c.color === 'coral'
                            ? 'rgba(224,101,78,0.12)'
                            : c.color === 'sage'
                            ? 'rgba(62,92,74,0.12)'
                            : 'rgba(194,138,45,0.12)',
                        color:
                          c.color === 'coral' ? '#E0654E' : c.color === 'sage' ? '#3E5C4A' : '#C28A2D',
                      }}
                    >
                      <Icon className="h-4 w-4" />
                    </span>
                    <p className="text-xs uppercase tracking-[0.18em] text-ink-300">{c.label}</p>
                  </div>
                  <p className="mt-3 font-display text-3xl text-ink-500">{c.value}</p>
                  <p className="mt-1 text-xs text-ink-300">{c.detail}</p>
                </PaperCard>
              )
            })}
          </div>
        </section>

        {/* ─────── 5. 히스토리 타임라인 ─────── */}
        <section className="border-t border-dashed border-ink-500/15 py-16">
          <div className="mb-8 flex items-end justify-between gap-4">
            <div>
              <CaveatText className="text-lg text-coral-500">timeline</CaveatText>
              <h2 className="scrap-h2 mt-1">랑구팸 히스토리</h2>
              <p className="mt-2 text-sm text-ink-300">{historyEvents.length}개의 이벤트로 정리한 우리 이야기.</p>
            </div>
          </div>

          {isLoading && (
            <PaperCard className="!p-12 text-center">
              <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-coral-500/30 border-t-coral-500" />
              <p className="caveat mt-4 text-lg text-ink-300">heritage loading…</p>
            </PaperCard>
          )}

          {!isLoading && historyEvents.length > 0 && (
            <div className="relative">
              {/* center spine */}
              <div className="pointer-events-none absolute left-4 top-0 bottom-0 w-px bg-[repeating-linear-gradient(0deg,rgba(43,33,24,0.2)_0,rgba(43,33,24,0.2)_4px,transparent_4px,transparent_10px)] sm:left-1/2 sm:-translate-x-1/2" />
              <ol className="space-y-10">
                {historyEvents.map((event, idx) => {
                  const isLeft = idx % 2 === 0
                  return (
                    <motion.li
                      key={event.id || `${event.title}-${idx}`}
                      initial={{ opacity: 0, y: 16 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.45 }}
                      className="relative"
                    >
                      {/* node */}
                      <div className="absolute left-4 top-3 -translate-x-1/2 sm:left-1/2">
                        <span
                          className="block h-3.5 w-3.5 rounded-full bg-coral-500 ring-4 ring-paper-50"
                        />
                      </div>

                      <div
                        className={`grid gap-6 pl-12 sm:pl-0 sm:grid-cols-2 ${
                          isLeft ? '' : 'sm:[&>*:first-child]:order-2'
                        }`}
                      >
                        <div className={`${isLeft ? 'sm:pr-12' : 'sm:pl-12'}`}>
                          <PaperCard className="!p-5">
                            <div className="flex items-center justify-between">
                              <span className="text-2xl">{event.emoji || '⭐'}</span>
                              <span className="text-[11px] uppercase tracking-[0.18em] text-ink-300">
                                {new Date(event.date).toLocaleDateString('ko-KR')}
                              </span>
                            </div>
                            <h3 className="mt-3 font-display text-lg text-ink-500">{event.title}</h3>
                            <p className="mt-1.5 text-sm leading-relaxed text-ink-300">{event.description}</p>
                            {(event.category || event.location) && (
                              <div className="mt-3 flex flex-wrap gap-1.5">
                                {event.category && <span className="pill-tag">{event.category}</span>}
                                {event.location && <span className="pill-tag pill-tag--sage">{event.location}</span>}
                              </div>
                            )}
                          </PaperCard>
                        </div>
                        <div />
                      </div>
                    </motion.li>
                  )
                })}
              </ol>
            </div>
          )}
        </section>

        {/* ─────── 6. Rangu Lab ─────── */}
        <section className="border-t border-dashed border-ink-500/15 py-16">
          <div className="mb-10 flex items-end justify-between gap-4">
            <div>
              <CaveatText className="text-lg text-coral-500">our lab</CaveatText>
              <h2 className="scrap-h2 mt-1">Rangu Lab</h2>
              <p className="mt-2 text-sm text-ink-300">우리만의 도구를 직접 만들어요.</p>
            </div>
          </div>

          <div className="grid gap-10 sm:grid-cols-3 sm:gap-6">
            {labFeatures.map((f) => {
              const Icon = f.icon
              const accent = f.accent
              return (
                <button
                  key={f.title}
                  onClick={() => {
                    if (f.href.startsWith('http')) window.location.href = f.href
                    else router.push(f.href)
                  }}
                  className="group text-left"
                >
                  <div className="mx-auto" style={{ maxWidth: 280 }}>
                    <div
                      className={`polaroid polaroid--rot-${
                        accent === 'coral' ? 'l' : accent === 'sage' ? 'r' : 'xl'
                      } transition-transform group-hover:!translate-y-[-6px] group-hover:!rotate-0`}
                    >
                      <TapeStrip
                        className={accent === 'coral' ? 'tape--top-left' : accent === 'sage' ? 'tape--top-right' : 'tape--top'}
                        color={accent === 'coral' ? 'coral' : accent === 'sage' ? 'sage' : 'yellow'}
                      />
                      <div className="polaroid-photo aspect-square flex items-center justify-center bg-paper-100">
                        <Icon
                          className="h-20 w-20"
                          style={{
                            color: accent === 'coral' ? '#E0654E' : accent === 'sage' ? '#3E5C4A' : '#C28A2D',
                          }}
                        />
                      </div>
                      <div className="polaroid-caption">{f.title}</div>
                    </div>
                  </div>
                  <p className="mt-4 text-center text-sm text-ink-300">{f.desc}</p>
                </button>
              )
            })}
          </div>
        </section>

        {/* ─────── 7. 우리의 의식 ─────── */}
        <section className="border-t border-dashed border-ink-500/15 py-16">
          <div className="mb-8">
            <CaveatText className="text-lg text-coral-500">our rituals</CaveatText>
            <h2 className="scrap-h2 mt-1">우리의 의식</h2>
            <p className="mt-2 text-sm text-ink-300">물리적 거리는 잊고, 같은 시간을 함께 보내는 루틴.</p>
          </div>

          <div className="grid gap-5 sm:grid-cols-3">
            {rituals.map((r) => {
              const Icon = r.icon
              return (
                <PaperCard key={r.title} className="relative !p-6">
                  <div className="absolute -top-2 right-5">
                    <Pin color={r.pin} />
                  </div>
                  <Icon className="h-7 w-7 text-ink-500" />
                  <h3 className="mt-3 font-display text-xl text-ink-500">{r.title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-ink-300">{r.desc}</p>
                  <div className="mt-4 border-t border-dashed border-ink-500/15 pt-3 text-xs">
                    <p className="text-ink-300">
                      <span className="font-bold text-ink-500">{r.schedule}</span>
                    </p>
                    <p className="caveat mt-1 text-base text-coral-500">{r.focus}</p>
                  </div>
                </PaperCard>
              )
            })}
          </div>
        </section>

        {/* ─────── 8. 멤버 ─────── */}
        <section className="border-t border-dashed border-ink-500/15 py-16">
          <div className="mb-10 flex items-end justify-between gap-4">
            <div>
              <CaveatText className="text-lg text-coral-500">cast</CaveatText>
              <h2 className="scrap-h2 mt-1">랑구팸 멤버들</h2>
            </div>
            <button onClick={() => router.push('/members')} className="ghost-button text-sm">
              전체 카드 보기
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-x-6 gap-y-12 sm:grid-cols-3 lg:grid-cols-5">
            {members.map((m) => (
              <div key={m.name} className="text-center">
                <div className="mx-auto" style={{ maxWidth: 180 }}>
                  <div
                    className={`polaroid polaroid--rot-${m.rot === 'left' ? 'l' : m.rot === 'right' ? 'r' : 'xl'}`}
                  >
                    <TapeStrip
                      className={
                        m.tape === 'top-left'
                          ? 'tape--top-left'
                          : m.tape === 'top-right'
                          ? 'tape--top-right'
                          : 'tape--top'
                      }
                      color={m.color === 'coral' ? 'coral' : m.color === 'sage' ? 'sage' : 'yellow'}
                    />
                    <div className="polaroid-photo aspect-[3/4] bg-paper-200">
                      <img src={m.pic} alt={m.name} className="h-full w-full object-cover" />
                    </div>
                    <div className="polaroid-caption">{m.name}</div>
                  </div>
                </div>
                <p className="mt-3 text-xs font-semibold text-ink-500">{m.role}</p>
                <p className="caveat text-sm text-ink-300">{m.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ─────── 9. CTA ─────── */}
        <section className="border-t border-dashed border-ink-500/15 py-16">
          <PaperCard className="relative overflow-visible !p-10 sm:!p-12">
            <TapeStrip className="tape--top" color="coral" />
            <div className="grid items-center gap-6 sm:grid-cols-[1.4fr,1fr]">
              <div>
                <CaveatText className="text-lg text-coral-500">join the page</CaveatText>
                <h3 className="display-han mt-1 text-3xl text-ink-500 sm:text-4xl">
                  함께 만들어 가는 이야기.
                </h3>
                <p className="mt-3 max-w-xl text-base leading-relaxed text-ink-300">
                  새로운 사진, 새로운 메모, 새로운 카드. 매일 한 장씩 더해지는 페이지에
                  함께 참여해 주세요.
                </p>
              </div>
              <div className="flex flex-wrap gap-2 sm:justify-end">
                <button onClick={() => router.push('/cards')} className="ink-button">
                  <Sparkles className="h-4 w-4" />
                  카드 열기
                </button>
                <button
                  onClick={() => {
                    window.location.href = BRANDING.wikiPublicUrl
                  }}
                  className="ghost-button"
                >
                  이랑위키
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </PaperCard>
        </section>
      </main>
    </div>
  )
}
