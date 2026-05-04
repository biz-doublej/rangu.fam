'use client'

import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Info, Layers, Loader2 } from 'lucide-react'
import { WikiShell, WikiPageHeader } from '@/components/wiki'

const HANGUL_INITIALS = [
  'ㄱ','ㄲ','ㄴ','ㄷ','ㄸ','ㄹ','ㅁ','ㅂ','ㅃ','ㅅ','ㅆ','ㅇ','ㅈ','ㅉ','ㅊ','ㅋ','ㅌ','ㅍ','ㅎ'
]

interface CategoryPage {
  title: string
  slug: string
  summary?: string
}

export default function WikiCategoryPage() {
  const params = useParams()
  const router = useRouter()
  const raw = Array.isArray(params.name) ? params.name.join('/') : (params.name as string)
  const name = decodeURIComponent(raw || '')
  const [items, setItems] = useState<CategoryPage[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [stats, setStats] = useState({ total: 0 })

  const getInitial = useCallback((title = '') => {
    const trimmed = title.trim()
    if (!trimmed) return '#'
    const ch = trimmed.charAt(0)
    const code = ch.charCodeAt(0)
    if (code >= 0xac00 && code <= 0xd7a3) {
      const idx = Math.floor((code - 0xac00) / 588)
      return HANGUL_INITIALS[idx] || ch
    }
    if (/[A-Za-z]/.test(ch)) return ch.toUpperCase()
    return '#'
  }, [])

  const grouped = useMemo(() => {
    const map: Record<string, CategoryPage[]> = {}
    items.forEach(p => {
      const k = getInitial(p.title)
      if (!map[k]) map[k] = []
      map[k].push(p)
    })
    return Object.entries(map).sort(([a], [b]) => a.localeCompare(b, 'ko'))
  }, [items, getInitial])

  useEffect(() => {
    const load = async () => {
      if (!name) return
      setIsLoading(true)
      try {
        const r = await fetch(`/api/wiki/categories?name=${encodeURIComponent(name)}`)
        const d = await r.json()
        if (d.success) {
          setItems(d.pages)
          setStats({ total: d.total || d.pages.length })
        }
      } finally {
        setIsLoading(false)
      }
    }
    load()
  }, [name])

  return (
    <WikiShell
      activeNav="category"
      pageHeader={
        <WikiPageHeader
          title={`분류: ${name || '미지정'}`}
          subtitle={`이 분류에는 총 ${stats.total.toLocaleString()}개의 문서가 있습니다.`}
          hatnote={
            <>
              문서 안에 <code>[[분류:{name || '예시'}]]</code> 를 추가하면 이 분류에 자동으로 들어옵니다.
            </>
          }
          meta={[
            { label: '문서 수', value: `${stats.total.toLocaleString()}개`, icon: Layers }
          ]}
          actions={
            <button
              type="button"
              onClick={() => router.push('/wiki/category')}
              className="rounded-sm border border-[color:var(--wiki-rule-strong)] bg-[color:var(--wiki-bg-2)] px-2.5 py-1 text-xs text-[color:var(--wiki-ink-soft)] hover:border-[color:var(--wiki-accent)]"
            >
              ← 전체 분류
            </button>
          }
        />
      }
    >
      <section className="wiki-panel">
        <h3 className="flex items-center gap-2 wiki-serif text-base font-semibold mb-2">
          <Layers className="w-4 h-4 text-[color:var(--wiki-accent)]" />
          문서 목록
        </h3>
        {isLoading ? (
          <p className="text-sm text-[color:var(--wiki-ink-muted)] flex items-center gap-2 py-3">
            <Loader2 className="w-4 h-4 animate-spin" /> 불러오는 중…
          </p>
        ) : items.length === 0 ? (
          <p className="text-sm text-[color:var(--wiki-ink-muted)] py-3">
            아직 이 분류에 연결된 문서가 없습니다. 문서 끝에{' '}
            <code>[[분류:{name}]]</code>를 추가해 보세요.
          </p>
        ) : (
          <div className="space-y-4">
            {grouped.map(([initial, pages]) => (
              <div key={initial}>
                <div className="flex items-center gap-2 mb-1">
                  <span className="wiki-serif text-base font-semibold text-[color:var(--wiki-warning)]">
                    {initial}
                  </span>
                  <span className="h-px flex-1 bg-[color:var(--wiki-rule)]" />
                </div>
                <ul className="grid sm:grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-1 text-sm">
                  {pages.map(p => (
                    <li key={p.slug}>
                      <button
                        type="button"
                        onClick={() => router.push(`/wiki/${encodeURIComponent(p.title)}`)}
                        className="text-[color:var(--wiki-link)] hover:underline"
                      >
                        {p.title}
                      </button>
                      {p.summary && (
                        <span className="text-[11px] text-[color:var(--wiki-ink-muted)] ml-1 line-clamp-1">
                          — {p.summary}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="wiki-mbox wiki-mbox--info mt-4">
        <Info className="w-4 h-4 mt-0.5 text-[color:var(--wiki-accent)]" />
        <div>
          <p>
            여러 분류를 동시에 사용할 수 있습니다. 자세한 문법은{' '}
            <button
              type="button"
              onClick={() => router.push('/wiki/이랑위키:도움말_2026#분류-문법')}
              className="text-[color:var(--wiki-link)] hover:underline"
            >
              도움말 2026 — 분류 문법
            </button>
            을 참고하세요.
          </p>
        </div>
      </section>
    </WikiShell>
  )
}
