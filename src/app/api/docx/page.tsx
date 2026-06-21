'use client'

import React, { useMemo, useState } from 'react'
import { KeyRound, Lock, Search, Server, ShieldCheck } from 'lucide-react'

interface Endpoint {
  method: string
  path: string
  desc: string
}
interface Group {
  category: string
  emoji: string
  endpoints: Endpoint[]
}

const methodColor = (method: string): { bg: string; fg: string } => {
  const m = method.split('·')[0]
  switch (m) {
    case 'GET':
      return { bg: 'rgba(62,92,74,0.12)', fg: '#2D4435' }
    case 'POST':
      return { bg: 'rgba(224,101,78,0.14)', fg: '#C44E36' }
    case 'PATCH':
      return { bg: 'rgba(194,138,45,0.16)', fg: '#9A6C20' }
    case 'DELETE':
      return { bg: 'rgba(176,52,52,0.14)', fg: '#9B2C2C' }
    default:
      return { bg: 'rgba(43,33,24,0.10)', fg: '#2B2118' }
  }
}

export default function ApiConsolePage() {
  const [password, setPassword] = useState('')
  const [authed, setAuthed] = useState(false)
  const [catalog, setCatalog] = useState<Group[]>([])
  const [total, setTotal] = useState(0)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [query, setQuery] = useState('')

  const submit = async () => {
    if (!password || loading) return
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/docx/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      })
      const data = await res.json()
      if (data.success) {
        setCatalog(data.catalog)
        setTotal(data.totalEndpoints)
        setAuthed(true)
      } else {
        setError(data.message || '비밀번호가 올바르지 않습니다.')
      }
    } catch {
      setError('서버에 연결할 수 없습니다.')
    } finally {
      setLoading(false)
    }
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return catalog
    return catalog
      .map((g) => ({
        ...g,
        endpoints: g.endpoints.filter(
          (e) =>
            e.path.toLowerCase().includes(q) ||
            e.desc.toLowerCase().includes(q) ||
            g.category.toLowerCase().includes(q)
        ),
      }))
      .filter((g) => g.endpoints.length > 0)
  }, [catalog, query])

  // ── 비밀번호 게이트 ──────────────────────────────────────────
  if (!authed) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-paper-100 px-4">
        <div className="w-full max-w-sm rounded-2xl border border-ink-500/12 bg-paper-50 p-8 shadow-paper">
          <div className="mb-5 flex flex-col items-center text-center">
            <span className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-ink-500/8">
              <Lock className="h-6 w-6 text-ink-500" />
            </span>
            <h1 className="font-display text-2xl text-ink-500">API 콘솔</h1>
            <p className="mt-1 text-sm text-ink-300">랑구팸 · 위키 API 관리 화면</p>
          </div>

          <label className="mb-1.5 block text-xs font-bold text-ink-300">비밀번호</label>
          <div className="relative">
            <KeyRound className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-300" />
            <input
              type="password"
              autoFocus
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && submit()}
              placeholder="비밀번호를 입력하세요"
              className="w-full rounded-xl border border-ink-500/15 bg-paper-50 py-2.5 pl-9 pr-3 text-sm text-ink-500 placeholder-ink-300 focus:border-coral-500/40 focus:outline-none focus:ring-1 focus:ring-coral-500/30"
            />
          </div>

          {error && <p className="mt-2 text-xs font-medium text-coral-600">{error}</p>}

          <button
            type="button"
            onClick={submit}
            disabled={loading || !password}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-ink-500 py-2.5 text-sm font-bold text-paper-50 transition hover:bg-ink-600 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-paper-50/30 border-t-paper-50" />
            ) : (
              <ShieldCheck className="h-4 w-4" />
            )}
            입장
          </button>
        </div>
      </div>
    )
  }

  // ── 인증 후 카탈로그 ─────────────────────────────────────────
  return (
    <div className="min-h-screen bg-paper-100 pb-20">
      <div className="border-b border-dashed border-ink-500/15 bg-paper-50">
        <div className="mx-auto max-w-4xl px-5 py-6 sm:px-8">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <Server className="h-5 w-5 text-ink-500" />
                <h1 className="font-display text-2xl text-ink-500">API 콘솔</h1>
              </div>
              <p className="mt-1 text-sm text-ink-300">
                랑구팸 · 위키 전체 엔드포인트{' '}
                <span className="font-mono font-bold text-ink-500">{total}</span>개
              </p>
            </div>
          </div>

          <div className="relative mt-4">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-300" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="경로·설명으로 검색…"
              className="w-full rounded-xl border border-ink-500/15 bg-paper-50 py-2 pl-9 pr-3 text-sm text-ink-500 placeholder-ink-300 focus:border-coral-500/40 focus:outline-none focus:ring-1 focus:ring-coral-500/30"
            />
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-4xl space-y-8 px-5 pt-8 sm:px-8">
        {filtered.map((group) => (
          <section key={group.category}>
            <h2 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-ink-400">
              <span className="text-base">{group.emoji}</span>
              {group.category}
              <span className="ml-1 rounded-full bg-ink-500/8 px-2 py-0.5 text-[10px] font-bold text-ink-300">
                {group.endpoints.length}
              </span>
            </h2>
            <div className="overflow-hidden rounded-xl border border-ink-500/12 bg-paper-50">
              {group.endpoints.map((e, i) => {
                const c = methodColor(e.method)
                return (
                  <div
                    key={e.path + e.method}
                    className={`flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-3 ${
                      i > 0 ? 'border-t border-dashed border-ink-500/10' : ''
                    }`}
                  >
                    <span
                      className="shrink-0 rounded-md px-2 py-0.5 font-mono text-[10px] font-bold"
                      style={{ background: c.bg, color: c.fg }}
                    >
                      {e.method}
                    </span>
                    <code className="font-mono text-[13px] font-semibold text-ink-500">{e.path}</code>
                    <span className="ml-auto text-xs text-ink-300">{e.desc}</span>
                  </div>
                )
              })}
            </div>
          </section>
        ))}

        {filtered.length === 0 && (
          <p className="py-12 text-center text-sm text-ink-300">검색 결과가 없습니다.</p>
        )}
      </div>
    </div>
  )
}
