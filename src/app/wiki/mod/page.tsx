'use client'

import React, { useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle,
  Ban,
  CheckCircle2,
  Clock,
  Eye,
  Flag,
  Globe,
  Inbox,
  Pause,
  Search,
  Shield,
  ShieldOff,
  UserCog,
  Users,
  XCircle,
} from 'lucide-react'
import { WikiShell, WikiPageHeader } from '@/components/wiki'

// ── 타입 ──────────────────────────────────────────────
interface Submission {
  id?: string
  _id?: string
  type: 'create' | 'edit'
  status: 'pending' | 'approved' | 'rejected' | 'onhold'
  targetTitle: string
  targetSlug: string
  namespace: string
  author: string
  content: string
  editSummary?: string
  reason?: string
  createdAt: string
}

interface ModUser {
  id: string
  username: string
  email: string
  displayName?: string | null
  avatar?: string | null
  role: string
  isActive: boolean
  banStatus?: { isBanned?: boolean; reason?: string } | null
  edits: number
  createdAt?: string
  lastLogin?: string | null
}

interface Report {
  id: number
  title: string
  reason: string
  targetUserId: string | null
  reporter: string
  status: 'open' | 'resolved'
  createdAt: string
}

type TabKey = 'submissions' | 'users' | 'reports' | 'ipban' | 'overview'

const STATUS_TABS: Array<{ key: Submission['status']; label: string; icon: any }> = [
  { key: 'pending', label: '대기', icon: Clock },
  { key: 'approved', label: '승인됨', icon: CheckCircle2 },
  { key: 'rejected', label: '반려됨', icon: XCircle },
  { key: 'onhold', label: '보류됨', icon: Pause },
]

const MAIN_TABS: Array<{ key: TabKey; label: string; icon: any }> = [
  { key: 'overview', label: '개요', icon: Shield },
  { key: 'submissions', label: '검수 큐', icon: Inbox },
  { key: 'users', label: '사용자', icon: Users },
  { key: 'reports', label: '신고', icon: Flag },
  { key: 'ipban', label: 'IP 차단', icon: Ban },
]

// ── 메인 페이지 ────────────────────────────────────────
export default function WikiModPage() {
  const [activeTab, setActiveTab] = useState<TabKey>('overview')

  return (
    <WikiShell
      activeNav="mod"
      pageHeader={
        <WikiPageHeader
          title="운영자 대시보드"
          subtitle="검수 / 사용자 / 신고 / IP 차단을 한 곳에서 관리합니다."
          hatnote={
            <>
              운영진 전용 페이지입니다. 모든 결정은{' '}
              <strong>편집 역사</strong>로 추적되며 즉시 되돌릴 수 있어요.
            </>
          }
          tabs={MAIN_TABS.map((t) => ({ key: t.key, label: t.label, icon: t.icon }))}
          activeTab={activeTab}
          onTabChange={(k) => setActiveTab(k as TabKey)}
        />
      }
    >
      {activeTab === 'overview' && <OverviewTab onJump={setActiveTab} />}
      {activeTab === 'submissions' && <SubmissionsTab />}
      {activeTab === 'users' && <UsersTab />}
      {activeTab === 'reports' && <ReportsTab />}
      {activeTab === 'ipban' && <IpBanTab />}
    </WikiShell>
  )
}

