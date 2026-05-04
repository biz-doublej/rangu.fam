'use client'

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Bell, BellOff, RefreshCcw, ExternalLink } from 'lucide-react'
import { WikiShell, WikiPageHeader } from '@/components/wiki'
import { useWikiAuth } from '@/contexts/WikiAuthContext'

interface WatchedPage {
  title: string
  slug: string
  namespace: string
  lastEditDate: string
  lastEditor: string
}

export default function WatchlistPage() {
  const router = useRouter()
  const { wikiUser, isLoading: authLoading } = useWikiAuth()
  const [pages, setPages] = useState<WatchedPage[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [removingTitle, setRemovingTitle] = useState<string | null>(null)

  const fetchWatchlist = async () => {
    try {
      setLoading(true)
      setError(null)
      const r = await fetch('/api/wiki/watchlist', { credentials: 'include' })
      const d = await r.json()
      if (!d.success) {
        setError(d.error || '목록을 불러올 수 없습니다.')
        setPages([])
        return
      }
      setPages(d.pages || [])
    } catch (e) {
      setError('네트워크 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const removeFromWatchlist = async (title: string) => {
    setRemovingTitle(title)
    try {
      const r = await fetch('/api/wiki/watchlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ title, action: 'remove' }),
      })
      const d = await r.json()
      if (d.success) {
        setPages((p) => p.filter((x) => x.title !== title))
      }
    } finally {
      setRemovingTitle(null)
    }
  }

  useEffect(() => {
    if (!authLoading && wikiUser) {
      fetchWatchlist()
    } else if (!authLoading) {
      setLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, wikiUser])

  return (
    <WikiShell
      pageHeader={
        <WikiPageHeader
          title="내 감시 목록"
          subtitle="감시 중인 문서가 편집되면 우선적으로 확인할 수 있습니다."
          hatnote={
            <>
              문서 본문 우측 사이드바의 <strong>감시</strong> 버튼으로 추가/제거할 수 있습니다.
            </>
          }
        />
      }
    >
      {!wikiUser ? (
        <section className="wiki-panel text-center py-10">
          <Bell className="w-10 h-10 mx-auto mb-3 text-[color:var(--wiki-ink-muted)]" />
          <p className="text-sm text-[color:var(--wiki-ink-soft)] mb-4">
            감시 목록을 사용하려면 로그인이 필요합니다.
          </p>
          <button
            type="button"
            onClick={() => router.push('/wiki/login')}
            className="rounded-sm bg-[color:var(--wiki-accent)] px-4 py-1.5 text-sm font-medium text-white hover:opacity-90"
          >
            로그인
          </button>
        </section>
      ) : loading ? (
        <section className="wiki-panel">
          <p className="py-8 text-center text-sm text-[color:var(--wiki-ink-muted)]">
            불러오는 중…
          </p>
        </section>
      ) : error ? (
        <section className="wiki-panel">
          <p className="py-8 text-center text-sm text-red-400">{error}</p>
          <div className="text-center">
            <button
              type="button"
              onClick={fetchWatchlist}
              className="rounded-sm border border-[color:var(--wiki-rule-strong)] px-3 py-1 text-xs hover:border-[color:var(--wiki-accent)]"
            >
              <RefreshCcw className="inline w-3 h-3 mr-1" />
              다시 시도
            </button>
          </div>
        </section>
      ) : pages.length === 0 ? (
        <section className="wiki-panel text-center py-12">
          <Bell className="w-10 h-10 mx-auto mb-3 text-[color:var(--wiki-ink-muted)]" />
          <p className="text-sm text-[color:var(--wiki-ink-soft)] mb-1">
            감시 중인 문서가 없습니다.
          </p>
          <p className="text-xs text-[color:var(--wiki-ink-muted)]">
            관심 있는 문서에 들어가서 우측 <strong>감시</strong> 버튼을 눌러 추가하세요.
          </p>
        </section>
      ) : (
        <section className="wiki-panel">
          <div className="flex items-center justify-between mb-2 text-xs text-[color:var(--wiki-ink-muted)]">
            <span>{pages.length}개 문서를 감시 중</span>
            <button
              type="button"
              onClick={fetchWatchlist}
              className="inline-flex items-center gap-1 rounded-sm border border-[color:var(--wiki-rule)] px-2 py-0.5 hover:border-[color:var(--wiki-accent)]"
              title="새로 고침"
            >
              <RefreshCcw className="w-3 h-3" />
              새로 고침
            </button>
          </div>
          <ul className="divide-y divide-[color:var(--wiki-rule)]">
            {pages.map((p) => (
              <li
                key={p.slug}
                className="py-3 px-1 flex items-start justify-between gap-3 hover:bg-[color:var(--wiki-bg-2)]/50 transition-colors"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline gap-2 mb-0.5">
                    <button
                      type="button"
                      onClick={() => router.push(`/wiki/${encodeURIComponent(p.title)}`)}
                      className="wiki-serif text-base text-[color:var(--wiki-link)] hover:underline truncate"
                    >
                      {p.title}
                    </button>
                    {p.namespace && p.namespace !== 'main' && (
                      <span className="wiki-chip shrink-0 text-[10px]">{p.namespace}</span>
                    )}
                  </div>
                  <div className="text-[11px] text-[color:var(--wiki-ink-muted)]">
                    마지막 편집{' '}
                    <strong className="text-[color:var(--wiki-ink-soft)]">{p.lastEditor || '-'}</strong>
                    {' · '}
                    {p.lastEditDate
                      ? new Date(p.lastEditDate).toLocaleString('ko-KR', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })
                      : '-'}
                  </div>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    type="button"
                    onClick={() => router.push(`/wiki/${encodeURIComponent(p.title)}`)}
                    className="inline-flex items-center gap-1 rounded-sm border border-[color:var(--wiki-rule)] px-2 py-1 text-[11px] hover:border-[color:var(--wiki-accent)] text-[color:var(--wiki-ink-soft)]"
                    title="문서 열기"
                  >
                    <ExternalLink className="w-3 h-3" />
                  </button>
                  <button
                    type="button"
                    onClick={() => removeFromWatchlist(p.title)}
                    disabled={removingTitle === p.title}
                    className="inline-flex items-center gap-1 rounded-sm border border-[color:var(--wiki-rule)] px-2 py-1 text-[11px] hover:border-red-500 hover:text-red-400 text-[color:var(--wiki-ink-soft)] disabled:opacity-50"
                    title="감시 해제"
                  >
                    <BellOff className="w-3 h-3" />
                    {removingTitle === p.title ? '제거 중…' : '해제'}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}
    </WikiShell>
  )
}
