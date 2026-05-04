'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowRight, Layers, Loader2, Search } from 'lucide-react'
import { WikiShell, WikiPageHeader } from '@/components/wiki'

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
    let mounted = true
    setIsLoading(true)
    fetch('/api/wiki/categories?summary=1&limit=200')
      .then(r => r.json())
      .then(d => {
        if (!mounted) return
        if (d.success && Array.isArray(d.categories)) setCategories(d.categories)
        else setCategories([])
      })
      .catch(() => { if (mounted) setCategories([]) })
      .finally(() => { if (mounted) setIsLoading(false) })
    return () => { mounted = false }
  }, [])

  const filtered = useMemo(() => {
    if (!filter.trim()) return categories
    const k = filter.trim().toLowerCase()
    return categories.filter(c => c.name.toLowerCase().includes(k))
  }, [categories, filter])

  const totalDocs = useMemo(
    () => categories.reduce((s, c) => s + c.count, 0),
    [categories]
  )

  return (
    <WikiShell
      activeNav="category"
      pageHeader={
        <WikiPageHeader
          title="분류 — 전체 보기"
          subtitle="이랑위키의 모든 문서를 분류별로 둘러봅니다."
          hatnote={
            <>
              문서 안에 <code>[[분류:이름]]</code>을 추가하면 해당 분류로 자동 편입됩니다.
              자세한 사용법은{' '}
              <button
                type="button"
                className="text-[color:var(--wiki-link)] hover:underline"
                onClick={() => router.push('/wiki/이랑위키:도움말_2026#분류-문법')}
              >
                도움말 2026
              </button>
              에서 확인할 수 있습니다.
            </>
          }
          meta={[
            { label: '분류 수', value: `${categories.length.toLocaleString()}개`, icon: Layers },
            { label: '문서 합계', value: `${totalDocs.toLocaleString()}개` }
          ]}
        />
      }
    >
      {/* 검색 */}
      <section className="wiki-panel mb-4">
        <label className="block text-xs text-[color:var(--wiki-ink-muted)] mb-1">분류 이름 검색</label>
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[color:var(--wiki-ink-muted)]" />
          <input
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="분류 이름을 입력하세요…"
            className="w-full pl-8 pr-3 py-1.5 bg-[color:var(--wiki-bg-2)] border border-[color:var(--wiki-rule-strong)] rounded-sm text-sm text-[color:var(--wiki-ink)]"
          />
        </div>
      </section>

      {/* 분류 목록 */}
      <section className="wiki-panel">
        <h3 className="flex items-center gap-2 wiki-serif text-base font-semibold mb-2">
          <Layers className="w-4 h-4 text-[color:var(--wiki-accent)]" />
          분류 목록
        </h3>
        {isLoading ? (
          <p className="py-4 text-sm text-[color:var(--wiki-ink-muted)] flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            분류를 불러오는 중입니다…
          </p>
        ) : filtered.length === 0 ? (
          <p className="py-4 text-sm text-[color:var(--wiki-ink-muted)]">
            조건에 맞는 분류가 없습니다.
          </p>
        ) : (
          <ul className="grid gap-3 md:grid-cols-2">
            {filtered.map(category => (
              <li key={category.name} className="wiki-panel--inset px-3 py-2">
                <div className="flex items-baseline justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => router.push(`/wiki/category/${encodeURIComponent(category.name)}`)}
                    className="wiki-serif text-base text-[color:var(--wiki-link)] hover:underline truncate"
                  >
                    {category.name}
                  </button>
                  <span className="text-[11px] text-[color:var(--wiki-ink-muted)] shrink-0">
                    {category.count.toLocaleString()}개 문서
                  </span>
                </div>
                {category.sample.length > 0 && (
                  <ul className="mt-1.5 space-y-0.5 text-sm">
                    {category.sample.slice(0, 4).map(doc => (
                      <li key={`${category.name}-${doc.slug}`}>
                        <button
                          type="button"
                          onClick={() => router.push(`/wiki/${encodeURIComponent(doc.slug || doc.title)}`)}
                          className="text-[color:var(--wiki-link)] hover:underline"
                        >
                          {doc.title}
                        </button>
                        {doc.summary && (
                          <span className="text-[11px] text-[color:var(--wiki-ink-muted)] ml-1">
                            — {doc.summary}
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
                <button
                  type="button"
                  onClick={() => router.push(`/wiki/category/${encodeURIComponent(category.name)}`)}
                  className="mt-2 inline-flex items-center text-xs text-[color:var(--wiki-link)] hover:underline"
                >
                  분류 전체 보기
                  <ArrowRight className="w-3 h-3 ml-0.5" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </WikiShell>
  )
}
