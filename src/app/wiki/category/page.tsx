'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardHeader, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Layers, Search, Loader2, ArrowRight } from 'lucide-react'

type CategorySummary = {
  name: string
  count: number
  sample: Array<{ title: string; slug: string; summary?: string }>
}

export default function WikiCategoryIndexPage() {
  const router = useRouter()
  const [categories, setCategories] = useState<CategorySummary[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [filter, setFilter] = useState('')

  useEffect(() => {
    let isMounted = true
    setIsLoading(true)
    fetch('/api/wiki/categories?summary=1&limit=200')
      .then(res => res.json())
      .then((data) => {
        if (!isMounted) return
        if (data.success && Array.isArray(data.categories)) {
          setCategories(data.categories)
        } else {
          setCategories([])
        }
      })
      .catch(() => {
        if (isMounted) setCategories([])
      })
      .finally(() => {
        if (isMounted) setIsLoading(false)
      })
    return () => {
      isMounted = false
    }
  }, [])

  const filteredCategories = useMemo(() => {
    if (!filter.trim()) return categories
    const keyword = filter.trim().toLowerCase()
    return categories.filter((category) => category.name.toLowerCase().includes(keyword))
  }, [categories, filter])

  const totalDocuments = useMemo(
    () => categories.reduce((sum, category) => sum + category.count, 0),
    [categories]
  )

  const handleCategoryNavigate = (name: string) => {
    router.push(`/wiki/category/${encodeURIComponent(name)}`)
  }

  const handleDocumentNavigate = (slug: string, title: string) => {
    router.push(`/wiki/${encodeURIComponent(slug || title)}`)
  }

  return (
    <div className="min-h-screen theme-surface text-gray-100">
      <div className="max-w-6xl mx-auto px-3 sm:px-6 py-6 space-y-6">
        <Card className="bg-gradient-to-br from-[#111827] via-[#0f172a] to-[#0b1120] border border-white/10 text-gray-100">
          <CardContent className="space-y-4">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-blue-300">category hub</p>
                <h1 className="text-3xl font-bold text-white mt-1">분류 전체 보기</h1>
                <p className="text-sm text-gray-400 mt-2">
                  위키의 모든 문서를 분류별로 탐색하세요. 원하는 분류를 선택하거나 검색하면 빠르게 문서에 접근할 수 있습니다.
                </p>
              </div>
              <div className="w-full md:max-w-sm">
                <label className="text-xs uppercase text-gray-400 mb-1 block">분류 검색</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <Input
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                    placeholder="분류 이름을 입력하세요..."
                    className="pl-9 bg-gray-900 border-gray-700 text-gray-200 placeholder-gray-500"
                  />
                </div>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-3 text-sm">
              <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                <p className="text-xs text-gray-400">전체 분류 수</p>
                <p className="text-xl font-semibold">{categories.length.toLocaleString()}개</p>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                <p className="text-xs text-gray-400">분류 문서 수</p>
                <p className="text-xl font-semibold">{totalDocuments.toLocaleString()}개</p>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/5 p-3 flex items-center gap-2">
                <Layers className="w-4 h-4 text-emerald-300" />
                <p className="text-sm text-gray-300">새로운 문서는 [[분류:이름]] 문법으로 추가할 수 있습니다.</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-850 border border-gray-700">
          <CardHeader className="flex items-center gap-2 text-gray-200">
            <Layers className="w-4 h-4 text-blue-400" />
            <span>분류 목록</span>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center gap-2 text-gray-400 text-sm">
                <Loader2 className="w-4 h-4 animate-spin" />
                분류를 불러오는 중입니다...
              </div>
            ) : filteredCategories.length === 0 ? (
              <p className="text-sm text-gray-500">
                조건에 맞는 분류가 없습니다. 다른 검색어를 시도해 보세요.
              </p>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {filteredCategories.map((category) => (
                  <div key={category.name} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <button
                          className="text-left text-white font-semibold hover:text-blue-300"
                          onClick={() => handleCategoryNavigate(category.name)}
                        >
                          {category.name}
                        </button>
                        <p className="text-xs text-gray-400">{category.count.toLocaleString()}개의 문서</p>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-gray-300 hover:text-white"
                        onClick={() => handleCategoryNavigate(category.name)}
                      >
                        바로가기
                        <ArrowRight className="w-4 h-4 ml-1" />
                      </Button>
                    </div>
                    <div className="mt-3 space-y-2">
                      {category.sample.length === 0 ? (
                        <p className="text-xs text-gray-500">대표 문서가 아직 없습니다.</p>
                      ) : (
                        category.sample.map((doc) => (
                          <button
                            key={`${category.name}-${doc.slug}`}
                            onClick={() => handleDocumentNavigate(doc.slug, doc.title)}
                            className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-left hover:border-white/30 transition-colors"
                          >
                            <p className="text-sm text-white font-medium">{doc.title}</p>
                            {doc.summary && (
                              <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{doc.summary}</p>
                            )}
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
