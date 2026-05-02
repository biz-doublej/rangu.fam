'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { 
  Star,
  Users,
  Code,
  BookOpen,
  Coffee,
  Plane,
  Shield,
  Clock,
  Home,
  Package,
  LogIn,
  LogOut,
  Menu,
  X,
  Activity,
  Sparkles,
  Globe
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import ThemeMenu from '@/components/ui/ThemeMenu'
import { BookmarkWidget } from '@/components/ui/BookmarkWidget'
import { CardDropWidget } from '@/components/ui/CardDropWidget'

export default function AboutPage() {
  const router = useRouter()
  const { user, logout, isLoggedIn } = useAuth()
  const [isClient, setIsClient] = useState(false)
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [times, setTimes] = useState({
    seoul: new Date(),
    vancouver: new Date(),
    switzerland: new Date()
  })
  const [timeStats, setTimeStats] = useState({
    formationDays: 0,
    formationYears: 0,
    completeDays: 0,
    completeYears: 0
  })

  const [scrollGuide, setScrollGuide] = useState({
    showTop: false,
    showBottom: true
  })

  const [upcomingEvents, setUpcomingEvents] = useState<Array<{
    name: string
    type: 'formation' | 'complete'
    targetDays: number
    targetDate: Date
    daysLeft: number
    emoji: string
    color: string
  }>>([])

  const [siteHistory, setSiteHistory] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [historyEvents, setHistoryEvents] = useState<any[]>([])

  // 사이트 히스토리 데이터 로드
  useEffect(() => {
    loadSiteHistory()
  }, [])

  useEffect(() => {
    setIsClient(true)
  }, [])

  useEffect(() => {
    if (!isClient) return

    const updateTimes = () => {
      const now = new Date()
      setTimes({
        seoul: new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Seoul' })),
        vancouver: new Date(now.toLocaleString('en-US', { timeZone: 'America/Vancouver' })),
        switzerland: new Date(now.toLocaleString('en-US', { timeZone: 'Europe/Zurich' }))
      })
    }

    updateTimes()
    const interval = setInterval(updateTimes, 1000)
    return () => clearInterval(interval)
  }, [isClient])

  const loadSiteHistory = async () => {
    try {
      const response = await fetch('/api/site-history')
      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          setSiteHistory(data.data)
          
          // 타임라인 데이터 설정
          const sortedEvents = [...data.data.events].sort((a, b) => 
            new Date(b.date).getTime() - new Date(a.date).getTime()
          )
          setHistoryEvents(sortedEvents)
          
          // 시간 통계 계산
          calculateTimeStats(data.data)
        }
      }
    } catch (error) {
      console.error('사이트 히스토리 로딩 오류:', error)
    } finally {
      setIsLoading(false)
    }
  }

  // 기념일 목록 생성
  const createUpcomingEvents = (formationDate: Date, completeDate: Date) => {
    const now = new Date()
    const events: Array<{
      name: string
      type: 'formation' | 'complete'
      targetDays: number
      targetDate: Date
      daysLeft: number
      emoji: string
      color: string
    }> = []

    // 랑구팸 결성 기준 기념일들
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

    // 완전체 기준 기념일들
    const completeMilestones = [
      { days: 600, name: '완전체 600일', emoji: '💫' },
      { days: 700, name: '완전체 700일', emoji: '⭐' },
      { days: 730, name: '완전체 2주년', emoji: '🎭' },
      { days: 800, name: '완전체 800일', emoji: '🔥' },
      { days: 900, name: '완전체 900일', emoji: '💪' },
      { days: 1000, name: '완전체 1000일', emoji: '🏅' },
      { days: 1095, name: '완전체 3주년', emoji: '🎪' },
      { days: 1200, name: '완전체 1200일', emoji: '💝' },
      { days: 1460, name: '완전체 4주년', emoji: '🎨' },
      { days: 1500, name: '완전체 1500일', emoji: '🌺' },
      { days: 1825, name: '완전체 5주년', emoji: '🎖️' },
      { days: 2000, name: '완전체 2000일', emoji: '🛸' },
    ]

    // 랑구팸 결성 기준 이벤트 계산
    formationMilestones.forEach(milestone => {
      const targetDate = new Date(formationDate.getTime() + milestone.days * 24 * 60 * 60 * 1000)
      if (targetDate > now) {
        const daysLeft = Math.ceil((targetDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
        events.push({
          name: milestone.name,
          type: 'formation' as const,
          targetDays: milestone.days,
          targetDate,
          daysLeft,
          emoji: milestone.emoji,
          color: 'from-pink-400 to-pink-600'
        })
      }
    })

    // 완전체 구성 기준 이벤트 계산
    completeMilestones.forEach(milestone => {
      const targetDate = new Date(completeDate.getTime() + milestone.days * 24 * 60 * 60 * 1000)
      if (targetDate > now) {
        const daysLeft = Math.ceil((targetDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
        events.push({
          name: milestone.name,
          type: 'complete' as const,
          targetDays: milestone.days,
          targetDate,
          daysLeft,
          emoji: milestone.emoji,
          color: 'from-blue-400 to-blue-600'
        })
      }
    })

    // 날짜 순으로 정렬하고 가장 가까운 4개만 선택
    events.sort((a, b) => a.daysLeft - b.daysLeft)
    return events.slice(0, 4)
  }

  // 시간 계산 함수
  const calculateTimeStats = (historyData: any) => {
    if (!historyData) return
    
    const now = new Date()
    const formationDate = new Date(historyData.formationDate)
    const completeDate = new Date(historyData.completeDate)
    
    // 랑구팸 결성부터 계산
    const formationDiff = now.getTime() - formationDate.getTime()
    const formationDays = Math.floor(formationDiff / (1000 * 60 * 60 * 24))
    const formationYears = Math.floor(formationDays / 365)
    
    // 완전체 구성부터 계산
    const completeDiff = now.getTime() - completeDate.getTime()
    const completeDays = Math.floor(completeDiff / (1000 * 60 * 60 * 24))
    const completeYears = Math.floor(completeDays / 365)
    
    setTimeStats({
      formationDays,
      formationYears,
      completeDays,
      completeYears
    })

    // 다가오는 기념일 업데이트
    setUpcomingEvents(createUpcomingEvents(formationDate, completeDate))
  }

  // 스크롤 가이드 업데이트 함수
  const handleTimelineScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.target as HTMLDivElement
    const { scrollTop, scrollHeight, clientHeight } = target
    
    setScrollGuide({
      showTop: scrollTop > 50,
      showBottom: scrollTop < scrollHeight - clientHeight - 50
    })
  }

  useEffect(() => {
    if (siteHistory) {
      calculateTimeStats(siteHistory)
      // 1분마다 업데이트
      const interval = setInterval(() => calculateTimeStats(siteHistory), 60000)
      return () => clearInterval(interval)
    }
  }, [siteHistory])

  // 아이콘 매핑 함수
  const getIconForEvent = (iconName: string, type: string) => {
    switch (iconName) {
      case '🎉': return Users
      case '👥': return Shield
      case '🎂': return Star
      case '⭐': return Star
      case '🌟': return Star
      case '💻': return Code
      case '🎵': return Sparkles
      case '🎮': return Sparkles
      case '📚': return BookOpen
      case '✈️': return Plane
      case '☕': return Coffee
      default: 
        switch (type) {
          case 'formation': return Users
          case 'member': return Shield
          case 'anniversary': return Star
          case 'feature': return Code
          case 'milestone': return Clock
          default: return Star
        }
    }
  }

  // 색상 매핑 함수
  const getColorForEvent = (color: string, type: string) => {
    const colorMap: { [key: string]: string } = {
      'primary': 'bg-blue-500',
      'secondary': 'bg-green-500',
      'accent': 'bg-purple-500',
      'luxury': 'bg-amber-500',
      'rainbow': 'bg-gradient-to-r from-red-500 via-yellow-500 to-blue-500'
    }
    
    return colorMap[color] || 'bg-gray-500'
  }

  const members = [
    {
      name: '정재원',
      emoji: '🚀',
      role: '개발자',
      description: '코딩과 기술에 열정을 가진 랑구팸의 기술 리더',
      specialty: '풀스택 개발',
      color: 'from-blue-400 to-blue-600'
    },
    {
      name: '정민석',
      emoji: '✈️',
      role: '모험가',
      description: '새로운 경험과 도전을 즐기는 자유로운 영혼',
      specialty: '여행 & 탐험',
      color: 'from-green-400 to-green-600'
    },
    {
      name: '정진규',
      emoji: '🛡️',
      role: '수호자 (군 복무 중)',
      description: '든든한 믿음직한 랑구팸의 보호자 (현재 군 복무 중)',
      specialty: '리더십 & 책임감',
      color: 'from-orange-400 to-orange-600'
    },
    {
      name: '강한울',
      emoji: '🎮',
      role: '게이머',
      description: '게임과 엔터테인먼트의 전문가',
      specialty: '게임 & 재미',
      color: 'from-purple-400 to-purple-600'
    },
    {
      name: '이승찬',
      emoji: '🪄',
      role: '임시 멤버',
      description: '2025년 7월부터 합류한 새로운 에너지',
      specialty: '신선한 아이디어',
      color: 'from-yellow-400 to-yellow-600'
    }
  ]

  const baseFeatures = [
    {
      icon: BookOpen,
      title: '이랑위키',
      description: '우리만의 지식과 추억을 기록하는 백과사전',
      link: '/wiki',
      accent: 'from-amber-400/15 via-amber-400/5 to-transparent',
      statKey: 'totalPages',
      metricLabel: '등록 문서',
      metricFallback: '문서 42개'
    },
    {
      icon: Package,
      title: '카드 드랍',
      description: '랜덤 미션과 수집 카드를 확인하는 공간',
      link: '/cards',
      accent: 'from-emerald-500/15 via-emerald-500/5 to-transparent',
      metricFallback: '오늘의 카드 준비중'
    }
  ]



  const ritualHighlights = [
    {
      title: 'Night Sync',
      description: '하루를 마무리하며 감정과 근황을 나누는 시간',
      schedule: '매주 금요일 22:30',
      focus: '감정 공유',
      icon: Coffee,
      accent: 'from-amber-500/10 to-amber-600/20'
    },
    {
      title: 'Remote Drive',
      description: '각자의 도시를 느끼며 진행하는 드라이브 라이브',
      schedule: '격주 토요일 오후',
      focus: '거리 두지 않는 연결',
      icon: Plane,
      accent: 'from-blue-500/10 to-blue-600/20'
    },
    {
      title: 'Project Stand-up',
      description: '진행중인 프로젝트를 공유하고 서로 피드백하는 루틴',
      schedule: '매주 수요일 21:00',
      focus: '협업 & 성장',
      icon: Shield,
      accent: 'from-purple-500/10 to-purple-600/20'
    }
  ]

  const formatNumber = (value?: number | null) => {
    if (typeof value !== 'number' || Number.isNaN(value)) return '0'
    return value.toLocaleString('ko-KR')
  }

  const heroStats = useMemo(() => [
    {
      label: '함께한 시간',
      value: `D+${formatNumber(timeStats.formationDays)}`,
      detail: timeStats.formationYears > 0 ? `${timeStats.formationYears}년째 여정` : '막 시작했어요',
      icon: Activity
    },
    {
      label: '완전체 여정',
      value: `D+${formatNumber(timeStats.completeDays)}`,
      detail: timeStats.completeYears > 0 ? `완전체 ${timeStats.completeYears}년차` : '따끈따끈한 완전체',
      icon: Users
    },
    {
      label: '타임라인 이벤트',
      value: formatNumber(historyEvents.length),
      detail: '기록된 순간들',
      icon: Clock
    },
    {
      label: '운영 중인 기능',
      value: formatNumber(baseFeatures.length),
      detail: '랩에서 계속 확장 중',
      icon: Sparkles
    }
  ], [timeStats, historyEvents.length, baseFeatures.length])

  const siteStatsCards = useMemo(() => {
    const stats = siteHistory?.stats || {}
    return [
      {
        label: '누적 방문',
        value: formatNumber(stats.totalVisits || 1280),
        detail: '우리 공간을 찾은 횟수',
        icon: Globe,
        accent: 'from-sky-500/20 to-indigo-600/10'
      },
      {
        label: '등록 문서',
        value: formatNumber(stats.totalPages || 8),
        detail: '이랑위키 컨텐츠',
        icon: BookOpen,
        accent: 'from-amber-500/20 to-amber-600/10'
      },
      {
        label: '함께한 멤버',
        value: formatNumber(stats.totalUsers || members.length),
        detail: '현재 & 임시 멤버',
        icon: Users,
        accent: 'from-emerald-500/20 to-emerald-600/10'
      },
      {
        label: '누적 기록',
        value: formatNumber(stats.totalPages || 0),
        detail: '위키 기록',
        icon: BookOpen,
        accent: 'from-amber-500/20 to-amber-600/10'
      }
    ]
  }, [siteHistory, members.length])

  const projectHighlights = useMemo(() => {
    const stats = siteHistory?.stats || {}
    return baseFeatures.map(feature => {
      let metric = feature.metricFallback
      if (feature.statKey && stats[feature.statKey as keyof typeof stats] !== undefined) {
        const statValue = stats[feature.statKey as keyof typeof stats] as number
        metric = feature.metricLabel
          ? `${feature.metricLabel} ${formatNumber(statValue)}`
          : formatNumber(statValue)
      }
      return { ...feature, metric }
    })
  }, [baseFeatures, siteHistory])

  const navigationItems = [
    { icon: Home, label: '홈', href: '/' },
    { icon: Users, label: '소개', href: '/about' },
    { icon: Users, label: '멤버 소개', href: '/members' },
    { icon: BookOpen, label: '이랑위키', href: '/wiki' },
    { icon: Package, label: '카드 관리', href: '/cards' }
  ]

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="flex flex-col items-center justify-center py-24">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-400 mx-auto mb-6"></div>
          <p className="text-lg text-primary-200">Rangu.fam 히스토리를 불러오고 있습니다...</p>
        </div>
      )
    }

    return (
      <>
        <motion.section
          className="mb-16"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <div className="glass-card p-8 md:p-12 lg:p-14">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
              <div className="space-y-4 max-w-3xl">
                <p className="text-sm uppercase tracking-[0.3em] text-primary-200/70">Our Story</p>
                <h1 className="text-4xl md:text-5xl font-bold text-gradient">Rangu.fam 소개</h1>
                <p className="text-lg text-gray-200/80 leading-relaxed">
                  네 명의 친구가 서로 다른 도시에서 같은 하늘을 바라보며 만든 커뮤니티.
                  기록과 일상 속 소소한 감정을 공유하며 특별한 우정을 쌓아갑니다.
                </p>
                <div className="flex flex-wrap gap-3">
                  <span className="px-4 py-2 rounded-full text-sm bg-primary-300/20 text-primary-100">Remote-first Crew</span>
                  <span className="px-4 py-2 rounded-full text-sm bg-emerald-300/20 text-emerald-100">Since 2023.06.06</span>
                </div>
              </div>
              <div className="flex flex-wrap gap-4 w-full lg:w-auto justify-end">
                {heroStats.map(stat => (
                  <div
                    key={stat.label}
                    className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 flex items-start gap-3 min-w-[9.5rem]"
                  >
                    <div className="p-2 rounded-full bg-white/10">
                      <stat.icon className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-[0.25em] text-white/60">{stat.label}</p>
                      <p className="text-2xl font-bold text-white mt-1">{stat.value}</p>
                      <p className="text-sm text-primary-100/70">{stat.detail}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </motion.section>

        <motion.section
          className="mb-20"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
        >
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="glass-card p-8 md:p-10">
              <div className="flex items-center gap-3 mb-6">
                <Star className="w-10 h-10 text-pink-300" />
                <h2 className="text-3xl font-bold text-primary-100">랑구팸이란?</h2>
              </div>
              <p className="text-lg text-gray-200/80 leading-relaxed mb-4">
                <strong className="text-primary-100">Rangu.fam</strong>은 서로 다른 도시에서 살아가는 네 명의 친구들이 만든 독립 커뮤니티입니다.
                실시간 통화, 협업 프로젝트, 기록 문화가 자연스럽게 이어지도록 직접 서비스와 툴을 구축해 나가는 실험실이기도 합니다.
              </p>
              <p className="text-lg text-gray-200/70 leading-relaxed">
                우리는 “함께 있는 감각”을 온라인으로 재현하기 위해 위키, 일정 관리 등 다양한 기능을 직접 만들고 다듬어 가고 있어요.
              </p>
            </div>
            <div className="glass-card p-8 md:p-10">
              <div className="flex items-center gap-3 mb-6">
                <Clock className="w-10 h-10 text-blue-300" />
                <h2 className="text-3xl font-bold text-primary-100">기념일 타임라인</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="rounded-2xl border border-pink-400/30 bg-pink-400/10 p-5">
                  <p className="text-sm text-white/70 mb-2">Rangu.fam 결성</p>
                  <p className="text-3xl font-bold text-white">D+{formatNumber(timeStats.formationDays)}</p>
                  <p className="text-sm text-white/60 mt-1">
                    {timeStats.formationYears > 0 && `${timeStats.formationYears}년 `}
                    {timeStats.formationDays % 365}일째
                  </p>
                </div>
                <div className="rounded-2xl border border-blue-400/30 bg-blue-400/10 p-5">
                  <p className="text-sm text-white/70 mb-2">완전체 구성</p>
                  <p className="text-3xl font-bold text-white">D+{formatNumber(timeStats.completeDays)}</p>
                  <p className="text-sm text-white/60 mt-1">
                    {timeStats.completeYears > 0 && `${timeStats.completeYears}년 `}
                    {timeStats.completeDays % 365}일째
                  </p>
                </div>
              </div>
            </div>
          </div>
        </motion.section>

        <motion.section
          className="mb-20"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.5 }}
        >
          <div className="glass-card p-8 md:p-12">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between mb-8">
              <div className="flex items-center gap-3">
                <Clock className="w-12 h-12 text-purple-400" />
                <div>
                  <h2 className="text-3xl font-bold text-primary-200">다가오는 기념일</h2>
                  <p className="text-sm text-gray-200/70">다음 만남을 기다리는 설렘</p>
                </div>
              </div>
              <div className="text-sm text-primary-200/70">업데이트: {new Date().toLocaleString()}</div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {upcomingEvents.map((event, index) => (
                <motion.div
                  key={index}
                  className="glass-card p-6 hover:shadow-glass transition-all duration-300"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.6 + index * 0.1 }}
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <span className="text-3xl">{event.emoji}</span>
                      <div>
                        <h3 className="text-xl font-bold text-primary-100">{event.name}</h3>
                        <p className="text-sm text-gray-200/70">목표일: {event.targetDate.toLocaleDateString()}</p>
                      </div>
                    </div>
                    <div className={`px-3 py-1 rounded-full text-sm ${event.type === 'formation' ? 'bg-pink-300/20 text-pink-200' : 'bg-blue-300/20 text-blue-200'}`}>
                      {event.type === 'formation' ? '결성' : '완전체'}
                    </div>
                  </div>
                  <div className="bg-gradient-to-r from-primary-300/10 to-primary-500/20 rounded-xl p-4 flex items-center justify-between border border-primary-400/20">
                    <div>
                      <p className="text-xs text-primary-200 mb-1">D-{event.daysLeft}</p>
                      <p className="text-2xl font-bold text-primary-100">{event.daysLeft.toLocaleString()}일 남음</p>
                    </div>
                    <div className={`w-14 h-14 rounded-full flex items-center justify-center text-2xl ${event.type === 'formation' ? 'bg-pink-400/20 text-pink-200' : 'bg-blue-400/20 text-blue-200'}`}>
                      {event.type === 'formation' ? '🎉' : '🎯'}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.section>

        <motion.section
          className="mb-20"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.55 }}
        >
          <div className="glass-card p-8 md:p-10">
            <div className="flex items-center gap-3 mb-8">
              <Activity className="w-10 h-10 text-emerald-300" />
              <h2 className="text-3xl font-bold text-primary-100">커뮤니티 스냅샷</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
              {siteStatsCards.map(card => (
                <div
                  key={card.label}
                  className={`rounded-2xl border border-white/10 bg-gradient-to-br ${card.accent} p-5 shadow-xl`}
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 rounded-full bg-white/10">
                      <card.icon className="w-5 h-5 text-white" />
                    </div>
                    <p className="text-sm text-white/70">{card.label}</p>
                  </div>
                  <p className="text-3xl font-bold text-white">{card.value}</p>
                  <p className="text-sm text-white/70 mt-1">{card.detail}</p>
                </div>
              ))}
            </div>
          </div>
        </motion.section>

        <motion.section
          className="mb-20"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.6 }}
        >
          <div className="glass-card p-8 md:p-12">
            <div className="flex items-center justify-between mb-8 flex-col md:flex-row gap-4">
              <div className="flex items-center gap-3">
                <BookOpen className="w-10 h-10 text-emerald-300" />
                <div>
                  <h2 className="text-3xl font-bold text-primary-100">랑구팸 히스토리</h2>
                  <p className="text-sm text-gray-200/70">우리가 기록한 순간들</p>
                </div>
              </div>
              <div className="text-sm text-primary-100/70">{historyEvents.length}개의 이벤트</div>
            </div>

            <div
              className="relative max-h-[32rem] overflow-y-auto pr-2"
              onScroll={handleTimelineScroll}
            >
              <div className="absolute left-1/2 transform -translate-x-1/2 h-full w-1 bg-gradient-to-b from-primary-400/40 via-primary-500/40 to-primary-400/40"></div>
              <div className="space-y-8">
                {historyEvents.map((event, index) => {
                  const IconComponent = getIconForEvent(event.emoji, event.type)
                  const isLeft = index % 2 === 0

                  const primaryCard = (
                    <div className="glass-card p-6 hover:shadow-glass transition-all duration-300">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-sm text-gray-200/70">{new Date(event.date).toLocaleDateString()}</span>
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-medium ${
                            event.type === 'formation'
                              ? 'bg-pink-300/20 text-pink-200'
                              : event.type === 'member'
                              ? 'bg-blue-300/20 text-blue-200'
                              : event.type === 'anniversary'
                              ? 'bg-yellow-300/20 text-yellow-200'
                              : 'bg-purple-300/20 text-purple-200'
                          }`}
                        >
                          {event.category}
                        </span>
                      </div>
                      <h3 className="text-xl font-bold text-primary-100 mb-2">{event.title}</h3>
                      <p className="text-gray-200/80">{event.description}</p>
                    </div>
                  )

                  const accentCard = (
                    <div className="glass-card p-6 bg-primary-950/50 border border-primary-500/30">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-sm text-primary-200/80">{new Date(event.date).toLocaleDateString()}</span>
                        <div className="flex items-center space-x-2">
                          <span className="text-sm text-primary-100/80">{event.location || '기념일'}</span>
                          <div className="w-8 h-8 rounded-full bg-primary-500/60 flex items-center justify-center">
                            <IconComponent className="w-5 h-5 text-white" />
                          </div>
                        </div>
                      </div>
                      <div className="text-left text-primary-100">
                        <h3 className="text-lg font-semibold mb-2">{event.title}</h3>
                        <p className="text-sm leading-relaxed text-primary-200/80">{event.description}</p>
                      </div>
                    </div>
                  )

                  return (
                    <motion.div
                      key={event.id}
                      className="relative space-y-4 md:space-y-0"
                      initial={{ opacity: 0, y: 24 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.6, delay: 0.65 + index * 0.08 }}
                    >
                      <div className="md:hidden">{isLeft ? primaryCard : accentCard}</div>

                      <div className="hidden md:grid md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] md:gap-6 md:items-start">
                        <div className={`${isLeft ? '' : 'invisible'}`}>{primaryCard}</div>
                        <div className="flex justify-center">
                          <div className="relative">
                            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-2xl text-white shadow-lg">
                              {event.emoji || '⭐'}
                            </div>
                            <div className="absolute inset-0 animate-ping opacity-20 bg-gradient-to-br from-primary-400 to-primary-600 rounded-full"></div>
                          </div>
                        </div>
                        <div className={`${isLeft ? 'invisible' : ''}`}>{accentCard}</div>
                      </div>
                    </motion.div>
                  )
                })}
              </div>

              {scrollGuide.showTop && (
                <div className="absolute top-2 left-1/2 transform -translate-x-1/2 text-center">
                  <div className="bg-primary-200/20 text-primary-100 px-3 py-1 rounded-full text-xs animate-bounce">↑ 위로 스크롤해서 더 보기</div>
                </div>
              )}

              {scrollGuide.showBottom && (
                <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 text-center">
                  <div className="bg-primary-200/20 text-primary-100 px-3 py-1 rounded-full text-xs animate-bounce">↓ 아래로 스크롤해서 더 보기</div>
                </div>
              )}
            </div>
          </div>
        </motion.section>

        <motion.section
          className="mb-20"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.75 }}
        >
          <h2 className="text-4xl font-bold text-primary-200 text-center mb-12">Rangu Lab</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {projectHighlights.map((feature, index) => (
              <motion.div
                key={feature.title}
                className="glass-card p-6 text-center hover:shadow-glass transition-all duration-300 cursor-pointer"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.9 + index * 0.1 }}
                whileHover={{ y: -5 }}
                onClick={() => router.push(feature.link)}
              >
                <div className={`w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br ${feature.accent} flex items-center justify-center`}>
                  <feature.icon className="w-8 h-8 text-primary-100" />
                </div>
                <h3 className="text-lg font-bold text-primary-100 mb-2">{feature.title}</h3>
                <p className="text-sm text-gray-200/70 mb-4">{feature.description}</p>
                <div className="text-xs uppercase tracking-[0.3em] text-primary-200/70">{feature.metric}</div>
              </motion.div>
            ))}
          </div>
        </motion.section>

        <motion.section
          className="mb-20"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.85 }}
        >
          <h2 className="text-4xl font-bold text-primary-200 text-center mb-12">우리의 의식</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {ritualHighlights.map((ritual, index) => (
              <motion.div
                key={ritual.title}
                className="glass-card p-6"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 1 + index * 0.08 }}
              >
                <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${ritual.accent} flex items-center justify-center mb-4`}>
                  <ritual.icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-xl font-bold text-primary-100 mb-2">{ritual.title}</h3>
                <p className="text-sm text-primary-200/70 mb-4 leading-relaxed">{ritual.description}</p>
                <div className="text-sm text-gray-200/70 mb-2">{ritual.schedule}</div>
                <div className="inline-flex px-3 py-1 rounded-full text-xs border border-white/20 text-white/70">{ritual.focus}</div>
              </motion.div>
            ))}
          </div>
        </motion.section>

        <motion.section
          className="mb-20"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 1 }}
        >
          <h2 className="text-4xl font-bold text-primary-200 text-center mb-12">랑구팸 멤버들</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {members.map((member, index) => (
              <motion.div
                key={member.name}
                className="glass-card p-8 text-center hover:shadow-glass transition-all duration-300"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 1.1 + index * 0.1 }}
                whileHover={{ y: -5 }}
              >
                <div className={`w-20 h-20 mx-auto mb-4 bg-gradient-to-br ${member.color} rounded-full flex items-center justify-center text-3xl shadow-lg`}>
                  {member.emoji}
                </div>
                <h3 className="text-2xl font-bold text-primary-100 mb-2">{member.name}</h3>
                <p className="text-lg font-medium text-primary-200 mb-3">{member.role}</p>
                <p className="text-gray-200/70 mb-4">{member.description}</p>
                <div className="inline-block bg-primary-300/20 text-primary-100 px-4 py-2 rounded-full text-sm font-medium">
                  {member.specialty}
                </div>
              </motion.div>
            ))}
          </div>
        </motion.section>

        <motion.div
          className="text-center"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 1.1 }}
        >
          <div className="glass-card p-8">
            <h3 className="text-3xl font-bold text-primary-100 mb-4">함께 만들어가는 이야기</h3>
            <p className="text-lg text-gray-200/80 max-w-3xl mx-auto leading-relaxed">
              Rangu.fam은 “우정이 멀어지지 않도록”이라는 목표로 시작된 실험입니다.
              계속되는 업데이트와 새로운 의식으로 더 많은 순간을 기록할 예정이에요.
            </p>
            <div className="mt-6 flex justify-center">
              <div className="flex items-center space-x-2 text-yellow-400">
                <Star className="w-6 h-6" />
                <span className="text-xl font-bold">Made with Passion by Rangu.fam</span>
                <Star className="w-6 h-6" />
              </div>
            </div>
          </div>
        </motion.div>
      </>
    )
  }

  return (
    <div className="min-h-screen relative overflow-hidden theme-surface">
      <header className="glass-nav fixed top-0 left-0 right-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex justify-between items-center">
            <motion.div
              className="text-2xl font-bold text-gradient"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
            >
              Rangu.fam
            </motion.div>

            <div className="hidden md:flex items-center space-x-6">
              {isClient ? (
                <>
                  <div className="flex items-center space-x-2 text-sm">
                    <Clock className="w-4 h-4 text-primary-300" />
                    <span className="text-primary-100/80">서울</span>
                    <span className="font-mono text-primary-200">{times.seoul.toLocaleTimeString()}</span>
                  </div>
                  <div className="flex items-center space-x-2 text-sm">
                    <Clock className="w-4 h-4 text-primary-300" />
                    <span className="text-primary-100/80">밴쿠버</span>
                    <span className="font-mono text-primary-200">{times.vancouver.toLocaleTimeString()}</span>
                  </div>
                  <div className="flex items-center space-x-2 text-sm">
                    <Clock className="w-4 h-4 text-primary-300" />
                    <span className="text-primary-100/80">취리히</span>
                    <span className="font-mono text-primary-200">{times.switzerland.toLocaleTimeString()}</span>
                  </div>
                </>
              ) : (
                <div className="flex items-center space-x-2 text-sm">
                  <Clock className="w-4 h-4 text-primary-300" />
                  <span className="text-primary-100/70">시간을 불러오는 중...</span>
                </div>
              )}
            </div>

            <div className="flex items-center space-x-4">
              {isLoggedIn ? (
                <div className="flex items-center space-x-3">
                  <button
                    type="button"
                    onClick={() => router.push('/settings/account')}
                    className="hidden md:block text-right group focus:outline-none"
                    title="계정 설정 열기"
                  >
                    <p className="text-sm font-medium text-primary-100 group-hover:text-white transition-colors">{user?.username}</p>
                    <p className="text-xs text-primary-200/70 group-hover:text-primary-100">{user?.role === 'member' ? '멤버' : '게스트'}</p>
                  </button>
                  <button
                    className="glass-button p-2"
                    onClick={() => logout()}
                    title="로그아웃"
                  >
                    <LogOut className="w-5 h-5 text-primary-200" />
                  </button>
                  <ThemeMenu />
                </div>
              ) : (
                <button
                  className="glass-button p-2"
                  onClick={() => router.push('/auth/start?callbackUrl=%2Fabout')}
                  title="로그인"
                >
                  <LogIn className="w-5 h-5 text-primary-200" />
                </button>
              )}
              <button
                className="glass-button p-2 md:hidden"
                onClick={() => setIsMenuOpen(!isMenuOpen)}
              >
                {isMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>
      </header>

      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            className="md:hidden fixed inset-0 z-50 bg-gray-900/80 backdrop-blur-lg overflow-y-auto"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="pt-20 p-6 space-y-6">
              <ul className="space-y-3">
                {navigationItems.map((item, index) => (
                  <motion.li
                    key={item.label}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.05 }}
                  >
                    <a
                      href={item.href}
                      className="glass-button flex items-center space-x-3 p-4 w-full text-left"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      <item.icon className="w-5 h-5 text-primary-200" />
                      <span className="text-gray-100 font-medium">{item.label}</span>
                    </a>
                  </motion.li>
                ))}
              </ul>

              {isLoggedIn && user?.id && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: 0.4 }}
                >
                  <CardDropWidget userId={user.id} />
                </motion.div>
              )}

              {isLoggedIn && user?.id && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: 0.45 }}
                >
                  <BookmarkWidget userId={user.id} />
                </motion.div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <main className="pt-24 pb-16">
        <div className="max-w-6xl mx-auto px-4">
          {renderContent()}
        </div>
      </main>
    </div>
  )
}
