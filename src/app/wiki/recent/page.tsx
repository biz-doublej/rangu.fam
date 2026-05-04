'use client'

import React, { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ChevronLeft, ChevronRight, Filter, RefreshCw } from 'lucide-react'
import { WikiShell, WikiPageHeader } from '@/components/wiki'

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
    sizeChange?: number
    contentLength?: number
    isMinorEdit?: boolean
    isAutomated?: boolean
  }
}

// 상대 시각 — "3분 전", "어제", "3일 전"
function relativeTime(iso: string): string {
  const t = new Date(iso).getTime()
  if (Number.isNaN(t)) return ''
  const diff = Date.now() - t
  const sec = Math.floor(diff / 1000)
  if (sec < 60) return `${sec}초 전`
  const min = Math.floor(sec / 60)
  if (min < 60) return `${min}분 전`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr}시간 전`
  const day = Math.floor(hr / 24)
  if (day < 7) return `${day}일 전`
  if (day < 30) return `${Math.floor(day / 7)}주 전`
  return new Date(iso).toLocaleDateString('ko-KR', { year: 'numeric', month: 'short', day: 'numeric' })
}

// "오늘" / "어제" / "2026년 1월 15일" 같은 그룹 키
function dateGroup(iso: string): string {
  const t = new Date(iso)
  if (Number.isNaN(t.getTime())) return '기타'
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const day = new Date(t)
  day.setHours(0, 0, 0, 0)
  const diff = (today.getTime() - day.getTime()) / 86400000
  if (diff === 0) return '오늘'
  if (diff === 1) return '어제'
  if (diff < 7) return `${Math.floor(diff)}일 전`
  return t.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' })
}

interface PaginationInfo {
  total: number
  skip: number
  limit: number
  hasMore: boolean
}

const TYPE_LABELS: Record<string, string> = {
  create: '생성',
  edit: '편집',
  revert: '되돌림',
  delete: '삭제',
  protect: '보호'
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

  const load = async (page = 1, fetchAll = showAllChanges) => {
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

      const r = await fetch(`/api/wiki/recent?${sp.toString()}`)
      const d = await r.json()
      if (d.success) {
        setItems(d.changes)
        setPagination(d.pagination || { total: d.changes.length, skip, limit, hasMore: false })
        setCurrentPage(page)
        setShowAllChanges(fetchAll)
      }
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    load(1, true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const totalPages = Math.ceil(pagination.total / pagination.limit) || 1

  return (
    <WikiShell
      activeNav="recent"
      pageHeader={
        <WikiPageHeader
          title={showAllChanges ? '모든 변경 기록' : '최근 변경'}
          subtitle={
            showAllChanges
              ? '이랑위키에서 일어난 모든 변경 내역을 시간순으로 보여줍니다.'
              : '가장 최근에 일어난 변경 내역만 보여줍니다.'
          }
          hatnote={
            <>
              필요한 변경 내역만 보려면 아래 필터를 사용하세요. 작성자명을 누르면 그 사용자의 활동을, 문서명을 누르면 본문을 확인할 수 있습니다.
            </>
          }
          actions={
            <>
              <button
                type="button"
                onClick={() => load(1, true)}
                className={`inline-flex items-center gap-1 rounded-sm border px-2.5 py-1 text-xs ${
                  showAllChanges
                    ? 'bg-[color:var(--wiki-accent)] text-white border-[color:var(--wiki-accent)]'
                    : 'bg-[color:var(--wiki-bg-2)] border-[color:var(--wiki-rule-strong)] text-[color:var(--wiki-ink-soft)] hover:border-[color:var(--wiki-accent)]'
                }`}
              >
                모든 변경
              </button>
              <button
                type="button"
                onClick={() => load(1, false)}
                className={`inline-flex items-center gap-1 rounded-sm border px-2.5 py-1 text-xs ${
                  !showAllChanges
                    ? 'bg-[color:var(--wiki-accent)] text-white border-[color:var(--wiki-accent)]'
                    : 'bg-[color:var(--wiki-bg-2)] border-[color:var(--wiki-rule-strong)] text-[color:var(--wiki-ink-soft)] hover:border-[color:var(--wiki-accent)]'
                }`}
              >
                최근 변경
              </button>
              <a
                href="/api/wiki/feed"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 rounded-sm border border-amber-500/40 bg-amber-500/10 text-amber-300 px-2.5 py-1 text-xs hover:bg-amber-500/20 hover:border-amber-500/60"
                title="RSS 피드로 구독하기 (예: Feedly, Inoreader)"
              >
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M4 11v3c4.97 0 9 4.03 9 9h3c0-6.63-5.37-12-12-12zm0-7v3c9.39 0 17 7.61 17 17h3c0-11.05-8.95-20-20-20zm2 16a2 2 0 100-4 2 2 0 000 4z" />
                </svg>
                RSS
              </a>
              <button
                type="button"
                onClick={() => load(currentPage, showAllChanges)}
                disabled={isLoading}
                className="inline-flex items-center gap-1 rounded-sm border border-[color:var(--wiki-rule-strong)] bg-[color:var(--wiki-bg-2)] px-2.5 py-1 text-xs text-[color:var(--wiki-ink-soft)] hover:border-[color:var(--wiki-accent)] disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                새로고침
              </button>
            </>
          }
        />
      }
    >
      {/* 필터 */}
      <section className="wiki-panel mb-4">
        <h3 className="flex items-center gap-2 wiki-serif text-base font-semibold mb-2">
          <Filter className="w-4 h-4 text-[color:var(--wiki-accent)]" />
          필터
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
          <input
            value={namespace}
            onChange={(e) => setNamespace(e.target.value)}
            placeholder="네임스페이스"
            className="bg-[color:var(--wiki-bg-2)] border border-[color:var(--wiki-rule-strong)] rounded-sm px-2 py-1.5 text-sm text-[color:var(--wiki-ink)]"
          />
          <input
            value={type}
            onChange={(e) => setType(e.target.value)}
            placeholder="유형 (create/edit/revert)"
            className="bg-[color:var(--wiki-bg-2)] border border-[color:var(--wiki-rule-strong)] rounded-sm px-2 py-1.5 text-sm text-[color:var(--wiki-ink)]"
          />
          <input
            value={author}
            onChange={(e) => setAuthor(e.target.value)}
            placeholder="작성자"
            className="bg-[color:var(--wiki-bg-2)] border border-[color:var(--wiki-rule-strong)] rounded-sm px-2 py-1.5 text-sm text-[color:var(--wiki-ink)]"
          />
          <button
            type="button"
            onClick={() => { setCurrentPage(1); load(1, showAllChanges) }}
            disabled={isLoading}
            className="rounded-sm bg-[color:var(--wiki-accent)] px-3 py-1.5 text-xs font-medium text-white hover:opacity-90 disabled:opacity-50"
          >
            적용
          </button>
        </div>
      </section>

      {/* 결과 */}
      <section className="wiki-panel">
        <div className="flex items-center justify-between mb-2 text-xs text-[color:var(--wiki-ink-muted)]">
          <span>{isLoading ? '불러오는 중…' : `총 ${pagination.total.toLocaleString()}개의 변경`}</span>
          {totalPages > 1 && (
            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={currentPage === 1 || isLoading}
                onClick={() => load(currentPage - 1, showAllChanges)}
                className="inline-flex h-6 w-6 items-center justify-center rounded-sm border border-[color:var(--wiki-rule-strong)] bg-[color:var(--wiki-bg-2)] hover:border-[color:var(--wiki-accent)] disabled:opacity-40"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <span>{currentPage} / {totalPages}</span>
              <button
                type="button"
                disabled={currentPage === totalPages || isLoading}
                onClick={() => load(currentPage + 1, showAllChanges)}
                className="inline-flex h-6 w-6 items-center justify-center rounded-sm border border-[color:var(--wiki-rule-strong)] bg-[color:var(--wiki-bg-2)] hover:border-[color:var(--wiki-accent)] disabled:opacity-40"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>

        {isLoading ? (
          <p className="text-center py-6 text-sm text-[color:var(--wiki-ink-muted)]">
            <RefreshCw className="w-4 h-4 animate-spin inline-block mr-1.5 align-middle" />
            변경 내역을 불러오는 중입니다…
          </p>
        ) : items.length === 0 ? (
          <p className="text-center py-6 text-sm text-[color:var(--wiki-ink-muted)]">
            변경 내역이 없습니다.
          </p>
        ) : (
          (() => {
            // 날짜 그룹별로 묶기
            const groups: Record<string, RecentChange[]> = {}
            const order: string[] = []
            for (const item of items) {
              const key = dateGroup(item.revision.timestamp)
              if (!(key in groups)) {
                groups[key] = []
                order.push(key)
              }
              groups[key].push(item)
            }

            return (
              <div className="space-y-5">
                {order.map((groupKey) => (
                  <div key={groupKey}>
                    {/* 그룹 헤더 */}
                    <div className="flex items-baseline gap-2 mb-1.5 px-2">
                      <h3 className="text-sm font-semibold text-[color:var(--wiki-ink)] wiki-serif">
                        {groupKey}
                      </h3>
                      <span className="text-[10px] text-[color:var(--wiki-ink-muted)] tabular-nums">
                        {groups[groupKey].length}건
                      </span>
                    </div>

                    {/* 그룹 내 변경 리스트 */}
                    <ul className="border border-[color:var(--wiki-rule)] rounded-sm overflow-hidden divide-y divide-[color:var(--wiki-rule)]">
                      {groups[groupKey].map((item) => {
                        const sz = item.revision.sizeChange ?? 0
                        const isPositive = sz > 0
                        const isMinor = item.revision.isMinorEdit
                        const isAuto = item.revision.isAutomated

                        return (
                          <li
                            key={`${item.slug}-${item.revision.revisionNumber}`}
                            className="px-3 py-2 hover:bg-[color:var(--wiki-paper-2)] transition-colors"
                          >
                            <div className="flex items-start gap-2 flex-wrap">
                              {/* 시각 (상대) */}
                              <span
                                className="text-[11px] text-[color:var(--wiki-ink-muted)] tabular-nums w-16 flex-shrink-0 pt-0.5"
                                title={new Date(item.revision.timestamp).toLocaleString('ko-KR', { hour12: false })}
                              >
                                {relativeTime(item.revision.timestamp)}
                              </span>

                              {/* 유형 chip */}
                              <span
                                className={`wiki-chip text-[10px] flex-shrink-0 ${
                                  item.revision.editType === 'create'
                                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                                    : item.revision.editType === 'revert'
                                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                                      : ''
                                }`}
                              >
                                {TYPE_LABELS[item.revision.editType] || item.revision.editType}
                              </span>

                              {/* minor / auto badges */}
                              {isMinor && (
                                <span
                                  className="text-[10px] font-bold text-amber-400 bg-amber-500/15 border border-amber-500/30 rounded-sm px-1.5 py-0.5"
                                  title="마이너 편집"
                                >
                                  m
                                </span>
                              )}
                              {isAuto && (
                                <span
                                  className="text-[10px] font-bold text-blue-400 bg-blue-500/15 border border-blue-500/30 rounded-sm px-1.5 py-0.5"
                                  title="자동 편집"
                                >
                                  bot
                                </span>
                              )}

                              {/* 문서 제목 */}
                              <button
                                type="button"
                                onClick={() => router.push(`/wiki/${encodeURIComponent(item.title)}`)}
                                className="text-[color:var(--wiki-link)] hover:underline text-sm font-medium"
                              >
                                {item.title}
                              </button>

                              {/* size diff */}
                              {sz !== 0 && (
                                <span
                                  className={`text-[11px] tabular-nums font-mono ${
                                    isPositive ? 'text-emerald-400' : 'text-rose-400'
                                  }`}
                                  title={`총 ${item.revision.contentLength?.toLocaleString() ?? '?'} 자`}
                                >
                                  ({isPositive ? '+' : ''}{sz.toLocaleString()})
                                </span>
                              )}

                              {/* namespace (main 외) */}
                              {item.namespace && item.namespace !== 'main' && (
                                <span className="wiki-chip text-[10px] flex-shrink-0">
                                  {item.namespace}
                                </span>
                              )}

                              <span className="ml-auto" />

                              {/* 작성자 */}
                              <button
                                type="button"
                                onClick={() => {
                                  setAuthor(item.revision.author)
                                  load(1, showAllChanges)
                                }}
                                className="text-[11px] text-[color:var(--wiki-ink-soft)] hover:text-[color:var(--wiki-link)] hover:underline flex-shrink-0"
                                title="이 작성자의 변경만 보기"
                              >
                                {item.revision.author}
                              </button>
                            </div>

                            {/* 요약 (있을 경우) */}
                            {item.revision.summary && (
                              <div className="text-[11px] text-[color:var(--wiki-ink-muted)] mt-0.5 ml-[68px] line-clamp-1 italic">
                                “{item.revision.summary}”
                              </div>
                            )}
                          </li>
                        )
                      })}
                    </ul>
                  </div>
                ))}
              </div>
            )
          })()
        )}

        {pagination.total > 0 && !isLoading && (
          <p className="mt-3 pt-3 border-t border-[color:var(--wiki-rule)] text-center text-xs text-[color:var(--wiki-ink-muted)]">
            {showAllChanges
              ? <>{pagination.total.toLocaleString()}개의 변경 중 {items.length.toLocaleString()}개 표시 중</>
              : <>최근 {items.length.toLocaleString()}개의 변경 표시 중</>
            }
          </p>
        )}
      </section>
    </WikiShell>
  )
}

export default function WikiRecentChangesPage() {
  return (
    <Suspense
      fallback={
        <WikiShell>
          <div className="text-center py-24 text-sm text-[color:var(--wiki-ink-muted)]">
            불러오는 중…
          </div>
        </WikiShell>
      }
    >
      <WikiRecentChangesPageContent />
    </Suspense>
  )
}
