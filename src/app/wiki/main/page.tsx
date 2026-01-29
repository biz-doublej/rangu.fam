'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Search, Edit, History, MessageSquare, Star, Clock, 
  Users, FileText, Settings, AlertCircle, HelpCircle,
  Shield, Gavel, CheckCircle, TrendingUp,
  BookOpen, Archive, Folder, BarChart3, Globe,
  ArrowLeft, ChevronRight, ExternalLink, Hash, Zap,
  User, UserPlus, LogIn, LogOut, MessageCircle
} from 'lucide-react'
import { Card, CardHeader, CardContent, CardFooter } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { NotificationDropdown } from '@/components/ui/NotificationDropdown'
import { formatDate } from '@/lib/utils'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { useWikiAuth } from '@/contexts/WikiAuthContext'

// 더미 데이터
const RECENT_CHANGES = [
  { title: 'BIRDBRAIN', editor: 'admin', time: new Date('2024-01-20T14:30:00'), type: '편집' },
  { title: '2025-26 AFC 여자 챔피언스 리그', editor: 'user1', time: new Date('2024-01-20T13:15:00'), type: '생성' },
  { title: '라바넬 대마스/신수 김명/2025년', editor: 'user2', time: new Date('2024-01-20T12:45:00'), type: '편집' },
  { title: '프레야 비헤인드 시원', editor: 'user3', time: new Date('2024-01-20T11:20:00'), type: '편집' },
  { title: 'DORIDORI', editor: 'user4', time: new Date('2024-01-19T16:30:00'), type: '편집' }
]

const TRENDING_SEARCHES = [
  'BIRDBRAIN', '2025-26 AFC 여자 챔피언스 리그', '라바넬 대마스/신수 김명/2025년', 
  '프레야 비헤인드 시원', 'DORIDORI', '첫 번째 키스', '순준호(축구선수)', 
  '유코', '메킨 더 게더링/용량', '만 나이'
]

