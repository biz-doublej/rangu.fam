'use client'

import React, { useCallback, useEffect, useMemo, useState } from 'react'
import {
  ArrowRightLeft,
  ExternalLink,
  FileText,
  History,
  LockOpen,
  RefreshCw,
  Search,
  Shield,
  Trash2,
  Undo2,
  X,
} from 'lucide-react'

// ── 타입 ────────────────────────────────────────────────
interface DocProtection {
  level: 'none' | 'semi' | 'full' | 'admin'
  reason?: string
  protectedBy?: string
  protectedUntil?: string
  allowedRoles?: string[]
}

interface DocEditLock {
  isLocked: boolean
  lockedBy?: string
  lockExpiry?: string
}

interface DocRow {
  id: string
  title: string
  slug: string
  namespace: string
  lastEditor?: string
  lastEditDate?: string
  lastEditSummary?: string
  currentRevision: number
  views: number
  edits: number
  protection?: DocProtection
  editLock?: DocEditLock
  isRedirect?: boolean
  redirectTarget?: string | null
  isDeleted?: boolean
  deletedBy?: string | null
  deleteReason?: string | null
}

interface RevisionRow {
  revisionNumber: number
  summary?: string
  author: string
  editType: string
  contentLength: number
  sizeChange: number
  isReverted: boolean
  timestamp: string
}

type DocFilter = 'all' | 'protected' | 'locked' | 'redirect' | 'deleted'

const FILTERS: Array<{ key: DocFilter; label: string }> = [
  { key: 'all', label: '전체' },
  { key: 'protected', label: '보호됨' },
  { key: 'locked', label: '잠김' },
  { key: 'redirect', label: '리다이렉트' },
  { key: 'deleted', label: '삭제됨' },
]

const PROTECTION_LABELS: Record<DocProtection['level'], string> = {
  none: '보호 없음',
  semi: '준보호 (editor 이상 편집)',
  full: '완전 보호 (moderator 이상 편집)',
  admin: '관리자 전용',
}

function formatDate(value?: string | null): string {
  if (!value) return '—'
  try {
    return new Date(value).toLocaleString('ko-KR', { dateStyle: 'short', timeStyle: 'short' })
  } catch {
    return value
  }
}

