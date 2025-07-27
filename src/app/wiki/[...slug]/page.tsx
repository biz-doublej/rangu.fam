'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useRouter, useParams, notFound } from 'next/navigation'
import { 
  Search, Edit, History, MessageSquare, Eye, Star,
  ArrowLeft, Settings, Share2, Bookmark, Clock,
  Users, Shield, Lock, AlertCircle, ExternalLink,
  BookOpen, Home, Menu, User, LogIn, LogOut
} from 'lucide-react'
import { Card, CardHeader, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import NamuWikiRenderer from '@/components/ui/NamuWikiRenderer'
import WikiEditor from '@/components/ui/WikiEditor'
import { useWikiAuth } from '@/contexts/WikiAuthContext'
import { formatDate } from '@/lib/utils'

type WikiTabType = 'document' | 'edit' | 'history' | 'discussion'

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
  const { wikiUser, isLoggedIn, logout } = useWikiAuth()
  
  // URL에서 슬러그 추출 및 디코딩
  const rawSlug = Array.isArray(params.slug) ? params.slug.join('/') : params.slug || ''
  const slug = decodeURIComponent(rawSlug)
  
  const [currentPage, setCurrentPage] = useState<WikiPageData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<WikiTabType>('document')
  const [searchQuery, setSearchQuery] = useState('')
  const [editContent, setEditContent] = useState('')
  const [editSummary, setEditSummary] = useState('')

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
          setCurrentPage(data.page)
          setEditContent(data.page.content)
        } else {
          // 페이지가 없으면 새 문서 생성 모드
          setCurrentPage(null)
          setActiveTab('edit')
          setEditContent(`= ${slug} =

새 문서입니다. 내용을 작성해주세요.

== 개요 ==

== 상세 내용 ==

== 참고 ==

[[분류:새 문서]]`)
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
    if (!isLoggedIn || !editContent.trim()) return

    try {
      const method = currentPage ? 'PUT' : 'POST'
      const body = {
        title: currentPage?.title || slug,
        content: editContent,
        summary: editSummary || '문서 편집',
        editSummary: editSummary || '문서 편집',
        namespace: currentPage?.namespace || 'main'
      }

      const response = await fetch('/api/wiki/pages', {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body)
      })

      const data = await response.json()

      if (data.success) {
        // 페이지 새로고침 또는 업데이트
        window.location.reload()
      } else {
        alert('저장에 실패했습니다: ' + (data.error || '알 수 없는 오류'))
      }
    } catch (error) {
      console.error('저장 오류:', error)
      alert('저장 중 오류가 발생했습니다.')
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
                className="prose prose-lg max-w-none prose-invert"
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
                <h3 className="text-lg font-semibold text-gray-200">편집 역사</h3>
                <p className="text-sm text-gray-400">
                  이 문서의 모든 변경 사항을 확인할 수 있습니다.
                </p>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-gray-500">
                  편집 역사 기능은 구현 중입니다.
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )

      case 'discussion':
        return (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <h3 className="text-lg font-semibold text-gray-200">토론</h3>
                <p className="text-sm text-gray-400">
                  이 문서에 대한 의견을 나누는 공간입니다.
                </p>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-gray-500">
                  토론 기능은 구현 중입니다.
                </div>
              </CardContent>
            </Card>
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
    <div className="min-h-screen bg-gray-900 text-gray-100">
      {/* 헤더 */}
      <header className="border-b border-gray-700 bg-gray-800 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4">
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
              {isLoggedIn ? (
                <div className="flex items-center space-x-3">
                  <span className="text-sm text-gray-400 hidden sm:block">
                    {wikiUser?.displayName}님
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={logout}
                    className="flex items-center space-x-1 text-gray-400 hover:text-gray-200"
                  >
                    <LogOut className="w-4 h-4" />
                    <span className="hidden sm:block">로그아웃</span>
                  </Button>
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
                  { id: 'history', label: '역사', icon: History },
                  { id: 'discussion', label: '토론', icon: MessageSquare }
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
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* 메인 컨텐츠 */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* 퀵 액션 버튼 (문서 탭에서만) */}
        {activeTab === 'document' && currentPage && (
          <motion.div
            className="mb-6 flex justify-end"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Button
              onClick={handleEditMode}
              disabled={!isLoggedIn || currentPage.protection.level !== 'none'}
              className="bg-gray-700 hover:bg-gray-600 text-gray-200"
            >
              <Edit className="w-4 h-4 mr-2" />
              편집
            </Button>
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
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  )
} 