export default function WikiMainPage() {
  const router = useRouter()
  const { user, isLoggedIn } = useAuth()
  const { wikiUser, isLoggedIn: isWikiLoggedIn, isModerator } = useWikiAuth()
  const [searchQuery, setSearchQuery] = useState('')
  const [currentTime, setCurrentTime] = useState(new Date())
  const [mainPageData, setMainPageData] = useState<{
    lastEditDate: string;
    lastEditor: string;
    views: number;
  } | null>(null)

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000)
    return () => clearInterval(timer)
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
            views: data.latestEdit.views || 20000 // API에서 제공되지 않으면 기본값
          })
        }
      } catch (error) {
        console.error('Failed to fetch latest edit data:', error)
        // Keep default null state if fetch fails
      }
    }

    fetchLatestEditData()
  }, [])

  // 편집 페이지로 이동 (관리자만 가능)
  const handleEditMainPage = () => {
    if (!isWikiLoggedIn) {
      router.push('/wiki/login')
      return
    }
    
    if (!isModerator) {
      alert('나무위키:대문은 관리자만 편집할 수 있습니다.')
      return
    }
    
    router.push('/wiki/나무위키:대문')
  }

  return (
    <div className="min-h-screen theme-surface text-gray-100">
      {/* 상단 네비게이션 */}
      <header className="bg-gray-800 border-b border-gray-700 sticky top-0 z-50">
        <div className="max-w-full mx-auto">
          {/* 메인 네비게이션 */}
          <div className="flex items-center justify-between px-6 py-3">
            <div className="flex items-center space-x-6">
              <div className="flex items-center space-x-2">
                <span className="text-2xl">🌳</span>
                <span className="text-xl font-bold text-white">나무위키</span>
              </div>
              
              <nav className="flex items-center space-x-4">
                <Button variant="ghost" size="sm" className="text-green-400 font-medium hover:text-green-300">
                  위키
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="text-gray-300 hover:text-white"
                  onClick={() => router.push('/wiki/recent')}
                >
                  <MessageSquare className="w-4 h-4 mr-1" />
                  최근 변경
                </Button>
                <div className="relative group">
                  <Button variant="ghost" size="sm" className="text-gray-300 hover:text-white">
                    <Settings className="w-4 h-4 mr-1" />
                    특수 기능
                    <ChevronRight className="w-3 h-3 ml-1" />
                  </Button>
                  <div className="absolute top-full left-0 mt-1 w-64 bg-gray-800 border border-gray-600 rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-10">
                    <div className="p-2 grid grid-cols-2 gap-1 text-xs">
                      <button className="p-2 hover:bg-gray-700 rounded text-left text-gray-300">게시판</button>
                      <button className="p-2 hover:bg-gray-700 rounded text-left text-gray-300">파일 올리기</button>
                      <button className="p-2 hover:bg-gray-700 rounded text-left text-gray-300">작성이 필요한 문서</button>
                      <button className="p-2 hover:bg-gray-700 rounded text-left text-gray-300">고립된 문서</button>
                      <button className="p-2 hover:bg-gray-700 rounded text-left text-gray-300">분류가 없는 문서</button>
                      <button className="p-2 hover:bg-gray-700 rounded text-left text-gray-300">편집이 오래된 문서</button>
                      <button className="p-2 hover:bg-gray-700 rounded text-left text-gray-300">내용이 짧은 문서</button>
                      <button className="p-2 hover:bg-gray-700 rounded text-left text-gray-300">내용이 긴 문서</button>
                      <button className="p-2 hover:bg-gray-700 rounded text-left text-gray-300">RandomPage</button>
                      <button className="p-2 hover:bg-gray-700 rounded text-left text-gray-300">라이선스</button>
                    </div>
                  </div>
                </div>
              </nav>
            </div>
            
            <div className="flex items-center space-x-4">
              {/* 검색창 */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  type="text"
                  placeholder="여기에서 검색"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 w-80 bg-gray-700 border-gray-600 text-white placeholder-gray-400"
                />
              </div>

              {/* 알림 */}
              <NotificationDropdown />

              {/* 로그인/프로필 */}
              {isLoggedIn ? (
                <div className="flex items-center space-x-2">
                  <Button variant="ghost" size="sm" className="text-gray-300 hover:text-white">
                    <User className="w-4 h-4 mr-1" />
                    {user?.username}
                  </Button>
                  <Button variant="ghost" size="sm" className="text-gray-300 hover:text-white" onClick={() => router.push('/')}>
                    <ArrowLeft className="w-4 h-4 mr-1" />
                    홈
                  </Button>
                </div>
              ) : (
                <div className="flex items-center space-x-2">
                  <Button variant="ghost" size="sm" className="text-gray-300 hover:text-white" onClick={() => router.push('/login')}>
                    <LogIn className="w-4 h-4 mr-1" />
                    로그인
                  </Button>
                  <Button variant="ghost" size="sm" className="text-gray-300 hover:text-white">
                    <UserPlus className="w-4 h-4 mr-1" />
                    회원가입
                  </Button>
                  <Button variant="ghost" size="sm" className="text-gray-300 hover:text-white" onClick={() => router.push('/')}>
                    <ArrowLeft className="w-4 h-4 mr-1" />
                    홈
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* 페이지 헤더 */}
          <div className="px-6 py-4 border-t border-gray-700">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <h1 className="text-2xl font-bold text-white">나무위키:대문</h1>
                <div className="text-sm bg-gray-700 px-2 py-1 rounded">
                  {mainPageData ? `${(mainPageData.views / 1000).toFixed(1)}K` : '20K'}
                </div>
                <div className="flex items-center space-x-2">
                  <Button variant="ghost" size="sm" className="text-gray-300 hover:text-white">
                    <Star className="w-4 h-4" />
                  </Button>
                  {isLoggedIn && (
                    <>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="text-gray-300 hover:text-white"
                        onClick={handleEditMainPage}
                      >
                        <Edit className="w-4 h-4" />
                        편집
                      </Button>
                    </>
                  )}
                  <Button variant="ghost" size="sm" className="text-gray-300 hover:text-white">
                    <History className="w-4 h-4" />
                    역사
                  </Button>
                </div>
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
      </header>

      {/* 메인 콘텐츠 */}
      <main className="max-w-full mx-auto px-6 py-8">
        <div className="grid grid-cols-4 gap-8">
          {/* 좌측 메인 콘텐츠 (3/4 차지) */}
          <div className="col-span-3 space-y-6">
            {/* 나무위키:대문 환영 메시지 */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <div className="bg-gray-800 border border-gray-700 rounded-lg p-8 text-center">
                <h2 className="text-2xl font-bold text-yellow-400 mb-4">
                  여러분이 가꾸어 나가는 지식의 나무
                </h2>
                <p className="text-gray-300 mb-2">
                  <strong>나무위키</strong>에 오신 것을 환영합니다!
                </p>
                <p className="text-gray-400 mb-6">
                  나무위키는 누구나 기여할 수 있는 위키입니다.<br/>
                  검증되지 않았거나 편집된 내용이 있을 수 있습니다.
                </p>
              </div>
            </motion.div>

            {/* 위키에 처음 오셨나요? */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
            >
              <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
                <div className="flex items-start space-x-4">
                  <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center">
                    <HelpCircle className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-2">나무위키에 처음 오셨나요?</h3>
                    <p className="text-gray-300 text-sm">
                      먼저 <span className="text-blue-400">나무위키의 규정</span>과 <span className="text-blue-400">CCL 위반</span> 등 자주 하는 실수, <span className="text-blue-400">도움말</span>을 확인해 보세요.
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* 나무위키 게시판 */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
                <div className="flex items-start space-x-4">
                  <div className="w-12 h-12 bg-green-600 rounded-full flex items-center justify-center">
                    <MessageCircle className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-2">나무위키 게시판</h3>
                    <div className="text-sm space-y-1">
                      <div>
                        <span className="text-green-400">🟢 자유게시판</span> · 
                        <span className="text-green-400"> 🟢 문의</span> · 
                        <span className="text-green-400"> 🟢 신고</span> · 
                        <span className="text-green-400"> 🟢 편집 요청</span> · 
                        <span className="text-green-400"> 🟢 차단 소명/해제 요청</span> · 
                        <span className="text-green-400"> 🟢 토론 중재 요청</span> · 
                        <span className="text-green-400"> 🟢 토론 문의</span> · 
                        <span className="text-green-400"> 🟢 개발 문의</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* 나무위키의 규정 */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
            >
              <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                    <Shield className="w-4 h-4 text-white" />
                  </div>
                  <h3 className="text-lg font-semibold text-white">나무위키의 규정</h3>
                </div>
                <div className="text-sm text-gray-300">
                  <span className="text-blue-400">기본방침</span> (문서 관리, 토론 관리, 이용자 관리, 운영 관리, 운영진 선출) · <span className="text-blue-400">편집지침</span> (일반 문서, 특수 문서, 특정 분야, 등재 기준, 표제어)
                </div>
              </div>
            </motion.div>

            {/* 나무위키의 도움말 */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.5 }}
            >
              <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center">
                    <HelpCircle className="w-4 h-4 text-white" />
                  </div>
                  <h3 className="text-lg font-semibold text-white">나무위키의 도움말</h3>
                </div>
                <div className="text-sm text-gray-300">
                  <span className="text-blue-400">FAQ</span> · <span className="text-blue-400">도움말</span> (기능, 편집, 문법, 심화, 수식, 개발, 토론, 설정, 소명, 권리침해, 자주 하는 실수, 문서 삭제, 더미)
                </div>
              </div>
            </motion.div>

            {/* 나무위키의 기능 */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.6 }}
            >
              <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="w-8 h-8 bg-orange-600 rounded-full flex items-center justify-center">
                    <Zap className="w-4 h-4 text-white" />
                  </div>
                  <h3 className="text-lg font-semibold text-white">나무위키의 기능</h3>
                </div>
                <div className="text-sm text-gray-300">
                  <span className="text-blue-400">분류</span> · <span className="text-blue-400">게시판</span> · <span className="text-blue-400">엔진(업데이트)</span> · <span className="text-blue-400">계정</span> · <span className="text-blue-400">통계</span> · <span className="text-blue-400">연습장</span> · <span className="text-blue-400">내 문서함</span> · <span className="text-blue-400">문서 작성 요청</span>
                </div>
              </div>
            </motion.div>

            {/* 나무위키의 분류 */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.7 }}
            >
              <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="w-8 h-8 bg-teal-600 rounded-full flex items-center justify-center">
                    <Folder className="w-4 h-4 text-white" />
                  </div>
                  <h3 className="text-lg font-semibold text-white">나무위키의 분류</h3>
                </div>
                <div className="text-sm text-gray-300">
                  <span className="text-blue-400">주요 페이지 링크</span> · <span className="text-blue-400">보존문서</span> · <span className="text-blue-400">파일</span> · <span className="text-blue-400">틀</span> · <span className="text-blue-400">템플릿</span>
                </div>
              </div>
            </motion.div>

            {/* 주요 운영 알림 */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.8 }}
            >
              <div className="bg-gray-800 border border-gray-700 rounded-lg p-6 border-red-600">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="w-8 h-8 bg-red-600 rounded-full flex items-center justify-center">
                    <AlertCircle className="w-4 h-4 text-white" />
                  </div>
                  <h3 className="text-lg font-semibold text-red-400">주요 운영 알림</h3>
                </div>
                <div className="text-sm text-gray-300">
                  <span className="text-red-400">권리침해 문의</span> · <span className="text-red-400">중재 제도</span> · <span className="text-orange-400">운영진 지원</span> (상시 모집 중)
                </div>
              </div>
            </motion.div>


          </div>

          {/* 우측 사이드바 (1/4 차지) */}
          <div className="col-span-1 space-y-6">
            {/* 실시간 검색어 */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
            >
              <div className="bg-gray-800 border border-gray-700 rounded-lg">
                <div className="px-4 py-3 border-b border-gray-700">
                  <div className="flex items-center space-x-2">
                    <TrendingUp className="w-4 h-4 text-red-500" />
                    <h3 className="font-semibold text-white">실시간 검색어</h3>
                  </div>
                </div>
                <div className="p-3">
                  <div className="space-y-2">
                    {TRENDING_SEARCHES.slice(0, 10).map((term, index) => (
                      <div key={term} className="flex items-center space-x-2 text-sm">
                        <span className={`w-4 h-4 text-xs flex items-center justify-center rounded ${
                          index < 3 ? 'bg-red-500 text-white' : 'bg-gray-600 text-gray-300'
                        }`}>
                          {index + 1}
                        </span>
                        <button className="text-gray-300 hover:text-blue-400 transition-colors truncate text-left">
                          {term}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>

            {/* 최근 변경 */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
            >
              <div className="bg-gray-800 border border-gray-700 rounded-lg">
                <div className="px-4 py-3 border-b border-gray-700">
                  <div className="flex items-center space-x-2">
                    <Clock className="w-4 h-4 text-blue-400" />
                    <h3 className="font-semibold text-white">최근 변경</h3>
                    <ChevronRight className="w-4 h-4 text-gray-400" />
                  </div>
                </div>
                <div className="p-3">
                  <div className="space-y-3">
                    {RECENT_CHANGES.slice(0, 5).map((change, index) => (
                      <div key={index} className="text-sm">
                        <div className="flex items-center justify-between mb-1">
                          <button className="text-blue-400 hover:underline font-medium truncate">
                            {change.title}
                          </button>
                          <span className={`px-1 py-0.5 text-xs rounded ${
                            change.type === '생성' ? 'bg-green-600 text-white' : 'bg-blue-600 text-white'
                          }`}>
                            {change.type}
                          </span>
                        </div>
                        <div className="text-gray-400 text-xs">
                          {change.editor} · {formatDate.relative(change.time)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>

          </div>
        </div>
      </main>
    </div>
  )
} 
