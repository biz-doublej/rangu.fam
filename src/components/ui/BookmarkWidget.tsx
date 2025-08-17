'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  ExternalLink, 
  Plus, 
  Edit3, 
  Trash2, 
  Save, 
  X, 
  GripVertical,
  Globe
} from 'lucide-react'
import { Bookmark } from '@/types'
import { Button } from './Button'
import { Input } from './Input'
import toast from 'react-hot-toast'

interface BookmarkWidgetProps {
  userId: string
  className?: string
}

interface BookmarkFormData {
  title: string
  url: string
  description: string
  icon: string
}

export const BookmarkWidget: React.FC<BookmarkWidgetProps> = ({ 
  userId, 
  className = '' 
}) => {
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([])
  const [loading, setLoading] = useState(true)
  const [isAddingNew, setIsAddingNew] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formData, setFormData] = useState<BookmarkFormData>({
    title: '',
    url: '',
    description: '',
    icon: '🔗'
  })

  // 북마크 목록 로드
  const loadBookmarks = async () => {
    try {
      const response = await fetch(`/api/bookmarks?userId=${userId}`)
      const data = await response.json()
      
      if (data.success) {
        setBookmarks(data.data || [])
      } else {
        console.error('북마크 로드 실패:', data.error)
      }
    } catch (error) {
      console.error('북마크 로드 오류:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (userId) {
      loadBookmarks()
    }
  }, [userId])

  // 새 북마크 추가
  const handleAddBookmark = async () => {
    if (!formData.title.trim() || !formData.url.trim()) {
      toast.error('제목과 URL을 입력해주세요.')
      return
    }

    try {
      const response = await fetch('/api/bookmarks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          ...formData
        })
      })

      const data = await response.json()

      if (data.success) {
        setBookmarks([...bookmarks, data.data])
        setFormData({ title: '', url: '', description: '', icon: '🔗' })
        setIsAddingNew(false)
        toast.success('북마크가 추가되었습니다!')
      } else {
        toast.error(data.error || '북마크 추가에 실패했습니다.')
      }
    } catch (error) {
      console.error('북마크 추가 오류:', error)
      toast.error('서버 오류가 발생했습니다.')
    }
  }

  // 북마크 수정
  const handleEditBookmark = async (bookmarkId: string) => {
    if (!formData.title.trim() || !formData.url.trim()) {
      toast.error('제목과 URL을 입력해주세요.')
      return
    }

    try {
      const response = await fetch(`/api/bookmarks/${bookmarkId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData)
      })

      const data = await response.json()

      if (data.success) {
        setBookmarks(bookmarks.map(bookmark => 
          bookmark._id === bookmarkId ? data.data : bookmark
        ))
        setEditingId(null)
        setFormData({ title: '', url: '', description: '', icon: '🔗' })
        toast.success('북마크가 수정되었습니다!')
      } else {
        toast.error(data.error || '북마크 수정에 실패했습니다.')
      }
    } catch (error) {
      console.error('북마크 수정 오류:', error)
      toast.error('서버 오류가 발생했습니다.')
    }
  }

  // 북마크 삭제
  const handleDeleteBookmark = async (bookmarkId: string) => {
    if (!confirm('정말로 이 북마크를 삭제하시겠습니까?')) {
      return
    }

    try {
      const response = await fetch(`/api/bookmarks/${bookmarkId}`, {
        method: 'DELETE'
      })

      const data = await response.json()

      if (data.success) {
        setBookmarks(bookmarks.filter(bookmark => bookmark._id !== bookmarkId))
        toast.success('북마크가 삭제되었습니다!')
      } else {
        toast.error(data.error || '북마크 삭제에 실패했습니다.')
      }
    } catch (error) {
      console.error('북마크 삭제 오류:', error)
      toast.error('서버 오류가 발생했습니다.')
    }
  }

  // 편집 모드 시작
  const startEdit = (bookmark: Bookmark) => {
    setEditingId(bookmark._id || null)
    setFormData({
      title: bookmark.title,
      url: bookmark.url,
      description: bookmark.description || '',
      icon: bookmark.icon || '🔗'
    })
  }

  // 편집 취소
  const cancelEdit = () => {
    setEditingId(null)
    setIsAddingNew(false)
    setFormData({ title: '', url: '', description: '', icon: '🔗' })
  }

  // 외부 링크 열기
  const openLink = (url: string) => {
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  if (loading) {
    return (
      <div className={`glass-card p-4 ${className}`}>
        <div className="flex items-center space-x-2 mb-4">
          <Globe className="w-5 h-5 text-primary-600" />
          <h3 className="text-lg font-semibold text-gray-800">바로가기</h3>
        </div>
        <div className="space-y-2">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-12 bg-gray-100 rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className={`glass-card p-4 ${className}`}>
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <Globe className="w-5 h-5 text-primary-600" />
          <h3 className="text-lg font-semibold text-gray-800">바로가기</h3>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsAddingNew(true)}
          className="text-primary-600 hover:bg-primary-50"
        >
          <Plus className="w-4 h-4" />
        </Button>
      </div>

      {/* 북마크 목록 */}
      <div className="space-y-2">
        <AnimatePresence>
          {bookmarks.map((bookmark) => (
            <motion.div
              key={bookmark._id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="group"
            >
              {editingId === bookmark._id ? (
                // 편집 모드
                <div className="space-y-2 p-3 bg-gray-50 rounded-lg">
                  <div className="flex space-x-2">
                    <Input
                      type="text"
                      placeholder="아이콘 (emoji)"
                      value={formData.icon}
                      onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                      className="w-16 text-center"
                    />
                    <Input
                      type="text"
                      placeholder="제목"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      className="flex-1"
                    />
                  </div>
                  <Input
                    type="url"
                    placeholder="URL"
                    value={formData.url}
                    onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                  />
                  <Input
                    type="text"
                    placeholder="설명 (선택사항)"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  />
                  <div className="flex space-x-2">
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => handleEditBookmark(bookmark._id!)}
                    >
                      <Save className="w-3 h-3 mr-1" />
                      저장
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={cancelEdit}
                    >
                      <X className="w-3 h-3 mr-1" />
                      취소
                    </Button>
                  </div>
                </div>
              ) : (
                // 일반 표시 모드
                <div className="flex items-center space-x-2 p-2 rounded-lg hover:bg-gray-50 transition-colors">
                  <GripVertical className="w-4 h-4 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity cursor-move" />
                  <button
                    onClick={() => openLink(bookmark.url)}
                    className="flex items-center space-x-3 flex-1 text-left"
                  >
                    <span className="text-lg">{bookmark.icon}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">
                        {bookmark.title}
                      </p>
                      {bookmark.description && (
                        <p className="text-xs text-gray-500 truncate">
                          {bookmark.description}
                        </p>
                      )}
                    </div>
                    <ExternalLink className="w-4 h-4 text-gray-400" />
                  </button>
                  <div className="flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => startEdit(bookmark)}
                      className="p-1 h-auto"
                    >
                      <Edit3 className="w-3 h-3 text-gray-500" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteBookmark(bookmark._id!)}
                      className="p-1 h-auto"
                    >
                      <Trash2 className="w-3 h-3 text-red-500" />
                    </Button>
                  </div>
                </div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>

        {/* 새 북마크 추가 폼 */}
        <AnimatePresence>
          {isAddingNew && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-2 p-3 bg-gray-50 rounded-lg"
            >
              <div className="flex space-x-2">
                <Input
                  type="text"
                  placeholder="🔗"
                  value={formData.icon}
                  onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                  className="w-16 text-center"
                />
                <Input
                  type="text"
                  placeholder="제목"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="flex-1"
                />
              </div>
              <Input
                type="url"
                placeholder="https://example.com"
                value={formData.url}
                onChange={(e) => setFormData({ ...formData, url: e.target.value })}
              />
              <Input
                type="text"
                placeholder="설명 (선택사항)"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
              <div className="flex space-x-2">
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleAddBookmark}
                >
                  <Save className="w-3 h-3 mr-1" />
                  저장
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={cancelEdit}
                >
                  <X className="w-3 h-3 mr-1" />
                  취소
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 빈 상태 */}
        {bookmarks.length === 0 && !isAddingNew && (
          <div className="text-center py-8">
            <Globe className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-sm text-gray-500 mb-3">
              아직 바로가기가 없습니다.
            </p>
            <Button
              variant="primary"
              size="sm"
              onClick={() => setIsAddingNew(true)}
            >
              <Plus className="w-4 h-4 mr-1" />
              첫 번째 바로가기 추가
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}