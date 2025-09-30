'use client'

import React, { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Card, CardHeader, CardContent } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react'

interface RecentChange {
  title: string
  slug: string
  namespace?: string
  revision: {
    revisionNumber: number
    editType: string
    summary?: string
    author: string
    timestamp: string
  }
}

interface PaginationInfo {
  total: number
  skip: number
  limit: number
  hasMore: boolean
}

function WikiRecentChangesPageContent() {
  const params = useSearchParams()
  const router = useRouter()
  const [namespace, setNamespace] = useState(params.get('namespace') || '')
  const [type, setType] = useState(params.get('type') || '')
  const [author, setAuthor] = useState(params.get('author') || '')
  const [items, setItems] = useState<RecentChange[]>([])
  const [pagination, setPagination] = useState<PaginationInfo>({ total: 0, skip: 0, limit: 50, hasMore: false })
  const [isLoading, setIsLoading] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [showAllChanges, setShowAllChanges] = useState(true)

  const load = async (page = 1, fetchAll = false) => {
    setIsLoading(true)
    try {
      const limit = fetchAll ? 500 : 50
      const skip = (page - 1) * limit
      
      const sp = new URLSearchParams()
      if (namespace) sp.set('namespace', namespace)
      if (type) sp.set('type', type)
      if (author) sp.set('author', author)
      if (fetchAll) sp.set('all', 'true')
      sp.set('limit', limit.toString())
      sp.set('skip', skip.toString())
      
      const res = await fetch(`/api/wiki/recent?${sp.toString()}`)
      const data = await res.json()
      if (data.success) {
        setItems(data.changes)
        setPagination(data.pagination || { total: data.changes.length, skip, limit, hasMore: false })
        setCurrentPage(page)
        setShowAllChanges(fetchAll)
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handlePageChange = (newPage: number) => {
    load(newPage, showAllChanges)
  }

  const handleFilterChange = () => {
    setCurrentPage(1)
    load(1, showAllChanges)
  }

  const handleShowAllChanges = () => {
    setCurrentPage(1)
    load(1, true)
  }

  const handleShowRecentChanges = () => {
    setCurrentPage(1)
    load(1, false)
  }

  useEffect(() => {
    load(1, true) // Start with all changes by default
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const totalPages = Math.ceil(pagination.total / pagination.limit)

  return (
    <div className="min-h-screen theme-surface text-gray-100">
      <div className="max-w-5xl mx-auto px-4 py-6 space-y-4">
        {/* Header */}
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-200">
                  {showAllChanges ? '모든 변경 기록' : '최근 변경'}
                </h1>
                <p className="text-gray-400 text-sm mt-1">
                  {showAllChanges 
                    ? '처음부터 끝까지 모든 변경 기록을 보여줍니다.'
                    : '최근에 이루어진 변경 내역을 보여줍니다.'
                  }
                </p>
              </div>
              <div className="flex gap-2">
                <Button 
                  onClick={handleShowAllChanges}
                  className={`${
                    showAllChanges 
                      ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                      : 'bg-gray-700 hover:bg-gray-600 text-gray-200'
                  }`}
                >
                  모든 변경
                </Button>
                <Button 
                  onClick={handleShowRecentChanges}
                  className={`${
                    !showAllChanges 
                      ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                      : 'bg-gray-700 hover:bg-gray-600 text-gray-200'
                  }`}
                >
                  최근 변경
                </Button>
                <Button 
                  onClick={() => load(currentPage, showAllChanges)}
                  className="bg-gray-700 hover:bg-gray-600 text-gray-200"
                  disabled={isLoading}
                >
                  <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                  새로고침
                </Button>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Filters */}
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>미세 필터</CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <Input 
                value={namespace} 
                onChange={(e) => setNamespace(e.target.value)} 
                placeholder="네임스페이스" 
                className="bg-gray-700 border-gray-600 text-gray-200" 
              />
              <Input 
                value={type} 
                onChange={(e) => setType(e.target.value)} 
                placeholder="유형(create/edit/revert...)" 
                className="bg-gray-700 border-gray-600 text-gray-200" 
              />
              <Input 
                value={author} 
                onChange={(e) => setAuthor(e.target.value)} 
                placeholder="작성자" 
                className="bg-gray-700 border-gray-600 text-gray-200" 
              />
              <Button 
                onClick={handleFilterChange} 
                className="bg-gray-700 hover:bg-gray-600 text-gray-200"
                disabled={isLoading}
              >
                적용
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Results */}
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <div className="flex items-center justify-between">
              <span>{isLoading ? '불러오는 중...' : `총 ${pagination.total}개의 변경 내역`}</span>
              {totalPages > 1 && (
                <div className="flex items-center space-x-2">
                  <Button
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1 || isLoading}
                    className="bg-gray-700 hover:bg-gray-600 text-gray-200 px-3 py-1"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <span className="text-sm text-gray-400">
                    {currentPage} / {totalPages}
                  </span>
                  <Button
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages || isLoading}
                    className="bg-gray-700 hover:bg-gray-600 text-gray-200 px-3 py-1"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-gray-400">
                <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2" />
                <p>변경 내역을 불러오는 중입니다...</p>
              </div>
            ) : items.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                <p>변경 내역이 없습니다.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {items.map((item) => (
                  <div key={`${item.slug}-${item.revision.revisionNumber}`} className="bg-gray-900 rounded px-4 py-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <button
                          className="text-blue-400 hover:underline font-medium"
                          onClick={() => router.push(`/wiki/${encodeURIComponent(item.title)}`)}
                        >
                          {item.title}
                        </button>
                        {item.namespace && (
                          <span className="text-xs bg-gray-700 text-gray-300 px-2 py-1 rounded">
                            {item.namespace}
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-gray-500">
                        {new Date(item.revision.timestamp).toLocaleString('ko-KR')}
                      </span>
                    </div>
                    
                    <div className="flex items-center justify-between mt-2 text-sm">
                      <div className="flex items-center space-x-3">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          item.revision.editType === 'create' 
                            ? 'bg-green-900 text-green-300' 
                            : item.revision.editType === 'revert' 
                              ? 'bg-red-900 text-red-300' 
                              : 'bg-blue-900 text-blue-300'
                        }`}>
                          {item.revision.editType === 'create' ? '생성' : 
                           item.revision.editType === 'revert' ? '되돌림' : '편집'}
                        </span>
                        <span className="text-gray-400">
                          {item.revision.author}
                        </span>
                      </div>
                      {item.revision.summary && (
                        <span className="text-gray-500 text-sm truncate max-w-xs">
                          {item.revision.summary}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            {/* Pagination Info */}
            {pagination.total > 0 && !isLoading && (
              <div className="mt-4 pt-4 border-t border-gray-700 text-center text-sm text-gray-500">
                {showAllChanges ? (
                  <p>
                    {pagination.total}개의 변경 내역 중 {items.length}개를 표시 중
                    {pagination.hasMore && ' (더 많은 변경 내역이 있습니다)'}
                  </p>
                ) : (
                  <p>
                    최근 {items.length}개의 변경 내역을 표시 중
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default function WikiRecentChangesPage() {
  return (
    <Suspense fallback={<div className="min-h-screen theme-surface text-gray-100 flex items-center justify-center">Loading...</div>}>
      <WikiRecentChangesPageContent />
    </Suspense>
  )
}


