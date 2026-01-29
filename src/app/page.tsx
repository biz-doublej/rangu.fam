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
  BookOpen, 
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
  Palette
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { MediaPlayer } from '@/components/ui/MediaPlayer'
import { BookmarkWidget } from '@/components/ui/BookmarkWidget'
import ThemeMenu from '@/components/ui/ThemeMenu'

type SpotlightSlide = {
  id?: string
  type: 'video' | 'image'
  src: string
  title: string
  poster?: string
  durationSeconds?: number
}

const DEFAULT_SPOTLIGHT_SLIDES: SpotlightSlide[] = [
  { type: 'video', src: '/videos/intro-jaewon.mp4', title: '정재원 소개', poster: '/images/poster-jaewon.jpg', durationSeconds: 17 },
  { type: 'image', src: '/images/slide1.jpg', title: '추억의 사진 1', durationSeconds: 5 },
  { type: 'video', src: '/videos/intro-minseok.mp4', title: '정민석 소개', poster: '/images/poster-minseok.jpg', durationSeconds: 17 },
  { type: 'image', src: '/images/slide2.jpg', title: '추억의 사진 2', durationSeconds: 5 },
  { type: 'video', src: '/videos/intro-jingyu.mp4', title: '정진규 소개', poster: '/images/poster-jingyu.jpg', durationSeconds: 17 },
  { type: 'image', src: '/images/slide3.jpg', title: '추억의 사진 3', durationSeconds: 5 },
  { type: 'video', src: '/videos/intro-hanul.mp4', title: '강한울 소개', poster: '/images/poster-hanul.jpg', durationSeconds: 17 },
  { type: 'video', src: '/videos/intro-seungchan.mp4', title: '이승찬 소개', poster: '/images/poster-seungchan.jpg', durationSeconds: 17 },
  { type: 'image', src: '/images/slide4.jpg', title: '추억의 사진 4', durationSeconds: 5 }
]

const quickActions = [
  { title: '카드 드랍', description: '랜덤 미션 & 수집 카드', href: '/cards', icon: Package },
  { title: '이랑위키', description: '우리만의 기록을 모으는 공간', href: '/wiki', icon: BookOpen },
]

const featureHighlights = [
  { title: '테마 커스터마이즈', description: '크리스마스부터 갤럭시까지 무드 선택', href: '/members', icon: Palette, badge: 'NEW' },
  { title: '카드 드랍', description: '하루 한 번의 서프라이즈 카드', href: '/cards', icon: Sparkles, badge: 'DAILY' },
  { title: '이랑위키', description: '추억과 지식을 모으는 위키', href: '/wiki', icon: BookOpen, badge: 'WIKI' },
]

