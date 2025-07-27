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
  LogIn,
  LogOut,
  Menu,
  X
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { MemberWithActivity } from '@/backend/types'

// 임시 이미지 데이터 (나중에 실제 이미지로 교체)
const slideImages = [
  '/images/slide1.jpg',
  '/images/slide2.jpg', 
  '/images/slide3.jpg',
  '/images/slide4.jpg',
]

export default function HomePage() {
  const [currentSlide, setCurrentSlide] = useState(0)
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [times, setTimes] = useState({
    seoul: new Date(),
    vancouver: new Date(),
    switzerland: new Date(),
  })
  const [members, setMembers] = useState<MemberWithActivity[]>([])
  const [membersLoading, setMembersLoading] = useState(true)
  const { user, logout, isLoggedIn } = useAuth()
  const router = useRouter()

  // 시간 업데이트
  useEffect(() => {
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
  }, [])

  // 자동 슬라이드
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slideImages.length)
    }, 5000)
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
  ]

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* 상단 시간 표시 */}
      <header className="glass-nav fixed top-0 left-0 right-0 z-50">
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
            </div>

            {/* 사용자 정보 및 메뉴 */}
            <div className="flex items-center space-x-4">
              {isLoggedIn ? (
                <div className="flex items-center space-x-3">
                  <div className="hidden md:block text-right">
                    <p className="text-sm font-medium text-primary-700">{user?.username}</p>
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
      <nav className="hidden md:block glass-nav fixed left-0 top-20 bottom-0 w-64 z-40">
        <div className="p-6">
          <ul className="space-y-3">
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
                  <item.icon className="w-5 h-5 text-primary-600" />
                  <span className="text-gray-700 font-medium">{item.label}</span>
                </a>
              </motion.li>
            ))}
          </ul>
        </div>
      </nav>

      {/* 모바일 메뉴 */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            className="md:hidden fixed inset-0 z-50 bg-glass-white backdrop-blur-lg"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="pt-20 p-6">
              <ul className="space-y-3">
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
                      <item.icon className="w-5 h-5 text-primary-600" />
                      <span className="text-gray-700 font-medium">{item.label}</span>
                    </a>
                  </motion.li>
                ))}
              </ul>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 메인 콘텐츠 */}
      <main className="md:ml-64 pt-20 min-h-screen">
        <div className="max-w-4xl mx-auto p-6">
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
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              네 친구의 특별한 온라인 공간, Rangu.fam에 오신 것을 환영합니다. 
              우정과 추억이 가득한 이곳에서 함께 시간을 보내세요.
            </p>
          </motion.div>

          {/* 중앙 슬라이드 이미지 */}
          <motion.div 
            className="glass-card relative h-96 md:h-[500px] overflow-hidden mb-12"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            <AnimatePresence mode="wait">
              <motion.div
                key={currentSlide}
                className="absolute inset-0 bg-gradient-to-br from-primary-100 to-warm-100 flex items-center justify-center"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 1 }}
              >
                <div className="text-center text-gray-500">
                  <div className="w-24 h-24 bg-primary-200 rounded-full mx-auto mb-4 flex items-center justify-center">
                    <span className="text-3xl">📸</span>
                  </div>
                  <p className="text-lg">슬라이드 {currentSlide + 1}</p>
                  <p className="text-sm mt-2">추억의 사진들이 여기에 표시됩니다</p>
                </div>
              </motion.div>
            </AnimatePresence>

            {/* 슬라이드 인디케이터 */}
            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-2">
              {slideImages.map((_, index) => (
                <button
                  key={index}
                  className={`w-3 h-3 rounded-full transition-all duration-300 ${
                    index === currentSlide 
                      ? 'bg-primary-500 scale-125' 
                      : 'bg-glass-medium hover:bg-primary-300'
                  }`}
                  onClick={() => setCurrentSlide(index)}
                />
              ))}
            </div>
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
                        const getActivityStatusColor = () => {
                          if (member.isOnline) return 'text-green-500'
                          
                          const now = new Date()
                          const diffInMinutes = Math.floor((now.getTime() - new Date(member.lastSeen).getTime()) / (1000 * 60))
                          
                          if (diffInMinutes < 30) return 'text-yellow-500'
                          return 'text-gray-500'
                        }

                        const getActivityText = () => {
                          if (member.isOnline) return '활동중'
                          
                          const now = new Date()
                          const lastSeenDate = new Date(member.lastSeen)
                          const diffInMinutes = Math.floor((now.getTime() - lastSeenDate.getTime()) / (1000 * 60))
                          
                          if (diffInMinutes < 30) return '방금 전 활동'
                          
                          return '오프라인'
                        }

                        const getEmoji = (name: string) => {
                          const emojiMap: { [key: string]: string } = {
                            '정재원': '👨‍💻',
                            '정민석': '🏔️',
                            '정진규': '🪖',
                            '강한울': '🎮'
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
                              {/* 온라인 상태 표시 */}
                              {member.isOnline && (
                                <div className="absolute top-0 right-0 w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                              )}
                            </div>
                            <h3 className="text-xl font-bold text-primary-700 mb-2">{member.name}</h3>
                            <p className={`text-sm ${getActivityStatusColor()}`}>
                              {getActivityText()}
                            </p>
                            {!member.isOnline && member.lastLogin && (
                              <p className="text-xs text-gray-400 mt-1">
                                마지막 로그인: {(() => {
                                  const loginDate = new Date(member.lastLogin)
                                  const now = new Date()
                                  const diffInMinutes = Math.floor((now.getTime() - loginDate.getTime()) / (1000 * 60))
                                  
                                  if (diffInMinutes < 1) return '방금 전'
                                  if (diffInMinutes < 60) return `${diffInMinutes}분 전`
                                  
                                  const diffInHours = Math.floor(diffInMinutes / 60)
                                  if (diffInHours < 24) return `${diffInHours}시간 전`
                                  
                                  return loginDate.toLocaleDateString('ko-KR', {
                                    month: 'short',
                                    day: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  })
                                })()}
                              </p>
                            )}
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
                        <p className="text-sm text-gray-600">{feature.desc}</p>
                      </motion.div>
                    ))}
                  </motion.div>
        </div>
      </main>
    </div>
  )
} 