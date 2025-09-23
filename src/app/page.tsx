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
  VolumeX
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { MemberWithActivity } from '@/backend/types'
import { MediaPlayer } from '@/components/ui/MediaPlayer'
import { BookmarkWidget } from '@/components/ui/BookmarkWidget'
import { CardDropWidget } from '@/components/ui/CardDropWidget'

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
  { type: 'image', src: '/images/slide4.jpg', title: '추억의 사진 4' },
  { type: 'video', src: '/videos/intro-heeyeol.mp4', title: '윤희열 소개', poster: '/images/poster-heeyeol.jpg' },
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
  const [videoMuted, setVideoMuted] = useState(false)
  const [members, setMembers] = useState<MemberWithActivity[]>([])
  const [membersLoading, setMembersLoading] = useState(true)
  const [countdown, setCountdown] = useState(17) // 카운트다운 타이머
  const [isSlideHovered, setIsSlideHovered] = useState(false) // 슬라이드 호버 상태
  const [showVolumePanel, setShowVolumePanel] = useState(false) // 슬라이드 내부 볼륨 패널 표시
  const [videoError, setVideoError] = useState(false)
  const { user, logout, isLoggedIn } = useAuth()
  const router = useRouter()

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
    // 슬라이드 전환 시 볼륨 패널은 닫고 에러 상태 초기화
    setShowVolumePanel(false)
    setVideoError(false)
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
  }, [user])

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
    <div className="min-h-screen relative overflow-hidden bg-gray-900">
      {/* 상단 시간 표시 */}
      <header className="glass-nav fixed top-0 left-0 right-0 z-50 bg-gray-900/70">
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
                    <Clock className="w-4 h-4 text-primary-300" />
                    <span className="text-gray-200">서울</span>
                    <span className="font-mono text-primary-300">
                      {format(times.seoul, 'HH:mm:ss')}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2 text-sm">
                    <Clock className="w-4 h-4 text-primary-300" />
                    <span className="text-gray-200">밴쿠버</span>
                    <span className="font-mono text-primary-300">
                      {format(times.vancouver, 'HH:mm:ss')}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2 text-sm">
                    <Clock className="w-4 h-4 text-primary-300" />
                    <span className="text-gray-200">스위스</span>
                    <span className="font-mono text-primary-300">
                      {format(times.switzerland, 'HH:mm:ss')}
                    </span>
                  </div>
                </>
              ) : (
                <div className="flex items-center space-x-2 text-sm">
                  <Clock className="w-4 h-4 text-primary-300" />
                  <span className="text-gray-200">시간 로딩중...</span>
                </div>
              )}
            </div>

            {/* 사용자 정보 및 메뉴 */}
            <div className="flex items-center space-x-4">
              {isLoggedIn ? (
                <div className="flex items-center space-x-3">
                  <div className="hidden md:block text-right">
                    <p className="text-sm font-medium text-primary-200">{user?.username}</p>
                    <p className="text-xs text-gray-500">{user?.role === 'member' ? '멤버' : '게스트'}</p>
                  </div>
                  <button 
                    className="glass-button p-2"
                    onClick={() => logout()}
                    title="로그아웃"
                  >
                    <LogOut className="w-5 h-5 text-primary-600" />
                  </button>
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
                className="glass-button p-2"
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                title="메뉴"
              >
                {isMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* 네비게이션 메뉴 */}
      <nav className="hidden md:block glass-sidebar fixed left-0 top-20 bottom-0 w-64 z-40 overflow-y-auto">
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

          {/* 카드 드랍 위젯 - 로그인한 사용자만 표시 */}
          {isLoggedIn && user?.id && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.7 }}
              className="mb-4"
            >
              <CardDropWidget userId={user.id} />
            </motion.div>
          )}

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
            className="fixed inset-0 z-50 bg-gray-900/60 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsMenuOpen(false)}
          >
            <motion.div
              className="pt-20 p-6 w-full max-w-sm h-full glass-sidebar"
              initial={{ x: -40, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -40, opacity: 0 }}
              transition={{ duration: 0.25 }}
              onClick={(e) => e.stopPropagation()}
            >
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

              {/* 카드 드랍 위젯 - 로그인한 사용자만 표시 */}
              {isLoggedIn && user?.id && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: 0.6 }}
                  className="mb-4"
                >
                  <CardDropWidget userId={user.id} />
                </motion.div>
              )}

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
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 메인 콘텐츠 */}
      <main className="md:ml-64 pt-20 min-h-screen">
        <div className="max-w-6xl mx-auto p-6">
          {/* 환영 메시지 */}
          <motion.div 
            className="text-center mb-12"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <h1 className="text-4xl md:text-6xl font-bold text-gradient mb-4">
              환영합니다
            </h1>
            <p className="text-lg text-gray-300 max-w-2xl mx-auto">
              네 친구의 특별한 온라인 공간, Rangu.fam에 오신 것을 환영합니다. 
              우정과 추억이 가득한 이곳에서 함께 시간을 보내세요.
            </p>
          </motion.div>

          {/* 중앙 슬라이드 (이미지 + 영상) - 와이드 직사각형 */}
          <motion.div 
            className="glass-card relative h-[400px] md:h-[500px] lg:h-[550px] w-full max-w-5xl mx-auto overflow-hidden mb-12 cursor-pointer"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            onMouseEnter={() => setIsSlideHovered(true)}
            onMouseLeave={() => {
              setIsSlideHovered(false)
              // 호버가 끝나면 패널 자동 숨김 (고정 클릭 시 유지 원치 않음)
              setShowVolumePanel(false)
            }}
            onClick={() => setIsSlideHovered(!isSlideHovered)}
            style={{ aspectRatio: '16/9' }}
          >
            <AnimatePresence mode="wait">
              <motion.div
                key={currentSlide}
                className="absolute inset-0"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 1 }}
              >
                {slideContent[currentSlide]?.type === 'video' && !videoError ? (
                  <video
                    className="w-full h-full object-cover"
                    autoPlay
                    loop
                    playsInline
                    muted={videoMuted}
                    poster={slideContent[currentSlide].poster}
                    onCanPlay={(e) => {
                      // 영상이 로드되면 자동 재생 시도하고 볼륨 설정
                      const video = e.target as HTMLVideoElement;
                      video.volume = videoVolume / 100;
                      video.muted = videoMuted;
                      video.play().catch(console.log);
                    }}
                    onLoadedData={(e) => {
                      // 비디오 데이터가 로드되면 볼륨 설정
                      const video = e.target as HTMLVideoElement;
                      video.volume = videoVolume / 100;
                      video.muted = videoMuted;
                    }}
                    onError={() => setVideoError(true)}
                  >
                    <source src={slideContent[currentSlide].src} type="video/mp4" />
                    <div className="w-full h-full bg-gradient-to-br from-primary-100 to-warm-100 flex items-center justify-center">
                      <div className="text-center text-gray-500">
                        <div className="w-24 h-24 bg-primary-200 rounded-full mx-auto mb-4 flex items-center justify-center">
                          <span className="text-3xl">🎬</span>
                        </div>
                        <p className="text-lg">{slideContent[currentSlide].title}</p>
                        <p className="text-sm mt-2">브라우저가 비디오를 지원하지 않습니다</p>
                      </div>
                    </div>
                  </video>
                ) : slideContent[currentSlide]?.type === 'image' && !videoError ? (
                  <Image
                    src={slideContent[currentSlide].src}
                    alt={slideContent[currentSlide].title}
                    fill
                    className="object-cover object-top"
                    onError={() => setVideoError(true)}
                  />
                ) : (
                  // 플레이스홀더 (파일이 없을 때)
                  <div className="w-full h-full bg-gradient-to-br from-primary-100 to-warm-100 flex items-center justify-center">
                    <div className="text-center text-gray-500">
                      <div className="w-24 h-24 bg-primary-200 rounded-full mx-auto mb-4 flex items-center justify-center">
                        <span className="text-3xl">
                          {slideContent[currentSlide]?.type === 'video' ? '🎬' : '📸'}
                        </span>
                      </div>
                      <p className="text-lg">{slideContent[currentSlide]?.title || `슬라이드 ${currentSlide + 1}`}</p>
                      <p className="text-sm mt-2">
                        {slideContent[currentSlide]?.type === 'video' 
                          ? '멤버 소개 영상이 여기에 표시됩니다' 
                          : '추억의 사진이 여기에 표시됩니다'}
                      </p>
                    </div>
                  </div>
                )}
                

              </motion.div>
            </AnimatePresence>

            {/* 좌우 네비게이션 버튼 - 호버 시에만 표시 */}
            <AnimatePresence>
              {isSlideHovered && (
                <>
                  <motion.button
                    className="absolute left-4 top-1/2 transform -translate-y-1/2 slide-nav-button z-15 p-3"
                    onClick={() => setCurrentSlide(currentSlide === 0 ? slideContent.length - 1 : currentSlide - 1)}
                    title="이전 슬라이드"
                    initial={{ opacity: 0, x: -30 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -30 }}
                    transition={{ duration: 0.3, ease: "easeOut" }}
                  >
                    <ChevronLeft className="w-6 h-6 text-primary-600" />
                  </motion.button>
                  
                  <motion.button
                    className="absolute right-4 top-1/2 transform -translate-y-1/2 slide-nav-button z-15 p-3"
                    onClick={() => setCurrentSlide((currentSlide + 1) % slideContent.length)}
                    title="다음 슬라이드"
                    initial={{ opacity: 0, x: 30 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 30 }}
                    transition={{ duration: 0.3, ease: "easeOut" }}
                  >
                    <ChevronRight className="w-6 h-6 text-primary-600" />
                  </motion.button>
                </>
              )}
            </AnimatePresence>

            {/* 슬라이드 내부 볼륨 토글 버튼 및 패널 (비디오일 때만) */}
            {(slideContent[currentSlide]?.type === 'video') && (
              <>
                {/* 토글 버튼: 호버 시 또는 패널 열려있을 때만 표시 */}
                {(isSlideHovered || showVolumePanel) && (
                  <button
                    className={`absolute bottom-4 right-4 z-20 glass-button p-3 rounded-full ${showVolumePanel ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
                    title={videoMuted ? '음소거 해제' : '볼륨 조절'}
                    onClick={(e) => { e.stopPropagation(); setShowVolumePanel(true) }}
                  >
                    {videoMuted ? <VolumeX className="w-5 h-5 text-primary-700" /> : <Volume2 className="w-5 h-5 text-primary-700" />}
                  </button>
                )}

                {/* 볼륨 패널 */}
                {showVolumePanel && (
                  <div className="absolute bottom-4 right-4 z-30 bg-white/90 backdrop-blur-sm border border-gray-200 rounded-2xl shadow-lg p-4 min-w-[260px]" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-2">
                        <div className="w-8 h-8 bg-gradient-to-r from-orange-400 to-pink-500 rounded-full flex items-center justify-center">
                          <Volume2 className="w-4 h-4 text-white" />
                        </div>
                        <div>
                          <h3 className="text-sm font-semibold text-gray-800">메인 영상 볼륨</h3>
                          <p className="text-xs text-gray-500">{slideContent[currentSlide].title}</p>
                        </div>
                      </div>
                      <button className="p-1 rounded-lg hover:bg-gray-100" onClick={() => setShowVolumePanel(false)} title="닫기">
                        <X className="w-4 h-4 text-gray-600" />
                      </button>
                    </div>
                    <div className="mb-3">
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={videoMuted ? 0 : videoVolume}
                        onChange={(e) => {
                          const volume = Number(e.target.value)
                          setVideoVolume(volume)
                          setSavedVolume(volume)
                          if (volume > 0) setVideoMuted(false)
                          updateAllVideosVolume(volume, volume === 0)
                          localStorage.setItem('rangu_video_volume', volume.toString())
                          localStorage.setItem('rangu_video_muted', (volume === 0).toString())
                        }}
                        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                        style={{
                          background: `linear-gradient(to right, #f97316 0%, #f97316 ${videoMuted ? 0 : videoVolume}%, #e5e7eb ${videoMuted ? 0 : videoVolume}%, #e5e7eb 100%)`
                        }}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <button
                        onClick={() => {
                          const newMuted = !videoMuted
                          setVideoMuted(newMuted)
                          updateAllVideosVolume(videoVolume, newMuted)
                          localStorage.setItem('rangu_video_muted', newMuted.toString())
                        }}
                        className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                        title={videoMuted ? '음소거 해제' : '음소거'}
                      >
                        {videoMuted ? (
                          <VolumeX className="w-4 h-4 text-gray-600" />
                        ) : (
                          <Volume2 className="w-4 h-4 text-gray-600" />
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
                            className={`px-2 py-1 text-xs rounded transition-colors ${
                              videoVolume === preset && !videoMuted
                                ? 'bg-orange-500 text-white'
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            }`}
                          >
                            {preset}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}

          </motion.div>

                            {/* 멤버 소개 카드 */}
                  <motion.div
                    className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12"
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, delay: 0.4 }}
                  >
                    {membersLoading ? (
                      // 로딩 상태
                      Array.from({ length: 4 }).map((_, index) => (
                        <motion.div
                          key={index}
                          className="glass-card p-6 text-center"
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.6, delay: 0.6 + index * 0.1 }}
                        >
                          <div className="animate-pulse">
                            <div className="text-4xl mb-4">⏳</div>
                            <div className="h-6 bg-gray-200 rounded mb-2"></div>
                            <div className="h-4 bg-gray-200 rounded w-3/4 mx-auto"></div>
                          </div>
                        </motion.div>
                      ))
                    ) : (
                      // 실제 멤버 데이터
                      members.map((member, index) => {
                        // 상태별 색상 반환
                        const getStatusColor = (status: string) => {
                          switch (status) {
                            case 'online':
                              return 'text-green-500'
                            case 'idle':
                              return 'text-yellow-500'
                            case 'dnd':
                              return 'text-red-500'
                            case 'offline':
                              return 'text-gray-500'
                            default:
                              return 'text-green-500'
                          }
                        }

                        // 상태별 텍스트 반환
                        const getStatusText = (status: string) => {
                          switch (status) {
                            case 'online':
                              return '온라인'
                            case 'idle':
                              return '자리 비움'
                            case 'dnd':
                              return '방해금지'
                            case 'offline':
                              return '오프라인'
                            default:
                              return '온라인'
                          }
                        }

                        // 상태별 배경색 반환 (상태 점용)
                        const getStatusBgColor = (status: string) => {
                          switch (status) {
                            case 'online':
                              return 'bg-green-500'
                            case 'idle':
                              return 'bg-yellow-500'
                            case 'dnd':
                              return 'bg-red-500'
                            case 'offline':
                              return 'bg-gray-500'
                            default:
                              return 'bg-green-500'
                          }
                        }

                        const getEmoji = (name: string) => {
                          const emojiMap: { [key: string]: string } = {
                            '정재원': '👨‍💻',
                            '정민석': '🏔️',
                            '정진규': '🪖',
                            '강한울': '🎮',
                            '이승찬': '🌟',
                            '윤희열': '🔮'
                          }
                          return emojiMap[name] || '👤'
                        }

                        return (
                          <motion.div
                            key={member.id}
                            className="glass-card p-6 text-center hover:shadow-glass transition-all duration-300 cursor-pointer"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.6, delay: 0.6 + index * 0.1 }}
                            whileHover={{ y: -5 }}
                            onClick={() => router.push(member.personalPageUrl || `/members/${member.id}`)}
                          >
                            <div className="relative">
                              <div className="text-4xl mb-3">{getEmoji(member.name)}</div>
                              {/* 새로운 상태 표시 시스템 */}
                              <div className={`absolute top-0 right-0 w-4 h-4 ${getStatusBgColor(member.userStatus || 'offline')} rounded-full border-2 border-white ${
                                member.userStatus === 'online' ? 'animate-pulse' : ''
                              }`}></div>
                            </div>
                            <h3 className="text-xl font-bold text-primary-700 mb-2">{member.name}</h3>
                            <p className={`text-sm font-medium ${getStatusColor(member.userStatus || 'offline')}`}>
                              {getStatusText(member.userStatus || 'offline')}
                            </p>
                          </motion.div>
                        )
                      })
                    )}
                  </motion.div>

                  {/* 주요 기능 소개 */}
                  <motion.div
                    className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, delay: 0.8 }}
                  >
                    {[
                      { title: '🎵 음악 스테이션', desc: '친구들과 함께 만든 음악 감상', link: '/music' },
                      { title: '📚 이랑위키', desc: '우리만의 지식 백과사전', link: '/wiki' },
                      { title: '🎮 게임센터', desc: '테트리스, 끝말잇기, 카드게임', link: '/games' },
                    ].map((feature, index) => (
                      <motion.div
                        key={feature.title}
                        className="glass-card p-6 text-center hover:shadow-glass transition-all duration-300 cursor-pointer"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, delay: 1.0 + index * 0.1 }}
                        whileHover={{ y: -5 }}
                        onClick={() => router.push(feature.link)}
                      >
                        <h3 className="text-lg font-bold text-primary-700 mb-2">{feature.title}</h3>
                        <p className="text-sm text-gray-300">{feature.desc}</p>
                      </motion.div>
                    ))}
                  </motion.div>
        </div>
      </main>

      {/* 우측 하단 고정 볼륨 패널은 제거하고, 슬라이드 내부로 이동함 */}
    </div>
  )
}
