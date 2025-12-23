'use client'

import React, { useEffect, useState, useMemo, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Card, CardHeader, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Sparkles, LayoutGrid, Info, Loader2 } from 'lucide-react'

const HANGUL_INITIALS = ['ㄱ','ㄲ','ㄴ','ㄷ','ㄸ','ㄹ','ㅁ','ㅂ','ㅃ','ㅅ','ㅆ','ㅇ','ㅈ','ㅉ','ㅊ','ㅋ','ㅌ','ㅍ','ㅎ']

export default function WikiCategoryPage() {
  const params = useParams()
  const router = useRouter()
  const raw = Array.isArray(params.name) ? params.name.join('/') : (params.name as string)
  const name = decodeURIComponent(raw || '')
  const [items, setItems] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [stats, setStats] = useState({ total: 0 })

  const getInitial = useCallback((title: string = '') => {
    const trimmed = title.trim()
    if (!trimmed) return '#'
    const firstChar = trimmed.charAt(0)
    const code = firstChar.charCodeAt(0)
    if (code >= 0xac00 && code <= 0xd7a3) {
      const index = Math.floor((code - 0xac00) / 588)
      return HANGUL_INITIALS[index] || firstChar
    }
    if (/[A-Za-z]/.test(firstChar)) {
      return firstChar.toUpperCase()
    }
    return '#'
  }, [])

  const groupedItems = useMemo(() => {
    const map: Record<string, Array<any>> = {}
    items.forEach(page => {
      const key = getInitial(page.title)
      if (!map[key]) map[key] = []
      map[key].push(page)
    })
    return Object.entries(map).sort(([a], [b]) => a.localeCompare(b, 'ko'))
  }, [items, getInitial])

  useEffect(() => {
    const load = async () => {
      if (!name) return
      setIsLoading(true)
      try {
        const res = await fetch(`/api/wiki/categories?name=${encodeURIComponent(name)}`)
        const data = await res.json()
        if (data.success) {
          setItems(data.pages)
          setStats({ total: data.total || data.pages.length })
        }
      } finally {
        setIsLoading(false)
      }
    }
    load()
  }, [name])

  return (
    <div className="min-h-screen theme-surface text-gray-100">
      <div className="max-w-5xl mx-auto px-3 sm:px-4 py-6 space-y-6">
        <Card className="bg-gradient-to-br from-[#111827] via-[#0f172a] to-[#0b1120] border border-white/10 text-gray-100">
          <CardContent className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-blue-300">category</p>
                <h1 className="text-2xl font-bold text-white">분류 · {name || '미지정'}</h1>
                <p className="text-xs text-gray-400 mt-1">
                  문서 하단에 <code className="bg-white/10 px-1 rounded">[[분류:{name || '예시'}]]</code> 를 추가하면 이 목록에 자동으로 편입됩니다.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  className="bg-blue-500 hover:bg-blue-400 text-white"
                  onClick={() => router.push('/wiki/search')}
                >
                  새 문서 만들기
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-gray-200 border border-gray-600 hover:bg-white/10"
                  onClick={() => router.push('/wiki/도움말#분류-문법')}
                >
                  도움말
                </Button>
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
              <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                <p className="text-xs text-gray-400">전체 문서</p>
                <p className="text-lg font-semibold">{stats.total.toLocaleString()}개</p>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                <p className="text-xs text-gray-400">최종 편집</p>
                <p className="text-lg font-semibold">실시간</p>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                <p className="text-xs text-gray-400">상위 분류</p>
                <p className="text-lg font-semibold">분류 목록</p>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                <p className="text-xs text-gray-400">문서 함수</p>
                <p className="text-lg font-semibold text-blue-300">자동 분류</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-850 border border-gray-700">
          <CardHeader className="flex items-center gap-2 text-gray-200">
            <LayoutGrid className="w-4 h-4 text-blue-400" />
            <span>문서 목록</span>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center gap-2 text-gray-400 text-sm">
                <Loader2 className="w-4 h-4 animate-spin" />
                불러오는 중...
              </div>
            ) : (
              <>
                {items.length === 0 ? (
                  <div className="text-sm text-gray-400">
                    아직 이 분류에 연결된 문서가 없습니다. 문서 하단에{' '}
                    <code className="bg-gray-700 px-1 rounded">[[분류:{name}]]</code> 를 추가해 보세요.
                  </div>
                ) : (
                  <div className="space-y-6">
                    {groupedItems.map(([initial, pages]) => (
                      <div key={initial}>
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-sm font-semibold text-orange-300">{initial}</span>
                          <span className="h-px flex-1 bg-white/10" />
                        </div>
                        <div className="grid sm:grid-cols-2 gap-3">
                          {pages.map((p) => (
                            <div key={p.slug} className="rounded-lg border border-white/10 bg-white/5 px-3 py-2">
                              <button
                                className="text-blue-300 hover:text-blue-200 font-medium"
                                onClick={() => router.push(`/wiki/${encodeURIComponent(p.title)}`)}
                              >
                                {p.title}
                              </button>
                              {p.summary && (
                                <div className="text-xs text-gray-400 mt-1 line-clamp-2">{p.summary}</div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>

        <Card className="bg-gray-850 border border-gray-700 text-gray-200">
          <CardHeader className="flex items-center gap-2">
            <Info className="w-4 h-4 text-emerald-300" />
            <span>분류 사용 안내</span>
          </CardHeader>
          <CardContent className="text-sm text-gray-300 space-y-2">
            <p>
              문서를 저장하기 전에 가장 아래 줄에 <code className="bg-gray-800 px-1 rounded">[[분류:{name || '예시'}]]</code> 를 추가하면 이 분류에 자동으로 연결됩니다.
            </p>
            <p>
              여러 분류를 동시에 사용할 수 있으며, 분류 페이지는 항상 동일한 레이아웃으로 표시됩니다. 자세한 문법은{' '}
              <button
                className="text-blue-300 hover:text-blue-200 underline"
                onClick={() => router.push('/wiki/도움말#분류-문법')}
              >
                도움말 · 분류 문법
              </button>{' '}
              섹션을 참고해 주세요.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
