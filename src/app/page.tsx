'use client'

import React, { useState, useEffect } from 'react'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'
import { 
  Clock, 
  Home, 
  User, 
  Music, 
  BookOpen, 
  Calendar,
  Gamepad2,
  Package,
  LogIn,
  LogOut,
  Menu,
  X,
  ChevronLeft,
  ChevronRight,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Sparkles,
  Palette,
  Radio
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { MemberWithActivity } from '@/backend/types'
import { MediaPlayer } from '@/components/ui/MediaPlayer'
import { BookmarkWidget } from '@/components/ui/BookmarkWidget'
import ThemeMenu from '@/components/ui/ThemeMenu'

// 슬라이드 콘텐츠 (이미지와 영상 혼합)
const slideContent = [
  { type: 'video', src: '/videos/intro-jaewon.mp4', title: '정재원 소개', poster: '/images/poster-jaewon.jpg' },
  { type: 'image', src: '/images/slide1.jpg', title: '추억의 사진 1' },
  { type: 'video', src: '/videos/intro-minseok.mp4', title: '정민석 소개', poster: '/images/poster-minseok.jpg' },
  { type: 'image', src: '/images/slide2.jpg', title: '추억의 사진 2' },
  { type: 'video', src: '/videos/intro-jingyu.mp4', title: '정진규 소개', poster: '/images/poster-jingyu.jpg' },
  { type: 'image', src: '/images/slide3.jpg', title: '추억의 사진 3' },
  { type: 'video', src: '/videos/intro-hanul.mp4', title: '강한울 소개', poster: '/images/poster-hanul.jpg' },
  { type: 'video', src: '/videos/intro-seungchan.mp4', title: '이승찬 소개', poster: '/images/poster-seungchan.jpg' },
  { type: 'image', src: '/images/slide4.jpg', title: '추억의 사진 4' }
]

const quickActions = [
  { title: '음악 스테이션', description: '밤 감성 라디오 & 믹스', href: '/music', icon: Music },
  { title: '달력', description: '약속과 돌아오는 일정', href: '/calendar', icon: Calendar },
  { title: '게임 라운지', description: '미니 게임 아케이드', href: '/games', icon: Gamepad2 },
  { title: '카드 드랍', description: '랜덤 미션 & 수집 카드', href: '/cards', icon: Package },
]

const featureHighlights = [
  { title: '밤샘 라디오', description: '새벽 감성 사연과 실시간 믹스', href: '/music', icon: Radio, badge: 'LIVE' },
  { title: '테마 커스터마이즈', description: '크리스마스부터 갤럭시까지 무드 선택', href: '/members', icon: Palette, badge: 'NEW' },
  { title: '게임 아케이드', description: '테트리스 · 카드 · 퀴즈로 승부!', href: '/games', icon: Gamepad2, badge: 'PLAY' },
  { title: '카드 드랍', description: '하루 한 번의 서프라이즈 카드', href: '/cards', icon: Sparkles, badge: 'DAILY' },
]

export default function HomePage() {
  const [currentSlide, setCurrentSlide] = useState(0)
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [times, setTimes] = useState({
    seoul: new Date(),
    vancouver: new Date(),
    switzerland: new Date(),
  })  
  const [isClient, setIsClient] = useState(false)
  const [savedVolume, setSavedVolume] = useState(50)
  const [videoVolume, setVideoVolume] = useState(50)
  const [videoMuted, setVideoMuted] = useState(true)
  const [isVolumeOpen, setIsVolumeOpen] = useState(true)
  const [members, setMembers] = useState<MemberWithActivity[]>([])
  const [membersLoading, setMembersLoading] = useState(true)
  const [countdown, setCountdown] = useState(17) // 카운트다운 타이머
  const [isSlideHovered, setIsSlideHovered] = useState(false) // 슬라이드 호버 상태
  const { user, logout, isLoggedIn } = useAuth()
  const router = useRouter()

  const onlineCount = members.filter(member => member.userStatus === 'online').length
  const activeSlide = slideContent[currentSlide]
  const quickStats = [
    { label: '지금 온라인', value: `${onlineCount}명`, detail: '실시간 상태' },
    { label: '등록 멤버', value: `${members.length || 0}명`, detail: '우리만의 팀원' },
    { label: '오늘의 스포트라이트', value: activeSlide?.title || '준비 중', detail: activeSlide?.type === 'video' ? '멤버 인사 영상' : '추억의 사진' },
  ]
  const worldTimeItems = [
    { label: '서울', value: isClient ? format(times.seoul, 'HH:mm:ss') : '--:--:--', zone: 'KST' },
    { label: '밴쿠버', value: isClient ? format(times.vancouver, 'HH:mm:ss') : '--:--:--', zone: 'PST' },
    { label: '스위스', value: isClient ? format(times.switzerland, 'HH:mm:ss') : '--:--:--', zone: 'CET' },
  ]

  const getStatusStyles = (status: string) => {
    switch (status) {
      case 'online':
        return { pill: 'bg-emerald-500/20 text-emerald-200 border border-emerald-500/40', text: 'text-emerald-300' }
      case 'idle':
        return { pill: 'bg-amber-500/20 text-amber-200 border border-amber-500/40', text: 'text-amber-300' }
      case 'dnd':
        return { pill: 'bg-rose-500/20 text-rose-200 border border-rose-500/40', text: 'text-rose-300' }
      default:
        return { pill: 'bg-slate-600/30 text-slate-200 border border-slate-500/40', text: 'text-slate-300' }
    }
  }

  // 모든 비디오 요소들의 볼륨 제어
  const updateAllVideosVolume = (volume: number, muted: boolean) => {
    const videos = document.querySelectorAll('video')
    videos.forEach((video) => {
      video.volume = volume / 100
      video.muted = muted
    })
  }

  // 클라이언트 사이드에서만 실행되도록 설정
  useEffect(() => {
    setIsClient(true)
    // 저장된 볼륨 불러오기
    const savedVol = localStorage.getItem('rangu_video_volume')
    if (savedVol) {
      const volume = parseInt(savedVol, 10)
      setSavedVolume(volume)
      setVideoVolume(volume)
    }
    
    // 저장된 음소거 상태 불러오기
    const savedMuted = localStorage.getItem('rangu_video_muted')
    if (savedMuted) {
      setVideoMuted(savedMuted === 'true')
    }
  }, [])

  // 시간 업데이트
  useEffect(() => {
    if (!isClient) return

    const updateTimes = () => {
      const now = new Date()
      setTimes({
        seoul: new Date(now.toLocaleString("en-US", {timeZone: "Asia/Seoul"})),
        vancouver: new Date(now.toLocaleString("en-US", {timeZone: "America/Vancouver"})),
        switzerland: new Date(now.toLocaleString("en-US", {timeZone: "Europe/Zurich"})),
      })
    }

    updateTimes()
    const interval = setInterval(updateTimes, 1000)
    return () => clearInterval(interval)
  }, [isClient])

  // 슬라이드 변경 시 카운트다운 초기화
  useEffect(() => {
    const currentContent = slideContent[currentSlide]
    const initialTime = currentContent?.type === 'video' ? 17 : 5 // 영상 17초, 이미지 5초
    setCountdown(initialTime)
  }, [currentSlide])

  // 카운트다운 타이머
  useEffect(() => {
    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          // 1초에서 다음 슬라이드로 전환
          setCurrentSlide((current) => (current + 1) % slideContent.length)
          return prev // 다음 슬라이드로 넘어가면서 카운트다운은 useEffect에서 리셋됨
        }
        return prev - 1
      })
    }, 1000)
    
    return () => clearInterval(interval)
  }, [])

  // 멤버 활동 상태 가져오기
  const fetchMembers = async () => {
    try {
      console.log('Frontend: Fetching members...')
      const response = await fetch('/api/members')
      console.log('Frontend: API response status:', response.status)
      
      if (response.ok) {
        const data = await response.json()
        console.log('Frontend: Received data:', data)
        setMembers(data)
      } else {
        console.error('Failed to fetch members:', response.status, response.statusText)
      }
    } catch (error) {
      console.error('Error fetching members:', error)
    } finally {
      setMembersLoading(false)
    }
  }

  useEffect(() => {
    fetchMembers()
    
    // 30초마다 멤버 상태 업데이트
    const interval = setInterval(fetchMembers, 30000)
    return () => clearInterval(interval)
  }, [])

  // 로그인/로그아웃 시 멤버 목록 새로고침
  useEffect(() => {
    if (!membersLoading) {
      // 약간의 지연을 두고 멤버 상태 새로고침 (API 업데이트 반영 시간)
      const timer = setTimeout(() => {
        fetchMembers()
      }, 500)
      return () => clearTimeout(timer)
    }
  }, [user, membersLoading])

  const navigationItems = [
    { icon: Home, label: '홈', href: '/' },
    { icon: User, label: '소개', href: '/about' },
    { icon: User, label: '개인 페이지', href: '/members' },
    { icon: Music, label: '음악 스테이션', href: '/music' },
    { icon: BookOpen, label: '이랑위키', href: '/wiki' },
    { icon: Calendar, label: '달력', href: '/calendar' },
    { icon: Gamepad2, label: '게임', href: '/games' },
    { icon: Package, label: '카드 드랍', href: '/cards' },
  ]

  return (
    <div className="min-h-screen relative overflow-hidden theme-surface">
      {/* 상단 시간 표시 */}
      <header className="glass-nav fixed top-0 left-0 right-0 z-50 bg-gradient-to-b from-black/40 via-black/20 to-transparent backdrop-blur-xl border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex justify-between items-center">
            {/* 로고 */}
            <motion.div 
              className="text-2xl font-bold text-gradient"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
            >
              Rangu.fam
            </motion.div>

            {/* 세계 시간 */}
            <div className="hidden md:flex items-center space-x-6">
              {isClient ? (
                <>
                  <div className="flex items-center space-x-2 text-sm">
                    <Clock className="w-4 h-4 text-primary-600" />
                    <span className="text-gray-700">서울</span>
                    <span className="font-mono text-primary-700">
                      {format(times.seoul, 'HH:mm:ss')}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2 text-sm">
                    <Clock className="w-4 h-4 text-primary-600" />
                    <span className="text-gray-700">밴쿠버</span>
                    <span className="font-mono text-primary-700">
                      {format(times.vancouver, 'HH:mm:ss')}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2 text-sm">
                    <Clock className="w-4 h-4 text-primary-600" />
                    <span className="text-gray-700">스위스</span>
                    <span className="font-mono text-primary-700">
                      {format(times.switzerland, 'HH:mm:ss')}
                    </span>
                  </div>
                </>
              ) : (
                <div className="flex items-center space-x-2 text-sm">
                  <Clock className="w-4 h-4 text-primary-600" />
                  <span className="text-gray-700">시간 로딩중...</span>
                </div>
              )}
            </div>

            {/* 사용자 정보 및 메뉴 */}
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
                    <LogOut className="w-5 h-5 text-primary-300" />
                  </button>
                  <ThemeMenu />
                </div>
              ) : (
                <button 
                  className="glass-button p-2"
                  onClick={() => router.push('/login')}
                  title="로그인"
                >
                  <LogIn className="w-5 h-5 text-primary-600" />
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

      {/* 네비게이션 메뉴 */}
      <nav className="hidden md:block glass-nav fixed left-0 top-20 bottom-0 w-64 z-40 overflow-y-auto">
        <div className="p-6">
          {/* 메인 네비게이션 */}
          <ul className="space-y-3 mb-6">
            {navigationItems.map((item, index) => (
              <motion.li 
                key={item.label}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
              >
                <a 
                  href={item.href}
                  className="glass-button flex items-center space-x-3 p-4 w-full text-left"
                >
                  <item.icon className="w-5 h-5 text-primary-300" />
                  <span className="text-gray-100 font-medium">{item.label}</span>
                </a>
              </motion.li>
            ))}
          </ul>

          {/* 개인 바로가기 위젯 - 로그인한 사용자만 표시 */}
          {isLoggedIn && user?.id && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.8 }}
            >
              <BookmarkWidget userId={user.id} />
            </motion.div>
          )}
        </div>
      </nav>

      {/* 모바일 메뉴 */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            className="md:hidden fixed inset-0 z-50 bg-gray-900/80 backdrop-blur-lg overflow-y-auto"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="pt-20 p-6">
              {/* 메인 네비게이션 */}
              <ul className="space-y-3 mb-6">
                {navigationItems.map((item, index) => (
                  <motion.li 
                    key={item.label}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.1 }}
                  >
                    <a 
                      href={item.href}
                      className="glass-button flex items-center space-x-3 p-4 w-full text-left"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      <item.icon className="w-5 h-5 text-primary-300" />
                      <span className="text-gray-100 font-medium">{item.label}</span>
                    </a>
                  </motion.li>
                ))}
              </ul>

              {/* 개인 바로가기 위젯 - 로그인한 사용자만 표시 */}
              {isLoggedIn && user?.id && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: 0.7 }}
                >
                  <BookmarkWidget userId={user.id} />
                </motion.div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 메인 콘텐츠 */}
      <main className="md:ml-64 pt-24 pb-24 min-h-screen">
        <div className="max-w-6xl mx-auto px-6 space-y-12">
          <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-slate-900/70 via-indigo-900/30 to-purple-900/20 p-8 text-white shadow-2xl">
            <div
              className="absolute inset-0 opacity-70 pointer-events-none blur-3xl"
              style={{
                backgroundImage:
                  'radial-gradient(circle at 20% 20%, rgba(129, 140, 248, 0.25), transparent 55%), radial-gradient(circle at 70% 0%, rgba(14, 165, 233, 0.25), transparent 45%)',
              }}
            />
            <div className="relative grid gap-8 lg:grid-cols-[2fr,1fr]">
              <div className="space-y-6">
                <span className="accent-chip">Rangu.fam 2025</span>
                <div className="space-y-3">
                  <h1 className="text-4xl md:text-5xl font-semibold leading-tight">추억과 지금을 한 장에서</h1>
                  <p className="text-base text-slate-200">
                    각자의 이야기, 각자의 시간. 그리고 한 곳에 모이는 우리만의 기록. 오늘도 감성 가득한 무드를 켜고,
                    Rangu.fam에서 만나요.
                  </p>
                </div>
                <div className="grid gap-4 sm:grid-cols-3">
                  {quickStats.map(stat => (
                    <div key={stat.label} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                      <p className="text-xs uppercase text-gray-400">{stat.label}</p>
                      <p className="text-2xl font-semibold text-white mt-1">{stat.value}</p>
                      <p className="text-xs text-gray-300 mt-2">{stat.detail}</p>
                    </div>
                  ))}
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  {quickActions.map(action => {
                    const Icon = action.icon
                    return (
                      <button
                        key={action.title}
                        onClick={() => router.push(action.href)}
                        className="rounded-2xl border border-white/10 bg-white/5 p-4 flex items-start gap-3 text-left hover:border-[var(--accent-border)] hover:bg-white/10 transition"
                      >
                        <span className="inline-flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl bg-white/10 text-white">
                          <Icon className="w-5 h-5" />
                        </span>
                        <span>
                          <span className="block text-sm font-semibold text-white">{action.title}</span>
                          <span className="text-xs text-gray-300">{action.description}</span>
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>
              <div className="rounded-3xl border border-white/10 bg-slate-900/50 p-6 flex flex-col gap-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-gray-400">현재 접속</p>
                    <p className="text-xl font-semibold text-white">{onlineCount}명</p>
                  </div>
                  {isLoggedIn ? (
                    <div className="text-right">
                      <p className="text-sm text-white font-semibold">{user?.username}</p>
                      <p className="text-xs text-gray-400">{user?.role === 'member' ? '멤버' : '게스트'}</p>
                    </div>
                  ) : (
                    <button
                      onClick={() => router.push('/login')}
                      className="glass-button px-4 py-1 text-xs text-white"
                    >
                      로그인
                    </button>
                  )}
                </div>
                <div className="space-y-3">
                  {worldTimeItems.map(item => (
                    <div
                      key={item.label}
                      className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-2"
                    >
                      <div>
                        <p className="text-xs text-gray-400">{item.label}</p>
                        <p className="text-sm font-mono text-white">{item.value}</p>
                      </div>
                      <span className="text-[11px] text-gray-500 uppercase tracking-[0.3em]">{item.zone}</span>
                    </div>
                  ))}
                </div>
                <div className="flex items-center justify-between pt-4 border-t border-white/10">
                  <div>
                    <p className="text-xs text-gray-400">테마 커스터마이즈</p>
                    <p className="text-sm text-gray-200">기분에 따라 무드 변경</p>
                  </div>
                  <ThemeMenu />
                </div>
              </div>
            </div>
          </section>

          <motion.section
            className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-[#0f172a] via-[#111827] to-[#1f2937] p-6 shadow-2xl"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <div className="grid gap-8 lg:grid-cols-[2fr,1fr] items-center">
              <div
                className="relative rounded-2xl border border-white/10 overflow-hidden min-h-[320px]"
                onMouseEnter={() => setIsSlideHovered(true)}
                onMouseLeave={() => setIsSlideHovered(false)}
              >
                <AnimatePresence mode="wait">
                  <motion.div
                    key={currentSlide}
                    className="absolute inset-0"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.8 }}
                  >
                    {activeSlide?.type === 'video' ? (
                      <video
                        className="w-full h-full object-cover"
                        autoPlay
                        loop
                        playsInline
                        muted={videoMuted}
                        poster={activeSlide.poster}
                        onCanPlay={e => {
                          const video = e.target as HTMLVideoElement
                          video.volume = videoVolume / 100
                          video.muted = videoMuted
                          video.play().catch(console.log)
                        }}
                        onLoadedData={e => {
                          const video = e.target as HTMLVideoElement
                          video.volume = videoVolume / 100
                          video.muted = videoMuted
                        }}
                      >
                        <source src={activeSlide.src} type="video/mp4" />
                      </video>
                    ) : activeSlide?.type === 'image' ? (
                      <Image src={activeSlide.src} alt={activeSlide.title} fill className="object-cover object-top" />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-slate-800 to-indigo-900 flex items-center justify-center text-gray-200">
                        준비 중인 콘텐츠
                      </div>
                    )}
                  </motion.div>
                </AnimatePresence>

                {isSlideHovered && (
                  <>
                    <button
                      className="absolute left-4 top-1/2 -translate-y-1/2 slide-nav-button z-10 p-3"
                      onClick={() =>
                        setCurrentSlide(currentSlide === 0 ? slideContent.length - 1 : currentSlide - 1)
                      }
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <button
                      className="absolute right-4 top-1/2 -translate-y-1/2 slide-nav-button z-10 p-3"
                      onClick={() => setCurrentSlide((currentSlide + 1) % slideContent.length)}
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </>
                )}
              </div>

              <div className="text-white space-y-6">
                <div>
                  <span className="accent-chip mb-3">오늘의 스포트라이트</span>
                  <h3 className="text-3xl font-semibold">{activeSlide?.title || 'Spotlight'}</h3>
                  <p className="text-sm text-gray-300 mt-3">
                    {activeSlide?.type === 'video'
                      ? '멤버가 직접 인사하는 짧은 영상을 감상해 보세요.'
                      : '현장의 분위기가 담긴 사진으로 추억을 이어갑니다.'}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <p className="text-xs text-gray-400">다음 전환까지</p>
                    <p className="text-3xl font-mono">{countdown}s</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <p className="text-xs text-gray-400">콘텐츠 타입</p>
                    <p className="text-xl font-semibold">{activeSlide?.type === 'video' ? '영상' : '이미지'}</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {slideContent.map((slide, index) => (
                    <button
                      key={slide.title}
                      onClick={() => setCurrentSlide(index)}
                      className={`px-3 py-1 text-xs rounded-full border ${
                        currentSlide === index
                          ? 'border-white text-white bg-white/10'
                          : 'border-white/20 text-gray-300 hover:border-white/40'
                      }`}
                    >
                      {index + 1}. {slide.type === 'video' ? '영상' : '사진'}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </motion.section>

          <section className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <span className="accent-chip">멤버 활동</span>
                <h2 className="text-3xl font-semibold text-white mt-3">오늘의 상태</h2>
                <p className="text-sm text-gray-400">누가 온라인인지, 무엇을 하고 있는지 한눈에.</p>
              </div>
              <button className="glass-button px-4 py-2 text-sm text-white" onClick={() => router.push('/members')}>
                전체 멤버 보기
              </button>
            </div>
            {membersLoading ? (
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {Array.from({ length: 4 }).map((_, index) => (
                  <div
                    key={index}
                    className="rounded-2xl border border-white/10 bg-white/5 h-36 animate-pulse"
                  />
                ))}
              </div>
            ) : members.length > 0 ? (
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {members.map(member => {
                  const styles = getStatusStyles(member.userStatus || 'offline')
                  return (
                    <div
                      key={member.id}
                      className="rounded-2xl border border-white/10 bg-white/5 p-5 hover:border-[var(--accent-border)] hover:bg-white/10 transition cursor-pointer"
                      onClick={() => router.push(member.personalPageUrl || `/members/${member.id}`)}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-xs text-gray-400">{member.role || 'Rangu 멤버'}</p>
                          <p className="text-xl font-semibold text-white">{member.name}</p>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-[11px] font-semibold ${styles.pill}`}>
                          {member.userStatus || 'offline'}
                        </span>
                      </div>
                      <p className={`text-sm mt-2 line-clamp-2 ${styles.text}`}>
                        {member.description || '지금 순간을 기록하는 중'}
                      </p>
                      <p className="text-xs text-gray-400 mt-3">
                        {member.location || '어딘가에서'} · {member.currentActivity || (member.userStatus === 'online' ? '활동 중' : '스텔스 모드')}
                      </p>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-white/20 p-8 text-center text-gray-400">
                아직 등록된 멤버가 없어요. 첫 번째 순간을 기록해볼까요?
              </div>
            )}
          </section>

          <section className="space-y-6">
            <div>
              <span className="accent-chip">즐길 거리</span>
              <h2 className="text-3xl font-semibold text-white mt-3">모듈 & 하이라이트</h2>
              <p className="text-sm text-gray-400">마법 같은 기능을 골라 빠르게 이동하세요.</p>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              {featureHighlights.map(card => {
                const Icon = card.icon
                return (
                  <div
                    key={card.title}
                    className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-white/10 to-white/5 p-5 text-white"
                  >
                    <div className="absolute inset-0 opacity-30 pointer-events-none bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.2),_transparent)]" />
                    <div className="relative flex items-start gap-4">
                      <div className="h-12 w-12 rounded-2xl bg-white/15 flex items-center justify-center">
                        <Icon className="w-6 h-6" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="text-xl font-semibold">{card.title}</h3>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-white/15 text-white">
                            {card.badge}
                          </span>
                        </div>
                        <p className="text-sm text-gray-200 mt-1">{card.description}</p>
                        <button
                          onClick={() => router.push(card.href)}
                          className="mt-4 text-sm text-white/80 underline underline-offset-4 hover:text-white"
                        >
                          바로가기
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </section>
        </div>
      </main>

      {/* 우측 하단 비디오 볼륨 컨트롤 */}
      {/* Main video volume controls */}
      {isClient && (
        <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end space-y-3">
          <AnimatePresence>
            {isVolumeOpen && (
              <motion.div
                key="volume-panel"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 12 }}
                transition={{ duration: 0.2 }}
                className="glass-card backdrop-blur-xl bg-white/10 border border-white/30 shadow-glass rounded-2xl p-4 min-w-[280px]"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-2">
                    <div className="w-8 h-8 bg-gradient-to-r from-orange-400 to-pink-500/90 rounded-full flex items-center justify-center">
                      <Volume2 className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-gray-100">Main Video Volume</h3>
                      <p className="text-xs text-gray-200/80">
                        {slideContent[currentSlide]?.type === 'video'
                          ? slideContent[currentSlide].title
                          : 'Image slide'}
                      </p>
                    </div>
                  </div>
                  <span className="text-sm font-medium text-gray-100/90">
                    {videoMuted ? 'Muted' : `${videoVolume}%`}
                  </span>
                </div>

                <div className="mb-3">
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={videoMuted ? 0 : videoVolume}
                    onChange={(e) => {
                      const volume = Number(e.target.value)
                      const shouldMute = volume === 0
                      setVideoVolume(volume)
                      setSavedVolume(volume)
                      setVideoMuted(shouldMute)
                      updateAllVideosVolume(volume, shouldMute)
                      localStorage.setItem('rangu_video_volume', volume.toString())
                      localStorage.setItem('rangu_video_muted', shouldMute.toString())
                    }}
                    className="w-full h-2 rounded-lg appearance-none cursor-pointer"
                    style={{
                      background: `linear-gradient(to right, rgba(249,115,22,0.9) 0%, rgba(249,115,22,0.9) ${videoMuted ? 0 : videoVolume}%, rgba(255,255,255,0.25) ${videoMuted ? 0 : videoVolume}%, rgba(255,255,255,0.25) 100%)`
                    }}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => {
                        const newMuted = !videoMuted
                        setVideoMuted(newMuted)
                        updateAllVideosVolume(videoVolume, newMuted)
                        localStorage.setItem('rangu_video_muted', newMuted.toString())
                      }}
                      className="glass-button p-2 rounded-lg"
                      title={videoMuted ? 'Unmute' : 'Mute'}
                    >
                      {videoMuted ? (
                        <VolumeX className="w-4 h-4" />
                      ) : (
                        <Volume2 className="w-4 h-4" />
                      )}
                    </button>

                    <div className="flex space-x-1">
                      {[25, 50, 75, 100].map((preset) => (
                        <button
                          key={preset}
                          onClick={() => {
                            setVideoVolume(preset)
                            setSavedVolume(preset)
                            setVideoMuted(false)
                            updateAllVideosVolume(preset, false)
                            localStorage.setItem('rangu_video_volume', preset.toString())
                            localStorage.setItem('rangu_video_muted', 'false')
                          }}
                          className={`px-2 py-1 text-xs rounded glass-button ${
                            videoVolume === preset && !videoMuted
                              ? 'bg-orange-500/80 text-white'
                              : 'text-gray-100/80'
                          }`}
                        >
                          {preset}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <button
            onClick={() => setIsVolumeOpen(!isVolumeOpen)}
            className="glass-button w-12 h-12 rounded-full flex items-center justify-center"
            title={isVolumeOpen ? 'Hide volume panel' : 'Show volume panel'}
            aria-label={isVolumeOpen ? 'Hide volume panel' : 'Show volume panel'}
          >
            {videoMuted ? (
              <VolumeX className="w-5 h-5" />
            ) : (
              <Volume2 className="w-5 h-5" />
            )}
          </button>
        </div>
      )}
    </div>
  )
} 