export default function HomePage() {
  const [currentSlide, setCurrentSlide] = useState(0)
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [slideContent, setSlideContent] = useState<SpotlightSlide[]>(DEFAULT_SPOTLIGHT_SLIDES)
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
  const [showDepartureModal, setShowDepartureModal] = useState(true)
  const departureImageSrc = '/images/minseok-farewell.jpg'
  const departureHideKey = 'rangu_departure_hide_until_v2'
  const [nowTick, setNowTick] = useState(0)
  const departureEvents = [
    {
      title: 'ICN → AUH',
      date: '2026.02.05',
      time: '17:50 ~ 23:25',
      startUtc: Date.UTC(2026, 1, 5, 8, 50, 0),
      endUtc: Date.UTC(2026, 1, 5, 14, 25, 0)
    },
    {
      title: 'AUH 대기 (3시간 10분)',
      date: '2026.02.05 ~ 2026.02.06',
      time: '23:25 ~ 02:35',
      startUtc: Date.UTC(2026, 1, 5, 14, 25, 0),
      endUtc: Date.UTC(2026, 1, 5, 17, 35, 0)
    },
    {
      title: 'AUH → ZRH',
      date: '2026.02.06',
      time: '02:35 ~ 06:30',
      startUtc: Date.UTC(2026, 1, 5, 17, 35, 0),
      endUtc: Date.UTC(2026, 1, 5, 21, 30, 0)
    }
  ]
  const initialSlide = DEFAULT_SPOTLIGHT_SLIDES[0]
  const [countdown, setCountdown] = useState(
    initialSlide?.durationSeconds || (initialSlide?.type === 'video' ? 17 : 5) || 5
  ) // 카운트다운 타이머
  const [isSlideHovered, setIsSlideHovered] = useState(false) // 슬라이드 호버 상태
  const { user, logout, isLoggedIn } = useAuth()
  const router = useRouter()

  const slideCount = slideContent.length || 1
  const activeSlide = slideContent[currentSlide]
  const quickStats = [
    { label: '등록 멤버', value: '5명', detail: '우리만의 팀원' },
    { label: '오늘의 스포트라이트', value: activeSlide?.title || '준비 중', detail: activeSlide?.type === 'video' ? '멤버 인사 영상' : '추억의 사진' },
    { label: '위키 문서', value: '업데이트 중', detail: '새 기록 준비' },
  ]
  const worldTimeItems = [
    { label: '서울', value: isClient ? format(times.seoul, 'HH:mm:ss') : '--:--:--', zone: 'KST' },
    { label: '밴쿠버', value: isClient ? format(times.vancouver, 'HH:mm:ss') : '--:--:--', zone: 'PST' },
    { label: '스위스', value: isClient ? format(times.switzerland, 'HH:mm:ss') : '--:--:--', zone: 'CET' },
  ]

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

  useEffect(() => {
    if (!isClient) return
    setNowTick(Date.now())
    const timer = setInterval(() => setNowTick(Date.now()), 60 * 1000)
    return () => clearInterval(timer)
  }, [isClient])

  useEffect(() => {
    if (!isClient) return
    const hiddenUntilRaw = localStorage.getItem(departureHideKey)
    if (!hiddenUntilRaw) return
    const hiddenUntil = Number(hiddenUntilRaw)
    if (Number.isNaN(hiddenUntil)) {
      localStorage.removeItem(departureHideKey)
      return
    }
    if (hiddenUntil > Date.now()) setShowDepartureModal(false)
  }, [isClient])

  // 슬라이드 데이터를 서버에서 로드
  useEffect(() => {
    let isMounted = true

    const fetchSlides = async () => {
      try {
        const response = await fetch('/api/spotlight', { cache: 'no-store' })
        if (!response.ok) return
        const data = await response.json()
        if (isMounted && Array.isArray(data.slides) && data.slides.length) {
          setSlideContent(data.slides)
          setCurrentSlide(0)
        }
      } catch (error) {
        console.error('Failed to load spotlight slides:', error)
      }
    }

    fetchSlides()

    return () => {
      isMounted = false
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
    if (!currentContent) return
    const initialTime =
      currentContent.durationSeconds || (currentContent.type === 'video' ? 17 : 5) // 영상 17초, 이미지 5초
    setCountdown(initialTime)
  }, [currentSlide, slideContent])

  // 카운트다운 타이머
  useEffect(() => {
    if (!slideContent.length) return

    const interval = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          // 1초에서 다음 슬라이드로 전환
          setCurrentSlide(current => (current + 1) % slideContent.length)
          return prev // 다음 슬라이드로 넘어가면서 카운트다운은 useEffect에서 리셋됨
        }
        return prev - 1
      })
    }, 1000)
    
    return () => clearInterval(interval)
  }, [slideContent.length])

  const navigationItems = [
    { icon: Home, label: '홈', href: '/' },
    { icon: User, label: '소개', href: '/about' },
    { icon: User, label: '멤버 카드', href: '/members' },
    { icon: BookOpen, label: '이랑위키', href: '/wiki' },
    { icon: Package, label: '카드 드랍', href: '/cards' },
  ]

  return (
    <div className="min-h-screen relative overflow-hidden theme-surface">
      {showDepartureModal && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-sm px-4"
          onClick={() => setShowDepartureModal(false)}
        >
          <div
            className="relative w-full max-w-5xl overflow-hidden rounded-[2.5rem] border border-white/15 bg-slate-950/90 p-10 text-white shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="absolute -top-16 -right-16 h-48 w-48 rounded-full bg-emerald-500/20 blur-3xl" />
            <div className="absolute -bottom-20 -left-10 h-52 w-52 rounded-full bg-indigo-500/20 blur-3xl" />
            <div className="relative space-y-4">
              <div className="overflow-hidden rounded-[2rem] border border-white/10 bg-black/20">
                <Image
                  src={departureImageSrc}
                  alt="민석 이별 이미지"
                  width={1280}
                  height={720}
                  priority
                  className="h-auto w-full object-cover"
                />
              </div>
              <div className="flex flex-wrap gap-2 pt-2">
                <div className="flex items-center gap-2 text-xs text-white/70">
                  <button
                    type="button"
                    className="rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs text-white/80 hover:text-white"
                    onClick={() => {
                      localStorage.setItem(departureHideKey, String(Date.now() + 24 * 60 * 60 * 1000))
                      setShowDepartureModal(false)
                    }}
                  >
                    하루 안보기
                  </button>
                  <span className="text-white/40">|</span>
                  <button
                    type="button"
                    className="rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs text-white/80 hover:text-white"
                    onClick={() => setShowDepartureModal(false)}
                  >
                    닫기
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
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
                    <Clock className="w-4 h-4 text-white/90" />
                    <span className="text-white/80">서울</span>
                    <span className="font-mono text-white">
                      {format(times.seoul, 'HH:mm:ss')}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2 text-sm">
                    <Clock className="w-4 h-4 text-white/90" />
                    <span className="text-white/80">밴쿠버</span>
                    <span className="font-mono text-white">
                      {format(times.vancouver, 'HH:mm:ss')}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2 text-sm">
                    <Clock className="w-4 h-4 text-white/90" />
                    <span className="text-white/80">스위스</span>
                    <span className="font-mono text-white">
                      {format(times.switzerland, 'HH:mm:ss')}
                    </span>
                  </div>
                </>
              ) : (
                <div className="flex items-center space-x-2 text-sm">
                  <Clock className="w-4 h-4 text-white/90" />
                  <span className="text-white/80">시간 로딩중...</span>
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
          <section className="rounded-3xl border border-white/10 bg-gradient-to-br from-slate-900/70 via-emerald-900/20 to-slate-950/40 p-6 text-white shadow-xl">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-emerald-200/70">현재 상황</p>
                <h2 className="text-2xl font-semibold">민석 이동 일정</h2>
                <p className="mt-1 text-sm text-slate-300">한국 시간 기준</p>
              </div>
              <div className="rounded-full border border-emerald-400/30 bg-emerald-500/10 px-4 py-2 text-xs text-emerald-100">
                2026.02.05 ~ 2026.02.06
              </div>
            </div>
            <div className="mt-6 grid gap-4 md:grid-cols-3">
              {departureEvents.map((event) => {
                const isPast = isClient && nowTick > event.endUtc
                const isActive = isClient && nowTick >= event.startUtc && nowTick <= event.endUtc
                const statusLabel = isActive ? '진행중' : isPast ? '완료' : '예정'
                return (
                  <div
                    key={event.title}
                    className={`rounded-2xl border border-white/10 bg-slate-950/50 px-5 py-4 text-sm transition ${
                      isPast ? 'text-slate-400 line-through' : 'text-slate-100'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="font-semibold text-white">{event.title}</span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs ${
                          isActive
                            ? 'bg-emerald-500/20 text-emerald-200'
                            : isPast
                              ? 'bg-white/10 text-slate-400'
                              : 'bg-sky-500/20 text-sky-200'
                        }`}
                      >
                        {statusLabel}
                      </span>
                    </div>
                    <p className="mt-2 text-xs text-slate-300">{event.date}</p>
                    <p className="mt-1 text-xs text-emerald-200">{event.time}</p>
                  </div>
                )
              })}
            </div>
          </section>
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
                <span className="accent-chip">Rangu.fam 2026</span>
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
                  <p className="text-xs text-gray-400">접속 안내</p>
                  <p className="text-xl font-semibold text-white">현재 시간</p>
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
                        setCurrentSlide(currentSlide === 0 ? slideCount - 1 : currentSlide - 1)
                      }
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <button
                      className="absolute right-4 top-1/2 -translate-y-1/2 slide-nav-button z-10 p-3"
                      onClick={() => setCurrentSlide((currentSlide + 1) % slideCount)}
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
                <span className="accent-chip">멤버 카드</span>
                <h2 className="text-3xl font-semibold text-white mt-3">Rangu.fam 카드 모음</h2>
                <p className="text-sm text-gray-400">개인 카드 컬렉션에서 멤버 정보를 확인하세요.</p>
              </div>
              <button className="glass-button px-4 py-2 text-sm text-white" onClick={() => router.push('/members')}>
                카드 보러가기
              </button>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
              <p className="text-sm text-gray-300">
                실시간 접속 상태 대신, 멤버별 카드로 한눈에 정리된 정보를 제공합니다.
              </p>
            </div>
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
