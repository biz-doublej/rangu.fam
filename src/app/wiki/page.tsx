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
  Zap
} from 'lucide-react'
import { Card, CardHeader, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useWikiAuth } from '@/contexts/WikiAuthContext'

export default function WikiMainPage() {
  const router = useRouter()
  const { wikiUser, isLoggedIn, logout } = useWikiAuth()
  const [searchQuery, setSearchQuery] = useState('')
  
  // 실시간 검색어 (더미 데이터)
  const [realtimeSearch, setRealtimeSearch] = useState([
    'RANGU.FAM',
    '2025-26 Next.js',
    'React 개발가이드',
    'TypeScript 팁',
    'MongoDB 연동',
    '위키 편집법',
    '개발환경 설정',
    'Framer Motion',
    'Tailwind CSS',
    '프론트엔드'
  ])

  // 최근 변경 문서 (더미 데이터)
  const [recentChanges, setRecentChanges] = useState([
    { title: 'RANGU.FAM', editor: 'admin', time: '1분 전', type: '편집' },
    { title: '2025-26 Next.js 가이드', editor: 'jaewon', time: '5분 전', type: '편집' },
    { title: 'React 개발 가이드', editor: 'minseok', time: '10분 전', type: '편집' },
    { title: 'TypeScript 기초', editor: 'user3', time: '15분 전', type: '편집' },
    { title: 'MongoDB 연동법', editor: 'user4', time: '20분 전', type: '편집' }
  ])

  // 이랑뉴스 (더미 데이터) 
  const [news, setNews] = useState([
    '"새해 지역에 가져갈 출간..."서울교통공단"',
    '"내가 고라니? 김명화, 망실한 한 총구 관..."',
    '"억대 근현근 기도 연기 위...우킹"',
    '"적인 수술기, 삼픙 부칠 시연에 관련..."',
    '"고슈 수술기, 삼픙 부칠 시연에 관련..."'
  ])

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

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100">
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
                <span className="font-bold text-lg">이랑위키</span>
              </motion.button>
              
              <nav className="hidden md:flex items-center space-x-4 text-sm">
                <button 
                  onClick={() => router.push('/wiki')}
                  className="text-gray-300 hover:text-white px-2 py-1"
                >
                  위키
                </button>
                <button className="text-gray-400 hover:text-gray-300 px-2 py-1">최근 변경</button>
                <button className="text-gray-400 hover:text-gray-300 px-2 py-1">최근 토론</button>
                <button 
                  onClick={goToRandomPage}
                  className="text-gray-400 hover:text-gray-300 px-2 py-1 flex items-center"
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
              <Bell className="w-4 h-4 text-gray-400" />
              {isLoggedIn ? (
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-300">{wikiUser?.displayName}</span>
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
              <span className="text-sm text-gray-400">20K</span>
              <Star className="w-4 h-4 text-gray-400" />
              <span className="text-sm text-blue-400">편집</span>
              <span className="text-sm text-gray-400">토론</span>
              <span className="text-sm text-gray-400">역사</span>
            </div>
            <div className="text-sm text-gray-400">
              최근 수정 시간: 2025.07.18 13:19:22
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
                  {realtimeSearch.slice(0, 10).map((keyword, index) => (
                    <div key={index} className="flex items-center text-sm">
                      <span className="w-6 text-gray-400 font-mono">{index + 1}</span>
                      <button 
                        onClick={() => router.push(`/wiki/${encodeURIComponent(keyword)}`)}
                        className="text-gray-300 hover:text-blue-400 hover:underline"
                      >
                        {keyword}
                      </button>
                    </div>
                  ))}
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
                  최근 변경 <ChevronRight className="w-3 h-3 ml-auto" />
                </h3>
              </div>
              <div className="p-4">
                <div className="space-y-3">
                  {recentChanges.map((change, index) => (
                    <div key={index} className="text-sm">
                      <button 
                        onClick={() => router.push(`/wiki/${encodeURIComponent(change.title)}`)}
                        className="text-blue-400 hover:underline block"
                      >
                        {change.title}
                      </button>
                      <div className="text-gray-500 text-xs">
                        {change.editor} · {change.time}
                      </div>
                    </div>
                  ))}
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
                  {news.map((item, index) => (
                    <div key={index} className="text-xs text-orange-400 hover:text-orange-300 cursor-pointer">
                      "{item}"
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>

          </div>
        </div>
      </div>
    </div>
  )
} 