// ── 개요 탭: 통계 카드 ────────────────────────────────
function OverviewTab({ onJump }: { onJump: (tab: TabKey) => void }) {
  const [pending, setPending] = useState<number | null>(null)
  const [openReports, setOpenReports] = useState<number | null>(null)
  const [bannedIps, setBannedIps] = useState<number | null>(null)
  const [totalUsers, setTotalUsers] = useState<number | null>(null)

  useEffect(() => {
    const load = async () => {
      try {
        const [p, r, b, u] = await Promise.all([
          fetch('/api/wiki/mod?status=pending', { credentials: 'include' }).then((r) => r.json()),
          fetch('/api/wiki/mod/reports', { credentials: 'include' }).then((r) => r.json()),
          fetch('/api/wiki/mod/ban', { credentials: 'include' }).then((r) => r.json()),
          fetch('/api/wiki/users?limit=1', { credentials: 'include' }).then((r) => r.json()),
        ])
        setPending(p.success ? (p.submissions || []).length : 0)
        setOpenReports(
          r.success ? (r.reports || []).filter((x: any) => x.status === 'open').length : 0
        )
        setBannedIps(b.success ? (b.bannedIps || []).length : 0)
        setTotalUsers(u.success ? u.pagination?.total ?? (u.users || []).length : 0)
      } catch {
        /* ignore */
      }
    }
    load()
  }, [])

  const cards = [
    {
      label: '검수 대기',
      value: pending,
      desc: '확인이 필요한 새 문서/편집 제출',
      tone: 'amber' as const,
      icon: Inbox,
      onClick: () => onJump('submissions'),
    },
    {
      label: '열린 신고',
      value: openReports,
      desc: '아직 처리되지 않은 신고',
      tone: 'rose' as const,
      icon: Flag,
      onClick: () => onJump('reports'),
    },
    {
      label: '차단 IP',
      value: bannedIps,
      desc: '메모리 기반 임시 블록리스트',
      tone: 'slate' as const,
      icon: Ban,
      onClick: () => onJump('ipban'),
    },
    {
      label: '전체 사용자',
      value: totalUsers,
      desc: '이랑위키 등록 계정',
      tone: 'sky' as const,
      icon: Users,
      onClick: () => onJump('users'),
    },
  ]

  return (
    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map((c) => {
        const Icon = c.icon
        return (
          <button
            key={c.label}
            type="button"
            onClick={c.onClick}
            className="group wiki-panel text-left transition hover:border-[color:var(--wiki-cyan)]/50"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="text-[11px] uppercase tracking-[0.18em] text-[color:var(--wiki-ink-muted)]">
                  {c.label}
                </p>
                <p className="mt-2 font-mono text-3xl font-semibold tabular-nums text-[color:var(--wiki-ink)]">
                  {c.value === null ? '—' : c.value.toLocaleString()}
                </p>
                <p className="mt-1.5 text-xs text-[color:var(--wiki-ink-soft)]">{c.desc}</p>
              </div>
              <span
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-md border ${toneClasses(c.tone)}`}
              >
                <Icon className="h-4 w-4" />
              </span>
            </div>
          </button>
        )
      })}
    </section>
  )
}

function toneClasses(tone: 'amber' | 'rose' | 'slate' | 'sky' | 'emerald'): string {
  switch (tone) {
    case 'amber':
      return 'border-amber-500/30 bg-amber-500/10 text-amber-300'
    case 'rose':
      return 'border-rose-500/30 bg-rose-500/10 text-rose-300'
    case 'slate':
      return 'border-slate-500/40 bg-slate-500/10 text-slate-300'
    case 'sky':
      return 'border-sky-500/30 bg-sky-500/10 text-sky-300'
    case 'emerald':
      return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
  }
}

// ── 검수 큐 탭 ────────────────────────────────────────
function SubmissionsTab() {
  const [list, setList] = useState<Submission[]>([])
  const [status, setStatus] = useState<Submission['status']>('pending')
  const [reasonMap, setReasonMap] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const r = await fetch(`/api/wiki/mod?status=${status}`, { credentials: 'include' })
      const d = await r.json()
      if (d.success) setList(d.submissions || [])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status])

  const act = async (id: string, action: 'approve' | 'reject' | 'hold') => {
    setBusy(id)
    try {
      const r = await fetch('/api/wiki/mod', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          action,
          submissionId: id,
          reason: reasonMap[id] || '',
        }),
      })
      const d = await r.json()
      if (d.success) {
        await load()
        setReasonMap((m) => {
          const n = { ...m }
          delete n[id]
          return n
        })
      } else {
        alert(d.error || '처리 실패')
      }
    } finally {
      setBusy(null)
    }
  }

  return (
    <section className="space-y-4">
      {/* status 서브탭 */}
      <div className="flex flex-wrap gap-1 rounded-md border border-[color:var(--wiki-rule)] bg-[color:var(--wiki-bg-2)]/40 p-1">
        {STATUS_TABS.map((s) => {
          const Icon = s.icon
          const active = status === s.key
          return (
            <button
              key={s.key}
              type="button"
              onClick={() => setStatus(s.key)}
              className={`inline-flex items-center gap-1.5 rounded px-2.5 py-1 text-xs font-medium transition ${
                active
                  ? 'bg-[color:var(--wiki-accent)] text-white'
                  : 'text-[color:var(--wiki-ink-soft)] hover:bg-[color:var(--wiki-bg-2)]'
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {s.label}
            </button>
          )
        })}
      </div>

      <div className="wiki-panel">
        <div className="mb-3 flex items-center justify-between text-xs text-[color:var(--wiki-ink-muted)]">
          <span>총 {list.length}건</span>
          <button
            type="button"
            onClick={load}
            disabled={loading}
            className="rounded border border-[color:var(--wiki-rule)] px-2 py-0.5 hover:border-[color:var(--wiki-cyan)] disabled:opacity-50"
          >
            {loading ? '불러오는 중…' : '새로 고침'}
          </button>
        </div>
        {list.length === 0 ? (
          <EmptyState icon={Inbox} message={`${statusLabel(status)} 항목이 없습니다.`} />
        ) : (
          <ul className="space-y-3">
            {list.map((s) => {
              const id = (s.id || s._id) as string
              return (
                <li
                  key={id}
                  className="rounded-md border border-[color:var(--wiki-rule)] bg-[color:var(--wiki-bg-2)]/40 p-3"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-[color:var(--wiki-ink)]">
                        <span className="wiki-chip mr-1.5">{s.type === 'create' ? '신규' : '편집'}</span>
                        {s.targetTitle}
                        <span className="ml-1 text-xs text-[color:var(--wiki-ink-muted)]">
                          ({s.namespace})
                        </span>
                      </p>
                      <p className="mt-1 text-[11px] text-[color:var(--wiki-ink-muted)]">
                        <strong className="text-[color:var(--wiki-ink-soft)]">{s.author}</strong>
                        {' · '}
                        {new Date(s.createdAt).toLocaleString('ko-KR')}
                        {s.editSummary && (
                          <>
                            {' · '}
                            <em>&ldquo;{s.editSummary}&rdquo;</em>
                          </>
                        )}
                      </p>
                      {s.reason && (
                        <p className="mt-1 text-[11px] text-[color:var(--wiki-warning)]">
                          처리 사유: {s.reason}
                        </p>
                      )}
                    </div>
                    {s.status === 'pending' && (
                      <div className="flex flex-wrap gap-1.5">
                        <button
                          type="button"
                          onClick={() => act(id, 'approve')}
                          disabled={busy === id}
                          className="inline-flex items-center gap-1 rounded bg-emerald-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          승인
                        </button>
                        <button
                          type="button"
                          onClick={() => act(id, 'hold')}
                          disabled={busy === id}
                          className="inline-flex items-center gap-1 rounded bg-amber-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-amber-500 disabled:opacity-50"
                        >
                          <Pause className="h-3.5 w-3.5" />
                          보류
                        </button>
                        <button
                          type="button"
                          onClick={() => act(id, 'reject')}
                          disabled={busy === id}
                          className="inline-flex items-center gap-1 rounded bg-rose-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-rose-500 disabled:opacity-50"
                        >
                          <XCircle className="h-3.5 w-3.5" />
                          반려
                        </button>
                      </div>
                    )}
                  </div>
                  {s.status === 'pending' && (
                    <textarea
                      value={reasonMap[id] || ''}
                      onChange={(e) => setReasonMap((m) => ({ ...m, [id]: e.target.value }))}
                      className="mt-2 w-full rounded border border-[color:var(--wiki-rule-strong)] bg-[color:var(--wiki-bg-2)] px-2 py-1 text-sm text-[color:var(--wiki-ink)]"
                      placeholder="반려/보류 사유 (선택, 작성자에게 전달됨)"
                      rows={2}
                    />
                  )}
                  <details className="mt-2 text-sm">
                    <summary className="cursor-pointer text-xs text-[color:var(--wiki-link)] hover:underline inline-flex items-center gap-1">
                      <Eye className="h-3 w-3" />
                      내용 미리 보기
                    </summary>
                    <pre className="mt-2 max-h-80 overflow-auto whitespace-pre-wrap rounded border border-[color:var(--wiki-rule)] bg-[color:var(--wiki-bg-2)] p-2 text-[11px] text-[color:var(--wiki-ink-soft)]">
                      {s.content}
                    </pre>
                  </details>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </section>
  )
}

function statusLabel(s: Submission['status']) {
  return STATUS_TABS.find((x) => x.key === s)?.label || s
}

// ── 사용자 관리 탭 ────────────────────────────────────
function UsersTab() {
  const [users, setUsers] = useState<ModUser[]>([])
  const [search, setSearch] = useState('')
  const [filterRole, setFilterRole] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [loading, setLoading] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [draftRole, setDraftRole] = useState('')
  const [busy, setBusy] = useState<string | null>(null)

  const load = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        limit: '50',
        ...(search ? { search } : {}),
        ...(filterRole ? { role: filterRole } : {}),
        ...(filterStatus ? { status: filterStatus } : {}),
      })
      const r = await fetch(`/api/wiki/users?${params}`, { credentials: 'include' })
      const d = await r.json()
      if (d.success) setUsers(d.users || [])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterRole, filterStatus])

  const onSearch = (e: React.FormEvent) => {
    e.preventDefault()
    load()
  }

  const updateRole = async (u: ModUser) => {
    if (!draftRole || draftRole === u.role) {
      setEditingId(null)
      return
    }
    setBusy(u.id)
    try {
      const r = await fetch('/api/wiki/mod/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ username: u.username, role: draftRole }),
      })
      const d = await r.json()
      if (d.success) {
        setEditingId(null)
        setDraftRole('')
        await load()
      } else {
        alert(d.error || '역할 변경 실패')
      }
    } finally {
      setBusy(null)
    }
  }

  const toggleBan = async (u: ModUser) => {
    const isBanned = Boolean(u.banStatus?.isBanned)
    const action = isBanned ? 'unbanUser' : 'banUser'
    let reason = ''
    if (!isBanned) {
      reason = prompt('차단 사유를 입력하세요 (선택):') || ''
      if (reason === null) return
    }
    setBusy(u.id)
    try {
      const r = await fetch('/api/wiki/mod/ban', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ action, userId: u.id, reason }),
      })
      const d = await r.json()
      if (d.success) await load()
      else alert(d.error || '처리 실패')
    } finally {
      setBusy(null)
    }
  }

  return (
    <section className="space-y-3">
      <div className="wiki-panel">
        <form onSubmit={onSearch} className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[180px]">
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="사용자명 / 이메일 검색"
              className="w-full rounded border border-[color:var(--wiki-rule-strong)] bg-[color:var(--wiki-bg-2)] py-1.5 pl-8 pr-3 text-sm text-[color:var(--wiki-ink)]"
            />
            <Search className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[color:var(--wiki-ink-muted)]" />
          </div>
          <select
            value={filterRole}
            onChange={(e) => setFilterRole(e.target.value)}
            className="rounded border border-[color:var(--wiki-rule-strong)] bg-[color:var(--wiki-bg-2)] px-2 py-1.5 text-xs text-[color:var(--wiki-ink)]"
          >
            <option value="">모든 역할</option>
            <option value="viewer">viewer</option>
            <option value="editor">editor</option>
            <option value="moderator">moderator</option>
            <option value="admin">admin</option>
            <option value="owner">owner</option>
          </select>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="rounded border border-[color:var(--wiki-rule-strong)] bg-[color:var(--wiki-bg-2)] px-2 py-1.5 text-xs text-[color:var(--wiki-ink)]"
          >
            <option value="">전체</option>
            <option value="active">활성</option>
            <option value="banned">차단됨</option>
            <option value="inactive">비활성</option>
          </select>
          <button
            type="submit"
            className="rounded bg-[color:var(--wiki-accent)] px-3 py-1.5 text-xs font-medium text-white hover:opacity-90"
          >
            검색
          </button>
        </form>
      </div>

      <div className="wiki-panel">
        <div className="mb-2 text-xs text-[color:var(--wiki-ink-muted)]">총 {users.length}명 표시</div>
        {loading ? (
          <p className="py-6 text-center text-xs text-[color:var(--wiki-ink-muted)]">불러오는 중…</p>
        ) : users.length === 0 ? (
          <EmptyState icon={Users} message="조건에 맞는 사용자가 없습니다." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[color:var(--wiki-rule)] text-left text-[11px] uppercase tracking-wider text-[color:var(--wiki-ink-muted)]">
                  <th className="px-2 py-2">사용자</th>
                  <th className="px-2 py-2 hidden sm:table-cell">역할</th>
                  <th className="px-2 py-2 hidden md:table-cell">편집</th>
                  <th className="px-2 py-2 hidden lg:table-cell">최근 로그인</th>
                  <th className="px-2 py-2 text-right">액션</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => {
                  const isBanned = Boolean(u.banStatus?.isBanned)
                  const isEditing = editingId === u.id
                  return (
                    <tr
                      key={u.id}
                      className="border-b border-[color:var(--wiki-rule)] last:border-b-0 hover:bg-[color:var(--wiki-bg-2)]/30"
                    >
                      <td className="px-2 py-2">
                        <div className="flex items-center gap-2">
                          {u.avatar ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={u.avatar}
                              alt={u.username}
                              className="h-7 w-7 rounded-full object-cover"
                            />
                          ) : (
                            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[color:var(--wiki-bg-2)] text-[11px] text-[color:var(--wiki-ink-soft)]">
                              {(u.displayName || u.username).slice(0, 1).toUpperCase()}
                            </span>
                          )}
                          <div className="min-w-0">
                            <p className="truncate font-medium text-[color:var(--wiki-ink)]">
                              {u.displayName || u.username}
                            </p>
                            <p className="truncate text-[11px] text-[color:var(--wiki-ink-muted)]">
                              @{u.username}
                              {isBanned && (
                                <span className="ml-1.5 inline-flex items-center gap-0.5 rounded-sm bg-rose-500/20 px-1.5 py-0.5 text-[10px] text-rose-300">
                                  <Ban className="h-2.5 w-2.5" />
                                  차단
                                </span>
                              )}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-2 py-2 hidden sm:table-cell">
                        {isEditing ? (
                          <select
                            value={draftRole}
                            onChange={(e) => setDraftRole(e.target.value)}
                            className="rounded border border-[color:var(--wiki-rule-strong)] bg-[color:var(--wiki-bg-2)] px-1.5 py-0.5 text-xs"
                          >
                            <option value="viewer">viewer</option>
                            <option value="editor">editor</option>
                            <option value="moderator">moderator</option>
                            <option value="admin">admin</option>
                            <option value="owner">owner</option>
                          </select>
                        ) : (
                          <RoleBadge role={u.role} />
                        )}
                      </td>
                      <td className="px-2 py-2 hidden md:table-cell font-mono text-xs text-[color:var(--wiki-ink-soft)]">
                        {u.edits.toLocaleString()}
                      </td>
                      <td className="px-2 py-2 hidden lg:table-cell text-[11px] text-[color:var(--wiki-ink-muted)]">
                        {u.lastLogin
                          ? new Date(u.lastLogin).toLocaleDateString('ko-KR')
                          : '—'}
                      </td>
                      <td className="px-2 py-2 text-right">
                        <div className="inline-flex flex-wrap items-center justify-end gap-1">
                          {isEditing ? (
                            <>
                              <button
                                type="button"
                                onClick={() => updateRole(u)}
                                disabled={busy === u.id}
                                className="rounded bg-emerald-600 px-2 py-0.5 text-[11px] text-white hover:bg-emerald-500 disabled:opacity-50"
                              >
                                저장
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingId(null)
                                  setDraftRole('')
                                }}
                                className="rounded border border-[color:var(--wiki-rule)] px-2 py-0.5 text-[11px] text-[color:var(--wiki-ink-soft)]"
                              >
                                취소
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingId(u.id)
                                  setDraftRole(u.role)
                                }}
                                className="inline-flex items-center gap-1 rounded border border-[color:var(--wiki-rule)] px-2 py-0.5 text-[11px] text-[color:var(--wiki-ink-soft)] hover:border-[color:var(--wiki-cyan)]"
                              >
                                <UserCog className="h-3 w-3" />
                                역할
                              </button>
                              <button
                                type="button"
                                onClick={() => toggleBan(u)}
                                disabled={busy === u.id}
                                className={`inline-flex items-center gap-1 rounded border px-2 py-0.5 text-[11px] disabled:opacity-50 ${
                                  isBanned
                                    ? 'border-emerald-500/40 text-emerald-300 hover:border-emerald-500'
                                    : 'border-rose-500/40 text-rose-300 hover:border-rose-500'
                                }`}
                              >
                                {isBanned ? (
                                  <>
                                    <ShieldOff className="h-3 w-3" />
                                    해제
                                  </>
                                ) : (
                                  <>
                                    <Ban className="h-3 w-3" />
                                    차단
                                  </>
                                )}
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  )
}

