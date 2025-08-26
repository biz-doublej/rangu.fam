'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { Card, CardHeader, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { 
  Plus, 
  Send, 
  Edit, 
  Trash2,
  Bell,
  Pin
} from 'lucide-react'

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

interface NoticeManagementProps {
  notices: Notice[]
  setNotices: (notices: Notice[]) => void
  newNotice: any
  setNewNotice: (notice: any) => void
}

export default function NoticeManagement({ 
  notices, 
  setNotices, 
  newNotice, 
  setNewNotice 
}: NoticeManagementProps) {
  const handleAddNotice = async () => {
    if (!newNotice.title.trim() || !newNotice.content.trim()) {
      alert('제목과 내용을 모두 입력해주세요.')
      return
    }

    try {
      const response = await fetch('/api/admin/notices', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
        },
        body: JSON.stringify(newNotice)
      })

      if (response.ok) {
        const result = await response.json()
        setNotices([result.notice, ...notices])
        setNewNotice({
          title: '',
          content: '',
          type: 'announcement',
          category: '',
          author: 'gabriel0727',
          isPinned: false
        })
        alert('공지사항이 추가되었습니다! 디스코드에도 알림이 전송되었습니다.')
      } else {
        throw new Error('공지사항 추가에 실패했습니다.')
      }
    } catch (error) {
      console.error('공지사항 추가 오류:', error)
      alert('공지사항 추가 중 오류가 발생했습니다.')
    }
  }

  const handleDeleteNotice = async (id: number) => {
    if (!confirm('정말 삭제하시겠습니까?')) return

    try {
      const response = await fetch(`/api/admin/notices?id=${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
        }
      })

      if (response.ok) {
        setNotices(notices.filter(n => n.id !== id))
        alert('공지사항이 삭제되었습니다.')
      } else {
        throw new Error('공지사항 삭제에 실패했습니다.')
      }
    } catch (error) {
      console.error('공지사항 삭제 오류:', error)
      alert('공지사항 삭제 중 오류가 발생했습니다.')
    }
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'announcement': return 'bg-blue-600 text-blue-100'
      case 'update': return 'bg-green-600 text-green-100'
      case 'policy': return 'bg-yellow-600 text-yellow-100'
      case 'maintenance': return 'bg-red-600 text-red-100'
      default: return 'bg-gray-600 text-gray-100'
    }
  }

  const getTypeText = (type: string) => {
    switch (type) {
      case 'announcement': return '📢 일반'
      case 'update': return '🔄 업데이트'
      case 'policy': return '📋 정책'
      case 'maintenance': return '🔧 점검'
      default: return type
    }
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <h2 className="text-2xl font-bold text-white">📢 공지사항 관리</h2>
      
      {/* 새 공지사항 추가 */}
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <h3 className="text-xl font-bold text-gray-200 flex items-center gap-2">
            <Plus className="w-5 h-5" />
            새 공지사항 추가
          </h3>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Input
              placeholder="제목을 입력하세요"
              value={newNotice.title}
              onChange={(e) => setNewNotice({...newNotice, title: e.target.value})}
              className="bg-gray-700 border-gray-600 text-gray-200"
            />
            
            <textarea
              placeholder="공지사항 내용을 입력하세요"
              value={newNotice.content}
              onChange={(e) => setNewNotice({...newNotice, content: e.target.value})}
              className="w-full p-3 bg-gray-700 border border-gray-600 rounded-md text-gray-200 min-h-[120px] resize-none"
              rows={4}
            />
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Input
                placeholder="카테고리 (선택사항)"
                value={newNotice.category}
                onChange={(e) => setNewNotice({...newNotice, category: e.target.value})}
                className="bg-gray-700 border-gray-600 text-gray-200"
              />
              
              <select
                value={newNotice.type}
                onChange={(e) => setNewNotice({...newNotice, type: e.target.value})}
                className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-gray-200"
              >
                <option value="announcement">📢 일반 공지</option>
                <option value="update">🔄 업데이트</option>
                <option value="policy">📋 정책 변경</option>
                <option value="maintenance">🔧 점검 공지</option>
              </select>
              
              <label className="flex items-center gap-2 text-gray-300 px-3 py-2 bg-gray-700 border border-gray-600 rounded-md">
                <input
                  type="checkbox"
                  checked={newNotice.isPinned}
                  onChange={(e) => setNewNotice({...newNotice, isPinned: e.target.checked})}
                  className="rounded"
                />
                <Pin className="w-4 h-4" />
                상단 고정
              </label>
            </div>
            
            <Button 
              onClick={handleAddNotice} 
              className="bg-blue-600 hover:bg-blue-700 flex items-center gap-2"
            >
              <Send className="w-4 h-4" />
              공지사항 추가 (디스코드 알림 포함)
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 기존 공지사항 목록 */}
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-bold text-gray-200 flex items-center gap-2">
              <Bell className="w-5 h-5" />
              기존 공지사항 ({notices.length}개)
            </h3>
            <div className="text-sm text-gray-400">
              최신순으로 정렬됨
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {notices.length === 0 ? (
            <div className="text-center py-12">
              <Bell className="w-12 h-12 text-gray-500 mx-auto mb-4" />
              <p className="text-gray-400 text-lg">등록된 공지사항이 없습니다.</p>
              <p className="text-gray-500 text-sm mt-2">
                위에서 새로운 공지사항을 추가해보세요.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {notices.map((notice) => (
                <motion.div 
                  key={notice.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-gray-700 p-6 rounded-lg hover:bg-gray-650 transition-colors"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <h4 className="font-semibold text-gray-200 text-lg">{notice.title}</h4>
                        {notice.isPinned && (
                          <span className="flex items-center gap-1 text-red-400 text-sm">
                            <Pin className="w-3 h-3" />
                            고정
                          </span>
                        )}
                      </div>
                      
                      <p className="text-gray-300 mb-4 leading-relaxed">{notice.content}</p>
                      
                      <div className="flex items-center gap-4 text-xs">
                        <span className={`px-2 py-1 rounded-full font-medium ${getTypeColor(notice.type)}`}>
                          {getTypeText(notice.type)}
                        </span>
                        
                        {notice.category && (
                          <span className="px-2 py-1 bg-gray-600 text-gray-300 rounded-full">
                            {notice.category}
                          </span>
                        )}
                        
                        <span className="text-gray-500">
                          작성자: {notice.author}
                        </span>
                        
                        <span className="text-gray-500">
                          {new Date(notice.date).toLocaleDateString('ko-KR', {
                            year: 'numeric',
                            month: '2-digit',
                            day: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex gap-2 ml-4">
                      <Button
                        size="sm"
                        className="bg-yellow-600 hover:bg-yellow-700"
                        title="편집"
                        onClick={() => {
                          // 편집 기능 구현 필요
                          alert('편집 기능을 구현해야 합니다.')
                        }}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        className="bg-red-600 hover:bg-red-700"
                        title="삭제"
                        onClick={() => handleDeleteNotice(notice.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 공지사항 통계 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-blue-600/10 border-blue-600/20">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-blue-400">
              {notices.filter(n => n.type === 'announcement').length}
            </p>
            <p className="text-blue-300 text-sm">일반 공지</p>
          </CardContent>
        </Card>
        <Card className="bg-green-600/10 border-green-600/20">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-green-400">
              {notices.filter(n => n.type === 'update').length}
            </p>
            <p className="text-green-300 text-sm">업데이트</p>
          </CardContent>
        </Card>
        <Card className="bg-yellow-600/10 border-yellow-600/20">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-yellow-400">
              {notices.filter(n => n.type === 'policy').length}
            </p>
            <p className="text-yellow-300 text-sm">정책</p>
          </CardContent>
        </Card>
        <Card className="bg-red-600/10 border-red-600/20">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-red-400">
              {notices.filter(n => n.isPinned).length}
            </p>
            <p className="text-red-300 text-sm">고정됨</p>
          </CardContent>
        </Card>
      </div>
    </motion.div>
  )
}
