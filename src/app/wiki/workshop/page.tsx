'use client'

import { FormEvent, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  ArrowLeft,
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

export default function WikiWorkshopListPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { wikiUser, isLoggedIn } = useWikiAuth()

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [showComposer, setShowComposer] = useState(false)
  const [data, setData] = useState<WorkshopPayload>({
    statements: []
  })

  const [speaker, setSpeaker] = useState('')
  const [message, setMessage] = useState('')

  const listAuthorId = wikiUser?.username || '비로그인'

  const loadStatements = async () => {
    try {
      setLoading(true)
      setError(null)

      const res = await fetch('/api/wiki/workshop?limit=300', {
        cache: 'no-store'
      })
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

  useEffect(() => {
    loadStatements()
  }, [])

  useEffect(() => {
    if (searchParams.get('mode') === 'write') {
      setShowComposer(true)
    }
  }, [searchParams])

  const speakerCount = useMemo(
    () => new Set(data.statements.map(statement => statement.speaker)).size,
    [data.statements]
  )

  const latestIssue = data.statements.length > 0 ? `${data.statements[0].issueNumber}호` : '-'

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()

    if (!isLoggedIn) {
      router.push('/wiki/login')
      return
    }

    if (!speaker.trim() || !message.trim()) {
      setError('발언자와 메시지를 모두 입력해주세요.')
      return
    }

    try {
      setSubmitting(true)
      setError(null)

      const response = await fetch('/api/wiki/workshop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          speaker: speaker.trim(),
          message: message.trim()
        })
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
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-gray-100">
      <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <header className="relative overflow-hidden rounded-3xl border border-teal-400/30 bg-slate-900/70 p-6 shadow-[0_20px_70px_-35px_rgba(20,184,166,0.6)] backdrop-blur">
          <div className="absolute -top-24 -right-16 h-56 w-56 rounded-full bg-teal-400/20 blur-3xl" />
          <div className="absolute -bottom-20 -left-12 h-48 w-48 rounded-full bg-cyan-500/10 blur-3xl" />
          <div className="relative space-y-4">
            <Link
              href="/wiki"
              className="inline-flex items-center gap-2 rounded-full border border-slate-700 bg-slate-900/70 px-3 py-1 text-xs text-gray-300 hover:text-white"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              위키 대문으로
            </Link>
            <div className="space-y-2">
              <p className="text-xs uppercase tracking-[0.24em] text-teal-200/80">Workshop Archive</p>
              <h1 className="text-3xl font-semibold text-white">한울 X 재원의 작업공작소</h1>
              <p className="max-w-3xl text-sm text-gray-300">
                오늘의 발언 기록과 올해의 발언인을 한 곳에서 확인하고 작성할 수 있습니다.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setShowComposer(prev => !prev)}
                className="inline-flex items-center gap-2 rounded-full border border-emerald-400/40 bg-emerald-500/20 px-4 py-2 text-sm font-medium text-emerald-100 hover:bg-emerald-500/30"
              >
                <NotebookPen className="h-4 w-4" />
                작성하기
              </button>
              <Link
                href="/wiki/workshop"
                className="inline-flex items-center gap-2 rounded-full border border-cyan-400/30 bg-cyan-500/10 px-4 py-2 text-sm font-medium text-cyan-100 hover:bg-cyan-500/20"
              >
                <ListChecks className="h-4 w-4" />
                목록보기
              </Link>
              <Link
                href="/wiki/workshop/awards-2025"
                className="inline-flex items-center gap-2 rounded-full border border-amber-400/40 bg-amber-500/15 px-4 py-2 text-sm font-medium text-amber-100 hover:bg-amber-500/25"
              >
                [50호 기념 2025 시상식]
              </Link>
            </div>
          </div>
        </header>

        <section className="mt-6 rounded-2xl border border-amber-400/35 bg-gradient-to-r from-amber-500/15 via-yellow-500/10 to-transparent p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="space-y-1">
              <p className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-amber-200">
                <Trophy className="h-4 w-4" />
                올해의 발언인
              </p>
              <p className="text-2xl font-semibold text-white">{workshopAward2025.winner.name}</p>
              <p className="text-sm text-amber-100/90">
                {workshopAward2025.year} 선정 · {workshopAward2025.winner.issueLabel}
              </p>
            </div>
            <p className="max-w-2xl text-base font-medium leading-relaxed text-gray-100">
              “{workshopAward2025.winner.quote}”
            </p>
          </div>
        </section>

        <section className="mt-6 grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
            <p className="text-xs text-gray-400">누적 발언</p>
            <p className="mt-2 text-2xl font-semibold text-white">{data.statements.length}건</p>
          </div>
          <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
            <p className="text-xs text-gray-400">참여 발언자</p>
            <p className="mt-2 text-2xl font-semibold text-white">{speakerCount}명</p>
          </div>
          <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
            <p className="text-xs text-gray-400">최신 회차</p>
            <p className="mt-2 text-2xl font-semibold text-white">{latestIssue}</p>
          </div>
        </section>

        {showComposer && (
          <section className="mt-6 rounded-2xl border border-emerald-400/25 bg-slate-900/70 p-5">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-lg font-semibold text-white">오늘의 발언 작성</h2>
              <p className="text-xs text-gray-400">
                작성자: <span className="font-semibold text-cyan-200">{listAuthorId}</span>
              </p>
            </div>
            <form onSubmit={handleSubmit} className="space-y-3">
              <input
                type="text"
                value={speaker}
                onChange={(event) => setSpeaker(event.target.value)}
                placeholder="발언자 이름"
                className="w-full rounded-xl border border-slate-700 bg-slate-950/70 px-3 py-2 text-sm text-gray-100 outline-none focus:border-emerald-400/60"
                maxLength={40}
              />
              <textarea
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                placeholder="오늘의 발언 메시지를 입력하세요."
                className="min-h-28 w-full rounded-xl border border-slate-700 bg-slate-950/70 px-3 py-2 text-sm text-gray-100 outline-none focus:border-emerald-400/60"
                maxLength={1200}
              />
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center gap-2 rounded-xl border border-emerald-400/50 bg-emerald-500/20 px-4 py-2 text-sm font-medium text-emerald-100 disabled:opacity-50"
                >
                  <Send className="h-4 w-4" />
                  {submitting ? '작성 중...' : '등록하기'}
                </button>
                {!isLoggedIn && (
                  <button
                    type="button"
                    onClick={() => router.push('/wiki/login')}
                    className="rounded-xl border border-slate-700 bg-slate-800/70 px-4 py-2 text-sm text-gray-200"
                  >
                    로그인하고 작성
                  </button>
                )}
              </div>
            </form>
          </section>
        )}

        {error && (
          <p className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
            {error}
          </p>
        )}

        <section className="mt-6 space-y-4">
          {loading ? (
            <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-8 text-center text-sm text-gray-400">
              발언 목록을 불러오는 중입니다...
            </div>
          ) : data.statements.length === 0 ? (
            <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-8 text-center text-sm text-gray-400">
              아직 등록된 발언이 없습니다.
            </div>
          ) : (
            data.statements.map((statement) => (
              <article
                key={statement.id}
                className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5 transition-colors hover:border-teal-400/40"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="inline-flex items-center gap-2 rounded-full border border-teal-400/30 bg-teal-500/10 px-3 py-1 text-xs font-semibold text-teal-100">
                    <MessageCircle className="h-3.5 w-3.5" />
                    {statement.issueLabel}
                  </div>
                  <div className="inline-flex items-center gap-1 text-xs text-gray-500">
                    <CalendarDays className="h-3.5 w-3.5" />
                    {new Date(statement.createdAt).toLocaleString('ko-KR', { hour12: false })}
                  </div>
                </div>
                <p className="mt-4 text-lg font-semibold leading-relaxed text-gray-100 sm:text-xl">
                  {statement.message}
                </p>
                <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
                  <span className="inline-flex items-center gap-1 rounded-full border border-cyan-400/30 bg-cyan-500/10 px-2.5 py-1 text-cyan-100">
                    <Mic2 className="h-3.5 w-3.5" />
                    {statement.speaker}
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full border border-indigo-400/30 bg-indigo-500/10 px-2.5 py-1 text-indigo-100">
                    <UserRound className="h-3.5 w-3.5" />
                    @{statement.listAuthor}
                  </span>
                </div>
              </article>
            ))
          )}
        </section>
      </main>
    </div>
  )
}
