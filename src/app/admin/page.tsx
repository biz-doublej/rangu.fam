'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Card, CardHeader, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { 
  Settings, 
  FileText, 
  Bell, 
  Users, 
  BarChart3,
  Clock,
  Ban,
  RefreshCw,
  Shield,
  LogIn,
  LogOut,
  User,
  Activity,
  TrendingUp,
  Database,
  Globe,
  Music,
  Gamepad2,
  Image,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Pause,
  Eye,
  Calendar,
  PieChart,
  Zap,
  Heart,
  Star,
  Target,
  Wifi,
  Server,
  Monitor
} from 'lucide-react'

// 컴포넌트 임포트
import DocumentManagement from './components/DocumentManagement'
import UserManagement from './components/UserManagement'
import NoticeManagement from './components/NoticeManagement'
import PageManagement from './components/PageManagement'

interface DashboardStats {
  users: {
    total: number
    active: number
    banned: number
    newToday: number
  }
  wiki: {
    totalPages: number
    pending: number
    approved: number
    rejected: number
    onhold: number
  }
  games: {
    totalScores: number
    todayPlayers: number
    topScore: number
  }
  music: {
    totalTracks: number
    totalPlays: number
    uploadsToday: number
  }
  cards: {
    totalDrops: number
    activeCollectors: number
    rareCards: number
  }
  images: {
    totalImages: number
    uploadsToday: number
    storageUsed: string
  }
  system: {
    uptime: string
    responseTime: number
    activeConnections: number
    serverLoad: number
  }
}

interface Notice {
  id: number
  title: string
  content: string
  type: string
  category: string
  author: string
  isPinned: boolean
  date: Date
}

interface PageData {
  company: { title: string; content: string }
  terms: { title: string; content: string }
  privacy: { title: string; content: string }
}

interface WikiSubmission {
  _id: string
  type: 'create' | 'edit'
  status: 'pending' | 'approved' | 'rejected' | 'onhold'
  targetTitle: string
  content: string
  author: string
  createdAt: string
  reason?: string
  editSummary?: string
}

interface WikiUser {
  _id: string
  username: string
  email: string
  role: string
  isActive: boolean
  createdAt: string
  lastActive?: string
  banStatus?: {
    isBanned: boolean
    reason: string
    bannedUntil?: string
  }
  warnings?: Array<{
    reason: string
    warnedBy: string
    warnedAt: string
  }>
}

interface AdminUser {
  id: string
  username: string
  displayName?: string
  role: string
  avatar?: string
  isAdmin: boolean
}

