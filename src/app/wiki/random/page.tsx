'use client'

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Shuffle, AlertTriangle } from 'lucide-react'
import { WikiShell, WikiPageHeader } from '@/components/wiki'

export default function WikiRandomPage() {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let cancelled = false
    const pick = async () => {
      setError(null)
      try {
        const res = await fetch('/api/wiki/random', { cache: 'no-store' })
        const data = await res.json()
        if (!data?.success || !data?.title) {
          throw new Error(data?.error || '아직 표시할 문서가 없습니다.')
        }
        if (!cancelled) router.replace(`/wiki/${encodeURIComponent(data.title)}`)
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : '임의 문서를 불러오지 못했습니다.')
        }
      }
    }
    pick()
    return () => { cancelled = true }
  }, [router, attempt])

  return (
    <WikiShell
      activeNav="random"
      pageHeader={
        <WikiPageHeader
          title="임의 문서"
          subtitle="이랑위키의 문서 중 하나를 무작위로 골라 보여드립니다."
          hatnote={<>이 페이지는 자동으로 다른 문서로 이동합니다. 이동되지 않는다면 아래 버튼을 눌러 주세요.</>}
        />
      }
    >
      {error ? (
        <section className="wiki-mbox wiki-mbox--danger">
          <AlertTriangle className="w-4 h-4 mt-0.5 text-[color:var(--wiki-danger)]" />
          <div className="flex-1">
            <p>{error}</p>
            <div className="mt-2 flex gap-2">
              <button
                type="button"
                onClick={() => setAttempt(a => a + 1)}
                className="rounded-sm bg-[color:var(--wiki-accent)] px-3 py-1 text-xs font-medium text-white hover:opacity-90"
              >
                다시 시도
              </button>
              <button
                type="button"
                onClick={() => router.push('/wiki/recent')}
                className="rounded-sm border border-[color:var(--wiki-rule-strong)] bg-[color:var(--wiki-bg-2)] px-3 py-1 text-xs text-[color:var(--wiki-ink-soft)] hover:border-[color:var(--wiki-accent)]"
              >
                최근 변경 보기
              </button>
            </div>
          </div>
        </section>
      ) : (
        <section className="wiki-panel flex items-center gap-3 text-sm text-[color:var(--wiki-ink-soft)]">
          <Shuffle className="w-4 h-4 text-[color:var(--wiki-cyan)] animate-pulse" />
          <span>무작위 문서를 선택하는 중입니다…</span>
        </section>
      )}
    </WikiShell>
  )
}
