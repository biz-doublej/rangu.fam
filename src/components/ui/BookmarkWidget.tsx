'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  ExternalLink, 
  Plus, 
  Edit3, 
  Trash2, 
  Save, 
  Globe,
  Search,
  Copy,
  X
} from 'lucide-react'
import { Bookmark } from '@/types'
import { Button } from './Button'
import { Input } from './Input'
import toast from 'react-hot-toast'

interface BookmarkWidgetProps {
  userId?: string
  className?: string
}

interface BookmarkFormData {
  title: string
  url: string
  description: string
  icon: string
}

const defaultBookmarkForm: BookmarkFormData = {
  title: '',
  url: '',
  description: '',
  icon: '🔗'
}

export const BookmarkWidget: React.FC<BookmarkWidgetProps> = ({ userId, className = '' }) => {
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([])
  const [loading, setLoading] = useState(true)
  const [isAddingNew, setIsAddingNew] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formData, setFormData] = useState<BookmarkFormData>(defaultBookmarkForm)
  const [filterQuery, setFilterQuery] = useState('')

  const loadBookmarks = async () => {
    if (!userId) {
      setBookmarks([])
      setLoading(false)
      return
    }

    setLoading(true)
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
    loadBookmarks()
  }, [userId])

  const handleAddBookmark = async () => {
    if (!userId) return
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
        setFormData(defaultBookmarkForm)
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

  const handleEditBookmark = async (bookmarkId: string) => {
    if (!userId) return
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
        setFormData(defaultBookmarkForm)
        toast.success('북마크가 수정되었습니다!')
      } else {
        toast.error(data.error || '북마크 수정에 실패했습니다.')
      }
    } catch (error) {
      console.error('북마크 수정 오류:', error)
      toast.error('서버 오류가 발생했습니다.')
    }
  }

  const handleDeleteBookmark = async (bookmarkId: string) => {
    if (!userId) return
    if (!confirm('정말로 이 바로가기를 삭제하시겠습니까?')) {
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

  const startEdit = (bookmark: Bookmark) => {
    setEditingId(bookmark._id || null)
    setIsAddingNew(false)
    setFormData({
      title: bookmark.title,
      url: bookmark.url,
      description: bookmark.description || '',
      icon: bookmark.icon || '🔗'
    })
  }

  const cancelEdit = () => {
    setEditingId(null)
    setIsAddingNew(false)
    setFormData(defaultBookmarkForm)
  }

  const filteredBookmarks = useMemo(() => {
    const query = filterQuery.trim().toLowerCase()
    if (!query) {
      return bookmarks
    }

    return bookmarks.filter((bookmark) => {
      const title = bookmark.title?.toLowerCase() || ''
      const description = bookmark.description?.toLowerCase() || ''
      const url = bookmark.url?.toLowerCase() || ''
      return title.includes(query) || description.includes(query) || url.includes(query)
    })
  }, [bookmarks, filterQuery])

  const isFiltering = Boolean(filterQuery.trim())
  const filteredCount = filteredBookmarks.length
  const hasBookmarks = bookmarks.length > 0

  const openLink = (url: string) => {
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  const handleCopyUrl = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url)
      toast.success('URL이 클립보드에 복사되었습니다.')
    } catch (error) {
      console.error('URL 복사 실패:', error)
      toast.error('URL을 복사할 수 없습니다.')
    }
  }

  if (!userId) {
    return (
      <div className={`glass-card p-4 ${className}`}>
        <div className="flex items-center justify-center gap-2 text-sm text-gray-400">
          <Globe className="w-5 h-5 text-primary-500" />
          로그인하여 바로가기를 관리하세요.
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className={`glass-card p-4 ${className}`}>
        <div className="flex items-center space-x-2 mb-3">
          <Globe className="w-5 h-5 text-primary-600" />
          <h3 className="text-lg font-semibold text-gray-800">바로가기</h3>
        </div>
        <div className="space-y-2">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-12 rounded-2xl bg-gray-100 animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  const handleOpenForm = () => {
    setEditingId(null)
    setIsAddingNew(true)
    setFormData(defaultBookmarkForm)
  }

  return (
    <div
      className={`glass-card relative overflow-hidden w-full max-w-xs bg-gradient-to-br from-slate-900 via-slate-900/90 to-slate-800 border border-slate-700/60 p-5 space-y-4 shadow-[0_20px_50px_-20px_rgba(0,0,0,0.5)] ${className}`}
    >
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-10 -top-8 h-32 w-32 rounded-full bg-amber-400/14 blur-3xl" />
        <div className="absolute -right-10 bottom-0 h-36 w-36 rounded-full bg-blue-400/14 blur-3xl" />
      </div>

      <div className="space-y-3 relative z-10">
        <div className="flex items-start gap-3">
          <div className="text-[10px] uppercase tracking-[0.35em] text-slate-200 leading-tight">
            <span className="block -mb-1">빠른</span>
            <span className="block">연결</span>
          </div>
          <div className="flex-1">
            <p className="text-[10px] uppercase tracking-[0.25em] text-slate-300 mb-1">
              빠른 연결
            </p>
            <h3 className="text-xl font-semibold text-white leading-tight">바로가기 컬렉션</h3>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <input
              type="search"
              placeholder="제목 · 설명 · URL 검색"
              value={filterQuery}
              onChange={(e) => setFilterQuery(e.target.value)}
              className="w-full rounded-2xl bg-slate-800/85 border border-slate-700 focus:border-[var(--accent-border)] focus:ring-2 focus:ring-[var(--accent-border)] text-xs text-slate-100 placeholder:text-slate-400 pl-9 pr-3 py-2 transition-all shadow-inner"
              aria-label="바로가기 검색"
            />
            <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 w-4 h-4" />
          </div>
          <Button
            variant="primary"
            size="sm"
            className="bg-amber-500 text-white hover:bg-amber-400 focus-visible:ring-amber-200 px-3.5 py-2 text-sm font-semibold"
            onClick={handleOpenForm}
          >
            <Plus className="w-4 h-4 mr-1" />
            새 바로가기
          </Button>
        </div>
        <div className="flex flex-wrap gap-2 text-[10px] font-semibold text-slate-100">
          <span className="rounded-full bg-white/15 px-3 py-1 tracking-[0.3em] uppercase border border-white/15">
            총 {bookmarks.length}개
          </span>
          {isFiltering && (
            <span className="rounded-full bg-white/15 px-3 py-1 text-primary-50 border border-white/20">
              {filteredCount}개 표시
            </span>
          )}
        </div>
      </div>

      <div className="space-y-3">
        <AnimatePresence>
          {filteredBookmarks.map((bookmark) => (
            <motion.div
              key={bookmark._id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
            >
              {editingId === bookmark._id ? (
                <motion.div
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  className="space-y-2 rounded-2xl border border-white/10 bg-slate-900/80 p-3"
                >
                  <div className="grid gap-2 sm:grid-cols-[60px,1fr]">
                    <Input
                      type="text"
                      placeholder="아이콘"
                      value={formData.icon}
                      onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                      className="text-center py-2"
                    />
                    <Input
                      type="text"
                      placeholder="제목"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      className="py-2"
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
                    placeholder="설명 (선택)"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  />
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => handleEditBookmark(bookmark._id!)}
                      className="px-3 py-1"
                    >
                      <Save className="w-3 h-3 mr-1" />
                      저장
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={cancelEdit}
                      className="px-3 py-1"
                    >
                      <X className="w-3 h-3 mr-1" />
                      취소
                    </Button>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  className="rounded-2xl border border-white/15 bg-gradient-to-br from-slate-900 to-slate-900/70 p-3 shadow-soft"
                >
                  <div className="flex items-start gap-3">
                    <div className="h-11 w-11 flex-shrink-0 rounded-2xl bg-slate-800/90 border border-slate-700 flex items-center justify-center text-xl text-white">
                      {bookmark.icon}
                    </div>
                    <div className="flex-1 space-y-1">
                      <p className="text-sm font-semibold text-white truncate">{bookmark.title}</p>
                      <p className="text-[11px] text-slate-300 truncate">{bookmark.url}</p>
                      {bookmark.description && (
                        <p className="text-[11px] text-slate-300 line-clamp-2">{bookmark.description}</p>
                      )}
                    </div>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1 text-[11px]">
                    <Button
                      variant="secondary"
                      size="sm"
                      className="px-3 py-1"
                      onClick={() => openLink(bookmark.url)}
                    >
                      <ExternalLink className="w-3 h-3 mr-1" />
                      열기
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="px-3 py-1"
                      onClick={() => handleCopyUrl(bookmark.url)}
                    >
                      <Copy className="w-3 h-3 mr-1" />
                      복사
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="px-3 py-1"
                      onClick={() => startEdit(bookmark)}
                    >
                      <Edit3 className="w-3 h-3 mr-1" />
                      수정
                    </Button>
                    <Button
                      variant="danger"
                      size="sm"
                      className="px-3 py-1"
                      onClick={() => handleDeleteBookmark(bookmark._id!)}
                    >
                      <Trash2 className="w-3 h-3 mr-1" />
                      삭제
                    </Button>
                  </div>
                </motion.div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>

        <AnimatePresence>
          {isAddingNew && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              className="space-y-3 rounded-2xl border border-dashed border-white/20 bg-slate-900/80 p-4"
              key="new-bookmark"
            >
              <div className="grid gap-2 sm:grid-cols-[60px,1fr]">
                <Input
                  type="text"
                  placeholder="아이콘"
                  value={formData.icon}
                  onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                  className="text-center py-2"
                />
                <Input
                  type="text"
                  placeholder="제목"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="py-2"
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
                placeholder="설명 (선택)"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
              <div className="flex flex-wrap gap-2">
                <Button variant="primary" size="sm" onClick={handleAddBookmark} className="px-3 py-1">
                  <Save className="w-3 h-3 mr-1" />
                  저장
                </Button>
                <Button variant="ghost" size="sm" onClick={cancelEdit} className="px-3 py-1">
                  <X className="w-3 h-3 mr-1" />
                  취소
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {!isAddingNew && !hasBookmarks && (
          <div className="rounded-2xl border border-dashed border-white/25 bg-slate-900/85 p-5 text-center space-y-3 text-sm text-slate-100 shadow-inner">
            <Globe className="w-12 h-12 mx-auto text-slate-400 drop-shadow-sm" />
            <p className="leading-relaxed">아직 바로가기가 없습니다. 새 바로가기를 추가해보세요.</p>
            <div>
              <Button variant="primary" size="sm" className="bg-blue-600 px-3 py-1.5 text-white text-sm" onClick={handleOpenForm}>
                <Plus className="w-3.5 h-3.5 mr-1" />
                바로가기 추가
              </Button>
            </div>
          </div>
        )}

        {isFiltering && filteredCount === 0 && hasBookmarks && (
          <div className="rounded-2xl border border-dashed border-white/25 bg-slate-900/85 p-5 text-center space-y-3 text-sm text-slate-100">
            검색 결과가 없습니다.
            <div>
              <Button variant="ghost" size="sm" className="text-slate-100 px-3 py-1" onClick={() => setFilterQuery('')}>
                검색 초기화
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
