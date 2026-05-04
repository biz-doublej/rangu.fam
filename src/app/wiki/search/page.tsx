'use client'

import React, { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Search } from 'lucide-react'
import { WikiShell, WikiPageHeader } from '@/components/wiki'

interface SearchResult {
  title: string
  slug: string
  namespace?: string
  summary?: string
  snippet?: string | null
  categories?: string[]
  lastEditDate?: string
  lastEditor?: string
  views?: number
  edits?: number
}

// "정재원" 같은 query를 텍스트 안에서 강조
function HighlightText({ text, term }: { text: string; term: string }) {
  if (!text || !term) return <>{text}</>
  // 정규식 특수문자 이스케이프
  const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const re = new RegExp(`(${escaped})`, 'ig')
  const parts = text.split(re)
  return (
    <>
      {parts.map((p, i) =>
        re.test(p) ? (
          <mark
            key={i}
            className="bg-amber-300/30 text-amber-100 rounded-sm px-0.5"
            style={{ backgroundColor: 'rgba(251,191,36,0.25)' }}
          >
            {p}
          </mark>
        ) : (
          <React.Fragment key={i}>{p}</React.Fragment>
        )
      )}
    </>
  )
}

function WikiSearchPageContent() {
  const params = useSearchParams()
  const router = useRouter()
  const [q, setQ] = useState(params.get('q') || '')
  const [results, setResults] = useState<SearchResult[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [total, setTotal] = useState(0)
  const [showCreate, setShowCreate] = useState(false)

  useEffect(() => {
    const initial = params.get('q') || ''
    if (initial) {
      setQ(initial)
      doSearch(initial)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const doSearch = async (term: string) => {
    setIsLoading(true)
    try {
      const r = await fetch(`/api/wiki/search?q=${encodeURIComponent(term)}`)
      const d = await r.json()
      if (d.success) {
        setResults(d.results || [])
        setTotal(d.total || 0)
        const hasExact = (d.results || []).some(
          (x: SearchResult) => String(x.title).toLowerCase() === term.toLowerCase()
        )
        setShowCreate(!hasExact && term.trim().length > 0)
      } else {
        setResults([]); setTotal(0)
        setShowCreate(term.trim().length > 0)
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <WikiShell
      activeNav="search"
      pageHeader={
        <WikiPageHeader
          title={q ? `"${q}" 검색 결과` : '문서 검색'}
          subtitle={
            q
              ? `이랑위키 본문/제목/요약/분류에서 "${q}"를 검색했습니다.`
              : '제목, 본문, 분류 등에서 키워드를 검색할 수 있습니다.'
          }
          hatnote={
            <>찾는 문서가 없다면 결과 우측의 <strong>새 문서 만들기</strong> 버튼으로 직접 작성할 수 있습니다.</>
          }
        />
      }
    >
      {/* 검색 박스 */}
      <section className="wiki-panel mb-4">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[color:var(--wiki-ink-muted)]" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') doSearch(q) }}
              placeholder="검색어를 입력하세요"
              className="w-full pl-8 pr-3 py-1.5 bg-[color:var(--wiki-bg-2)] border border-[color:var(--wiki-rule-strong)] rounded-sm text-sm text-[color:var(--wiki-ink)]"
            />
          </div>
          <button
            type="button"
            onClick={() => doSearch(q)}
            className="rounded-sm bg-[color:var(--wiki-accent)] px-4 py-1.5 text-sm font-medium text-white hover:opacity-90"
          >
            검색
          </button>
        </div>
      </section>

      {/* 결과 */}
      <section className="wiki-panel">
        <div className="flex items-center justify-between mb-2 text-xs text-[color:var(--wiki-ink-muted)]">
          <span>{isLoading ? '검색 중…' : `검색 결과 ${total.toLocaleString()}건`}</span>
          {showCreate && (
            <button
              type="button"
              onClick={() => router.push(`/wiki/${encodeURIComponent(q)}`)}
              className="rounded-sm bg-[color:var(--wiki-accent)] px-2.5 py-1 text-xs font-medium text-white hover:opacity-90"
            >
              {`"${q}" 새 문서 만들기`}
            </button>
          )}
        </div>

        {isLoading ? (
          <p className="py-6 text-center text-sm text-[color:var(--wiki-ink-muted)]">검색 중입니다…</p>
        ) : results.length === 0 ? (
          <div className="py-6 text-center text-sm text-[color:var(--wiki-ink-muted)]">
            <p>일치하는 문서가 없습니다.</p>
            {q.trim() && (
              <button
                type="button"
                onClick={() => router.push(`/wiki/${encodeURIComponent(q)}`)}
                className="mt-3 inline-flex rounded-sm border border-[color:var(--wiki-rule-strong)] bg-[color:var(--wiki-bg-2)] px-3 py-1.5 text-xs text-[color:var(--wiki-ink-soft)] hover:border-[color:var(--wiki-accent)]"
              >
                {`"${q}" 새 문서 만들기`}
              </button>
            )}
          </div>
        ) : (
          <ul className="divide-y divide-[color:var(--wiki-rule)]">
            {results.map(r => (
              <li key={r.slug} className="py-3 px-1 hover:bg-[color:var(--wiki-bg-2)]/50 transition-colors">
                <div className="flex items-baseline justify-between gap-2 mb-1">
                  <button
                    type="button"
                    onClick={() => router.push(`/wiki/${encodeURIComponent(r.title)}`)}
                    className="wiki-serif text-base text-[color:var(--wiki-link)] hover:underline text-left"
                  >
                    <HighlightText text={r.title} term={q} />
                  </button>
                  {r.namespace && r.namespace !== 'main' && (
                    <span className="wiki-chip shrink-0 text-[10px]">{r.namespace}</span>
                  )}
                </div>

                {/* 본문 매칭 스니펫 (있으면 우선 표시) */}
                {r.snippet ? (
                  <p className="text-sm text-[color:var(--wiki-ink-soft)] leading-relaxed line-clamp-2 mb-1">
                    <HighlightText text={r.snippet} term={q} />
                  </p>
                ) : r.summary ? (
                  <p className="text-sm text-[color:var(--wiki-ink-soft)] leading-relaxed line-clamp-2 mb-1">
                    <HighlightText text={r.summary} term={q} />
                  </p>
                ) : null}

                {/* 메타 라인: 분류 + 편집자 + 조회수 */}
                <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-[color:var(--wiki-ink-muted)]">
                  {r.categories && r.categories.length > 0 && (
                    <span>
                      분류:{' '}
                      {r.categories.slice(0, 3).map((c, i) => (
                        <button
                          key={`${c}-${i}`}
                          type="button"
                          onClick={() => router.push(`/wiki/category/${encodeURIComponent(c)}`)}
                          className="text-[color:var(--wiki-link)] hover:underline mr-1"
                        >
                          {c}
                        </button>
                      ))}
                      {r.categories.length > 3 && <span className="opacity-60">+{r.categories.length - 3}</span>}
                    </span>
                  )}
                  {r.lastEditor && r.lastEditDate && (
                    <span>
                      편집 <strong className="text-[color:var(--wiki-ink-soft)]">{r.lastEditor}</strong>{' '}
                      · {new Date(r.lastEditDate).toLocaleDateString('ko-KR', { year: 'numeric', month: 'short', day: 'numeric' })}
                    </span>
                  )}
                  {typeof r.views === 'number' && r.views > 0 && (
                    <span className="tabular-nums">조회 {r.views.toLocaleString()}</span>
                  )}
                </div>
              </li>
            ))}
            {showCreate && (
              <li className="py-2">
                <div className="flex items-center justify-between gap-2 wiki-panel--inset px-2 py-1.5">
                  <span className="text-xs text-[color:var(--wiki-ink-soft)]">
                    {`정확히 "${q}" 제목의 문서가 없습니다.`}
                  </span>
                  <button
                    type="button"
                    onClick={() => router.push(`/wiki/${encodeURIComponent(q)}`)}
                    className="rounded-sm border border-[color:var(--wiki-rule-strong)] bg-[color:var(--wiki-bg-2)] px-2.5 py-1 text-xs text-[color:var(--wiki-ink-soft)] hover:border-[color:var(--wiki-accent)]"
                  >
                    {`"${q}" 새 문서 만들기`}
                  </button>
                </div>
              </li>
            )}
          </ul>
        )}
      </section>
    </WikiShell>
  )
}

export default function WikiSearchPage() {
  return (
    <Suspense
      fallback={
        <WikiShell>
          <div className="text-center py-24 text-sm text-[color:var(--wiki-ink-muted)]">불러오는 중…</div>
        </WikiShell>
      }
    >
      <WikiSearchPageContent />
    </Suspense>
  )
}
