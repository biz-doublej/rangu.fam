'use client'

import React, { FormEvent, Suspense, useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  CalendarDays,
  ListChecks,
  MessageCircle,
  Mic2,
  NotebookPen,
  Send,
  Trophy,
  UserRound
} from 'lucide-react'
import { useWikiAuth } from '@/contexts/WikiAuthContext'
import { workshopAward2025 } from '@/data/wikiWorkshopAward'
import { WikiShell, WikiPageHeader } from '@/components/wiki'

type WorkshopStatement = {
  id: string
  issueNumber: number
  issueLabel: string
  speaker: string
  message: string
  listAuthor: string
  listAuthorDisplayName: string
  listAuthorDiscordId: string | null
  createdAt: string
}

type WorkshopPayload = {
  statements: WorkshopStatement[]
}

function WikiWorkshopListPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { wikiUser, isLoggedIn } = useWikiAuth()

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [showComposer, setShowComposer] = useState(false)
  const [data, setData] = useState<WorkshopPayload>({ statements: [] })

  const [speaker, setSpeaker] = useState('')
  const [message, setMessage] = useState('')

  const listAuthorId = wikiUser?.username || '비로그인'

  const loadStatements = async () => {
    try {
      setLoading(true)
      setError(null)
      const res = await fetch('/api/wiki/workshop?limit=300', { cache: 'no-store' })
      const payload = await res.json()
      if (!res.ok || !payload?.success) {
        throw new Error(payload?.error || '발언 목록을 불러오지 못했습니다.')
      }
      setData(payload.data)
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : '발언 목록 로딩 실패')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadStatements() }, [])

  useEffect(() => {
    if (searchParams.get('mode') === 'write') setShowComposer(true)
  }, [searchParams])

  const speakerCount = useMemo(
    () => new Set(data.statements.map(s => s.speaker)).size,
    [data.statements]
  )
  const latestIssue = data.statements.length > 0 ? `${data.statements[0].issueNumber}호` : '—'

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (!isLoggedIn) {
      router.push('/auth/start?callbackUrl=%2Fwiki%2Fworkshop')
      return
    }
    if (!speaker.trim() || !message.trim()) {
      setError('발언자와 메시지를 모두 입력해 주세요.')
      return
    }
    try {
      setSubmitting(true)
      setError(null)
      const response = await fetch('/api/wiki/workshop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ speaker: speaker.trim(), message: message.trim() })
      })
      const payload = await response.json()
      if (!response.ok || !payload?.success) {
        throw new Error(payload?.error || '작성에 실패했습니다.')
      }
      setSpeaker('')
      setMessage('')
      await loadStatements()
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : '작성 처리 중 오류')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <WikiShell
      activeNav="workshop"
      pageHeader={
        <WikiPageHeader
          title="한울 X 재원의 작업공작소"
          subtitle="오늘의 발언 기록과 올해의 발언인을 한 곳에서 확인하고 작성합니다."
          hatnote={<>오늘의 발언은 매주 새로 갱신됩니다. 50호 기념 시상식은 별도 탭에서 확인하세요.</>}
          meta={[
            { label: '누적 발언', value: `${data.statements.length.toLocaleString()}건`, icon: MessageCircle },
            { label: '참여 발언자', value: `${speakerCount.toLocaleString()}명`, icon: UserRound },
            { label: '최신 회차', value: latestIssue, icon: CalendarDays }
          ]}
          actions={
            <>
              <button
                type="button"
                onClick={() => setShowComposer(prev => !prev)}
                className="inline-flex items-center gap-1 rounded-sm border border-[color:var(--wiki-success)]/55 bg-[color:var(--wiki-bg-2)] px-2.5 py-1 text-xs text-[color:var(--wiki-success)] hover:border-[color:var(--wiki-success)]"
              >
                <NotebookPen className="w-3.5 h-3.5" />
                작성하기
              </button>
              <button
                type="button"
                onClick={() => router.push('/wiki/workshop/awards-2025')}
                className="inline-flex items-center gap-1 rounded-sm border border-[color:var(--wiki-warning)]/55 bg-[color:var(--wiki-bg-2)] px-2.5 py-1 text-xs text-[color:var(--wiki-warning)] hover:border-[color:var(--wiki-warning)]"
              >
                <Trophy className="w-3.5 h-3.5" />
                50호 시상식
              </button>
              <button
                type="button"
                onClick={() => router.push('/wiki')}
                className="inline-flex items-center gap-1 rounded-sm border border-[color:var(--wiki-rule-strong)] bg-[color:var(--wiki-bg-2)] px-2.5 py-1 text-xs text-[color:var(--wiki-ink-soft)] hover:border-[color:var(--wiki-accent)]"
              >
                <ListChecks className="w-3.5 h-3.5" />
                위키 대문
              </button>
            </>
          }
        />
      }
      rightRail={
        <>
          <table className="wiki-infobox">
            <caption>올해의 발언인</caption>
            <tbody>
              <tr>
                <th className="text-left">수상자</th>
                <td>{workshopAward2025.winner.name}</td>
              </tr>
              <tr>
                <th className="text-left">연도</th>
                <td>{workshopAward2025.year}</td>
              </tr>
              <tr>
                <th className="text-left">대표 회차</th>
                <td>{workshopAward2025.winner.issueLabel}</td>
              </tr>
            </tbody>
          </table>

          <section className="wiki-panel">
            <h4 className="wiki-display text-sm font-semibold flex items-center gap-1.5">
              <Trophy className="w-4 h-4 text-[color:var(--wiki-warning)]" />
              올해의 한 마디
            </h4>
            <blockquote className="mt-2 text-sm text-[color:var(--wiki-ink-soft)] border-l-2 border-[color:var(--wiki-warning)]/60 pl-3 leading-relaxed">
              “{workshopAward2025.winner.quote}”
            </blockquote>
            <button
              type="button"
              onClick={() => router.push('/wiki/workshop/awards-2025')}
              className="mt-3 inline-flex w-full justify-center rounded-sm bg-[color:var(--wiki-warning)]/10 border border-[color:var(--wiki-warning)]/40 px-2.5 py-1.5 text-xs text-[color:var(--wiki-warning)] hover:bg-[color:var(--wiki-warning)]/20"
            >
              시상식 페이지 열기
            </button>
          </section>
        </>
      }
    >
      {showComposer && (
        <section className="wiki-panel mb-4">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <h2 className="wiki-display text-base font-semibold">오늘의 발언 작성</h2>
            <p className="text-xs text-[color:var(--wiki-ink-muted)]"
               style={{ fontFamily: "'JetBrains Mono', monospace" }}>
              작성자: <span className="text-[color:var(--wiki-cyan)]">@{listAuthorId}</span>
            </p>
          </div>
          <form onSubmit={handleSubmit} className="space-y-2">
            <input
              type="text"
              value={speaker}
              onChange={(e) => setSpeaker(e.target.value)}
              placeholder="발언자 이름"
              className="w-full rounded-sm px-3 py-2 text-sm"
              maxLength={40}
            />
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="오늘의 발언 메시지를 입력하세요."
              className="min-h-28 w-full rounded-sm px-3 py-2 text-sm"
              maxLength={1200}
            />
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="submit"
                disabled={submitting}
                className="inline-flex items-center gap-1.5 rounded-sm bg-[color:var(--wiki-accent)] px-3 py-1.5 text-xs font-medium text-white hover:opacity-90 disabled:opacity-50"
              >
                <Send className="w-3.5 h-3.5" />
                {submitting ? '작성 중…' : '등록하기'}
              </button>
              {!isLoggedIn && (
                <button
                  type="button"
                  onClick={() => router.push('/auth/start?callbackUrl=%2Fwiki%2Fworkshop')}
                  className="rounded-sm border border-[color:var(--wiki-rule-strong)] bg-[color:var(--wiki-bg-2)] px-3 py-1.5 text-xs text-[color:var(--wiki-ink-soft)] hover:border-[color:var(--wiki-accent)]"
                >
                  로그인하고 작성
                </button>
              )}
            </div>
          </form>
        </section>
      )}

      {error && (
        <div className="wiki-mbox wiki-mbox--danger mb-4">
          <span>{error}</span>
        </div>
      )}

      <section className="space-y-3">
        {loading ? (
          <p className="wiki-panel text-sm text-[color:var(--wiki-ink-muted)] text-center py-6">
            발언 목록을 불러오는 중입니다…
          </p>
        ) : data.statements.length === 0 ? (
          <p className="wiki-panel text-sm text-[color:var(--wiki-ink-muted)] text-center py-6">
            아직 등록된 발언이 없습니다.
          </p>
        ) : (
          data.statements.map((statement) => (
            <article key={statement.id} className="wiki-panel">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="wiki-chip is-active">
                  <MessageCircle className="w-3 h-3" />
                  {statement.issueLabel}
                </span>
                <span
                  className="text-[11px] text-[color:var(--wiki-ink-muted)] inline-flex items-center gap-1"
                  style={{ fontFamily: "'JetBrains Mono', monospace" }}
                >
                  <CalendarDays className="w-3 h-3" />
                  {new Date(statement.createdAt).toLocaleString('ko-KR', { hour12: false })}
                </span>
              </div>
              <p className="mt-3 text-base font-semibold leading-relaxed text-[color:var(--wiki-ink)]">
                {statement.message}
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-1.5 text-xs">
                <span className="wiki-chip">
                  <Mic2 className="w-3 h-3" />
                  {statement.speaker}
                </span>
                <span
                  className="wiki-chip"
                  style={{ borderColor: 'rgba(167,139,250,0.45)', color: 'var(--wiki-violet)' }}
                >
                  <UserRound className="w-3 h-3" />
                  @{statement.listAuthor}
                </span>
              </div>
            </article>
          ))
        )}
      </section>
    </WikiShell>
  )
}

export default function WikiWorkshopListPage() {
  return (
    <Suspense
      fallback={
        <WikiShell>
          <p className="wiki-panel text-center py-8 text-sm text-[color:var(--wiki-ink-muted)]">
            작업공작소 페이지를 불러오는 중입니다…
          </p>
        </WikiShell>
      }
    >
      <WikiWorkshopListPageContent />
    </Suspense>
  )
}
