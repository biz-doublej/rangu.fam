'use client'

import React, { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Card, CardHeader, CardContent } from '@/components/ui/Card'
import { Search } from 'lucide-react'

function WikiSearchPageContent() {
  const params = useSearchParams()
  const router = useRouter()
  const [q, setQ] = useState(params.get('q') || '')
  const [results, setResults] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [total, setTotal] = useState(0)
  const [showCreate, setShowCreate] = useState(false)

  useEffect(() => {
    const initialQ = params.get('q') || ''
    if (initialQ) {
      setQ(initialQ)
      doSearch(initialQ)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const doSearch = async (term: string) => {
    setIsLoading(true)
    try {
      const res = await fetch(`/api/wiki/search?q=${encodeURIComponent(term)}`)
      const data = await res.json()
      if (data.success) {
        setResults(data.results || [])
        setTotal(data.total || 0)
        // 정확 일치 여부 판단하여 새 문서 만들기 노출 결정
        const hasExact = (data.results || []).some((r: any) => String(r.title).toLowerCase() === term.toLowerCase())
        setShowCreate(!hasExact && term.trim().length > 0)
      } else {
        setResults([])
        setTotal(0)
        setShowCreate(term.trim().length > 0)
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen theme-surface text-gray-100">
      <div className="max-w-5xl mx-auto px-4 py-6">
        <div className="flex items-center gap-2 mb-6">
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="검색어를 입력하세요"
            className="bg-gray-800 border-gray-700 text-gray-200"
            onKeyDown={(e) => { if (e.key === 'Enter') doSearch(q) }}
          />
          <Button onClick={() => doSearch(q)} className="bg-gray-700 hover:bg-gray-600 text-gray-200">
            <Search className="w-4 h-4 mr-1" />
            검색
          </Button>
        </div>

        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <div className="flex items-center justify-between">
              <span>{isLoading ? '검색 중...' : `검색 결과 (${total})`}</span>
              {showCreate && (
                <Button
                  onClick={() => router.push(`/wiki/${encodeURIComponent(q)}`)}
                  className="bg-blue-600 hover:bg-blue-500 text-white h-8 px-3"
                  title={`새 문서 만들기: ${q}`}
                >
                  새 문서 만들기
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {results.length === 0 ? (
              <div className="text-gray-400 text-sm">
                결과가 없습니다.
                {q.trim() && (
                  <div className="mt-3">
                    <Button onClick={() => router.push(`/wiki/${encodeURIComponent(q)}`)} className="bg-gray-700 hover:bg-gray-600 text-gray-200">
                      "{q}" 새 문서 만들기
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {results.map((r) => (
                  <div key={r.slug} className="bg-gray-900 rounded px-3 py-2">
                    <div className="flex items-center justify-between">
                      <button
                        className="text-blue-400 hover:underline text-sm"
                        onClick={() => router.push(`/wiki/${encodeURIComponent(r.title)}`)}
                      >
                        {r.title}
                      </button>
                      <span className="text-xs text-gray-500">{r.namespace}</span>
                  </div>
                  {r.summary && (
                    <div className="text-gray-400 text-xs mt-1">{r.summary}</div>
                  )}
                  {r.categories?.length > 0 && (
                    <div className="text-xs text-gray-500 mt-1">분류: {r.categories.join(', ')}</div>
                  )}
                </div>
              ))}
              {/* 정확히 "q" 제목이 없을 때 바로 만들기 CTA 노출 */}
              {showCreate && (
                <div className="bg-gray-900 rounded px-3 py-2">
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-gray-300">정확히 "{q}" 제목의 문서가 없습니다.</div>
                    <Button onClick={() => router.push(`/wiki/${encodeURIComponent(q)}`)} className="bg-gray-700 hover:bg-gray-600 text-gray-200 h-8 px-3">
                      "{q}" 새 문서 만들기
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  </div>
  )
}

export default function WikiSearchPage() {
  return (
    <Suspense fallback={<div className="min-h-screen theme-surface text-gray-100 flex items-center justify-center">Loading...</div>}>
      <WikiSearchPageContent />
    </Suspense>
  )
}