interface RecentActivity {
  id: string
  type: 'login' | 'edit' | 'upload' | 'game' | 'card' | 'admin'
  user: string
  action: string
  timestamp: string
  details?: any
}

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('overview')
  const [activeSubTab, setActiveSubTab] = useState('')
  
  // 인증 상태
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [currentUser, setCurrentUser] = useState<AdminUser | null>(null)
  const [loginForm, setLoginForm] = useState({ username: '', password: '' })
  
  // 데이터 상태들
  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null)
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([])
  const [notices, setNotices] = useState<Notice[]>([])
  const [pageData, setPageData] = useState<PageData | null>(null)
  const [submissions, setSubmissions] = useState<WikiSubmission[]>([])
  const [users, setUsers] = useState<WikiUser[]>([])
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [refreshInterval, setRefreshInterval] = useState<NodeJS.Timeout | null>(null)
  
  const [newNotice, setNewNotice] = useState({
    title: '',
    content: '',
    type: 'announcement',
    category: '',
    author: '',
    isPinned: false
  })

  // WikiUser 인증
  const handleLogin = async () => {
    if (!loginForm.username || !loginForm.password) {
      alert('사용자명과 비밀번호를 입력해주세요.')
      return
    }

    try {
      const response = await fetch('/api/admin/wiki-auth', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(loginForm)
      })

      const result = await response.json()

      if (response.ok) {
        localStorage.setItem('adminToken', result.token)
        setCurrentUser(result.user)
        setIsAuthenticated(true)
        setNewNotice(prev => ({ ...prev, author: result.user.username }))
        loadDashboardData()
        startAutoRefresh()
      } else {
        alert(result.error || '로그인에 실패했습니다.')
      }
    } catch (error) {
      console.error('로그인 오류:', error)
      alert('로그인 중 오류가 발생했습니다.')
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('adminToken')
    setIsAuthenticated(false)
    setCurrentUser(null)
    setLoginForm({ username: '', password: '' })
    if (refreshInterval) {
      clearInterval(refreshInterval)
      setRefreshInterval(null)
    }
  }

  const checkAuth = async () => {
    const token = localStorage.getItem('adminToken')
    if (token) {
      try {
        const response = await fetch('/api/admin/wiki-auth', {
          headers: { 'Authorization': `Bearer ${token}` }
        })

        if (response.ok) {
          const result = await response.json()
          setCurrentUser(result.user)
          setIsAuthenticated(true)
          setNewNotice(prev => ({ ...prev, author: result.user.username }))
          loadDashboardData()
          startAutoRefresh()
          return
        } else {
          localStorage.removeItem('adminToken')
        }
      } catch (error) {
        console.error('인증 확인 오류:', error)
        localStorage.removeItem('adminToken')
      }
    }

    // adminToken이 없으면 위키 쿠키를 확인
    await checkWikiAuth()
  }

  const checkWikiAuth = async () => {
    try {
      // 위키 인증 상태 확인
      const response = await fetch('/api/wiki/auth/me', {
        credentials: 'include'
      })

      if (response.ok) {
        const result = await response.json()
        const user = result.user

        // admin, moderator, owner 권한이 있는지 확인
        if (user && (user.role === 'admin' || user.role === 'moderator' || user.role === 'owner')) {
          // 위키 토큰으로 관리자 인증 진행
          const wikiToken = getCookie('wiki-token')
          if (wikiToken) {
            localStorage.setItem('adminToken', wikiToken)
            setCurrentUser({
              id: user.id,
              username: user.username,
              displayName: user.displayName || user.username,
              role: user.role,
              isAdmin: true
            })
            setIsAuthenticated(true)
            setNewNotice(prev => ({ ...prev, author: user.username }))
            loadDashboardData()
            startAutoRefresh()
          }
        }
      }
    } catch (error) {
      console.error('위키 인증 확인 오류:', error)
    }
  }

  const getCookie = (name: string): string | null => {
    const value = `; ${document.cookie}`
    const parts = value.split(`; ${name}=`)
    if (parts.length === 2) return parts.pop()?.split(';').shift() || null
    return null
  }

  // 통계 데이터 로드
  const loadDashboardStats = async () => {
    try {
      const token = localStorage.getItem('adminToken')
      if (!token) return

      const response = await fetch('/api/admin/dashboard-stats', {
        headers: { 'Authorization': `Bearer ${token}` }
      })

      if (response.ok) {
        const data = await response.json()
        setDashboardStats(data.stats)
        setRecentActivity(data.recentActivity || [])
      }
      
    } catch (error) {
      console.error('통계 로드 오류:', error)
    }
  }

  const loadDashboardData = async () => {
    try {
      const token = localStorage.getItem('adminToken')
      if (!token) {
        setIsAuthenticated(false)
        return
      }

      setLoading(true)

      // 기존 데이터 로드
      const [noticesRes, pagesRes, submissionsRes, usersRes] = await Promise.all([
        fetch('/api/admin/notices', {
          headers: { 'Authorization': `Bearer ${token}` }
        }).catch(() => null),
        fetch('/api/admin/pages', {
          headers: { 'Authorization': `Bearer ${token}` }
        }).catch(() => null),
        fetch('/api/wiki/mod', {
          headers: { 'Authorization': `Bearer ${token}` }
        }).catch(() => null),
        fetch('/api/wiki/users', {
          headers: { 'Authorization': `Bearer ${token}` }
        }).catch(() => null)
      ])

      if (noticesRes?.ok) {
        const noticesData = await noticesRes.json()
        setNotices(noticesData.notices || [])
      }

      if (pagesRes?.ok) {
        const pagesData = await pagesRes.json()
        setPageData(pagesData.data)
      }

      if (submissionsRes?.ok) {
        const submissionsData = await submissionsRes.json()
        setSubmissions(submissionsData.submissions || [])
      }

      if (usersRes?.ok) {
        const usersData = await usersRes.json()
        setUsers(usersData.users || [])
      }

      // 통계 데이터 로드
      await loadDashboardStats()

    } catch (error) {
      console.error('데이터 로드 오류:', error)
    } finally {
      setLoading(false)
    }
  }

  const startAutoRefresh = () => {
    if (refreshInterval) clearInterval(refreshInterval)
    
    const interval = setInterval(() => {
      loadDashboardStats()
    }, 30000) // 30초마다 통계 새로고침
    
    setRefreshInterval(interval)
  }

  const handleSubmissionAction = async (submissionId: string, action: 'approve' | 'reject' | 'hold', reason?: string) => {
    try {
      const response = await fetch('/api/wiki/mod', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
        },
        body: JSON.stringify({ action, submissionId, reason })
      })

      if (response.ok) {
        const result = await response.json()
        alert(result.message)
        loadDashboardData()
      } else {
        const error = await response.json()
        alert(error.error || '처리 중 오류가 발생했습니다.')
      }
    } catch (error) {
      console.error('처리 오류:', error)
      alert('처리 중 오류가 발생했습니다.')
    }
  }

  const handleUserAction = async (userId: string, action: 'ban' | 'unban' | 'warn' | 'role', data?: any) => {
    try {
      const response = await fetch('/api/wiki/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
        },
        body: JSON.stringify({ action, userId, data })
      })

      if (response.ok) {
        const result = await response.json()
        alert(result.message)
        loadDashboardData()
      } else {
        const error = await response.json()
        alert(error.error || '처리 중 오류가 발생했습니다.')
      }
    } catch (error) {
      console.error('사용자 관리 오류:', error)
      alert('사용자 관리 중 오류가 발생했습니다.')
    }
  }

  // 메뉴 구성
  const menuItems = [
    {
      id: 'overview',
      label: '대시보드 개요',
      icon: BarChart3,
      subItems: []
    },
    {
      id: 'analytics',
      label: '실시간 분석',
      icon: Activity,
      subItems: [
        { id: 'realtime', label: '실시간 현황' },
        { id: 'trends', label: '트렌드 분석' },
        { id: 'performance', label: '성능 모니터링' }
      ]
    },
    {
      id: 'documents',
      label: '문서 관리',
      icon: FileText,
      subItems: [
        { id: 'pending', label: '승인 대기', count: submissions.filter(s => s.status === 'pending').length },
        { id: 'approved', label: '승인 목록', count: submissions.filter(s => s.status === 'approved').length },
        { id: 'rejected', label: '불허 목록', count: submissions.filter(s => s.status === 'rejected').length },
        { id: 'onhold', label: '보류 목록', count: submissions.filter(s => s.status === 'onhold').length }
      ]
    },
    {
      id: 'users',
      label: '사용자 관리',
      icon: Users,
      subItems: [
        { id: 'userlist', label: '사용자 목록', count: users.length },
        { id: 'banned', label: '차단된 사용자', count: users.filter(u => u.banStatus?.isBanned).length },
        { id: 'roles', label: '권한 관리' }
      ]
    },
    {
      id: 'content',
      label: '콘텐츠 관리',
      icon: Database,
      subItems: [
        { id: 'music', label: '음악 관리' },
        { id: 'games', label: '게임 관리' },
        { id: 'cards', label: '카드 관리' },
        { id: 'images', label: '이미지 관리' }
      ]
    },
    {
      id: 'system',
      label: '시스템 관리',
      icon: Settings,
      subItems: [
        { id: 'notices', label: '공지사항 관리', count: notices.length },
        { id: 'pages', label: '페이지 관리' },
        { id: 'server', label: '서버 상태' }
      ]
    }
  ]

  useEffect(() => {
    checkAuth()
    
    return () => {
      if (refreshInterval) {
        clearInterval(refreshInterval)
      }
    }
  }, [])

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 text-gray-100 flex items-center justify-center">
        <div className="absolute inset-0 bg-black bg-opacity-30"></div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative w-full max-w-md z-10"
        >
          <Card className="bg-gray-800/90 border-gray-700 backdrop-blur-sm">
            <CardHeader>
              <div className="text-center">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                  className="inline-block"
                >
                  <Shield className="w-16 h-16 text-blue-400 mx-auto mb-4" />
                </motion.div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                  RangU 관리자 대시보드
                </h1>
                <p className="text-gray-400 mt-2">WikiUser 관리자 계정으로 로그인하세요</p>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    사용자명
                  </label>
                  <Input
                    type="text"
                    placeholder="WikiUser 사용자명"
                    value={loginForm.username}
                    onChange={(e) => setLoginForm(prev => ({ ...prev, username: e.target.value }))}
                    className="bg-gray-700/50 border-gray-600 text-gray-200 backdrop-blur-sm"
                    onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    비밀번호
                  </label>
                  <Input
                    type="password"
                    placeholder="비밀번호"
                    value={loginForm.password}
                    onChange={(e) => setLoginForm(prev => ({ ...prev, password: e.target.value }))}
                    className="bg-gray-700/50 border-gray-600 text-gray-200 backdrop-blur-sm"
                    onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                  />
                </div>
                <Button 
                  onClick={handleLogin} 
                  className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 border-0"
                >
                  <LogIn className="w-4 h-4 mr-2" />
                  관리자 로그인
                </Button>
                <div className="text-center text-sm text-gray-500">
                  WikiUser 테이블의 role이 'admin'인 계정만 접근 가능<br/>
                  또는 위키에서 admin/moderator/owner 권한으로 로그인 후 운영자 버튼 클릭
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 text-gray-100">
      <div className="absolute inset-0 bg-black bg-opacity-20"></div>
      
      <div className="relative z-10">
        {/* 상단 헤더 */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gray-800/90 backdrop-blur-sm border-b border-gray-700/50 sticky top-0 z-50"
        >
          <div className="max-w-7xl mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-3">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                  >
                    <Shield className="w-8 h-8 text-blue-400" />
                  </motion.div>
                  <div>
                    <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                      RangU 관리자 대시보드
                    </h1>
                    <p className="text-gray-400 text-sm">
                      실시간 모니터링 & 관리 시스템
                    </p>
                  </div>
                </div>
                
                {/* 실시간 상태 표시기 */}
                <div className="flex items-center gap-2 ml-8">
                  <div className="flex items-center gap-1 px-2 py-1 bg-green-600/20 rounded-full">
                    <Wifi className="w-3 h-3 text-green-400" />
                    <span className="text-xs text-green-400">온라인</span>
                  </div>
                  <div className="flex items-center gap-1 px-2 py-1 bg-blue-600/20 rounded-full">
                    <Zap className="w-3 h-3 text-blue-400" />
                    <span className="text-xs text-blue-400">
                      {dashboardStats?.system.responseTime || 0}ms
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 px-3 py-2 bg-gray-700/50 rounded-lg">
                  <User className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-300">{currentUser?.username}</span>
                  <span className="px-2 py-1 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-full text-xs">
                    {currentUser?.role}
                  </span>
                </div>
                <Button 
                  onClick={handleLogout} 
                  variant="ghost"
                  className="text-gray-400 hover:text-white hover:bg-gray-700/50"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  로그아웃
                </Button>
              </div>
            </div>
          </div>
        </motion.div>

        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="grid grid-cols-12 gap-6">
            {/* 사이드바 메뉴 */}
            <div className="col-span-3">
              <Card className="bg-gray-800/90 border-gray-700/50 backdrop-blur-sm sticky top-24">
                <CardContent className="p-4">
                  <nav className="space-y-2">
                    {menuItems.map((item) => (
                      <div key={item.id}>
                        <button
                          onClick={() => {
                            setActiveTab(item.id)
                            setActiveSubTab(item.subItems.length > 0 ? item.subItems[0].id : '')
                          }}
                          className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all duration-300 ${
                            activeTab === item.id
                              ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg shadow-blue-500/25'
                              : 'text-gray-400 hover:bg-gray-700/50 hover:text-gray-200'
                          }`}
                        >
                          <item.icon className="w-5 h-5" />
                          {item.label}
                        </button>
                        
                        {/* 서브메뉴 */}
                        {activeTab === item.id && item.subItems.length > 0 && (
                          <motion.div 
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            transition={{ duration: 0.3 }}
                            className="ml-6 mt-2 space-y-1"
                          >
                            {item.subItems.map((subItem) => (
                              <button
                                key={subItem.id}
                                onClick={() => setActiveSubTab(subItem.id)}
                                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-all duration-200 ${
                                  activeSubTab === subItem.id
                                    ? 'bg-gray-700/70 text-blue-400'
                                    : 'text-gray-500 hover:bg-gray-700/30 hover:text-gray-300'
                                }`}
                              >
                                <span>{subItem.label}</span>
                                {subItem.count !== undefined && (
                                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                                    subItem.count > 0 
                                      ? 'bg-gradient-to-r from-red-600 to-red-700 text-white' 
                                      : 'bg-gray-600 text-gray-300'
                                  }`}>
                                    {subItem.count}
                                  </span>
                                )}
                              </button>
                            ))}
                          </motion.div>
                        )}
                      </div>
                    ))}
                  </nav>
                  
                  {/* 빠른 액션 버튼들 */}
                  <div className="mt-6 pt-6 border-t border-gray-700/50">
                    <h3 className="text-sm font-medium text-gray-400 mb-3">빠른 액션</h3>
                    <div className="space-y-2">
                      <Button 
                        size="sm" 
                        className="w-full bg-green-600/20 hover:bg-green-600/30 text-green-400 border border-green-600/30"
                        onClick={() => loadDashboardData()}
                      >
                        <RefreshCw className="w-4 h-4 mr-2" />
                        새로고침
                      </Button>
                      <Button 
                        size="sm" 
                        className="w-full bg-yellow-600/20 hover:bg-yellow-600/30 text-yellow-400 border border-yellow-600/30"
                        onClick={() => {
                          setActiveTab('documents')
                          setActiveSubTab('pending')
                        }}
                      >
                        <AlertTriangle className="w-4 h-4 mr-2" />
                        승인 대기
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* 메인 콘텐츠 */}
            <div className="col-span-9">
              <AnimatePresence mode="wait">
                {loading && (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex flex-col items-center justify-center py-12"
                  >
                    <RefreshCw className="w-8 h-8 animate-spin text-blue-400 mb-4" />
                    <span className="text-gray-400">데이터를 불러오는 중...</span>
                  </motion.div>
                )}

                {/* 대시보드 개요 */}
                {activeTab === 'overview' && !loading && (
                  <DashboardOverview 
                    dashboardStats={dashboardStats}
                    recentActivity={recentActivity}
                    submissions={submissions}
                    users={users}
                    notices={notices}
                  />
                )}

                {/* 실시간 분석 */}
                {activeTab === 'analytics' && !loading && (
                  <AnalyticsDashboard 
                    dashboardStats={dashboardStats}
                    activeSubTab={activeSubTab}
                  />
                )}

                {/* 문서 관리 */}
                {activeTab === 'documents' && !loading && (
                  <DocumentManagement 
                    submissions={submissions}
                    activeSubTab={activeSubTab}
                    onSubmissionAction={handleSubmissionAction}
                    searchTerm={searchTerm}
                    setSearchTerm={setSearchTerm}
                  />
                )}

                {/* 사용자 관리 */}
                {activeTab === 'users' && !loading && (
                  <UserManagement 
                    users={users}
                    activeSubTab={activeSubTab}
                    onUserAction={handleUserAction}
                    searchTerm={searchTerm}
                    setSearchTerm={setSearchTerm}
                  />
                )}

                {/* 콘텐츠 관리 */}
                {activeTab === 'content' && !loading && (
                  <ContentManagement 
                    activeSubTab={activeSubTab}
                    dashboardStats={dashboardStats}
                  />
                )}

                {/* 시스템 관리 */}
                {activeTab === 'system' && activeSubTab === 'notices' && !loading && (
                  <NoticeManagement 
                    notices={notices}
                    setNotices={setNotices}
                    newNotice={newNotice}
                    setNewNotice={setNewNotice}
                  />
                )}

                {activeTab === 'system' && activeSubTab === 'pages' && !loading && pageData && (
                  <PageManagement pageData={pageData} />
                )}

                {activeTab === 'system' && activeSubTab === 'server' && !loading && (
                  <ServerMonitoring dashboardStats={dashboardStats} />
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// 대시보드 개요 컴포넌트
function DashboardOverview({ 
  dashboardStats, 
  recentActivity, 
  submissions, 
  users, 
  notices 
}: {
  dashboardStats: DashboardStats | null
  recentActivity: RecentActivity[]
  submissions: WikiSubmission[]
  users: WikiUser[]
  notices: Notice[]
}) {
  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'login': return <LogIn className="w-4 h-4" />
      case 'edit': return <FileText className="w-4 h-4" />
      case 'upload': return <Music className="w-4 h-4" />
      case 'game': return <Gamepad2 className="w-4 h-4" />
      case 'card': return <Star className="w-4 h-4" />
      case 'admin': return <Shield className="w-4 h-4" />
      default: return <Activity className="w-4 h-4" />
    }
  }

  const getActivityColor = (type: string) => {
    switch (type) {
      case 'login': return 'text-green-400 bg-green-400/20'
      case 'edit': return 'text-blue-400 bg-blue-400/20'
      case 'upload': return 'text-purple-400 bg-purple-400/20'
      case 'game': return 'text-yellow-400 bg-yellow-400/20'
      case 'card': return 'text-pink-400 bg-pink-400/20'
      case 'admin': return 'text-red-400 bg-red-400/20'
      default: return 'text-gray-400 bg-gray-400/20'
    }
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* 핵심 지표 카드들 */}
      <div className="grid grid-cols-4 gap-4">
        <motion.div
          whileHover={{ scale: 1.02 }}
          transition={{ type: "spring", stiffness: 300 }}
        >
          <Card className="bg-gradient-to-br from-blue-600/20 to-blue-700/20 border-blue-500/30 backdrop-blur-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-300 text-sm font-medium">총 사용자</p>
                  <p className="text-3xl font-bold text-white">
                    {dashboardStats?.users.total || users.length}
                  </p>
                  <p className="text-blue-400 text-xs mt-1">
                    활성: {dashboardStats?.users.active || 0}
                  </p>
                </div>
                <div className="relative">
                  <Users className="w-8 h-8 text-blue-400" />
                  <motion.div
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
        
        <motion.div
          whileHover={{ scale: 1.02 }}
          transition={{ type: "spring", stiffness: 300 }}
        >
          <Card className="bg-gradient-to-br from-yellow-600/20 to-yellow-700/20 border-yellow-500/30 backdrop-blur-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-yellow-300 text-sm font-medium">승인 대기</p>
                  <p className="text-3xl font-bold text-white">
                    {dashboardStats?.wiki.pending || submissions.filter(s => s.status === 'pending').length}
                  </p>
                  <p className="text-yellow-400 text-xs mt-1">
                    총 페이지: {dashboardStats?.wiki.totalPages || 0}
                  </p>
                </div>
                <div className="relative">
                  <Clock className="w-8 h-8 text-yellow-400" />
                  {(dashboardStats?.wiki.pending || 0) > 0 && (
                    <motion.div
                      animate={{ scale: [1, 1.3, 1] }}
                      transition={{ duration: 1, repeat: Infinity }}
                      className="absolute -top-1 -right-1 w-3 h-3 bg-red-400 rounded-full"
                    />
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
        
        <motion.div
          whileHover={{ scale: 1.02 }}
          transition={{ type: "spring", stiffness: 300 }}
        >
          <Card className="bg-gradient-to-br from-green-600/20 to-green-700/20 border-green-500/30 backdrop-blur-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-green-300 text-sm font-medium">시스템 상태</p>
                  <p className="text-3xl font-bold text-white">
                    {dashboardStats?.system.responseTime || 0}ms
                  </p>
                  <p className="text-green-400 text-xs mt-1">
                    서버 로드: {dashboardStats?.system.serverLoad || 0}%
                  </p>
                </div>
                <div className="relative">
                  <Server className="w-8 h-8 text-green-400" />
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                    className="absolute inset-0"
                  >
                    <div className="w-2 h-2 bg-green-400 rounded-full absolute top-0 left-1/2 transform -translate-x-1/2" />
                  </motion.div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          whileHover={{ scale: 1.02 }}
          transition={{ type: "spring", stiffness: 300 }}
        >
          <Card className="bg-gradient-to-br from-purple-600/20 to-purple-700/20 border-purple-500/30 backdrop-blur-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-purple-300 text-sm font-medium">활성 연결</p>
                  <p className="text-3xl font-bold text-white">
                    {dashboardStats?.system.activeConnections || 0}
                  </p>
                  <p className="text-purple-400 text-xs mt-1">
                    업타임: {dashboardStats?.system.uptime || '0h'}
                  </p>
                </div>
                <div className="relative">
                  <Globe className="w-8 h-8 text-purple-400" />
                  <motion.div
                    animate={{ opacity: [0.5, 1, 0.5] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="absolute inset-0 border-2 border-purple-400 rounded-full"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* 상세 통계 그리드 */}
      <div className="grid grid-cols-3 gap-6">
        {/* 위키 통계 */}
        <Card className="bg-gray-800/90 border-gray-700/50 backdrop-blur-sm">
          <CardHeader>
            <h3 className="text-lg font-semibold text-gray-200 flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-400" />
              위키 현황
            </h3>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-400">승인됨</span>
                <span className="text-green-400 font-semibold">
                  {dashboardStats?.wiki.approved || 0}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-400">거부됨</span>
                <span className="text-red-400 font-semibold">
                  {dashboardStats?.wiki.rejected || 0}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-400">보류됨</span>
                <span className="text-yellow-400 font-semibold">
                  {dashboardStats?.wiki.onhold || 0}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 콘텐츠 통계 */}
        <Card className="bg-gray-800/90 border-gray-700/50 backdrop-blur-sm">
          <CardHeader>
            <h3 className="text-lg font-semibold text-gray-200 flex items-center gap-2">
              <Database className="w-5 h-5 text-purple-400" />
              콘텐츠 현황
            </h3>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-400 flex items-center gap-1">
                  <Music className="w-4 h-4" />
                  음악 트랙
                </span>
                <span className="text-purple-400 font-semibold">
                  {dashboardStats?.music.totalTracks || 0}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-400 flex items-center gap-1">
                  <Gamepad2 className="w-4 h-4" />
                  게임 점수
                </span>
                <span className="text-yellow-400 font-semibold">
                  {dashboardStats?.games.totalScores || 0}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-400 flex items-center gap-1">
                  <Image className="w-4 h-4" />
                  이미지
                </span>
                <span className="text-green-400 font-semibold">
                  {dashboardStats?.images.totalImages || 0}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 사용자 활동 */}
        <Card className="bg-gray-800/90 border-gray-700/50 backdrop-blur-sm">
          <CardHeader>
            <h3 className="text-lg font-semibold text-gray-200 flex items-center gap-2">
              <Activity className="w-5 h-5 text-green-400" />
              사용자 활동
            </h3>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-400">신규 가입</span>
                <span className="text-blue-400 font-semibold">
                  {dashboardStats?.users.newToday || 0}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-400">차단된 사용자</span>
                <span className="text-red-400 font-semibold">
                  {dashboardStats?.users.banned || 0}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-400">오늘 게임 플레이어</span>
                <span className="text-yellow-400 font-semibold">
                  {dashboardStats?.games.todayPlayers || 0}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 최근 활동 */}
      <Card className="bg-gray-800/90 border-gray-700/50 backdrop-blur-sm">
        <CardHeader>
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-200 flex items-center gap-2">
              <Activity className="w-5 h-5 text-blue-400" />
              실시간 활동
            </h2>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {/* 새로고침 로직 */}}
              className="text-gray-400 hover:text-gray-200"
            >
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 max-h-80 overflow-y-auto">
            {recentActivity.map((activity, index) => (
              <motion.div
                key={activity.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="flex items-center gap-4 p-3 bg-gray-700/50 rounded-lg hover:bg-gray-700/70 transition-colors"
              >
                <div className={`p-2 rounded-full ${getActivityColor(activity.type)}`}>
                  {getActivityIcon(activity.type)}
                </div>
                <div className="flex-1">
                  <p className="text-gray-200 font-medium">{activity.action}</p>
                  <p className="text-gray-400 text-sm">
                    {activity.user} • {new Date(activity.timestamp).toLocaleString('ko-KR', {
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit'
                    })}
                  </p>
                </div>
                <div className="flex items-center gap-1 text-gray-400">
                  <Clock className="w-3 h-3" />
                  <span className="text-xs">
                    {Math.floor((Date.now() - new Date(activity.timestamp).getTime()) / 60000)}분 전
                  </span>
                </div>
              </motion.div>
            ))}
            {recentActivity.length === 0 && (
              <div className="text-center py-8 text-gray-400">
                <Activity className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>최근 활동이 없습니다.</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

// 실시간 분석 컴포넌트
function AnalyticsDashboard({ dashboardStats, activeSubTab }: {
  dashboardStats: DashboardStats | null
  activeSubTab: string
}) {
  const [timeRange, setTimeRange] = useState('24h')
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-200 flex items-center gap-2">
          <BarChart3 className="w-6 h-6 text-blue-400" />
          실시간 분석
        </h2>
        <div className="flex gap-2">
          {['1h', '24h', '7d', '30d'].map((range) => (
            <Button
              key={range}
              size="sm"
              variant={timeRange === range ? "primary" : "ghost"}
              onClick={() => setTimeRange(range)}
              className={timeRange === range ? "bg-blue-600" : "text-gray-400"}
            >
              {range}
            </Button>
          ))}
        </div>
      </div>

      {activeSubTab === 'realtime' && (
        <div className="grid grid-cols-2 gap-6">
          <Card className="bg-gray-800/90 border-gray-700/50 backdrop-blur-sm">
            <CardHeader>
              <h3 className="text-lg font-semibold text-gray-200">실시간 트래픽</h3>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">동시 접속자</span>
                  <span className="text-2xl font-bold text-blue-400">
                    {dashboardStats?.system.activeConnections || 0}
                  </span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-2">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min((dashboardStats?.system.activeConnections || 0) / 50 * 100, 100)}%` }}
                    className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-800/90 border-gray-700/50 backdrop-blur-sm">
            <CardHeader>
              <h3 className="text-lg font-semibold text-gray-200">시스템 성능</h3>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">응답 시간</span>
                  <span className="text-2xl font-bold text-green-400">
                    {dashboardStats?.system.responseTime || 0}ms
                  </span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-2">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min((dashboardStats?.system.responseTime || 0) / 200 * 100, 100)}%` }}
                    className="bg-gradient-to-r from-green-500 to-blue-500 h-2 rounded-full"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {activeSubTab === 'trends' && (
        <div className="grid grid-cols-1 gap-6">
          <Card className="bg-gray-800/90 border-gray-700/50 backdrop-blur-sm">
            <CardHeader>
              <h3 className="text-lg font-semibold text-gray-200">사용자 활동 트렌드</h3>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-400">
                    {dashboardStats?.users.total || 0}
                  </div>
                  <div className="text-sm text-gray-400">총 사용자</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-400">
                    {dashboardStats?.wiki.approved || 0}
                  </div>
                  <div className="text-sm text-gray-400">승인된 문서</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-400">
                    {dashboardStats?.music.totalTracks || 0}
                  </div>
                  <div className="text-sm text-gray-400">음악 트랙</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-yellow-400">
                    {dashboardStats?.games.totalScores || 0}
                  </div>
                  <div className="text-sm text-gray-400">게임 점수</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {activeSubTab === 'performance' && (
        <div className="grid grid-cols-1 gap-6">
          <Card className="bg-gray-800/90 border-gray-700/50 backdrop-blur-sm">
            <CardHeader>
              <h3 className="text-lg font-semibold text-gray-200">성능 모니터링</h3>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-6">
                <div className="text-center p-4 bg-gray-700/50 rounded-lg">
                  <Server className="w-8 h-8 text-blue-400 mx-auto mb-2" />
                  <div className="text-lg font-bold text-white">
                    {dashboardStats?.system.serverLoad || 0}%
                  </div>
                  <div className="text-sm text-gray-400">서버 로드</div>
                </div>
                <div className="text-center p-4 bg-gray-700/50 rounded-lg">
                  <Monitor className="w-8 h-8 text-green-400 mx-auto mb-2" />
                  <div className="text-lg font-bold text-white">
                    {dashboardStats?.system.responseTime || 0}ms
                  </div>
                  <div className="text-sm text-gray-400">응답 시간</div>
                </div>
                <div className="text-center p-4 bg-gray-700/50 rounded-lg">
                  <Wifi className="w-8 h-8 text-purple-400 mx-auto mb-2" />
                  <div className="text-lg font-bold text-white">
                    {dashboardStats?.system.uptime || '0h'}
                  </div>
                  <div className="text-sm text-gray-400">업타임</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </motion.div>
  )
}

// 콘텐츠 관리 컴포넌트
function ContentManagement({ activeSubTab, dashboardStats }: {
  activeSubTab: string
  dashboardStats: DashboardStats | null
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-200 flex items-center gap-2">
          <Database className="w-6 h-6 text-purple-400" />
          콘텐츠 관리
        </h2>
      </div>

      {activeSubTab === 'music' && (
        <div className="grid grid-cols-1 gap-6">
          <Card className="bg-gray-800/90 border-gray-700/50 backdrop-blur-sm">
            <CardHeader>
              <h3 className="text-lg font-semibold text-gray-200 flex items-center gap-2">
                <Music className="w-5 h-5 text-purple-400" />
                음악 라이브러리
              </h3>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center p-4 bg-gray-700/50 rounded-lg">
                  <div className="text-2xl font-bold text-purple-400">
                    {dashboardStats?.music.totalTracks || 0}
                  </div>
                  <div className="text-sm text-gray-400">총 트랙 수</div>
                </div>
                <div className="text-center p-4 bg-gray-700/50 rounded-lg">
                  <div className="text-2xl font-bold text-green-400">
                    {dashboardStats?.music.totalPlays || 0}
                  </div>
                  <div className="text-sm text-gray-400">총 재생 수</div>
                </div>
                <div className="text-center p-4 bg-gray-700/50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-400">
                    {dashboardStats?.music.uploadsToday || 0}
                  </div>
                  <div className="text-sm text-gray-400">오늘 업로드</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {activeSubTab === 'games' && (
        <div className="grid grid-cols-1 gap-6">
          <Card className="bg-gray-800/90 border-gray-700/50 backdrop-blur-sm">
            <CardHeader>
              <h3 className="text-lg font-semibold text-gray-200 flex items-center gap-2">
                <Gamepad2 className="w-5 h-5 text-yellow-400" />
                게임 시스템
              </h3>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center p-4 bg-gray-700/50 rounded-lg">
                  <div className="text-2xl font-bold text-yellow-400">
                    {dashboardStats?.games.totalScores || 0}
                  </div>
                  <div className="text-sm text-gray-400">총 점수 기록</div>
                </div>
                <div className="text-center p-4 bg-gray-700/50 rounded-lg">
                  <div className="text-2xl font-bold text-green-400">
                    {dashboardStats?.games.todayPlayers || 0}
                  </div>
                  <div className="text-sm text-gray-400">오늘 플레이어</div>
                </div>
                <div className="text-center p-4 bg-gray-700/50 rounded-lg">
                  <div className="text-2xl font-bold text-red-400">
                    {dashboardStats?.games.topScore || 0}
                  </div>
                  <div className="text-sm text-gray-400">최고 점수</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {activeSubTab === 'cards' && (
        <div className="grid grid-cols-1 gap-6">
          <Card className="bg-gray-800/90 border-gray-700/50 backdrop-blur-sm">
            <CardHeader>
              <h3 className="text-lg font-semibold text-gray-200 flex items-center gap-2">
                <Star className="w-5 h-5 text-pink-400" />
                카드 컬렉션
              </h3>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center p-4 bg-gray-700/50 rounded-lg">
                  <div className="text-2xl font-bold text-pink-400">
                    {dashboardStats?.cards.totalDrops || 0}
                  </div>
                  <div className="text-sm text-gray-400">총 드랍 수</div>
                </div>
                <div className="text-center p-4 bg-gray-700/50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-400">
                    {dashboardStats?.cards.activeCollectors || 0}
                  </div>
                  <div className="text-sm text-gray-400">활성 수집가</div>
                </div>
                <div className="text-center p-4 bg-gray-700/50 rounded-lg">
                  <div className="text-2xl font-bold text-yellow-400">
                    {dashboardStats?.cards.rareCards || 0}
                  </div>
                  <div className="text-sm text-gray-400">레어 카드</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {activeSubTab === 'images' && (
        <div className="grid grid-cols-1 gap-6">
          <Card className="bg-gray-800/90 border-gray-700/50 backdrop-blur-sm">
            <CardHeader>
              <h3 className="text-lg font-semibold text-gray-200 flex items-center gap-2">
                <Image className="w-5 h-5 text-green-400" />
                이미지 관리
              </h3>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center p-4 bg-gray-700/50 rounded-lg">
                  <div className="text-2xl font-bold text-green-400">
                    {dashboardStats?.images.totalImages || 0}
                  </div>
                  <div className="text-sm text-gray-400">총 이미지 수</div>
                </div>
                <div className="text-center p-4 bg-gray-700/50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-400">
                    {dashboardStats?.images.uploadsToday || 0}
                  </div>
                  <div className="text-sm text-gray-400">오늘 업로드</div>
                </div>
                <div className="text-center p-4 bg-gray-700/50 rounded-lg">
                  <div className="text-2xl font-bold text-purple-400">
                    {dashboardStats?.images.storageUsed || '0 MB'}
                  </div>
                  <div className="text-sm text-gray-400">사용 용량</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </motion.div>
  )
}

// 서버 모니터링 컴포넌트
function ServerMonitoring({ dashboardStats }: {
  dashboardStats: DashboardStats | null
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-200 flex items-center gap-2">
          <Server className="w-6 h-6 text-green-400" />
          서버 모니터링
        </h2>
        <div className="flex items-center gap-2 px-3 py-1 bg-green-600/20 rounded-full">
          <motion.div
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="w-2 h-2 bg-green-400 rounded-full"
          />
          <span className="text-green-400 text-sm">시스템 정상</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <Card className="bg-gray-800/90 border-gray-700/50 backdrop-blur-sm">
          <CardHeader>
            <h3 className="text-lg font-semibold text-gray-200">시스템 리소스</h3>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-gray-400">서버 로드</span>
                  <span className="text-white">{dashboardStats?.system.serverLoad || 0}%</span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-2">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${dashboardStats?.system.serverLoad || 0}%` }}
                    className="bg-gradient-to-r from-green-500 to-yellow-500 h-2 rounded-full"
                  />
                </div>
              </div>
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-gray-400">응답 시간</span>
                  <span className="text-white">{dashboardStats?.system.responseTime || 0}ms</span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-2">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min((dashboardStats?.system.responseTime || 0) / 200 * 100, 100)}%` }}
                    className="bg-gradient-to-r from-blue-500 to-green-500 h-2 rounded-full"
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-800/90 border-gray-700/50 backdrop-blur-sm">
          <CardHeader>
            <h3 className="text-lg font-semibold text-gray-200">네트워크 상태</h3>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between">
                <span className="text-gray-400">활성 연결</span>
                <span className="text-blue-400 font-semibold">
                  {dashboardStats?.system.activeConnections || 0}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">업타임</span>
                <span className="text-green-400 font-semibold">
                  {dashboardStats?.system.uptime || '0h'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">상태</span>
                <span className="text-green-400 font-semibold flex items-center gap-1">
                  <CheckCircle className="w-4 h-4" />
                  정상
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </motion.div>
  )
}