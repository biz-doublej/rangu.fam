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
  X,
} from 'lucide-react'
import { Bookmark } from '@/types'
import { CaveatText, Pin, TapeStrip } from '@/components/scrapbook'
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
  icon: '🔗',
}

// 종이 톤 input/button 공통 클래스
const paperInput =
  'w-full rounded-xl border border-ink-500/15 bg-paper-50/80 px-3 py-2 text-sm text-ink-500 placeholder:text-ink-300 transition focus:border-coral-500/60 focus:bg-paper-50 focus:outline-none focus:ring-2 focus:ring-coral-500/20'

const tinyButton =
  'inline-flex items-center gap-1 rounded-lg border border-ink-500/15 bg-paper-50 px-2.5 py-1 text-[11px] font-medium text-ink-500 transition hover:border-ink-500/35 hover:bg-paper-100'

const tinyButtonDanger =
  'inline-flex items-center gap-1 rounded-lg border border-coral-500/40 bg-coral-500/10 px-2.5 py-1 text-[11px] font-medium text-coral-500 transition hover:border-coral-500/60 hover:bg-coral-500/15'

// 북마크 카드 핀 색상 순환 (시각적 변주)
const PIN_COLORS = ['coral', 'sage', 'mustard'] as const
const TAPE_COLORS = ['coral', 'sage', 'yellow'] as const

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
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, ...formData }),
      })

      const data = await response.json()

      if (data.success) {
        setBookmarks([...bookmarks, data.data])
        setFormData(defaultBookmarkForm)
        setIsAddingNew(false)
        toast.success('바로가기를 추가했어요.')
      } else {
        toast.error(data.error || '바로가기 추가에 실패했어요.')
      }
    } catch (error) {
      console.error('북마크 추가 오류:', error)
      toast.error('서버 오류가 발생했어요.')
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
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      const data = await response.json()

      if (data.success) {
        setBookmarks(
          bookmarks.map((bookmark) =>
            bookmark._id === bookmarkId ? data.data : bookmark
          )
        )
        setEditingId(null)
        setFormData(defaultBookmarkForm)
        toast.success('바로가기를 수정했어요.')
      } else {
        toast.error(data.error || '바로가기 수정에 실패했어요.')
      }
    } catch (error) {
      console.error('북마크 수정 오류:', error)
      toast.error('서버 오류가 발생했어요.')
    }
  }

  const handleDeleteBookmark = async (bookmarkId: string) => {
    if (!userId) return
    if (!confirm('정말로 이 바로가기를 삭제할까요?')) return

    try {
      const response = await fetch(`/api/bookmarks/${bookmarkId}`, { method: 'DELETE' })
      const data = await response.json()

      if (data.success) {
        setBookmarks(bookmarks.filter((bookmark) => bookmark._id !== bookmarkId))
        toast.success('바로가기를 삭제했어요.')
      } else {
        toast.error(data.error || '바로가기 삭제에 실패했어요.')
      }
    } catch (error) {
      console.error('북마크 삭제 오류:', error)
      toast.error('서버 오류가 발생했어요.')
    }
  }

  const startEdit = (bookmark: Bookmark) => {
    setEditingId(bookmark._id || null)
    setIsAddingNew(false)
    setFormData({
      title: bookmark.title,
      url: bookmark.url,
      description: bookmark.description || '',
      icon: bookmark.icon || '🔗',
    })
  }

  const cancelEdit = () => {
    setEditingId(null)
    setIsAddingNew(false)
    setFormData(defaultBookmarkForm)
  }

  const filteredBookmarks = useMemo(() => {
    const query = filterQuery.trim().toLowerCase()
    if (!query) return bookmarks

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
      toast.success('URL이 클립보드에 복사되었어요.')
    } catch (error) {
      console.error('URL 복사 실패:', error)
      toast.error('URL을 복사할 수 없어요.')
    }
  }

  const handleOpenForm = () => {
    setEditingId(null)
    setIsAddingNew(true)
    setFormData(defaultBookmarkForm)
  }

  // ── 로그인 안 됨 ───────────────────────────────────────
  if (!userId) {
    return (
      <div
        className={`relative w-full max-w-xs rounded-2xl border border-ink-500/12 bg-paper-50 p-5 shadow-paper ${className}`}
      >
        <TapeStrip className="tape--top" color="yellow" />
        <div className="flex items-center gap-2 text-sm text-ink-300">
          <Globe className="h-5 w-5 text-coral-500" />
          로그인하면 바로가기를 모아둘 수 있어요.
        </div>
      </div>
    )
  }

  // ── 로딩 ───────────────────────────────────────────────
  if (loading) {
    return (
      <div
        className={`relative w-full max-w-xs rounded-2xl border border-ink-500/12 bg-paper-50 p-5 shadow-paper space-y-3 ${className}`}
      >
        <TapeStrip className="tape--top" color="coral" />
        <div className="flex items-center gap-2">
          <Pin color="coral" />
          <h3 className="text-base font-semibold text-ink-500">바로가기</h3>
        </div>
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-12 rounded-xl bg-paper-100/70 animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  // ── 메인 ───────────────────────────────────────────────
  return (
    <div
      className={`relative w-full max-w-xs rounded-2xl border border-ink-500/12 bg-paper-50 p-5 shadow-paper space-y-4 ${className}`}
    >
      <TapeStrip className="tape--top" color="coral" />

      {/* 헤더 */}
      <div className="space-y-3">
        <div className="flex items-start gap-2">
          <Pin color="coral" className="mt-0.5" />
          <div className="flex-1">
            <CaveatText className="text-sm text-coral-500">quick links</CaveatText>
            <h3 className="text-lg font-bold text-ink-500 leading-tight">바로가기 컬렉션</h3>
          </div>
        </div>

        {/* 검색 + 추가 */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <input
              type="search"
              placeholder="제목·URL 검색"
              value={filterQuery}
              onChange={(e) => setFilterQuery(e.target.value)}
              className={`${paperInput} pl-8`}
              aria-label="바로가기 검색"
            />
            <Search className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-ink-300" />
          </div>
          <button
            type="button"
            onClick={handleOpenForm}
            className="ink-button !px-3 !py-2 text-xs"
          >
            <Plus className="h-3.5 w-3.5" />
            추가
          </button>
        </div>

        {/* 카운트 칩 */}
        <div className="flex flex-wrap items-center gap-2 text-[11px]">
          <span className="rounded-full bg-paper-100 px-2.5 py-0.5 font-semibold text-ink-300">
            총 <span className="text-ink-500">{bookmarks.length}</span>개
          </span>
          {isFiltering && (
            <span className="rounded-full bg-coral-500/10 px-2.5 py-0.5 font-semibold text-coral-500">
              {filteredCount}개 표시
            </span>
          )}
        </div>
      </div>

      {/* 본문: 항목 리스트 */}
      <div className="space-y-2">
        <AnimatePresence>
          {filteredBookmarks.map((bookmark, idx) => {
            const pinColor = PIN_COLORS[idx % PIN_COLORS.length]
            return (
              <motion.div
                key={bookmark._id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
              >
                {editingId === bookmark._id ? (
                  <BookmarkForm
                    formData={formData}
                    setFormData={setFormData}
                    onSave={() => handleEditBookmark(bookmark._id!)}
                    onCancel={cancelEdit}
                    saveLabel="저장"
                  />
                ) : (
                  <div className="group relative rounded-xl border border-ink-500/12 bg-paper-50 p-3 transition hover:border-ink-500/25 hover:bg-paper-100/40">
                    <div className="flex items-start gap-3">
                      <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-paper-100 border border-ink-500/10 text-lg">
                        {bookmark.icon || '🔗'}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-ink-500 truncate">
                          {bookmark.title}
                        </p>
                        <p className="text-[11px] text-ink-300 truncate">{bookmark.url}</p>
                        {bookmark.description && (
                          <p className="text-[11px] text-ink-300 line-clamp-2 mt-0.5">
                            {bookmark.description}
                          </p>
                        )}
                      </div>
                      <Pin color={pinColor} className="opacity-60 group-hover:opacity-100 transition" />
                    </div>

                    <div className="mt-2 flex flex-wrap gap-1">
                      <button
                        type="button"
                        onClick={() => openLink(bookmark.url)}
                        className={tinyButton}
                      >
                        <ExternalLink className="h-3 w-3" />
                        열기
                      </button>
                      <button
                        type="button"
                        onClick={() => handleCopyUrl(bookmark.url)}
                        className={tinyButton}
                      >
                        <Copy className="h-3 w-3" />
                        복사
                      </button>
                      <button
                        type="button"
                        onClick={() => startEdit(bookmark)}
                        className={tinyButton}
                      >
                        <Edit3 className="h-3 w-3" />
                        수정
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteBookmark(bookmark._id!)}
                        className={tinyButtonDanger}
                      >
                        <Trash2 className="h-3 w-3" />
                        삭제
                      </button>
                    </div>
                  </div>
                )}
              </motion.div>
            )
          })}
        </AnimatePresence>

        <AnimatePresence>
          {isAddingNew && (
            <motion.div
              key="new-bookmark"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
            >
              <BookmarkForm
                formData={formData}
                setFormData={setFormData}
                onSave={handleAddBookmark}
                onCancel={cancelEdit}
                saveLabel="추가"
                isNew
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* 빈 상태 */}
        {!isAddingNew && !hasBookmarks && (
          <div className="rounded-xl border border-dashed border-ink-500/20 bg-paper-100/40 p-5 text-center space-y-3">
            <Globe className="mx-auto h-10 w-10 text-ink-300" />
            <div>
              <CaveatText className="text-base text-coral-500">empty pinboard</CaveatText>
              <p className="text-sm leading-relaxed text-ink-300 mt-1">
                아직 바로가기가 없어요. 자주 쓰는 링크를 핀해보세요.
              </p>
            </div>
            <button type="button" onClick={handleOpenForm} className="ink-button !text-xs">
              <Plus className="h-3.5 w-3.5" />첫 바로가기 추가
            </button>
          </div>
        )}

        {/* 검색 결과 없음 */}
        {isFiltering && filteredCount === 0 && hasBookmarks && (
          <div className="rounded-xl border border-dashed border-ink-500/20 bg-paper-100/40 p-4 text-center space-y-2">
            <p className="text-sm text-ink-300">검색 결과가 없어요.</p>
            <button
              type="button"
              onClick={() => setFilterQuery('')}
              className={tinyButton}
            >
              검색 초기화
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ── 폼 (추가/수정 공용) ──────────────────────────────────
function BookmarkForm({
  formData,
  setFormData,
  onSave,
  onCancel,
  saveLabel,
  isNew = false,
}: {
  formData: BookmarkFormData
  setFormData: React.Dispatch<React.SetStateAction<BookmarkFormData>>
  onSave: () => void
  onCancel: () => void
  saveLabel: string
  isNew?: boolean
}) {
  return (
    <div
      className={`space-y-2 rounded-xl border p-3 ${
        isNew
          ? 'border-dashed border-coral-500/30 bg-coral-500/[0.04]'
          : 'border-ink-500/15 bg-paper-100/40'
      }`}
    >
      <div className="grid grid-cols-[52px,1fr] gap-2">
        <input
          type="text"
          placeholder="🔗"
          value={formData.icon}
          onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
          className={`${paperInput} text-center`}
          maxLength={4}
        />
        <input
          type="text"
          placeholder="제목"
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          className={paperInput}
        />
      </div>
      <input
        type="url"
        placeholder="https://example.com"
        value={formData.url}
        onChange={(e) => setFormData({ ...formData, url: e.target.value })}
        className={paperInput}
      />
      <input
        type="text"
        placeholder="설명 (선택)"
        value={formData.description}
        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
        className={paperInput}
      />
      <div className="flex flex-wrap gap-2 pt-1">
        <button type="button" onClick={onSave} className="ink-button !text-xs">
          <Save className="h-3 w-3" />
          {saveLabel}
        </button>
        <button type="button" onClick={onCancel} className={tinyButton}>
          <X className="h-3 w-3" />
          취소
        </button>
      </div>
    </div>
  )
}
