'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Card, CardHeader, CardContent } from '@/components/ui'
import { Bell, Calendar, User, Pin, Info, Settings, Plus, Edit, Trash2, X } from 'lucide-react'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'

interface Notice {
  id: number
  title: string
  content: string
  type: string
  isPinned: boolean
  author: string
  date: Date | string
  category: string
}

export default function NoticesPage() {
  const [isAdmin, setIsAdmin] = useState(false)
  const [notices, setNotices] = useState<Notice[]>([])
  const [showAddForm, setShowAddForm] = useState(false)
  const [showAdminLogin, setShowAdminLogin] = useState(false)
  const [editingNotice, setEditingNotice] = useState<Notice | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [loginData, setLoginData] = useState({
    username: '',
    password: ''
  })
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    type: 'announcement',
    category: '',
    author: '',
    isPinned: false
  })

  // 기본 공지사항 데이터 (API 실패 시 사용)
  const defaultNotices: Notice[] = [
    {
      id: 1,
      title: '랑구팸 v2.0 업데이트 완료 (25.08.26)',
      content: '새로운 기능들과 개선된 UI로 더욱 편리해진 랑구팸을 만나보세요. 카드 드랍 시스템과 게임 기능이 추가되었고, 알림 시스템 중복 방지 기능이 개선되었습니다.',
      type: 'update',
      isPinned: true,
      author: 'DoubleJ Tech Team',
      date: new Date('2025-08-26'),
      category: '시스템 업데이트'
    },
    {
      id: 2,
      title: '이용약관 및 개인정보처리방침 업데이트',
      content: '사용자 보호를 위한 정책이 업데이트되었습니다. 변경된 내용을 확인해주세요.',
      type: 'policy',
      isPinned: true,
      author: 'Legal Team',
      date: new Date('2025-01-10'),
      category: '정책 변경'
    },
    {
      id: 3,
      title: '위키 시스템 성능 최적화',
      content: '이랑위키의 검색 및 편집 기능이 더욱 빨라졌습니다. 더 나은 편집 경험을 제공합니다.',
      type: 'improvement',
      isPinned: false,
      author: 'Development Team',
      date: new Date('2025-01-05'),
      category: '성능 개선'
    },
    {
      id: 4,
      title: '정기 점검 안내',
      content: '매월 첫 번째 일요일 새벽 2시부터 4시까지 정기 점검이 진행됩니다. 이용에 참고 부탁드립니다.',
      type: 'maintenance',
      isPinned: false,
      author: 'System Admin',
      date: new Date('2024-12-28'),
      category: '시스템 점검'
    },
    {
      id: 5,
      title: '랑구팸 서비스 오픈',
      content: '친구들을 위한 특별한 온라인 공간, 랑구팸이 정식 오픈했습니다! 많은 이용 부탁드립니다.',
      type: 'announcement',
      isPinned: false,
      author: 'DoubleJ Tech Team',
      date: new Date('2024-12-20'),
      category: '서비스 오픈'
    }
  ]

  useEffect(() => {
    // 관리자 토큰 확인
    const token = localStorage.getItem('adminToken')
    if (token) {
      setIsAdmin(true)
    }
    
    // 모든 사용자가 동일한 공지사항을 보도록 공개 API 사용
    loadPublicNotices()
  }, [])

  // 공개 공지사항 로드 (모든 사용자용)
  const loadPublicNotices = async () => {
    try {
      setLoading(true)
      console.log('📢 공개 공지사항 로드 중...')
      const response = await fetch('/api/notices')

      if (response.ok) {
        const data = await response.json()
        console.log('✅ 공개 공지사항 로드 성공:', data.notices.length, '개')
        setNotices(data.notices.map((notice: any) => ({
          ...notice,
          date: new Date(notice.date)
        })))
      } else {
        console.error('❌ 공개 공지사항 API 실패:', response.status)
        console.log('🔄 기본 공지사항으로 폴백')
        setNotices(defaultNotices)
      }
    } catch (error) {
      console.error('공개 공지사항 로드 실패:', error)
      console.log('🔄 기본 공지사항으로 폴백')
      setNotices(defaultNotices)
    } finally {
      setLoading(false)
    }
  }

  // 관리자 공지사항 로드 (관리자용)
  const loadNotices = async () => {
    try {
      setLoading(true)
      const token = localStorage.getItem('adminToken')
      console.log('🔑 관리자 토큰으로 API 호출:', token ? '토큰 있음' : '토큰 없음')
      const response = await fetch('/api/admin/notices', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        console.log('✅ 관리자 공지사항 로드 성공:', data.notices.length, '개')
        setNotices(data.notices.map((notice: any) => ({
          ...notice,
          date: new Date(notice.date)
        })))
      } else {
        console.error('❌ 관리자 공지사항 API 실패:', response.status)
        // 관리자 API 실패 시 공개 API로 폴백
        await loadPublicNotices()
      }
    } catch (error) {
      console.error('관리자 공지사항 로드 실패:', error)
      // 오류 시 공개 API로 폴백
      await loadPublicNotices()
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.title || !formData.content || !formData.category || !formData.author) {
      alert('모든 필드를 입력해주세요.')
      return
    }

    if (submitting) return // 중복 제출 방지
    setSubmitting(true)

    try {
      const token = localStorage.getItem('adminToken')
      const method = editingNotice ? 'PUT' : 'POST'
      
      const body = editingNotice 
        ? { ...formData, id: editingNotice.id }
        : formData

      console.log('공지사항 저장 시도:', { method, editingNotice: !!editingNotice, body })

      const response = await fetch('/api/admin/notices', {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(body)
      })

      if (response.ok) {
        const data = await response.json()
        console.log('공지사항 저장 성공:', data)
        alert(data.message || (editingNotice ? '공지사항이 수정되었습니다.' : '공지사항이 추가되었습니다.'))
        setShowAddForm(false)
        setEditingNotice(null)
        setFormData({
          title: '',
          content: '',
          type: 'announcement',
          category: '',
          author: '',
          isPinned: false
        })
        loadPublicNotices() // 공지사항 새로고침
      } else {
        const error = await response.json()
        console.error('공지사항 저장 실패:', error)
        alert(error.error || '오류가 발생했습니다.')
      }
    } catch (error) {
      console.error('공지사항 저장 네트워크 오류:', error)
      alert('네트워크 오류가 발생했습니다.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (noticeId: number) => {
    if (!confirm('정말로 이 공지사항을 삭제하시겠습니까?')) {
      return
    }

    try {
      const token = localStorage.getItem('adminToken')
      const response = await fetch(`/api/admin/notices?id=${noticeId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        alert(data.message)
        loadPublicNotices() // 공지사항 새로고침
      } else {
        const error = await response.json()
        alert(error.error || '삭제 중 오류가 발생했습니다.')
      }
    } catch (error) {
      console.error('공지사항 삭제 실패:', error)
      alert('네트워크 오류가 발생했습니다.')
    }
  }

  const handleEdit = (notice: Notice) => {
    setEditingNotice(notice)
    setFormData({
      title: notice.title,
      content: notice.content,
      type: notice.type,
      category: notice.category,
      author: notice.author,
      isPinned: notice.isPinned
    })
    setShowAddForm(true)
  }

  // 관리자 로그인 처리
  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!loginData.username || !loginData.password) {
      alert('사용자명과 비밀번호를 입력해주세요.')
      return
    }

    try {
      const response = await fetch('/api/admin/auth', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(loginData)
      })

      const data = await response.json()

      if (response.ok && data.success) {
        localStorage.setItem('adminToken', data.token)
        setIsAdmin(true)
        setShowAdminLogin(false)
        setLoginData({ username: '', password: '' })
        loadPublicNotices() // 최신 공지사항 로드
        alert(`환영합니다, ${data.user.username}님! 관리자 권한이 활성화되었습니다.`)
      } else {
        alert(data.error || '로그인에 실패했습니다.')
      }
    } catch (error) {
      console.error('관리자 로그인 오류:', error)
      alert('서버 오류가 발생했습니다.')
    }
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'update':
        return <Bell className="w-5 h-5 text-blue-600" />
      case 'policy':
        return <Info className="w-5 h-5 text-orange-600" />
      case 'improvement':
        return <Calendar className="w-5 h-5 text-green-600" />
      case 'maintenance':
        return <User className="w-5 h-5 text-purple-600" />
      default:
        return <Bell className="w-5 h-5 text-primary-600" />
    }
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'update':
        return 'bg-blue-50 text-blue-700 border-blue-200'
      case 'policy':
        return 'bg-orange-50 text-orange-700 border-orange-200'
      case 'improvement':
        return 'bg-green-50 text-green-700 border-green-200'
      case 'maintenance':
        return 'bg-purple-50 text-purple-700 border-purple-200'
      default:
        return 'bg-primary-50 text-primary-700 border-primary-200'
    }
  }

  const pinnedNotices = notices.filter(notice => notice.isPinned)
  const regularNotices = notices.filter(notice => !notice.isPinned)

  if (loading) {
    return (
      <div className="min-h-screen theme-surface text-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-gray-300">공지사항을 불러오는 중...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen theme-surface text-gray-100">
      {/* Navigation Spacer */}
      <div className="h-20"></div>
      
      <div className="max-w-4xl mx-auto px-4 py-12">
        {/* Page Title */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex-1"></div>
            <h1 className="text-4xl font-bold text-white">공지사항</h1>
            <div className="flex-1 flex justify-end gap-2">
              {/* 관리자 상태 표시 및 로그인 */}
              <div className="flex items-center gap-2">
                {isAdmin ? (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-green-400">🔑 관리자 모드</span>
                    <button
                      onClick={() => {
                        localStorage.removeItem('adminToken')
                        setIsAdmin(false)
                        loadPublicNotices() // 공개 공지사항으로 다시 로드
                        alert('관리자 모드가 해제되었습니다.')
                      }}
                      className="px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700"
                    >
                      로그아웃
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowAdminLogin(true)}
                    className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                  >
                    🔑 관리자 도구
                  </button>
                )}
              </div>
              {isAdmin && (
                <>
                  <motion.button
                    onClick={() => {
                      setEditingNotice(null)
                      setFormData({
                        title: '',
                        content: '',
                        type: 'announcement',
                        category: '',
                        author: '',
                        isPinned: false
                      })
                      setShowAddForm(true)
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Plus className="w-4 h-4" />
                    공지 추가
                  </motion.button>
                  <motion.button
                    onClick={() => window.location.href = '/admin'}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Settings className="w-4 h-4" />
                    관리자 도구
                  </motion.button>
                </>
              )}
            </div>
          </div>
          <p className="text-gray-300 text-lg">
            랑구팸의 최신 소식과 업데이트를 확인하세요
          </p>
        </motion.div>

        {/* Pinned Notices */}
        {pinnedNotices.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="mb-8"
          >
            <h2 className="text-xl font-bold text-gray-200 mb-4 flex items-center gap-2">
              <Pin className="w-5 h-5 text-red-500" />
              중요 공지
            </h2>
            <div className="space-y-4">
              {pinnedNotices.map((notice, index) => (
                <motion.div
                  key={notice.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.6, delay: 0.2 + index * 0.1 }}
                >
                  <Card className="bg-gray-800 border-gray-700 border-l-4 border-l-red-500">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-4 flex-1">
                          {getTypeIcon(notice.type)}
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h3 className="font-semibold text-gray-200">{notice.title}</h3>
                              <Pin className="w-4 h-4 text-red-500" />
                            </div>
                            <p className="text-gray-400 text-sm mb-3 leading-relaxed">
                              {notice.content}
                            </p>
                            <div className="flex items-center gap-4 text-xs text-gray-500">
                              <span className={`px-2 py-1 rounded-full border ${getTypeColor(notice.type)}`}>
                                {notice.category}
                              </span>
                              <span>{notice.author}</span>
                              <span>{format(new Date(notice.date), 'yyyy년 MM월 dd일', { locale: ko })}</span>
                            </div>
                          </div>
                        </div>
                        {isAdmin && (
                          <div className="flex gap-2">
                            {/* 디버깅: 관리자 상태 확인 */}
                            <div className="text-xs text-gray-600 mr-2">Admin UI</div>
                            <motion.button
                              onClick={() => {
                                console.log('편집 버튼 클릭:', notice)
                                handleEdit(notice)
                              }}
                              className="p-2 text-blue-400 hover:text-blue-300 hover:bg-gray-700 rounded-lg transition-colors"
                              whileHover={{ scale: 1.1 }}
                              whileTap={{ scale: 0.9 }}
                              title={`편집: ${notice.title}`}
                            >
                              <Edit className="w-4 h-4" />
                            </motion.button>
                            <motion.button
                              onClick={() => handleDelete(notice.id)}
                              className="p-2 text-red-400 hover:text-red-300 hover:bg-gray-700 rounded-lg transition-colors"
                              whileHover={{ scale: 1.1 }}
                              whileTap={{ scale: 0.9 }}
                              title="삭제"
                            >
                              <Trash2 className="w-4 h-4" />
                            </motion.button>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Regular Notices */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
        >
          <h2 className="text-xl font-bold text-gray-200 mb-4">전체 공지</h2>
          <div className="space-y-4">
            {regularNotices.map((notice, index) => (
              <motion.div
                key={notice.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.4 + index * 0.1 }}
              >
                <Card className="bg-gray-800 border-gray-700 hover:bg-gray-750 hover:-translate-y-1 transition-all duration-300">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-4 flex-1">
                        {getTypeIcon(notice.type)}
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-200 mb-2">{notice.title}</h3>
                          <p className="text-gray-400 text-sm mb-3 leading-relaxed">
                            {notice.content}
                          </p>
                          <div className="flex items-center gap-4 text-xs text-gray-500">
                            <span className={`px-2 py-1 rounded-full border ${getTypeColor(notice.type)}`}>
                              {notice.category}
                            </span>
                            <span>{notice.author}</span>
                            <span>{format(new Date(notice.date), 'yyyy년 MM월 dd일', { locale: ko })}</span>
                          </div>
                        </div>
                      </div>
                      {isAdmin && (
                        <div className="flex gap-2">
                          {/* 디버깅: 관리자 상태 확인 */}
                          <div className="text-xs text-gray-600 mr-2">Admin UI</div>
                          <motion.button
                            onClick={() => {
                              console.log('편집 버튼 클릭 (일반):', notice)
                              handleEdit(notice)
                            }}
                            className="p-2 text-blue-400 hover:text-blue-300 hover:bg-gray-700 rounded-lg transition-colors"
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            title={`편집: ${notice.title}`}
                          >
                            <Edit className="w-4 h-4" />
                          </motion.button>
                          <motion.button
                            onClick={() => handleDelete(notice.id)}
                            className="p-2 text-red-400 hover:text-red-300 hover:bg-gray-700 rounded-lg transition-colors"
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            title="삭제"
                          >
                            <Trash2 className="w-4 h-4" />
                          </motion.button>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Notice Info */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.8 }}
          className="mt-12"
        >
          <Card className="bg-gray-800 border-gray-700">
            <CardContent className="p-6 text-center">
              <Info className="w-8 h-8 text-blue-400 mx-auto mb-3" />
              <h3 className="font-semibold text-gray-200 mb-2">공지사항 안내</h3>
              <p className="text-gray-400 text-sm">
                중요한 업데이트나 변경사항은 이 페이지를 통해 안내됩니다. 
                정기적으로 확인해주시기 바랍니다.
              </p>
            </CardContent>
          </Card>
        </motion.div>

        {/* 관리자 공지사항 추가/편집 폼 */}
        <AnimatePresence>
          {showAddForm && isAdmin && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
              onClick={(e) => {
                if (e.target === e.currentTarget) {
                  setShowAddForm(false)
                  setEditingNotice(null)
                }
              }}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
              >
                <div className="p-6">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h2 className="text-2xl font-bold text-white">
                        {editingNotice ? '공지사항 편집' : '새 공지사항 추가'}
                      </h2>
                      {editingNotice && (
                        <p className="text-gray-400 text-sm mt-1">
                          편집 중: #{editingNotice.id} - {editingNotice.title}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => {
                        setShowAddForm(false)
                        setEditingNotice(null)
                        setFormData({
                          title: '',
                          content: '',
                          type: 'announcement',
                          category: '',
                          author: '',
                          isPinned: false
                        })
                      }}
                      className="text-gray-400 hover:text-white transition-colors"
                    >
                      <X className="w-6 h-6" />
                    </button>
                  </div>

                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        제목 *
                      </label>
                      <input
                        type="text"
                        value={formData.title}
                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="공지사항 제목을 입력하세요"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        내용 *
                      </label>
                      <textarea
                        value={formData.content}
                        onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                        rows={6}
                        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                        placeholder="공지사항 내용을 입력하세요"
                        required
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          타입
                        </label>
                        <select
                          value={formData.type}
                          onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                          <option value="announcement">일반</option>
                          <option value="update">업데이트</option>
                          <option value="policy">정책</option>
                          <option value="improvement">개선</option>
                          <option value="maintenance">점검</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          카테고리 *
                        </label>
                        <input
                          type="text"
                          value={formData.category}
                          onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="예: 시스템 업데이트"
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        작성자 *
                      </label>
                      <input
                        type="text"
                        value={formData.author}
                        onChange={(e) => setFormData({ ...formData, author: e.target.value })}
                        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="예: DoubleJ Tech Team"
                        required
                      />
                    </div>

                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="isPinned"
                        checked={formData.isPinned}
                        onChange={(e) => setFormData({ ...formData, isPinned: e.target.checked })}
                        className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500"
                      />
                      <label htmlFor="isPinned" className="ml-2 text-sm text-gray-300">
                        중요 공지로 고정
                      </label>
                    </div>

                    <div className="flex gap-3 pt-4">
                      <button
                        type="button"
                        onClick={() => {
                          setShowAddForm(false)
                          setEditingNotice(null)
                        }}
                        className="flex-1 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
                      >
                        취소
                      </button>
                      <button
                        type="submit"
                        disabled={submitting}
                        className={`flex-1 px-4 py-2 text-white rounded-lg transition-colors ${
                          submitting 
                            ? 'bg-blue-400 cursor-not-allowed' 
                            : 'bg-blue-600 hover:bg-blue-700'
                        }`}
                      >
                        {submitting ? (
                          <div className="flex items-center justify-center gap-2">
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                            {editingNotice ? '수정 중...' : '추가 중...'}
                          </div>
                        ) : (
                          editingNotice ? '수정' : '추가'
                        )}
                      </button>
                    </div>
                  </form>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 관리자 로그인 모달 */}
        <AnimatePresence>
          {showAdminLogin && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
              onClick={(e) => {
                if (e.target === e.currentTarget) {
                  setShowAdminLogin(false)
                  setLoginData({ username: '', password: '' })
                }
              }}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-gray-800 rounded-xl p-6 w-full max-w-md mx-4 shadow-2xl border border-gray-700"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    🔑 관리자 로그인
                  </h2>
                  <button
                    onClick={() => {
                      setShowAdminLogin(false)
                      setLoginData({ username: '', password: '' })
                    }}
                    className="text-gray-400 hover:text-white transition-colors"
                  >
                    ✕
                  </button>
                </div>

                <form onSubmit={handleAdminLogin} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      사용자명
                    </label>
                    <input
                      type="text"
                      value={loginData.username}
                      onChange={(e) => setLoginData({ ...loginData, username: e.target.value })}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="관리자 사용자명을 입력하세요"
                      autoComplete="username"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      비밀번호
                    </label>
                    <input
                      type="password"
                      value={loginData.password}
                      onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="관리자 비밀번호를 입력하세요"
                      autoComplete="current-password"
                    />
                  </div>

                  <div className="flex gap-3 pt-4">
                    <button
                      type="button"
                      onClick={() => {
                        setShowAdminLogin(false)
                        setLoginData({ username: '', password: '' })
                      }}
                      className="flex-1 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
                    >
                      취소
                    </button>
                    <button
                      type="submit"
                      className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                    >
                      로그인
                    </button>
                  </div>
                </form>

                <div className="mt-4 p-3 bg-blue-900/30 border border-blue-700 rounded-lg">
                  <p className="text-xs text-blue-200">
                    💡 <strong>로그인 방법:</strong><br/>
                    • 기본 계정: admin / admin123<br/>
                    • 또는 user[숫자] / pass[숫자] 형태로 자유롭게 생성 가능<br/>
                    • 예: user1 / pass1, user2024 / pass2024
                  </p>
                </div>

              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}