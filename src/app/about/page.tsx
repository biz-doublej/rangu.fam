'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { 
  Star,
  Calendar,
  Users,
  Code,
  Music,
  Gamepad2,
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
  X
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
      case '🎵': return Music
      case '🎮': return Gamepad2
      case '📚': return BookOpen
      case '✈️': return Plane
      case '☕': return Coffee
      default: 
        switch (type) {
          case 'formation': return Users
          case 'member': return Shield
          case 'anniversary': return Star
          case 'feature': return Code
          case 'milestone': return Calendar
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
      emoji: '👨‍💻',
      role: '개발자',
      description: '코딩과 기술에 열정을 가진 랑구팸의 기술 리더',
      specialty: '풀스택 개발',
      color: 'from-blue-400 to-blue-600'
    },
    {
      name: '정민석',
      emoji: '🏔️',
      role: '모험가',
      description: '새로운 경험과 도전을 즐기는 자유로운 영혼',
      specialty: '여행 & 탐험',
      color: 'from-green-400 to-green-600'
    },
    {
      name: '정진규',
      emoji: '🪖',
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
      emoji: '🌟',
      role: '임시 멤버',
      description: '2025년 7월부터 합류한 새로운 에너지',
      specialty: '신선한 아이디어',
      color: 'from-yellow-400 to-yellow-600'
    },
    {
      name: '윤희열',
      emoji: '🔮',
      role: '임시 멤버 (예정)',
      description: '2025년 9월부터 합류 예정인 미래의 동료',
      specialty: '새로운 가능성',
      color: 'from-indigo-400 to-indigo-600'
    }
  ]

  const features = [
    {
      icon: Music,
      title: '음악 스테이션',
      description: '함께 듣고 싶은 음악을 공유하는 공간',
      link: '/music'
    },
    {
      icon: BookOpen,
      title: '이랑위키',
      description: '우리만의 지식과 추억을 기록하는 백과사전',
      link: '/wiki'
    },
    {
      icon: Gamepad2,
      title: '게임센터',
      description: '테트리스, 끝말잇기 등 다양한 게임을 즐기는 곳',
      link: '/games'
    },
    {
      icon: Calendar,
      title: '달력',
      description: '중요한 일정과 기념일을 함께 관리',
      link: '/calendar'
    }
  ]

  const navigationItems = [
    { icon: Home, label: '홈', href: '/' },
    { icon: Users, label: '소개', href: '/about' },
    { icon: Users, label: '멤버 소개', href: '/members' },
    { icon: Music, label: '음악 스테이션', href: '/music' },
    { icon: BookOpen, label: '이랑위키', href: '/wiki' },
    { icon: Calendar, label: '달력', href: '/calendar' },
    { icon: Gamepad2, label: '게임', href: '/games' },
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
        {/* 헤더 섹션 */}
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <h1 className="text-5xl md:text-6xl font-bold text-gradient mb-6">Rangu.fam 소개</h1>
          <p className="text-xl text-gray-200/80 max-w-3xl mx-auto leading-relaxed">
            네 명의 특별한 친구들이 만든 온라인 공간, <br />
            랑구팸에서 우정과 추억을 함께 만들어가고 있습니다.
          </p>
        </motion.div>

        {/* 랑구팸이란? */}
        <motion.section
          className="mb-20"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
        >
          <div className="glass-card p-8 md:p-12">
            <div className="flex items-center justify-center mb-8">
              <Star className="w-12 h-12 text-pink-400 mr-4" />
              <h2 className="text-4xl font-bold text-primary-200">랑구팸이란?</h2>
            </div>
            <div className="text-lg text-gray-200/80 space-y-4 max-w-4xl mx-auto text-center leading-relaxed">
              <p>
                <strong className="text-primary-200">랑구팸(Rangu.fam)</strong>은 네 명의 소중한 친구들이 만든 특별한 온라인 커뮤니티입니다.
              </p>
              <p>
                서로 다른 길을 걸어가면서도 변하지 않는 우정을 바탕으로, 함께 추억을 만들고 즐거운 시간을 보내는 공간입니다.
              </p>
              <p>
                각자의 개성과 재능을 살려 음악, 게임, 지식 공유 등 다양한 활동을 통해 더욱 끈끈한 관계를 만들어가고 있습니다.
              </p>
            </div>
          </div>
        </motion.section>

        {/* 함께한 시간 통계 */}
        <motion.section
          className="mb-20"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.3 }}
        >
          <div className="glass-card p-8 md:p-12">
            <div className="flex items-center justify-center mb-8">
              <Clock className="w-12 h-12 text-blue-400 mr-4" />
              <h2 className="text-4xl font-bold text-primary-200">함께한 시간</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
              <div className="text-center">
                <div className="bg-gradient-to-br from-pink-200/20 to-pink-500/20 rounded-2xl p-6 mb-4 border border-pink-300/30">
                  <Star className="w-12 h-12 text-pink-400 mx-auto mb-3" />
                  <h3 className="text-xl font-bold text-primary-100 mb-2">랑구팸 결성</h3>
                  <p className="text-sm text-primary-200/70 mb-4">2023년 6월 6일 오전 11:45</p>
                  <div className="space-y-2">
                    <p className="text-3xl font-bold text-pink-300">D+{timeStats.formationDays.toLocaleString()}일</p>
                    <p className="text-lg text-pink-200">
                      {timeStats.formationYears > 0 && `${timeStats.formationYears}주년 `}
                      {timeStats.formationDays % 365}일
                    </p>
                  </div>
                </div>
                <p className="text-sm text-gray-200/70">인스타 그룹방이 생성된 날부터</p>
              </div>

              <div className="text-center">
                <div className="bg-gradient-to-br from-blue-200/20 to-blue-500/20 rounded-2xl p-6 mb-4 border border-blue-300/30">
                  <Users className="w-12 h-12 text-blue-400 mx-auto mb-3" />
                  <h3 className="text-xl font-bold text-primary-100 mb-2">완전체 구성</h3>
                  <p className="text-sm text-primary-200/70 mb-4">2023년 6월 11일 오전 1:10</p>
                  <div className="space-y-2">
                    <p className="text-3xl font-bold text-blue-300">D+{timeStats.completeDays.toLocaleString()}일</p>
                    <p className="text-lg text-blue-200">
                      {timeStats.completeYears > 0 && `${timeStats.completeYears}주년 `}
                      {timeStats.completeDays % 365}일
                    </p>
                  </div>
                </div>
                <p className="text-sm text-gray-200/70">정민석이 합류한 날부터</p>
              </div>
            </div>

            {timeStats.formationYears >= 1 && (
              <div className="mt-8 text-center">
                <div className="inline-flex items-center bg-gradient-to-r from-yellow-300/30 to-yellow-500/30 text-yellow-200 px-5 py-3 rounded-full text-sm font-medium space-x-2">
                  <Star className="w-4 h-4 text-yellow-300" />
                  <span>{timeStats.formationYears}주년을 함께 축하했어요!</span>
                </div>
              </div>
            )}
          </div>
        </motion.section>

        {/* 다가오는 기념일 */}
        <motion.section
          className="mb-20"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.5 }}
        >
          <div className="glass-card p-8 md:p-12">
            <div className="flex items-center justify-center mb-8">
              <Calendar className="w-12 h-12 text-purple-400 mr-4" />
              <h2 className="text-4xl font-bold text-primary-200">다가오는 기념일</h2>
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
                      {event.type === 'formation' ? '결성 기념일' : '완전체 기념일'}
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

        {/* 히스토리 타임라인 */}
        <motion.section
          className="mb-20"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.6 }}
        >
          <div className="glass-card p-8 md:p-12">
            <div className="flex items-center justify-center mb-8">
              <BookOpen className="w-12 h-12 text-emerald-400 mr-4" />
              <h2 className="text-4xl font-bold text-primary-200">랑구팸 히스토리</h2>
            </div>

            <div className="relative">
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
                      transition={{ duration: 0.6, delay: 0.7 + index * 0.08 }}
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

        {/* 멤버 소개 */}
        <motion.section
          className="mb-20"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.8 }}
        >
          <h2 className="text-4xl font-bold text-primary-200 text-center mb-12">랑구팸 멤버들</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {members.map((member, index) => (
              <motion.div
                key={member.name}
                className="glass-card p-8 text-center hover:shadow-glass transition-all duration-300"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 1.0 + index * 0.1 }}
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

        {/* 주요 기능 소개 */}
        <motion.section
          className="mb-20"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 1.2 }}
        >
          <h2 className="text-4xl font-bold text-primary-200 text-center mb-12">Rangu.fam 주요 기능</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                className="glass-card p-6 text-center hover:shadow-glass transition-all duration-300 cursor-pointer"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 1.4 + index * 0.1 }}
                whileHover={{ y: -5 }}
                onClick={() => router.push(feature.link)}
              >
                <div className="w-16 h-16 mx-auto mb-4 bg-primary-300/20 rounded-full flex items-center justify-center">
                  <feature.icon className="w-8 h-8 text-primary-200" />
                </div>
                <h3 className="text-lg font-bold text-primary-100 mb-2">{feature.title}</h3>
                <p className="text-sm text-gray-200/70">{feature.description}</p>
                <div className="mt-3 flex items-center justify-center text-primary-200 text-sm">
                  <span>페이지로 이동 →</span>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.section>

        {/* 마무리 메시지 */}
        <motion.div
          className="text-center"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 1.6 }}
        >
          <div className="glass-card p-8">
            <h3 className="text-3xl font-bold text-primary-100 mb-4">함께 만들어가는 이야기</h3>
            <p className="text-lg text-gray-200/80 max-w-3xl mx-auto leading-relaxed">
              랑구팸은 단순한 웹사이트가 아닙니다. <br />
              네 명의 친구들이 함께 만들어가는 특별한 추억의 공간이며, <br />
              앞으로도 계속해서 새로운 이야기를 써나갈 예정입니다.
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
                  <div className="hidden md:block text-right">
                    <p className="text-sm font-medium text-primary-100">{user?.username}</p>
                    <p className="text-xs text-primary-200/70">{user?.role === 'member' ? '멤버' : '게스트'}</p>
                  </div>
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
                  onClick={() => router.push('/login')}
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