// ── 메인 컴포넌트 ────────────────────────────────────────
export default function WikiDocsManagement() {
  const [docs, setDocs] = useState<DocRow[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [busy, setBusy] = useState(false)
  const [filter, setFilter] = useState<DocFilter>('all')
  const [search, setSearch] = useState('')
  const [appliedSearch, setAppliedSearch] = useState('')

  // 모달 대상
  const [protectTarget, setProtectTarget] = useState<DocRow | null>(null)
  const [moveTarget, setMoveTarget] = useState<DocRow | null>(null)
  const [historyTarget, setHistoryTarget] = useState<DocRow | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<DocRow | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ limit: '100', sort: 'lastEdit', namespace: 'all' })
      if (appliedSearch) params.set('search', appliedSearch)
      if (filter === 'deleted') params.set('deleted', '1')
      const r = await fetch(`/api/wiki/pages?${params.toString()}`, { credentials: 'include' })
      const d = await r.json().catch(() => null)
      if (r.ok && d?.success) {
        setDocs(d.pages || [])
        setTotal(d.pagination?.total ?? (d.pages || []).length)
      } else {
        setDocs([])
        setTotal(0)
      }
    } catch {
      setDocs([])
      setTotal(0)
    } finally {
      setLoading(false)
    }
  }, [appliedSearch, filter])

  useEffect(() => {
    load()
  }, [load])

  // 보호/잠김/리다이렉트는 클라이언트 필터 (삭제됨은 서버 필터)
  const visible = useMemo(() => {
    switch (filter) {
      case 'protected':
        return docs.filter((d) => (d.protection?.level ?? 'none') !== 'none')
      case 'locked':
        return docs.filter((d) => d.editLock?.isLocked)
      case 'redirect':
        return docs.filter((d) => d.isRedirect)
      default:
        return docs
    }
  }, [docs, filter])

  // 공통 액션 실행기 — 성공 시 alert + 목록 갱신
  const runAction = useCallback(
    async (fn: () => Promise<Response>): Promise<boolean> => {
      setBusy(true)
      try {
        const r = await fn()
        const d = await r.json().catch(() => null)
        if (r.ok && d?.success) {
          if (d.message) alert(d.message)
          await load()
          return true
        }
        alert(d?.error || '처리에 실패했습니다.')
        return false
      } catch {
        alert('요청 중 오류가 발생했습니다.')
        return false
      } finally {
        setBusy(false)
      }
    },
    [load]
  )

  const unlockDoc = (doc: DocRow) => {
    if (!confirm(`"${doc.title}" 문서의 편집 잠금을 해제할까요?\n(현재 ${doc.editLock?.lockedBy || '알 수 없음'} 님이 잠금 중)`)) return
    runAction(() =>
      fetch(`/api/wiki/pages/lock?title=${encodeURIComponent(doc.title)}`, {
        method: 'DELETE',
        credentials: 'include',
      })
    )
  }

  const restoreDoc = (doc: DocRow) => {
    if (!confirm(`"${doc.title}" 문서를 복구할까요?`)) return
    runAction(() =>
      fetch(`/api/wiki/pages?title=${encodeURIComponent(doc.title)}&restore=1`, {
        method: 'DELETE',
        credentials: 'include',
      })
    )
  }

  return (
    <div className="space-y-4">
      {/* 헤더 */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-cyan-400" />
          <h3 className="text-sm font-semibold text-white">문서 관리</h3>
          <span className="text-xs text-slate-500">
            {loading ? '불러오는 중…' : `${visible.length}개 표시 / 전체 ${total.toLocaleString()}개`}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <form
            onSubmit={(e) => {
              e.preventDefault()
              setAppliedSearch(search.trim())
            }}
            className="flex items-center gap-1 rounded-md border border-slate-700 bg-slate-900 px-2"
          >
            <Search className="h-3.5 w-3.5 text-slate-500" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="제목·내용·태그 검색"
              className="w-44 bg-transparent py-1.5 text-xs text-slate-200 placeholder:text-slate-600 focus:outline-none"
            />
            {appliedSearch && (
              <button
                type="button"
                onClick={() => {
                  setSearch('')
                  setAppliedSearch('')
                }}
                className="rounded p-0.5 text-slate-500 hover:text-slate-200"
                title="검색 초기화"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </form>
          <button
            type="button"
            onClick={() => load()}
            disabled={loading}
            className="inline-flex items-center gap-1.5 rounded-md border border-slate-700 px-2.5 py-1.5 text-xs text-slate-300 transition hover:bg-slate-800 disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            새로고침
          </button>
        </div>
      </div>

      {/* 필터 칩 */}
      <div className="flex flex-wrap gap-1.5">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            type="button"
            onClick={() => setFilter(f.key)}
            className={`rounded-full px-3 py-1 text-xs transition ${
              filter === f.key
                ? 'border border-cyan-500/30 bg-cyan-500/15 text-cyan-300'
                : 'border border-slate-700 text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* 목록 */}
      <div className="overflow-x-auto rounded-lg border border-slate-800 bg-slate-900/60">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead>
            <tr className="border-b border-slate-800 text-[11px] uppercase tracking-wide text-slate-500">
              <th className="px-4 py-2.5 font-medium">문서</th>
              <th className="px-3 py-2.5 font-medium">최근 편집</th>
              <th className="px-3 py-2.5 font-medium">리비전</th>
              <th className="px-3 py-2.5 font-medium">조회</th>
              <th className="px-3 py-2.5 text-right font-medium">작업</th>
            </tr>
          </thead>
          <tbody>
            {visible.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-sm text-slate-500">
                  {loading ? '불러오는 중…' : '조건에 맞는 문서가 없습니다.'}
                </td>
              </tr>
            )}
            {visible.map((doc) => (
              <tr key={doc.id} className="border-b border-slate-800/60 last:border-0 hover:bg-slate-800/30">
                <td className="px-4 py-2.5">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="font-medium text-slate-100">{doc.title}</span>
                    {doc.namespace !== 'main' && (
                      <span className="rounded bg-slate-800 px-1.5 py-0.5 text-[10px] text-slate-400">
                        {doc.namespace}
                      </span>
                    )}
                    {(doc.protection?.level ?? 'none') !== 'none' && (
                      <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-1.5 py-0.5 text-[10px] text-amber-300">
                        보호: {doc.protection?.level}
                      </span>
                    )}
                    {doc.editLock?.isLocked && (
                      <span className="rounded-full border border-cyan-500/30 bg-cyan-500/10 px-1.5 py-0.5 text-[10px] text-cyan-300">
                        잠김: {doc.editLock.lockedBy || '?'}
                      </span>
                    )}
                    {doc.isRedirect && (
                      <span className="rounded-full border border-slate-500/40 bg-slate-500/10 px-1.5 py-0.5 text-[10px] text-slate-300">
                        → {doc.redirectTarget || '리다이렉트'}
                      </span>
                    )}
                    {doc.isDeleted && (
                      <span className="rounded-full border border-rose-500/30 bg-rose-500/10 px-1.5 py-0.5 text-[10px] text-rose-300">
                        삭제됨{doc.deletedBy ? ` (${doc.deletedBy})` : ''}
                      </span>
                    )}
                  </div>
                  {doc.isDeleted && doc.deleteReason && (
                    <p className="mt-0.5 text-[11px] text-slate-500">사유: {doc.deleteReason}</p>
                  )}
                </td>
                <td className="px-3 py-2.5 text-xs text-slate-400">
                  <div>{doc.lastEditor || '—'}</div>
                  <div className="text-[11px] text-slate-500">{formatDate(doc.lastEditDate)}</div>
                </td>
                <td className="px-3 py-2.5 font-mono text-xs text-slate-400">r{doc.currentRevision}</td>
                <td className="px-3 py-2.5 font-mono text-xs tabular-nums text-slate-400">
                  {doc.views.toLocaleString()}
                </td>
                <td className="px-3 py-2.5">
                  <div className="flex items-center justify-end gap-1">
                    <a
                      href={`/wiki/${encodeURIComponent(doc.title)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded p-1.5 text-slate-400 transition hover:bg-slate-800 hover:text-cyan-300"
                      title="문서 보기 (새 탭)"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                    {!doc.isDeleted && (
                      <>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => setHistoryTarget(doc)}
                          className="rounded p-1.5 text-slate-400 transition hover:bg-slate-800 hover:text-cyan-300 disabled:opacity-40"
                          title="역사 · 되돌리기"
                        >
                          <History className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => setProtectTarget(doc)}
                          className="rounded p-1.5 text-slate-400 transition hover:bg-slate-800 hover:text-amber-300 disabled:opacity-40"
                          title="보호 설정"
                        >
                          <Shield className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => setMoveTarget(doc)}
                          className="rounded p-1.5 text-slate-400 transition hover:bg-slate-800 hover:text-emerald-300 disabled:opacity-40"
                          title="문서 이동 (제목 변경)"
                        >
                          <ArrowRightLeft className="h-3.5 w-3.5" />
                        </button>
                        {doc.editLock?.isLocked && (
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => unlockDoc(doc)}
                            className="rounded p-1.5 text-cyan-300 transition hover:bg-slate-800 hover:text-cyan-200 disabled:opacity-40"
                            title="편집 잠금 해제"
                          >
                            <LockOpen className="h-3.5 w-3.5" />
                          </button>
                        )}
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => setDeleteTarget(doc)}
                          className="rounded p-1.5 text-slate-400 transition hover:bg-rose-500/10 hover:text-rose-300 disabled:opacity-40"
                          title="문서 삭제"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </>
                    )}
                    {doc.isDeleted && (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => restoreDoc(doc)}
                        className="inline-flex items-center gap-1 rounded border border-emerald-500/30 bg-emerald-500/10 px-2 py-1 text-[11px] text-emerald-300 transition hover:bg-emerald-500/20 disabled:opacity-40"
                        title="문서 복구"
                      >
                        <Undo2 className="h-3 w-3" />
                        복구
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-[11px] text-slate-500">
        삭제는 소프트 삭제(복구 가능)입니다. 보호 레벨: 준보호(semi)=editor 이상, 완전 보호(full)=moderator
        이상, admin=관리자 전용. 편집 잠금은 10분짜리 동시 편집 방지 잠금입니다.
      </p>

      {/* 모달들 */}
      {protectTarget && (
        <ProtectModal
          doc={protectTarget}
          busy={busy}
          onClose={() => setProtectTarget(null)}
          onSubmit={async (body) => {
            const ok = await runAction(() =>
              fetch('/api/wiki/pages/protect', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(body),
              })
            )
            if (ok) setProtectTarget(null)
          }}
        />
      )}

      {moveTarget && (
        <MoveModal
          doc={moveTarget}
          busy={busy}
          onClose={() => setMoveTarget(null)}
          onSubmit={async (body) => {
            const ok = await runAction(() =>
              fetch('/api/wiki/pages/move', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(body),
              })
            )
            if (ok) setMoveTarget(null)
          }}
        />
      )}

      {historyTarget && (
        <HistoryModal
          doc={historyTarget}
          busy={busy}
          onClose={() => setHistoryTarget(null)}
          onRevert={async (revisionNumber, summary) => {
            const ok = await runAction(() =>
              fetch('/api/wiki/pages/revert', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ title: historyTarget.title, revisionNumber, summary }),
              })
            )
            if (ok) setHistoryTarget(null)
          }}
        />
      )}

      {deleteTarget && (
        <DeleteModal
          doc={deleteTarget}
          busy={busy}
          onClose={() => setDeleteTarget(null)}
          onSubmit={async (reason) => {
            const params = new URLSearchParams({ title: deleteTarget.title })
            if (reason) params.set('reason', reason)
            const ok = await runAction(() =>
              fetch(`/api/wiki/pages?${params.toString()}`, {
                method: 'DELETE',
                credentials: 'include',
              })
            )
            if (ok) setDeleteTarget(null)
          }}
        />
      )}
    </div>
  )
}