function RoleBadge({ role }: { role: string }) {
  const map: Record<string, string> = {
    owner: 'border-purple-500/40 bg-purple-500/10 text-purple-300',
    admin: 'border-rose-500/40 bg-rose-500/10 text-rose-300',
    moderator: 'border-amber-500/40 bg-amber-500/10 text-amber-300',
    editor: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300',
    viewer: 'border-slate-500/40 bg-slate-500/10 text-slate-300',
  }
  const cls = map[role] || map.editor
  return (
    <span className={`inline-block rounded border px-1.5 py-0.5 text-[10px] font-mono uppercase ${cls}`}>
      {role}
    </span>
  )
}

// ── 신고 탭 ───────────────────────────────────────────
function ReportsTab() {
  const [reports, setReports] = useState<Report[]>([])
  const [loading, setLoading] = useState(false)
  const [filter, setFilter] = useState<'all' | 'open' | 'resolved'>('all')

  const load = async () => {
    setLoading(true)
    try {
      const r = await fetch('/api/wiki/mod/reports', { credentials: 'include' })
      const d = await r.json()
      if (d.success) setReports(d.reports || [])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const filtered = useMemo(
    () => (filter === 'all' ? reports : reports.filter((r) => r.status === filter)),
    [reports, filter]
  )

  return (
    <section className="space-y-3">
      <div className="wiki-panel">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap gap-1 rounded-md border border-[color:var(--wiki-rule)] bg-[color:var(--wiki-bg-2)]/40 p-1">
            {(['all', 'open', 'resolved'] as const).map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => setFilter(k)}
                className={`rounded px-2.5 py-1 text-xs font-medium transition ${
                  filter === k
                    ? 'bg-[color:var(--wiki-accent)] text-white'
                    : 'text-[color:var(--wiki-ink-soft)] hover:bg-[color:var(--wiki-bg-2)]'
                }`}
              >
                {k === 'all' ? '전체' : k === 'open' ? '열림' : '해결됨'}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={load}
            disabled={loading}
            className="rounded border border-[color:var(--wiki-rule)] px-2 py-0.5 text-xs hover:border-[color:var(--wiki-cyan)] disabled:opacity-50"
          >
            {loading ? '불러오는 중…' : '새로 고침'}
          </button>
        </div>
        {filtered.length === 0 ? (
          <EmptyState icon={Flag} message="신고가 없습니다." />
        ) : (
          <ul className="space-y-2">
            {filtered.map((r) => (
              <li
                key={r.id}
                className="rounded-md border border-[color:var(--wiki-rule)] bg-[color:var(--wiki-bg-2)]/40 p-3"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-[color:var(--wiki-ink)]">
                      {r.title}
                    </p>
                    <p className="mt-1 text-xs text-[color:var(--wiki-ink-soft)]">{r.reason}</p>
                    <p className="mt-1 text-[11px] text-[color:var(--wiki-ink-muted)]">
                      신고자 <strong>{r.reporter}</strong>
                      {r.targetUserId && (
                        <>
                          {' · '}대상 <code className="font-mono">{r.targetUserId}</code>
                        </>
                      )}
                      {' · '}
                      {new Date(r.createdAt).toLocaleString('ko-KR')}
                    </p>
                  </div>
                  <span
                    className={`inline-block rounded border px-2 py-0.5 text-[10px] font-mono uppercase ${
                      r.status === 'open'
                        ? 'border-rose-500/40 bg-rose-500/10 text-rose-300'
                        : 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300'
                    }`}
                  >
                    {r.status}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
        <p className="mt-3 text-[11px] text-[color:var(--wiki-ink-muted)]">
          <AlertTriangle className="mr-1 inline h-3 w-3 align-[-2px]" />
          신고는 메모리 기반(POC)이라 서버 재시작 시 초기화됩니다. 영속화가 필요하면 별도 테이블 작업.
        </p>
      </div>
    </section>
  )
}

// ── IP 차단 탭 ─────────────────────────────────────────
function IpBanTab() {
  const [bannedIps, setBannedIps] = useState<string[]>([])
  const [newIp, setNewIp] = useState('')
  const [loading, setLoading] = useState(false)
  const [busy, setBusy] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const r = await fetch('/api/wiki/mod/ban', { credentials: 'include' })
      const d = await r.json()
      if (d.success) setBannedIps(d.bannedIps || [])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const ban = async () => {
    const ip = newIp.trim()
    if (!ip) return
    setBusy(true)
    try {
      const r = await fetch('/api/wiki/mod/ban', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ action: 'banIp', ip }),
      })
      const d = await r.json()
      if (d.success) {
        setNewIp('')
        await load()
      } else alert(d.error || '차단 실패')
    } finally {
      setBusy(false)
    }
  }

  const unban = async (ip: string) => {
    if (!confirm(`${ip} 차단을 해제할까요?`)) return
    setBusy(true)
    try {
      const r = await fetch('/api/wiki/mod/ban', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ action: 'unbanIp', ip }),
      })
      const d = await r.json()
      if (d.success) await load()
      else alert(d.error || '해제 실패')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="space-y-3">
      <div className="wiki-panel">
        <div className="mb-3 flex items-center gap-2">
          <Globe className="h-4 w-4 text-[color:var(--wiki-cyan)]" />
          <h3 className="text-sm font-semibold text-[color:var(--wiki-ink)]">신규 IP 차단</h3>
        </div>
        <div className="flex flex-wrap gap-2">
          <input
            type="text"
            value={newIp}
            onChange={(e) => setNewIp(e.target.value)}
            placeholder="예: 203.0.113.42"
            className="flex-1 min-w-[200px] rounded border border-[color:var(--wiki-rule-strong)] bg-[color:var(--wiki-bg-2)] px-3 py-1.5 text-sm font-mono text-[color:var(--wiki-ink)]"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                ban()
              }
            }}
          />
          <button
            type="button"
            onClick={ban}
            disabled={!newIp.trim() || busy}
            className="inline-flex items-center gap-1 rounded bg-rose-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-rose-500 disabled:opacity-50"
          >
            <Ban className="h-3.5 w-3.5" />
            차단
          </button>
        </div>
        <p className="mt-2 text-[11px] text-[color:var(--wiki-ink-muted)]">
          메모리 기반(서버 재시작 시 초기화). 영구 차단이 필요하면 클라우드 방화벽 사용 권장.
        </p>
      </div>

      <div className="wiki-panel">
        <div className="mb-2 flex items-center justify-between text-xs text-[color:var(--wiki-ink-muted)]">
          <span>차단 중인 IP — 총 {bannedIps.length}건</span>
          <button
            type="button"
            onClick={load}
            disabled={loading}
            className="rounded border border-[color:var(--wiki-rule)] px-2 py-0.5 hover:border-[color:var(--wiki-cyan)] disabled:opacity-50"
          >
            {loading ? '...' : '새로 고침'}
          </button>
        </div>
        {bannedIps.length === 0 ? (
          <EmptyState icon={Ban} message="차단된 IP 가 없습니다." />
        ) : (
          <ul className="space-y-1">
            {bannedIps.map((ip) => (
              <li
                key={ip}
                className="flex items-center justify-between rounded border border-[color:var(--wiki-rule)] bg-[color:var(--wiki-bg-2)]/40 px-3 py-2"
              >
                <code className="font-mono text-sm text-[color:var(--wiki-ink)]">{ip}</code>
                <button
                  type="button"
                  onClick={() => unban(ip)}
                  disabled={busy}
                  className="inline-flex items-center gap-1 rounded border border-emerald-500/40 px-2 py-0.5 text-[11px] text-emerald-300 hover:border-emerald-500 disabled:opacity-50"
                >
                  <ShieldOff className="h-3 w-3" />
                  해제
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  )
}

// ── 공용: 빈 상태 ─────────────────────────────────────
function EmptyState({ icon: Icon, message }: { icon: any; message: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-10 text-[color:var(--wiki-ink-muted)]">
      <Icon className="h-8 w-8 opacity-50" />
      <p className="text-xs">{message}</p>
    </div>
  )
}
