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
  User
} from 'lucide-react'
import DocumentManagement from './components/DocumentManagement'
import UserManagement from './components/UserManagement'
import NoticeManagement from './components/NoticeManagement'
import PageManagement from './components/PageManagement'

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

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('overview')
  const [activeSubTab, setActiveSubTab] = useState('')
  
  // 인증 상태
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [currentUser, setCurrentUser] = useState<AdminUser | null>(null)
  const [loginForm, setLoginForm] = useState({ username: '', password: '' })
  
  // 데이터 상태들
  const [notices, setNotices] = useState<Notice[]>([])
  const [pageData, setPageData] = useState<PageData | null>(null)
  const [submissions, setSubmissions] = useState<WikiSubmission[]>([])
  const [users, setUsers] = useState<WikiUser[]>([])
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  
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
        loadData()
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
  }

  const checkAuth = async () => {
    const token = localStorage.getItem('adminToken')
    if (!token) return

    try {
      const response = await fetch('/api/admin/wiki-auth', {
        headers: { 'Authorization': `Bearer ${token}` }
      })

      if (response.ok) {
        const result = await response.json()
        setCurrentUser(result.user)
        setIsAuthenticated(true)
        setNewNotice(prev => ({ ...prev, author: result.user.username }))
        loadData()
      } else {
        localStorage.removeItem('adminToken')
      }
    } catch (error) {
      console.error('인증 확인 오류:', error)
      localStorage.removeItem('adminToken')
    }
  }

  const loadData = async () => {
    try {
      const token = localStorage.getItem('adminToken')
      if (!token) {
        setIsAuthenticated(false)
        return
      }

      setLoading(true)

      // 모든 데이터 병렬 로드
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

    } catch (error) {
      console.error('데이터 로드 오류:', error)
    } finally {
      setLoading(false)
    }
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
        loadData() // 새로고침
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
        loadData() // 새로고침
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
      id: 'system',
      label: '시스템 관리',
      icon: Settings,
      subItems: [
        { id: 'notices', label: '공지사항 관리', count: notices.length },
        { id: 'pages', label: '페이지 관리' }
      ]
    }
  ]

  useEffect(() => {
    checkAuth()
  }, [])

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-900 text-gray-100 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md"
        >
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <div className="text-center">
                <Shield className="w-12 h-12 text-blue-500 mx-auto mb-4" />
                <h1 className="text-2xl font-bold text-gray-200">관리자 로그인</h1>
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
                    className="bg-gray-700 border-gray-600 text-gray-200"
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
                    className="bg-gray-700 border-gray-600 text-gray-200"
                    onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                  />
                </div>
                <Button onClick={handleLogin} className="w-full bg-blue-600 hover:bg-blue-700">
                  <LogIn className="w-4 h-4 mr-2" />
                  로그인
                </Button>
                <div className="text-center text-sm text-gray-500">
                  WikiUser 테이블의 role이 'admin'인 계정만 접근 가능
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100">
      <div className="h-20"></div>
      
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* 헤더 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-white mb-2">🛠️ 운영자 대시보드</h1>
              <p className="text-gray-300">
                {currentUser?.displayName || currentUser?.username} 님, 환영합니다!
              </p>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-gray-300">
                <User className="w-4 h-4" />
                <span>{currentUser?.username}</span>
                <span className="px-2 py-1 bg-blue-600 text-blue-100 rounded-full text-xs">
                  {currentUser?.role}
                </span>
              </div>
              <Button onClick={handleLogout} className="bg-red-600 hover:bg-red-700">
                <LogOut className="w-4 h-4 mr-2" />
                로그아웃
              </Button>
            </div>
          </div>
        </motion.div>

        <div className="grid grid-cols-12 gap-6">
          {/* 사이드바 메뉴 */}
          <div className="col-span-3">
            <Card className="bg-gray-800 border-gray-700 sticky top-24">
              <CardContent className="p-4">
                <nav className="space-y-2">
                  {menuItems.map((item) => (
                    <div key={item.id}>
                      <button
                        onClick={() => {
                          setActiveTab(item.id)
                          setActiveSubTab(item.subItems.length > 0 ? item.subItems[0].id : '')
                        }}
                        className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg font-medium transition-all duration-200 ${
                          activeTab === item.id
                            ? 'bg-blue-600 text-white shadow-lg'
                            : 'text-gray-400 hover:bg-gray-700 hover:text-gray-200'
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
                          className="ml-6 mt-2 space-y-1"
                        >
                          {item.subItems.map((subItem) => (
                            <button
                              key={subItem.id}
                              onClick={() => setActiveSubTab(subItem.id)}
                              className={`w-full flex items-center justify-between px-3 py-2 rounded text-sm transition-colors ${
                                activeSubTab === subItem.id
                                  ? 'bg-gray-700 text-blue-400'
                                  : 'text-gray-500 hover:bg-gray-700 hover:text-gray-300'
                              }`}
                            >
                              <span>{subItem.label}</span>
                              {subItem.count !== undefined && (
                                <span className={`text-xs px-2 py-0.5 rounded-full ${
                                  subItem.count > 0 ? 'bg-red-600 text-white' : 'bg-gray-600 text-gray-300'
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
                  className="flex items-center justify-center py-12"
                >
                  <RefreshCw className="w-6 h-6 animate-spin mr-2" />
                  <span>데이터를 불러오는 중...</span>
                </motion.div>
              )}

              {/* 대시보드 개요 */}
              {activeTab === 'overview' && !loading && (
                <DashboardOverview 
                  submissions={submissions}
                  users={users}
                  notices={notices}
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
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  )
}

// 대시보드 개요 컴포넌트
function DashboardOverview({ submissions, users, notices }: {
  submissions: WikiSubmission[]
  users: WikiUser[]
  notices: Notice[]
}) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div className="grid grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-yellow-600 to-yellow-700 border-0">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-yellow-100 text-sm font-medium">승인 대기</p>
                <p className="text-3xl font-bold text-white">
                  {submissions.filter(s => s.status === 'pending').length}
                </p>
              </div>
              <Clock className="w-8 h-8 text-yellow-200" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-blue-600 to-blue-700 border-0">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-sm font-medium">총 사용자</p>
                <p className="text-3xl font-bold text-white">{users.length}</p>
              </div>
              <Users className="w-8 h-8 text-blue-200" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-red-600 to-red-700 border-0">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-red-100 text-sm font-medium">차단된 사용자</p>
                <p className="text-3xl font-bold text-white">
                  {users.filter(u => u.banStatus?.isBanned).length}
                </p>
              </div>
              <Ban className="w-8 h-8 text-red-200" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-green-600 to-green-700 border-0">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-100 text-sm font-medium">공지사항</p>
                <p className="text-3xl font-bold text-white">{notices.length}</p>
              </div>
              <Bell className="w-8 h-8 text-green-200" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <h2 className="text-xl font-bold text-gray-200 flex items-center gap-2">
            📋 최근 활동
          </h2>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {submissions.slice(0, 8).map((submission) => (
              <div key={submission._id} className="flex items-center justify-between p-4 bg-gray-700 rounded-lg hover:bg-gray-650 transition-colors">
                <div>
                  <p className="font-medium text-gray-200">{submission.targetTitle}</p>
                  <p className="text-sm text-gray-400">
                    {submission.author} • {new Date(submission.createdAt).toLocaleDateString('ko-KR', {
                      month: '2-digit',
                      day: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-1 rounded-full text-xs ${
                    submission.type === 'create' ? 'bg-blue-600 text-blue-100' : 'bg-green-600 text-green-100'
                  }`}>
                    {submission.type === 'create' ? '새 문서' : '편집'}
                  </span>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                    submission.status === 'pending' ? 'bg-yellow-600 text-yellow-100' :
                    submission.status === 'approved' ? 'bg-green-600 text-green-100' :
                    submission.status === 'rejected' ? 'bg-red-600 text-red-100' :
                    'bg-gray-600 text-gray-100'
                  }`}>
                    {submission.status === 'pending' ? '승인대기' :
                     submission.status === 'approved' ? '승인됨' :
                     submission.status === 'rejected' ? '불허됨' : '보류'}
                  </span>
                </div>
              </div>
            ))}
            {submissions.length === 0 && (
              <div className="text-center py-8 text-gray-400">
                최근 활동이 없습니다.
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}
