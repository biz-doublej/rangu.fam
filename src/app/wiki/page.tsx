'use client'

import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { 
  Search, 
  Menu, 
  User, 
  LogIn, 
  LogOut,
  Edit, 
  Clock, 
  TrendingUp, 
  Shuffle, 
  BookOpen,
  Star,
  MessageCircle,
  Eye,
  ArrowRight,
  Settings,
  HelpCircle,
  Home,
  RefreshCw,
  Bell,
  ChevronRight,
  ExternalLink,
  Users,
  FileText,
  Zap,
  Shield
} from 'lucide-react'
import { Card, CardHeader, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { NotificationDropdown } from '@/components/ui/NotificationDropdown'
import { BRANDING } from '@/config/branding'
import { useWikiAuth } from '@/contexts/WikiAuthContext'
import ThemeMenu from '@/components/ui/ThemeMenu'

export default function WikiMainPage() {
  // 최근 변경 토글 상태
  const [showRecentChanges, setShowRecentChanges] = useState(false)
  const router = useRouter()
  const { wikiUser, isLoggedIn, logout, isModerator } = useWikiAuth()
  const [searchQuery, setSearchQuery] = useState('')
  const [mainPageData, setMainPageData] = useState<{
    lastEditDate: string;
    lastEditor: string;
    views: number;
  } | null>(null)
  
  // 실시간 검색어 (DB에서 인기 문서 fetch)
  type TrendingItem = { title: string; slug: string; views: number }
  const [realtimeSearch, setRealtimeSearch] = useState<TrendingItem[]>([])
  useEffect(() => {
    fetch('/api/wiki/trending?limit=10')
      .then(res => res.json())
      .then(data => {
        if (data.success && data.trending) setRealtimeSearch(data.trending)
      })
      .catch(() => setRealtimeSearch([]))
  }, [])

  // 최근 변경 문서 (DB에서 동적 fetch)
  type RecentChange = {
    title: string;
    slug: string;
    namespace?: string;
    revision: {
      author?: string;
      timestamp?: number;
      editType?: string;
    }
  }
  const [recentChanges, setRecentChanges] = useState<RecentChange[]>([])
  useEffect(() => {
    fetch('/api/wiki/recent?limit=5')
      .then(res => res.json())
      .then(data => {
        if (data.success && data.changes) setRecentChanges(data.changes)
      })
      .catch(() => setRecentChanges([]))
  }, [])

  // 이랑뉴스 (실시간 NewsAPI)
  type NewsItem = { title: string; url: string }
  const [news, setNews] = useState<NewsItem[]>([])
  useEffect(() => {
    fetch('/api/news')
      .then(res => res.json())
      .then(data => {
        if (data.news) setNews(data.news)
      })
      .catch(() => setNews([]))
  }, [])

  // Fetch latest edit data from entire wiki
  useEffect(() => {
    const fetchLatestEditData = async () => {
      try {
        const response = await fetch('/api/wiki/latest-edit')
        const data = await response.json()
        
        if (data.success && data.latestEdit) {
          setMainPageData({
            lastEditDate: data.latestEdit.lastEditDate,
            lastEditor: data.latestEdit.lastEditor,
            views: 20000 // 기본값 유지 (전체 위키 조회수는 별도 관리)
          })
        }
      } catch (error) {
        console.error('Failed to fetch latest edit data:', error)
        // Keep default null state if fetch fails
      }
    }

    fetchLatestEditData()
  }, [])

  // 검색 처리
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      router.push(`/wiki/search?q=${encodeURIComponent(searchQuery)}`)
    }
  }

  // 랜덤 문서로 이동
  const goToRandomPage = () => {
    const randomPages = ['RANGU.FAM', 'Next.js', 'React', 'TypeScript']
    const randomPage = randomPages[Math.floor(Math.random() * randomPages.length)]
    router.push(`/wiki/${encodeURIComponent(randomPage)}`)
  }

  // 편집 페이지로 이동 (관리자만 가능)
  const handleEditMainPage = () => {
    if (!isLoggedIn) {
      router.push('/wiki/login')
      return
    }
    
    if (!isModerator) {
      alert('이랑위키:대문은 관리자만 편집할 수 있습니다.')
      return
    }
    
    router.push('/wiki/이랑위키:대문')
  }

  return (
    <div className="min-h-screen theme-surface text-gray-100" suppressHydrationWarning>
      {/* 상단 네비게이션 */}
      <header className="border-b border-gray-700 bg-gray-800">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between h-14">
            <div className="flex items-center space-x-6">
              <motion.button
                className="flex items-center space-x-2 text-green-400 hover:text-green-300"
                onClick={() => router.push('/')}
                whileHover={{ scale: 1.05 }}
              >
                <BookOpen className="w-5 h-5" />
                <span className="font-bold text-lg">{BRANDING.brandWiki}</span>
              </motion.button>
              
              <nav className="hidden md:flex items-center space-x-4 text-sm">
                <button 
                  onClick={() => router.push('/wiki')}
                  className="text-gray-300 hover:text-white px-2 py-1"
                >
                  위키
                </button>
                <button 
                  onClick={() => router.push('/wiki/recent')}
                  className="text-gray-200 hover:text-gray-100 px-2 py-1"
                >
                  최근 변경
                </button>
                <button 
                  onClick={goToRandomPage}
                  className="text-gray-200 hover:text-gray-100 px-2 py-1 flex items-center"
                >
                  특수 기능 <ChevronRight className="w-3 h-3 ml-1" />
                </button>
              </nav>
            </div>

            <div className="flex-1 max-w-md mx-4">
              <form onSubmit={handleSearch} className="relative">
                <Input
                  type="text"
                  placeholder="여기에서 검색"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pr-10 bg-gray-700 border-gray-600 text-gray-200 placeholder-gray-400 focus:border-gray-500 h-9"
                />
                <button
                  type="submit"
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-200"
                >
                  <Search className="w-4 h-4" />
                </button>
              </form>
            </div>

            <div className="flex items-center space-x-3">
              <NotificationDropdown />
              
              {/* 운영자 대시보드 버튼 (운영자만 표시) */}
              {isLoggedIn && isModerator && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => router.push('/admin')}
                  className="flex items-center space-x-1 text-yellow-400 hover:text-yellow-300 border border-yellow-400 hover:border-yellow-300 h-8"
                  title="운영자 대시보드"
                >
                  <Shield className="w-4 h-4" />
                  <span className="hidden sm:block">운영자</span>
                </Button>
              )}
              
              {isLoggedIn ? (
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-300">{wikiUser?.displayName}</span>
                  <ThemeMenu />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={logout}
                    className="text-gray-400 hover:text-gray-200 h-8"
                  >
                    <LogOut className="w-4 h-4" />
                  </Button>
                </div>
              ) : (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => router.push('/wiki/login')}
                  className="text-gray-400 hover:text-gray-200 h-8"
                >
                  정회원
                </Button>
              )}
              <Button variant="ghost" size="sm" className="text-gray-400 hover:text-gray-200 h-8">
                <Home className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* 문서 타이틀 섹션 */}
      <div className="border-b border-gray-700 bg-gray-800">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <h1 className="text-2xl font-bold text-gray-100">이랑위키:대문</h1>
              <span className="text-sm text-gray-400">{mainPageData ? `${(mainPageData.views / 1000).toFixed(1)}K` : '20K'}</span>
              <Star className="w-4 h-4 text-gray-400" />
              <button 
                onClick={handleEditMainPage}
                className="text-sm text-blue-400 hover:text-blue-300 hover:underline cursor-pointer"
              >
                편집
              </button>
              <span className="text-sm text-gray-400">역사</span>
            </div>
            <div className="text-sm text-gray-400">
              최근 수정 시간: {mainPageData ? 
                new Date(mainPageData.lastEditDate).toLocaleString('ko-KR', {
                  year: 'numeric',
                  month: '2-digit', 
                  day: '2-digit',
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit',
                  hour12: false
                }).replace(/\. /g, '.').replace(/\.$/, '') : 
                '2025.07.18 13:19:22'
              }
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* 메인 컨텐츠 */}
          <div className="lg:col-span-3 space-y-6">
            
            {/* 환영 메시지 */}
            <motion.div
              className="bg-gray-800 rounded-lg p-8 border border-gray-700 text-center"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <h2 className="text-2xl font-bold text-yellow-400 mb-4">
                여러분이 가꾸어 나가는 지식의 나무
              </h2>
              <p className="text-lg text-gray-300 mb-2">이랑위키에 오신 것을 환영합니다!</p>
              <div className="text-gray-400 space-y-1">
                <p>이랑위키는 누구나 기여할 수 있는 위키입니다.</p>
                <p>검증되지 않았거나 편향된 내용이 있을 수 있습니다.</p>
              </div>
            </motion.div>

            {/* 처음 오셨나요 섹션 */}
            <motion.div
              className="bg-gray-800 rounded-lg border border-gray-700"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
            >
              <div className="p-6">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
                    <HelpCircle className="w-5 h-5 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-200">이랑위키에 처음 오셨나요?</h3>
                </div>
                <p className="text-gray-400 mb-4">
                  먼저 <button onClick={() => router.push('/wiki/도움말')} className="text-blue-400 hover:underline">도움말</button>을 읽어 하는 방법을, <button onClick={() => router.push('/wiki/튜토리얼')} className="text-blue-400 hover:underline">튜토리얼</button>을 읽어 보세요.
                </p>
              </div>
            </motion.div>

            {/* 게시판 섹션 */}
            <motion.div
              className="bg-gray-800 rounded-lg border border-gray-700"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              <div className="p-6">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="w-10 h-10 bg-green-600 rounded-full flex items-center justify-center">
                    <MessageCircle className="w-5 h-5 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-200">이랑위키 게시판</h3>
                </div>
                <div className="flex flex-wrap gap-2">
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-green-600 text-white">● 공지</span>
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-gray-700 text-gray-300">● 자유게시판</span>
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-gray-700 text-gray-300">● 질문</span>
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-gray-700 text-gray-300">● 신규</span>
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-gray-700 text-gray-300">● 편집 요청</span>
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-gray-700 text-gray-300">● 편집 분쟁</span>
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-gray-700 text-gray-300">● 토론 요청/여론</span>
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-gray-700 text-gray-300">● 도움 요청</span>
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-gray-700 text-gray-300">● 토론 중재</span>
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-gray-700 text-gray-300">● 개발 요청</span>
                </div>
              </div>
            </motion.div>

            {/* 프로젝트 섹션 */}
            <motion.div
              className="bg-gray-800 rounded-lg border border-gray-700"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
            >
              <div className="p-6">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="w-8 h-8 bg-green-600 rounded flex items-center justify-center text-white font-bold">
                    3a
                  </div>
                  <h3 className="text-xl font-bold text-gray-200">이랑위키 프로젝트</h3>
                </div>
                <p className="text-gray-400 mb-4">프로젝트에 참여해서 관련 문서에 기여해 승격을 노려보세요!</p>
                <div className="space-y-2">
                  <p className="text-blue-400">
                    <button onClick={() => router.push('/wiki/이랑위키:학술적_프로젝트')} className="hover:underline">이랑위키 학술적 프로젝트</button>, <button onClick={() => router.push('/wiki/이랑위키:웹_개발_프로젝트')} className="hover:underline">이랑위키 웹 개발 프로젝트</button>, <button onClick={() => router.push('/wiki/이랑위키:인터넷_방송인_프로젝트')} className="hover:underline">이랑위키 인터넷 방송인 프로젝트</button>, <button onClick={() => router.push('/wiki/이랑위키:블루_아카이브_프로젝트')} className="hover:underline">이랑위키 블루 아카이브 프로젝트</button>
                  </p>
                  <button onClick={() => router.push('/wiki/프로젝트:목록')} className="text-blue-400 hover:underline">프로젝트 목록</button>
                </div>
              </div>
            </motion.div>

            {/* 규정 섹션 */}
            <motion.div
              className="bg-gray-800 rounded-lg border border-gray-700"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
            >
              <div className="p-6">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
                    <FileText className="w-5 h-5 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-200">이랑위키의 규정</h3>
                </div>
                <p className="text-gray-400">
                  기본방침 (문서 관리, 토론 관리, 이용자 관리, 운영 관리, 운영진 징계) · 편집지침 (일반 문서, 특수 문서, 특정 문서, 등재 기준, 표제어, 포매팅)
                </p>
              </div>
            </motion.div>

            {/* 도움말 섹션 */}
            <motion.div
              className="bg-gray-800 rounded-lg border border-gray-700"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.5 }}
            >
              <div className="p-6">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="w-10 h-10 bg-green-600 rounded-full flex items-center justify-center">
                    <HelpCircle className="w-5 h-5 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-200">이랑위키의 도움말</h3>
                </div>
                <p className="text-gray-400">
                  FAQ · 도움말 (기능, 편집, 문법, 심화, 수식, 개별, 토론, 설정, 소명, 권리침해, 자주 하는 실수, 문서 삭제, 다이)
                </p>
              </div>
            </motion.div>

            {/* 기능 섹션 */}
            <motion.div
              className="bg-gray-800 rounded-lg border border-gray-700"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.6 }}
            >
              <div className="p-6">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="w-10 h-10 bg-orange-600 rounded-full flex items-center justify-center">
                    <Zap className="w-5 h-5 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-200">이랑위키의 기능</h3>
                </div>
              </div>
            </motion.div>

          </div>

          {/* 우측 사이드바 */}
          <div className="space-y-6">
            
            {/* 실시간 검색어 */}
            <motion.div
              className="bg-gray-800 border border-gray-700 rounded-lg"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              <div className="p-4 border-b border-gray-700">
                <h3 className="font-bold text-gray-200 flex items-center">
                  <TrendingUp className="w-4 h-4 text-red-400 mr-2" />
                  실시간 검색어
                </h3>
              </div>
              <div className="p-4">
                <div className="space-y-2">
                  {realtimeSearch.length === 0 ? (
                    <div className="text-xs text-gray-500">실시간 인기 검색어가 없습니다.</div>
                  ) : (
                    realtimeSearch.map((item, index) => (
                      <div key={index} className="flex items-center text-sm">
                        <span className="w-6 text-gray-400 font-mono">{index + 1}</span>
                        <button
                          onClick={() => router.push(`/wiki/${encodeURIComponent(item.slug || item.title)}`)}
                          className="text-gray-300 hover:text-blue-400 hover:underline"
                        >
                          {item.title}
                        </button>
                        <span className="ml-2 text-xs text-gray-500">({item.views}회)</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </motion.div>

            {/* 최근 변경 */}
            <motion.div
              className="bg-gray-800 border border-gray-700 rounded-lg"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
            >
              <div className="p-4 border-b border-gray-700">
                <h3 className="font-bold text-gray-200 flex items-center">
                  <Clock className="w-4 h-4 text-blue-400 mr-2" />
                  최근 변경
                  <button 
                    onClick={() => router.push('/wiki/recent')}
                    className="ml-auto text-blue-400 hover:text-blue-300 text-sm flex items-center"
                  >
                    모든 변경 보기
                    <ChevronRight className="w-3 h-3 ml-1" />
                  </button>
                </h3>
              </div>
              <div className="p-4">
                <div className="space-y-3">
                  {recentChanges.length === 0 ? (
                    <div className="text-xs text-gray-500">최근 변경 내역이 없습니다.</div>
                  ) : (
                    recentChanges.map((change, index) => (
                      <div key={index} className="text-sm">
                        <button
                          onClick={() => router.push(`/wiki/${encodeURIComponent(change.slug || change.title)}`)}
                          className="text-blue-400 hover:underline block"
                        >
                          {change.title}
                        </button>
                        <div className="text-gray-500 text-xs">
                          {change.revision.author || '익명'} · {change.revision.editType || '편집'} · {change.revision.timestamp ? new Date(change.revision.timestamp).toLocaleString('ko-KR', { hour12: false }) : ''}
                        </div>
                      </div>
                    ))
                  )}
                  <div className="pt-2 border-t border-gray-700">
                    <button 
                      onClick={() => router.push('/wiki/recent')}
                      className="text-blue-400 hover:underline text-sm flex items-center w-full justify-center"
                    >
                      처음부터 끝까지 모든 변경 기록 보기
                      <ChevronRight className="w-3 h-3 ml-1" />
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* 이랑뉴스 */}
            <motion.div
              className="bg-gray-800 border border-gray-700 rounded-lg"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
            >
              <div className="p-4 border-b border-gray-700">
                <h3 className="font-bold text-gray-200 flex items-center">
                  <Bell className="w-4 h-4 text-yellow-400 mr-2" />
                  이랑뉴스
                </h3>
              </div>
              <div className="p-4">
                <div className="space-y-2">
                  {news.length === 0 ? (
                    <div className="text-xs text-gray-500">실시간 뉴스를 불러올 수 없습니다.</div>
                  ) : (
                    news.map((item, index) => (
                      <a
                        key={index}
                        href={item.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block text-xs text-orange-400 hover:text-orange-300 hover:underline cursor-pointer"
                      >
                        {item.title}
                      </a>
                    ))
                  )}
                </div>
              </div>
            </motion.div>

          </div>
        </div>
      </div>
    </div>
  )
} 
