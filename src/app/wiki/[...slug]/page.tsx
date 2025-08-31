'use client'

import React, { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useRouter, useParams, notFound } from 'next/navigation'
import { 
  Search, Edit, History, MessageSquare, Eye, Star,
  ArrowLeft, Settings, Share2, Bookmark, Clock,
  Users, Shield, Lock, AlertCircle, ExternalLink,
  BookOpen, Home, Menu, User, LogIn, LogOut, ChevronDown
} from 'lucide-react'
import { Card, CardHeader, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import NamuWikiRenderer from '@/components/ui/NamuWikiRenderer'
import WikiEditor from '@/components/ui/WikiEditor'
import { useWikiAuth } from '@/contexts/WikiAuthContext'
import { formatDate } from '@/lib/utils'

type WikiTabType = 'document' | 'edit' | 'history'

interface WikiPageData {
  id: string
  title: string
  slug: string
  namespace: string
  content: string
  summary: string
  categories: string[]
  tags: string[]
  creator: string
  creatorId: string
  lastEditor: string
  lastEditorId: string
  lastEditDate: string
  lastEditSummary: string
  currentRevision: number
  protection: {
    level: 'none' | 'autoconfirmed' | 'sysop'
    reason: string
    expiry: string | null
  }
  isRedirect: boolean
  redirectTarget: string | null
  isDeleted: boolean
  isStub: boolean
  isFeatured: boolean
  views: number
  uniqueViews: number
  edits: number
  watchers: string[]
  discussions: any[]
  incomingLinks: string[]
  outgoingLinks: string[]
  tableOfContents: any[]
  revisions: any[]
}

export default function WikiDocumentPage() {
  const router = useRouter()
  const params = useParams()
  const { wikiUser, isLoggedIn, logout, isModerator } = useWikiAuth()
  
  // URL에서 슬러그 추출 및 디코딩
  const rawSlug = Array.isArray(params.slug) ? params.slug.join('/') : params.slug || ''
  const slug = decodeURIComponent(rawSlug)
  
  const [currentPage, setCurrentPage] = useState<WikiPageData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<WikiTabType>('document')
  const [searchQuery, setSearchQuery] = useState('')
  const [editContent, setEditContent] = useState('')
  const [editSummary, setEditSummary] = useState('')
  const [currentRevision, setCurrentRevision] = useState<number | null>(null)
  const [revisions, setRevisions] = useState<any[]>([])
  const [isLoadingRevisions, setIsLoadingRevisions] = useState(false)
  const [diffView, setDiffView] = useState<{ a?: any; b?: any } | null>(null)
  const [discussions, setDiscussions] = useState<any[]>([])
  const [newDiscussion, setNewDiscussion] = useState({ topic: '', content: '' })
  const [isProtecting, setIsProtecting] = useState(false)
  const [protectLevel, setProtectLevel] = useState<'none' | 'semi' | 'full' | 'admin'>('none')
  const [protectReason, setProtectReason] = useState('')
  const [templateType, setTemplateType] = useState<string>('')
  const [templateCommand, setTemplateCommand] = useState<string>('')
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false)
  const userMenuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (!userMenuRef.current) return
      if (!userMenuRef.current.contains(e.target as Node)) setIsUserMenuOpen(false)
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [])

  const canShowProtectUI = isLoggedIn && (
    wikiUser?.permissions?.canProtect ||
    wikiUser?.role === 'moderator' ||
    wikiUser?.role === 'admin' ||
    wikiUser?.role === 'owner'
  )

  function mapIncomingProtectionLevel(level: any): 'none' | 'semi' | 'full' | 'admin' {
    switch (level) {
      case 'semi':
      case 'full':
      case 'admin':
      case 'none':
        return level
      case 'autoconfirmed':
        return 'semi'
      case 'sysop':
        return 'admin'
      default:
        return 'none'
    }
  }

  // 페이지 데이터 로드
  useEffect(() => {
    const loadPage = async () => {
      if (!slug) {
        setIsLoading(false)
        return
      }

      try {
        setIsLoading(true)
        
        // API 호출하여 페이지 데이터 가져오기 (이미 디코딩된 slug 사용)
        const response = await fetch(`/api/wiki/pages?title=${encodeURIComponent(slug)}`)
        const data = await response.json()
        
        if (data.success && data.page) {
          // 첫 줄이 #REDIRECT [[...]] 라면 대상 문서로 이동
          if (typeof data.page.content === 'string') {
            const firstLine = data.page.content.split('\n')[0].trim()
            const m = firstLine.match(/^#REDIRECT\s+\[\[([^\]]+)\]\]/i)
            if (m && m[1]) {
              router.push(`/wiki/${encodeURIComponent(m[1])}`)
              return
            }
          }
          setCurrentPage(data.page)
          setEditContent(data.page.content)
          setCurrentRevision(data.page.currentRevision)
        } else {
          // 페이지가 없으면 새 문서 생성 모드 (빈 상태에서 템플릿을 선택/명령으로 불러오도록 유도)
          setCurrentPage(null)
          setActiveTab('edit')
          setEditContent('')
        }
      } catch (error) {
        console.error('페이지 로드 오류:', error)
        setCurrentPage(null)
      } finally {
        setIsLoading(false)
      }
    }

    loadPage()
  }, [slug])

  // 리비전 목록 로드
  const loadRevisions = async () => {
    if (!slug) return
    setIsLoadingRevisions(true)
    try {
      const res = await fetch(`/api/wiki/pages/revisions?title=${encodeURIComponent(slug)}&limit=50`)
      const data = await res.json()
      if (data.success) {
        setRevisions(data.revisions || [])
      }
    } finally {
      setIsLoadingRevisions(false)
    }
  }

  // 편집 모드로 전환
  const handleEditMode = () => {
    if (!isLoggedIn) {
      router.push('/wiki/login')
      return
    }
    setActiveTab('edit')
  }

  // 저장
  const handleSave = async () => {
    if (!editContent.trim()) {
      alert('내용이 비어 있습니다.')
      return
    }
    if (!isLoggedIn) {
      alert('로그인이 필요합니다. 로그인 페이지로 이동합니다.')
      router.push('/wiki/login')
      return
    }

    try {
      const method = currentPage ? 'PUT' : 'POST'
      const body = {
        title: currentPage?.title || slug,
        content: editContent,
        summary: editSummary || '문서 편집',
        editSummary: editSummary || '문서 편집',
        namespace: currentPage?.namespace || 'main',
        expectedRevision: currentPage ? currentRevision : undefined
      }

      const response = await fetch('/api/wiki/pages', {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(body)
      })

      if (response.status === 401) {
        alert('로그인이 필요합니다. 로그인 페이지로 이동합니다.')
        router.push('/wiki/login')
        return
      }

      const data = await response.json()

      if (data.success) {
        // 페이지 새로고침 또는 업데이트
        window.location.reload()
      } else {
        if (response.status === 409 && data.conflict?.currentRevision) {
          alert('편집 충돌: 화면을 새로고침하여 최신 내용을 반영하세요.')
          return
        }
        alert('저장에 실패했습니다: ' + (data.error || '알 수 없는 오류'))
      }
    } catch (error) {
      console.error('저장 오류:', error)
      alert('저장 중 오류가 발생했습니다.')
    }
  }

  // 템플릿 불러오기: 템플릿 네임스페이스의 `템플릿:{분야}` 문서를 불러와 편집기에 삽입
  const loadTemplateByType = async (type: string) => {
    if (!type) return
    try {
      const title = `템플릿:${type}`
      const url = `/api/wiki/pages?title=${encodeURIComponent(title)}&namespace=template`
      const res = await fetch(url)
      if (!res.ok) {
        alert('템플릿을 찾을 수 없습니다.')
        return
      }
      const data = await res.json()
      if (data?.page?.content) {
        if (editContent && !confirm('현재 내용을 템플릿으로 대체할까요?')) return
        setEditContent(data.page.content)
      } else {
        alert('템플릿 내용이 비어 있습니다.')
      }
    } catch (e) {
      alert('템플릿 불러오기 중 오류가 발생했습니다.')
    }
  }

  const handleTemplateCommand = async () => {
    const cmd = templateCommand.trim()
    if (!cmd) return
    const m = cmd.match(/^\/(템플릿|template)\s+(.+)$/i)
    if (m) {
      const type = m[2].trim()
      await loadTemplateByType(type)
    } else {
      alert('명령어 형식: /템플릿 인물')
    }
  }

  // 토론 불러오기
  const loadDiscussions = async () => {
    if (!slug) return
    try {
      const res = await fetch(`/api/wiki/discussions?title=${encodeURIComponent(slug as string)}`)
      const data = await res.json()
      if (data.success) setDiscussions(data.discussions || [])
    } catch {}
  }

  // 문서 보호 설정 저장
  const handleProtect = async () => {
    if (!isLoggedIn) {
      router.push('/wiki/login')
      return
    }
    try {
      setIsProtecting(true)
      const response = await fetch('/api/wiki/pages/protect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          title: currentPage?.title || slug,
          level: protectLevel,
          reason: protectReason
        })
      })
      const data = await response.json()
      if (data.success) {
        window.location.reload()
      } else {
        alert(data.error || '보호 설정에 실패했습니다.')
      }
    } catch (e) {
      console.error(e)
      alert('보호 설정 중 오류가 발생했습니다.')
    } finally {
      setIsProtecting(false)
    }
  }

  // 검색
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      router.push(`/wiki/search?q=${encodeURIComponent(searchQuery)}`)
    }
  }

  // 탭 컨텐츠 렌더링
  const renderTabContent = () => {
    if (!currentPage && activeTab !== 'edit') return null

    switch (activeTab) {
      case 'document':
        if (!currentPage) return null
        
        return (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            {/* 메인 컨텐츠 (우측) */}
            <div className="lg:col-span-3">
              <motion.div
                className="prose prose-sm sm:prose-base md:prose-lg max-w-none prose-invert"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
              >
                <NamuWikiRenderer
                  content={currentPage.content}
                  generateTableOfContents={true}
                  onLinkClick={(link) => router.push(`/wiki/${encodeURIComponent(link)}`)}
                />
              </motion.div>

              {/* CAPTCHA 유도 메시지 표시 (서버가 429와 함께 captcha 제공 시 UI로 노출하는 용도) */}
              {/* 간단한 입력과 제출. 실제 동작은 편집 시 429 응답을 받아 토큰/질문 표시 후 여기서 POST */}
              <div id="captcha-container" className="hidden mt-6 p-4 bg-gray-800 border border-gray-700 rounded">
                <h4 className="text-gray-200 font-semibold mb-2">보안 확인</h4>
                <p className="text-sm text-gray-400 mb-3">편집이 일시적으로 제한되었습니다. 아래 질문에 답해주세요.</p>
                <div className="flex items-center gap-2">
                  <span id="captcha-question" className="text-gray-200"></span>
                  <input id="captcha-answer" className="bg-gray-700 text-gray-200 px-2 py-1 rounded border border-gray-600 w-24" />
                  <Button
                    onClick={async () => {
                      const questionEl = document.getElementById('captcha-question') as HTMLSpanElement
                      const answerEl = document.getElementById('captcha-answer') as HTMLInputElement
                      const token = questionEl?.dataset.token || ''
                      const answer = answerEl?.value || ''
                      try {
                        const res = await fetch('/api/wiki/pages/captcha', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ token, answer })
                        })
                        const data = await res.json()
                        if (data.success) {
                          // 통과 후 새로고침하여 편집 재시도 가능
                          window.location.reload()
                        } else {
                          alert(data.error || 'CAPTCHA 검증 실패')
                        }
                      } catch (e) {
                        alert('CAPTCHA 처리 중 오류')
                      }
                    }}
                    className="bg-gray-700 hover:bg-gray-600 text-gray-200"
                  >
                    제출
                  </Button>
                </div>
              </div>

              {/* 카테고리 */}
              {currentPage.categories.length > 0 && (
                <motion.div
                  className="mt-8 p-4 bg-gray-800 rounded-lg border border-gray-700"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3 }}
                >
                  <h4 className="font-semibold text-gray-200 mb-2">분류</h4>
                  <div className="flex flex-wrap gap-2">
                    {currentPage.categories.map((category, index) => (
                      <button
                        key={index}
                        onClick={() => router.push(`/wiki/category/${encodeURIComponent(category)}`)}
                        className="px-2 py-1 bg-gray-700 text-gray-300 rounded text-sm hover:bg-gray-600"
                      >
                        {category}
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* 라이선스 정보 */}
              <div className="mt-8 p-4 bg-gray-800 rounded-lg text-xs text-gray-400 border border-gray-700">
                <p>
                  이 문서는 <strong>이랑위키</strong>의 문서입니다. 
                  내용은 위키 사용자들에 의해 자유롭게 편집될 수 있으며, 
                  모든 기여는 공동체의 지식 향상을 위한 것입니다.
                </p>
              </div>
            </div>

            {/* 사이드바 (좌측) */}
            <div className="lg:col-span-1">
              <div className="sticky top-24 space-y-6">
                {/* 문서 정보 */}
                <Card className="bg-gray-800 border-gray-700">
                  <CardHeader>
                    <h3 className="font-semibold text-gray-200">문서 정보</h3>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <h4 className="font-semibold text-gray-200 mb-2">기본 정보</h4>
                      <div className="space-y-1 text-sm">
                        <p className="text-gray-400">제목: <span className="text-gray-300">{currentPage.title}</span></p>
                        <p className="text-gray-400">네임스페이스: <span className="text-gray-300">{currentPage.namespace}</span></p>
                        <p className="text-gray-400">리비전: <span className="text-gray-300">{currentPage.currentRevision}</span></p>
                      </div>
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-200 mb-2">편집 정보</h4>
                      <div className="space-y-1 text-sm">
                        <p className="text-gray-400">최종 수정: <span className="text-gray-300">{formatDate.withTime(new Date(currentPage.lastEditDate))}</span></p>
                        <p className="text-gray-400">편집자: <span className="text-gray-300">{currentPage.lastEditor}</span></p>
                        <p className="text-gray-400">편집 요약: <span className="text-gray-300">{currentPage.lastEditSummary}</span></p>
                      </div>
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-200 mb-2">통계</h4>
                      <div className="space-y-1 text-sm">
                        <p className="text-gray-400">총 편집 수: <span className="text-gray-300">{currentPage.edits}회</span></p>
                        <p className="text-gray-400">문서 크기: <span className="text-gray-300">{currentPage.content.length.toLocaleString()} bytes</span></p>
                        <p className="text-gray-400">고유 조회: <span className="text-gray-300">{currentPage.uniqueViews.toLocaleString()}회</span></p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* 보호 상태 */}
                {currentPage.protection.level !== 'none' && (
                  <Card className="bg-gray-800 border-gray-700">
                    <CardContent className="p-4">
                      <div className="flex items-center space-x-2 text-orange-400">
                        <Shield className="w-4 h-4" />
                        <span className="font-medium">보호된 문서</span>
                      </div>
                      <p className="text-sm text-gray-400 mt-1">
                        {currentPage.protection.reason}
                      </p>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          </div>
        )

      case 'edit':
        return (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="space-y-6"
          >
            <Card className="bg-gray-800 border-gray-700">
              <CardContent className="p-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">템플릿 선택</label>
                    <select
                      value={templateType}
                      onChange={(e) => setTemplateType(e.target.value)}
                      className="w-full bg-gray-700 text-gray-200 border border-gray-600 rounded px-2 py-2"
                    >
                      <option value="">선택하세요</option>
                      {['인물','학교','게임','음악','연구','케미','개발','내각','스포츠','기업'].map((t) => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm text-gray-400 mb-1">명령어 (예: /템플릿 인물)</label>
                    <div className="flex gap-2">
                      <input
                        value={templateCommand}
                        onChange={(e) => setTemplateCommand(e.target.value)}
                        className="flex-1 bg-gray-700 text-gray-200 border border-gray-600 rounded px-3 py-2"
                        placeholder="/템플릿 인물"
                      />
                      <Button onClick={async () => { await handleTemplateCommand() }} className="bg-gray-700 hover:bg-gray-600 text-gray-200">불러오기</Button>
                    </div>
                  </div>
                </div>
                <div className="mt-3">
                  <Button onClick={async () => { await loadTemplateByType(templateType) }} disabled={!templateType} className="bg-gray-700 hover:bg-gray-600 text-gray-200">
                    선택한 템플릿 적용
                  </Button>
                </div>
              </CardContent>
            </Card>
            <WikiEditor
              content={editContent}
              onChange={setEditContent}
              onSave={handleSave}
              title={currentPage ? `${currentPage.title} 편집` : `${slug} 생성`}
              showPreview={false}
            />
            
            <Card className="bg-gray-800 border-gray-700">
              <CardContent className="p-4">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      편집 요약
                    </label>
                    <Input
                      value={editSummary}
                      onChange={(e) => setEditSummary(e.target.value)}
                      placeholder="변경 내용을 간단히 설명해주세요..."
                      className="w-full bg-gray-700 border-gray-600 text-gray-200 placeholder-gray-400 focus:border-gray-500"
                    />
                  </div>
                  
                  <div className="flex space-x-3">
                    <Button onClick={handleSave} className="bg-gray-700 hover:bg-gray-600 text-gray-200">
                      {currentPage ? '변경사항 저장' : '새 문서 생성'}
                    </Button>
                    <Button 
                      variant="ghost" 
                      onClick={() => currentPage ? setActiveTab('document') : router.push('/wiki')}
                      className="text-gray-400 hover:text-gray-200"
                    >
                      취소
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )

      case 'history':
        return (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-200">편집 역사</h3>
                    <p className="text-sm text-gray-400">리비전 목록과 비교/되돌리기를 제공합니다.</p>
                  </div>
                  <Button onClick={loadRevisions} className="bg-gray-700 hover:bg-gray-600 text-gray-200">
                    {isLoadingRevisions ? '불러오는 중...' : '리비전 새로고침'}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {revisions.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">리비전이 없습니다. 버튼으로 새로고침 해보세요.</div>
                ) : (
                  <div className="space-y-2">
                    {revisions.map((r) => (
                      <div key={r.revisionNumber} className="flex items-center justify-between text-sm bg-gray-900 rounded px-3 py-2">
                        <div className="flex items-center gap-3">
                          <span className="text-gray-400">r{r.revisionNumber}</span>
                          <span className="text-gray-300">{r.editType}</span>
                          <span className="text-gray-400">{r.summary || '-'}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            className="text-blue-400 hover:text-blue-300"
                            onClick={async () => {
                              const q = new URLSearchParams({ title: slug as string, rev: String(r.revisionNumber) })
                              const res = await fetch(`/api/wiki/pages/revisions?${q.toString()}`)
                              const data = await res.json()
                              if (data.success) {
                                setDiffView({ a: data.previous, b: data.revision })
                              }
                            }}
                          >
                            비교
                          </Button>
                          <Button
                            variant="ghost"
                            className="text-red-400 hover:text-red-300"
                            onClick={async () => {
                              if (!confirm(`r${r.revisionNumber}으로 되돌리시겠습니까?`)) return
                              const res = await fetch('/api/wiki/pages/revert', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                credentials: 'include',
                                body: JSON.stringify({ title: slug, revisionNumber: r.revisionNumber })
                              })
                              const data = await res.json()
                              if (data.success) {
                                window.location.reload()
                              } else {
                                alert(data.error || '되돌리기 실패')
                              }
                            }}
                          >
                            되돌리기
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Diff 뷰어 */}
            {diffView?.b && (
              <Card className="bg-gray-800 border-gray-700 mt-4">
                <CardHeader>
                  <h4 className="text-gray-200 font-semibold">Diff 비교 (r{diffView.a?.revisionNumber || 0} → r{diffView.b.revisionNumber})</h4>
                </CardHeader>
                <CardContent>
                  <DiffViewer oldText={diffView.a?.content || ''} newText={diffView.b.content || ''} />
                </CardContent>
              </Card>
            )}
          </motion.div>
        )

      default:
        return null
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-400 mx-auto mb-4"></div>
          <p className="text-lg text-gray-400">문서를 불러오고 있습니다...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100" suppressHydrationWarning>
      {/* 헤더 */}
      <header className="border-b border-gray-700 bg-gray-800 sticky top-0 z-50" onClick={() => setIsUserMenuOpen(false)}>
        <div className="max-w-7xl mx-auto px-2 sm:px-4">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <motion.button
                className="flex items-center space-x-2 text-gray-400 hover:text-gray-200"
                onClick={() => router.push('/')}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Home className="w-5 h-5" />
                <span className="font-bold text-lg hidden sm:block">Rangu.fam</span>
              </motion.button>
              
              <div className="text-gray-600">|</div>
              
              <motion.button
                className="flex items-center space-x-2 text-gray-400 hover:text-gray-200"
                onClick={() => router.push('/wiki')}
                whileHover={{ scale: 1.02 }}
              >
                <BookOpen className="w-6 h-6" />
                <h1 className="text-xl font-bold">이랑위키</h1>
              </motion.button>
            </div>

            <div className="flex-1 max-w-md mx-4">
              <form onSubmit={handleSearch} className="relative">
                <Input
                  type="text"
                  placeholder="검색할 문서명을 입력하세요..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pr-10 bg-gray-700 border-gray-600 text-gray-200 placeholder-gray-400 focus:border-gray-500"
                />
                <button
                  type="submit"
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-200"
                >
                  <Search className="w-4 h-4" />
                </button>
              </form>
            </div>

            <div className="flex items-center space-x-2">

              {/* 운영자 대시보드 버튼 (운영자만 표시) */}
              {isLoggedIn && isModerator && (
                <button
                  onClick={() => router.push('/admin')}
                  className="flex items-center space-x-1 text-yellow-400 hover:text-yellow-300 border border-yellow-400 hover:border-yellow-300 px-3 py-2 rounded-md transition-colors"
                  title="운영자 대시보드"
                >
                  <Shield className="w-4 h-4" />
                  <span className="hidden sm:block">운영자</span>
                </button>
              )}
              


              {isLoggedIn ? (
                <div className="flex items-center space-x-3 relative" ref={userMenuRef}>
                  <button
                    type="button"
                    onClick={() => setIsUserMenuOpen((v) => !v)}
                    className="text-sm text-gray-300 hover:text-white bg-gray-700 hover:bg-gray-600 px-3 py-2 rounded-md border border-gray-600 cursor-pointer transition-colors"
                    title="사용자 메뉴"
                  >
                    {wikiUser?.displayName}
                  </button>
                  {isUserMenuOpen && (
                    <div className="absolute right-0 top-6 w-44 bg-gray-800 border border-gray-700 rounded shadow-lg z-50">
                      {/* 디버깅을 위한 사용자 정보 표시 */}
                      <div className="px-3 py-2 text-xs text-gray-400 border-b border-gray-600">
                        역할: {wikiUser?.role || '없음'}<br/>
                        권한: {wikiUser?.permissions?.canManageUsers ? '관리자' : '일반'}
                      </div>
                      
                      {((wikiUser?.role === 'moderator') || (wikiUser?.role === 'admin') || (wikiUser?.role === 'owner') || wikiUser?.permissions?.canManageUsers) && (
                        <button
                          className="block w-full text-left px-3 py-2 text-sm text-gray-200 hover:bg-gray-700"
                          onClick={() => { setIsUserMenuOpen(false); router.push('/admin') }}
                        >
                          운영자 대시보드
                        </button>
                      )}
                      <button
                        className="block w-full text-left px-3 py-2 text-sm text-gray-200 hover:bg-gray-700"
                        onClick={() => { setIsUserMenuOpen(false); logout() }}
                      >
                        로그아웃
                      </button>
                    </div>
                  )}
                  
                </div>
              ) : (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => router.push('/wiki/login')}
                  className="flex items-center space-x-1 text-gray-400 hover:text-gray-200"
                >
                  <LogIn className="w-4 h-4" />
                  <span className="hidden sm:block">로그인</span>
                </Button>
              )}
            </div>
          </div>

          {/* 페이지 제목 및 액션 */}
          <div className="py-4 border-t border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-200">
                  {currentPage?.title || slug}
                </h1>
                {currentPage && (
                  <div className="flex items-center space-x-4 text-sm text-gray-400 mt-1">
                    <div className="flex items-center space-x-1">
                      <Eye className="w-4 h-4" />
                      <span>{currentPage.views.toLocaleString()}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Clock className="w-4 h-4" />
                      <span>{formatDate.relative(new Date(currentPage.lastEditDate))}</span>
                    </div>
                  </div>
                )}
              </div>
              
              {/* 탭 네비게이션 */}
              <div className="flex space-x-1">
                {[
                  { id: 'document', label: '문서', icon: Eye },
                  { id: 'edit', label: '편집', icon: Edit },
                  { id: 'history', label: '역사', icon: History }
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as WikiTabType)}
                    className={`
                      flex items-center space-x-2 px-4 py-2 border-b-2 transition-colors
                      ${activeTab === tab.id 
                        ? 'border-gray-400 text-gray-200 bg-gray-700' 
                        : 'border-transparent text-gray-400 hover:text-gray-200 hover:border-gray-600'
                      }
                    `}
                  >
                    <tab.icon className="w-4 h-4" />
                    <span>{tab.label}</span>
                  </button>
                ))}
                {/* 감시 토글 */}
                {isLoggedIn && currentPage && (
                  <button
                    onClick={async () => {
                      const action = 'watch' // 간단히 watch만. 필요 시 토글로 확장
                      const res = await fetch('/api/wiki/watchlist', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        credentials: 'include',
                        body: JSON.stringify({ title: currentPage.title, action })
                      })
                      const data = await res.json()
                      if (!data.success) alert(data.error || '감시목록 추가 실패')
                    }}
                    className="px-3 py-2 text-sm text-gray-300 hover:text-gray-100"
                    title="감시목록에 추가"
                  >
                    감시
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* 메인 컨텐츠 */}
      <main className="max-w-7xl mx-auto px-2 sm:px-4 md:px-6 py-4 sm:py-6 md:py-8">
        {/* 퀵 액션 버튼 (문서 탭에서만) */}
        {activeTab === 'document' && currentPage && (
          <motion.div
            className="mb-6 flex justify-end"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Button
              onClick={handleEditMode}
              disabled={!isLoggedIn}
              className="bg-gray-700 hover:bg-gray-600 text-gray-200"
            >
              <Edit className="w-4 h-4 mr-2" />
              편집
            </Button>
            {/* 신고 버튼 */}
            <Button
              variant="ghost"
              className="ml-2 text-gray-300 hover:text-gray-100"
              onClick={async () => {
                const reason = prompt('신고 사유를 입력하세요')
                if (!reason) return
                try {
                  const res = await fetch('/api/wiki/mod/reports', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({ title: slug, reason })
                  })
                  const data = await res.json()
                  if (data.success) alert('신고가 접수되었습니다.')
                  else alert(data.error || '신고 실패')
                } catch {
                  alert('신고 처리 중 오류')
                }
              }}
            >
              신고
            </Button>
            {/* 보호 버튼: 운영 권한 사용자 노출(간단히 로그인 사용자 모두 노출 후 서버에서 권한검증) */}
            {canShowProtectUI && (
              <Button
                variant="ghost"
                onClick={() => {
                  setProtectLevel(mapIncomingProtectionLevel(currentPage.protection.level as any))
                }}
                className="ml-2 text-gray-300 hover:text-gray-100"
                title="문서 보호 설정"
              >
                <Shield className="w-4 h-4 mr-1" />
                보호
              </Button>
            )}
          </motion.div>
        )}

        {/* 탭 컨텐츠 */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            {renderTabContent()}

            {/* 보호 설정 패널 (간단 버전) */}
            {activeTab === 'document' && currentPage && canShowProtectUI && (
              <div className="mt-8 p-4 bg-gray-800 border border-gray-700 rounded">
                <div className="flex items-center mb-2 text-gray-200">
                  <Shield className="w-4 h-4 mr-2" />
                  <span className="font-medium">문서 보호</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">레벨</label>
                    <select
                      value={protectLevel}
                      onChange={(e) => setProtectLevel(e.target.value as any)}
                      className="w-full bg-gray-700 text-gray-200 border border-gray-600 rounded px-2 py-2"
                    >
                      <option value="none">none (보호 해제)</option>
                      <option value="semi">semi (반보호)</option>
                      <option value="full">full (준전면 보호)</option>
                      <option value="admin">admin (전면 보호)</option>
                    </select>
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm text-gray-400 mb-1">사유</label>
                    <input
                      value={protectReason}
                      onChange={(e) => setProtectReason(e.target.value)}
                      placeholder="보호/해제 사유 입력"
                      className="w-full bg-gray-700 text-gray-200 border border-gray-600 rounded px-3 py-2"
                    />
                  </div>
                </div>
                <div className="mt-3">
                  <Button onClick={handleProtect} disabled={isProtecting} className="bg-gray-700 hover:bg-gray-600 text-gray-200">
                    {isProtecting ? '적용 중...' : '보호 설정 적용'}
                  </Button>
                </div>
                {currentPage?.protection?.level !== 'none' && (
                  <div className="mt-3 text-sm text-gray-400">
                    현재 보호: <span className="text-gray-200 font-medium">{currentPage.protection.level}</span>
                    {currentPage.protection.reason && <>
                      {' '}· 사유: <span className="text-gray-300">{currentPage.protection.reason}</span>
                    </>}
                  </div>
                )}
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  )
} 

function DiffViewer({ oldText, newText }: { oldText: string; newText: string }) {
  const oldLines = (oldText || '').split('\n')
  const newLines = (newText || '').split('\n')
  const maxLen = Math.max(oldLines.length, newLines.length)
  const rows = [] as React.ReactNode[]
  for (let i = 0; i < maxLen; i++) {
    const a = oldLines[i] ?? ''
    const b = newLines[i] ?? ''
    let cls = 'bg-gray-900'
    if (a !== b) {
      if (!a && b) cls = 'bg-green-900/30'
      else if (a && !b) cls = 'bg-red-900/30'
      else cls = 'bg-yellow-900/20'
    }
    rows.push(
      <div key={i} className={`grid grid-cols-2 gap-2 px-2 py-1 text-sm ${cls}`}>
        <pre className="whitespace-pre-wrap text-gray-300">{a}</pre>
        <pre className="whitespace-pre-wrap text-gray-300">{b}</pre>
      </div>
    )
  }
  return (
    <div className="border border-gray-700 rounded overflow-hidden">
      <div className="grid grid-cols-2 text-xs text-gray-400 bg-gray-800 px-2 py-1">
        <div>이전</div>
        <div>현재</div>
      </div>
      <div className="divide-y divide-gray-800">{rows}</div>
    </div>
  )
}