// ── 모달 셸 ─────────────────────────────────────────────
function Modal({
  title,
  onClose,
  children,
  wide,
}: {
  title: string
  onClose: () => void
  children: React.ReactNode
  wide?: boolean
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
    >
      <div
        className={`w-full ${wide ? 'max-w-2xl' : 'max-w-md'} max-h-[85vh] overflow-y-auto rounded-lg border border-slate-700 bg-slate-900 p-5 shadow-xl`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-white">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-slate-400 transition hover:bg-slate-800 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

const inputClass =
  'w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-200 placeholder:text-slate-600 focus:border-cyan-500/60 focus:outline-none'
const labelClass = 'mb-1 block text-xs text-slate-400'
const primaryBtnClass =
  'inline-flex items-center justify-center gap-1.5 rounded-md bg-cyan-500 px-3 py-2 text-xs font-medium text-slate-950 transition hover:bg-cyan-400 disabled:opacity-50'
const ghostBtnClass =
  'inline-flex items-center justify-center rounded-md border border-slate-700 px-3 py-2 text-xs text-slate-300 transition hover:bg-slate-800 disabled:opacity-50'

// ── 보호 설정 모달 ───────────────────────────────────────
function ProtectModal({
  doc,
  busy,
  onClose,
  onSubmit,
}: {
  doc: DocRow
  busy: boolean
  onClose: () => void
  onSubmit: (body: {
    title: string
    level: DocProtection['level']
    reason?: string
    protectedUntil?: string
  }) => void
}) {
  const [level, setLevel] = useState<DocProtection['level']>(doc.protection?.level ?? 'none')
  const [reason, setReason] = useState(doc.protection?.reason ?? '')
  const [until, setUntil] = useState('')

  return (
    <Modal title={`보호 설정 — ${doc.title}`} onClose={onClose}>
      <div className="space-y-3">
        <div>
          <label className={labelClass}>보호 레벨</label>
          <select
            value={level}
            onChange={(e) => setLevel(e.target.value as DocProtection['level'])}
            className={inputClass}
          >
            {(Object.keys(PROTECTION_LABELS) as Array<DocProtection['level']>).map((lv) => (
              <option key={lv} value={lv}>
                {lv} — {PROTECTION_LABELS[lv]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelClass}>사유 (선택)</label>
          <input
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="예: 반달리즘 방지"
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>보호 만료 (선택 — 비우면 무기한)</label>
          <input
            type="datetime-local"
            value={until}
            onChange={(e) => setUntil(e.target.value)}
            className={inputClass}
          />
        </div>
        <div className="flex justify-end gap-2 pt-1">
          <button type="button" onClick={onClose} disabled={busy} className={ghostBtnClass}>
            취소
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() =>
              onSubmit({
                title: doc.title,
                level,
                reason: reason.trim() || undefined,
                protectedUntil: until ? new Date(until).toISOString() : undefined,
              })
            }
            className={primaryBtnClass}
          >
            <Shield className="h-3.5 w-3.5" />
            {busy ? '적용 중…' : '적용'}
          </button>
        </div>
      </div>
    </Modal>
  )
}

// ── 문서 이동 모달 ───────────────────────────────────────
function MoveModal({
  doc,
  busy,
  onClose,
  onSubmit,
}: {
  doc: DocRow
  busy: boolean
  onClose: () => void
  onSubmit: (body: { fromTitle: string; toTitle: string; reason?: string }) => void
}) {
  const [toTitle, setToTitle] = useState('')
  const [reason, setReason] = useState('')

  return (
    <Modal title={`문서 이동 — ${doc.title}`} onClose={onClose}>
      <div className="space-y-3">
        <p className="text-xs leading-relaxed text-slate-400">
          원본 문서는 새 제목으로의 리다이렉트로 전환됩니다.
        </p>
        <div>
          <label className={labelClass}>새 제목</label>
          <input
            value={toTitle}
            onChange={(e) => setToTitle(e.target.value)}
            placeholder="이동할 새 문서 제목"
            className={inputClass}
            autoFocus
          />
        </div>
        <div>
          <label className={labelClass}>사유 (선택)</label>
          <input
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="예: 표기 통일"
            className={inputClass}
          />
        </div>
        <div className="flex justify-end gap-2 pt-1">
          <button type="button" onClick={onClose} disabled={busy} className={ghostBtnClass}>
            취소
          </button>
          <button
            type="button"
            disabled={busy || !toTitle.trim() || toTitle.trim() === doc.title}
            onClick={() =>
              onSubmit({ fromTitle: doc.title, toTitle: toTitle.trim(), reason: reason.trim() || undefined })
            }
            className={primaryBtnClass}
          >
            <ArrowRightLeft className="h-3.5 w-3.5" />
            {busy ? '이동 중…' : '이동'}
          </button>
        </div>
      </div>
    </Modal>
  )
}

// ── 역사 · 되돌리기 모달 ─────────────────────────────────
function HistoryModal({
  doc,
  busy,
  onClose,
  onRevert,
}: {
  doc: DocRow
  busy: boolean
  onClose: () => void
  onRevert: (revisionNumber: number, summary: string) => void
}) {
  const [revisions, setRevisions] = useState<RevisionRow[]>([])
  const [loading, setLoading] = useState(true)
  const [summary, setSummary] = useState('')

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const r = await fetch(
          `/api/wiki/pages/revisions?title=${encodeURIComponent(doc.title)}&limit=30`,
          { credentials: 'include' }
        )
        const d = await r.json().catch(() => null)
        if (!cancelled) setRevisions(r.ok && d?.success ? d.revisions || [] : [])
      } catch {
        if (!cancelled) setRevisions([])
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [doc.title])

  return (
    <Modal title={`역사 · 되돌리기 — ${doc.title}`} onClose={onClose} wide>
      <div className="space-y-3">
        <div>
          <label className={labelClass}>되돌리기 편집 요약 (선택)</label>
          <input
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            placeholder="비우면 자동 요약이 들어갑니다"
            className={inputClass}
          />
        </div>

        {loading && <p className="py-6 text-center text-sm text-slate-500">리비전 불러오는 중…</p>}
        {!loading && revisions.length === 0 && (
          <p className="py-6 text-center text-sm text-slate-500">리비전 기록이 없습니다.</p>
        )}

        {!loading && revisions.length > 0 && (
          <ul className="divide-y divide-slate-800 rounded-md border border-slate-800">
            {revisions.map((rev) => {
              const isCurrent = rev.revisionNumber === doc.currentRevision
              return (
                <li key={rev.revisionNumber} className="flex items-center gap-3 px-3 py-2">
                  <span className="w-12 shrink-0 font-mono text-xs text-slate-400">
                    r{rev.revisionNumber}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs text-slate-300">
                      {rev.summary || <span className="text-slate-600">(요약 없음)</span>}
                    </p>
                    <p className="text-[11px] text-slate-500">
                      {rev.author} · {formatDate(rev.timestamp)} · {rev.editType}
                      {rev.isReverted ? ' · 되돌려짐' : ''}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 font-mono text-[11px] tabular-nums ${
                      rev.sizeChange > 0
                        ? 'text-emerald-400'
                        : rev.sizeChange < 0
                          ? 'text-rose-400'
                          : 'text-slate-500'
                    }`}
                  >
                    {rev.sizeChange > 0 ? `+${rev.sizeChange}` : rev.sizeChange}
                  </span>
                  {isCurrent ? (
                    <span className="shrink-0 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-2 py-0.5 text-[10px] text-cyan-300">
                      현재
                    </span>
                  ) : (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => {
                        if (!confirm(`r${rev.revisionNumber} 판으로 되돌릴까요?`)) return
                        onRevert(
                          rev.revisionNumber,
                          summary.trim() || `r${rev.revisionNumber} 판으로 되돌리기 (관리자)`
                        )
                      }}
                      className="shrink-0 rounded border border-slate-700 px-2 py-1 text-[11px] text-slate-300 transition hover:border-cyan-500/40 hover:text-cyan-300 disabled:opacity-40"
                    >
                      {busy ? '처리 중…' : '이 판으로 되돌리기'}
                    </button>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </Modal>
  )
}

// ── 삭제 확인 모달 ───────────────────────────────────────
function DeleteModal({
  doc,
  busy,
  onClose,
  onSubmit,
}: {
  doc: DocRow
  busy: boolean
  onClose: () => void
  onSubmit: (reason: string) => void
}) {
  const [reason, setReason] = useState('')

  return (
    <Modal title={`문서 삭제 — ${doc.title}`} onClose={onClose}>
      <div className="space-y-3">
        <p className="rounded-md border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs leading-relaxed text-rose-200">
          소프트 삭제됩니다 — 문서가 위키에서 숨겨지며, &ldquo;삭제됨&rdquo; 필터에서 언제든 복구할 수
          있습니다.
        </p>
        <div>
          <label className={labelClass}>삭제 사유 (선택)</label>
          <input
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="예: 스팸 문서"
            className={inputClass}
            autoFocus
          />
        </div>
        <div className="flex justify-end gap-2 pt-1">
          <button type="button" onClick={onClose} disabled={busy} className={ghostBtnClass}>
            취소
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => onSubmit(reason.trim())}
            className="inline-flex items-center justify-center gap-1.5 rounded-md bg-rose-500 px-3 py-2 text-xs font-medium text-white transition hover:bg-rose-400 disabled:opacity-50"
          >
            <Trash2 className="h-3.5 w-3.5" />
            {busy ? '삭제 중…' : '삭제'}
          </button>
        </div>
      </div>
    </Modal>
  )
}
