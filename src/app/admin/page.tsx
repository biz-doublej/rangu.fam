'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { useRouter } from 'next/navigation'
import {
  Activity,
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  Clock,
  FileText,
  Flag,
  Inbox,
  LogIn,
  LogOut,
  Pause,
  RefreshCw,
  Settings,
  Shield,
  Users,
  XCircle,
} from 'lucide-react'

import DocumentManagement from './components/DocumentManagement'
import UserManagement from './components/UserManagement'
import PageManagement from './components/PageManagement'

// ── 타입 ────────────────────────────────────────────────
interface DashboardStats {
  users: { total: number; active: number; banned: number; newToday: number }
  wiki: { totalPages: number; pending: number; approved: number; rejected: number; onhold: number }
  cards?: any
  images?: any
  system?: { uptime?: string; responseTime?: number; activeConnections?: number; serverLoad?: number }
}

interface PageData {
  company: { title: string; content: string }
  terms: { title: string; content: string }
  privacy: { title: string; content: string }
}

interface WikiSubmission {
  _id: string
  type: 'create' | 'edit'
  status: 'pending' | 'approved' | 'rejected' | 'onhold'
  targetTitle: string
  content: string
  author: string
  createdAt: string
  reason?: string
  editSummary?: string
}

interface WikiUser {
  _id?: string
  id?: string
  username: string
  email: string
  role: string
  isActive: boolean
  banStatus?: { isBanned?: boolean; reason?: string } | null
  warnings?: any[]
  createdAt?: string
  lastActive?: string
}

interface RecentActivity {
  id: string
  type: 'login' | 'edit' | 'upload' | 'card' | 'admin'
  user: string
  action: string
  timestamp: string
}

interface AdminUser {
  id: string
  username: string
  displayName?: string
  role: string
}

type TabKey = 'overview' | 'submissions' | 'users' | 'documents' | 'pages' | 'system'

const TABS: Array<{ key: TabKey; label: string; icon: any; desc?: string }> = [
  { key: 'overview', label: '개요', icon: BarChart3 },
  { key: 'submissions', label: '검수 큐', icon: Inbox },
  { key: 'users', label: '사용자', icon: Users },
  { key: 'documents', label: '문서 관리', icon: FileText },
  { key: 'pages', label: '정적 페이지', icon: Settings, desc: '회사·약관·개인정보' },
  { key: 'system', label: '시스템', icon: Activity },
]

// ── 메인 ────────────────────────────────────────────────
export default function AdminDashboard() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<TabKey>('overview')

  // 인증
  const [authLoading, setAuthLoading] = useState(true)
  const [me, setMe] = useState<AdminUser | null>(null)

  // 데이터
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([])
  const [submissions, setSubmissions] = useState<WikiSubmission[]>([])
  const [users, setUsers] = useState<WikiUser[]>([])
  const [pageData, setPageData] = useState<PageData | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(false)

  // 인증 체크
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const r = await fetch('/api/wiki/auth/me', { credentials: 'include' })
        if (!cancelled && r.ok) {
          const d = await r.json()
          if (d?.user?.role === 'admin') {
            setMe({
              id: d.user.id,
              username: d.user.username,
              displayName: d.user.displayName || d.user.username,
              role: d.user.role,
            })
            loadAll()
            return
          }
        }
      } catch {
        /* ignore */
      } finally {
        if (!cancelled) setAuthLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 데이터 로드
  const loadAll = async () => {
    setLoading(true)
    try {
      const [statsR, subR, userR, pagesR] = await Promise.all([
        fetch('/api/admin/dashboard-stats', { credentials: 'include' }).catch(() => null),
        fetch('/api/wiki/mod', { credentials: 'include' }).catch(() => null),
        // ssoOnly=true → DoubleJ OIDC 로 가입한 사용자만 가져옴 (옛 위키 자체 가입 row 제외)
        fetch('/api/wiki/users?limit=100&ssoOnly=true', { credentials: 'include' }).catch(() => null),
        fetch('/api/admin/pages', { credentials: 'include' }).catch(() => null),
      ])
      if (statsR?.ok) {
        const d = await statsR.json()
        setStats(d.stats)
        setRecentActivity(d.recentActivity || [])
      }
      if (subR?.ok) {
        const d = await subR.json()
        setSubmissions(d.submissions || [])
      }
      if (userR?.ok) {
        const d = await userR.json()
        setUsers(d.users || [])
      }
      if (pagesR?.ok) {
        const d = await pagesR.json()
        setPageData(d.data)
      }
      setAuthLoading(false)
    } catch (e) {
      console.error('admin load failed', e)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmissionAction = async (
    submissionId: string,
    action: 'approve' | 'reject' | 'hold',
    reason?: string
  ) => {
    const r = await fetch('/api/wiki/mod', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ action, submissionId, reason }),
    })
    const d = await r.json()
    if (d.success) {
      alert(d.message || '처리되었습니다.')
      loadAll()
    } else {
      alert(d.error || '처리 실패')
    }
  }

  const handleUserAction = async (userId: string, action: string, data?: any) => {
    const r = await fetch('/api/wiki/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ action, userId, data }),
    })
    const d = await r.json()
    if (d.success) {
      alert(d.message || '처리되었습니다.')
      loadAll()
    } else {
      alert(d.error || '처리 실패')
    }
  }

  // ── 인증 분기 ──────────────────────────────────────────
  if (authLoading) return <LoadingScreen />
  if (!me) return <UnauthScreen onLogin={() => router.push('/auth/start?callbackUrl=%2Fadmin')} />

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-slate-800 bg-slate-950/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-cyan-500/30 bg-cyan-500/10">
              <Shield className="h-4 w-4 text-cyan-400" />
            </div>
            <div className="min-w-0">
              <h1 className="text-base font-bold tracking-tight text-white sm:text-lg">
                이랑위키 운영 대시보드
              </h1>
              <p className="hidden text-[11px] text-slate-400 sm:block">
                관리자 전용 — 검수 / 사용자 / 문서 / 시스템 통합 관리
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="hidden items-center gap-2 rounded-md border border-slate-800 bg-slate-900 px-3 py-1.5 sm:flex">
              <span className="text-xs text-slate-400">{me.displayName}</span>
              <span className="rounded bg-rose-500/15 px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-widest text-rose-300">
                admin
              </span>
            </div>
            <button
              type="button"
              onClick={() => loadAll()}
              disabled={loading}
              className="inline-flex items-center gap-1 rounded-md border border-slate-800 bg-slate-900 px-2.5 py-1.5 text-xs text-slate-300 hover:border-cyan-500/40 hover:text-cyan-300 disabled:opacity-50"
              title="새로고침"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">새로고침</span>
            </button>
            <button
              type="button"
              onClick={() => router.push('/')}
              className="inline-flex items-center gap-1 rounded-md border border-slate-800 bg-slate-900 px-2.5 py-1.5 text-xs text-slate-400 hover:text-slate-200"
              title="메인으로"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">메인</span>
            </button>
          </div>
        </div>

        {/* Tabs */}
        <nav className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="flex flex-wrap gap-1 overflow-x-auto pb-2">
            {TABS.map((t) => {
              const Icon = t.icon
              const active = activeTab === t.key
              return (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => setActiveTab(t.key)}
                  className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition ${
                    active
                      ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30'
                      : 'border border-transparent text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {t.label}
                </button>
              )
            })}
          </div>
        </nav>
      </header>

      {/* Main */}
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        {activeTab === 'overview' && (
          <OverviewTab
            stats={stats}
            submissions={submissions}
            users={users}
            recentActivity={recentActivity}
            onJump={setActiveTab}
          />
        )}

        {activeTab === 'submissions' && (
          <DocumentManagement
            submissions={submissions}
            activeSubTab="pending"
            onSubmissionAction={handleSubmissionAction}
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
          />
        )}

        {activeTab === 'users' && (
          <UserManagement
            // DoubleJ Account mirror — system/inactive 가짜 row 는 표시에서 제외
            users={users.filter(
              (u) =>
                u.isActive !== false &&
                u.username?.toLowerCase() !== 'system' &&
                !u.username?.toLowerCase().startsWith('__')
            ) as any}
            activeSubTab="userlist"
            onUserAction={handleUserAction}
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
          />
        )}

        {activeTab === 'documents' && <DocumentsTab />}

        {activeTab === 'pages' && pageData && <PageManagement pageData={pageData} />}
        {activeTab === 'pages' && !pageData && (
          <EmptyTab
            icon={Settings}
            message="정적 페이지 데이터를 불러오는 중입니다… (`/api/admin/pages` 응답 대기)"
          />
        )}

        {activeTab === 'system' && <SystemTab stats={stats} />}
      </main>
    </div>
  )
}

// ── 인증 화면 ────────────────────────────────────────────
function LoadingScreen() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-200">
      <div className="text-center">
        <Shield className="mx-auto h-10 w-10 animate-pulse text-cyan-400" />
        <p className="mt-3 text-sm text-slate-400">인증 확인 중…</p>
      </div>
    </div>
  )
}

function UnauthScreen({ onLogin }: { onLogin: () => void }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4 text-slate-200">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md rounded-xl border border-slate-800 bg-slate-900/80 p-8 text-center backdrop-blur"
      >
        <Shield className="mx-auto h-12 w-12 text-cyan-400" />
        <h1 className="mt-4 text-2xl font-bold tracking-tight text-white">이랑위키 운영 대시보드</h1>
        <p className="mt-2 text-sm leading-relaxed text-slate-400">
          관리자 권한 계정만 접근할 수 있습니다.
          <br />
          DoubleJ 통합 로그인 후 자동 인증됩니다.
        </p>
        <button
          type="button"
          onClick={onLogin}
          className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-md bg-cyan-500 px-4 py-2.5 text-sm font-medium text-slate-950 transition hover:bg-cyan-400"
        >
          <LogIn className="h-4 w-4" />
          DoubleJ 통합 로그인
        </button>
        <p className="mt-3 text-[11px] text-slate-500">
          ⚠ 관리자는 <strong className="text-slate-300">강한울 / 정재원</strong> 만 등록되어 있습니다.
        </p>
      </motion.div>
    </div>
  )
}

// ── 개요 탭 ─────────────────────────────────────────────
function OverviewTab({
  stats,
  submissions,
  users,
  recentActivity,
  onJump,
}: {
  stats: DashboardStats | null
  submissions: WikiSubmission[]
  users: WikiUser[]
  recentActivity: RecentActivity[]
  onJump: (t: TabKey) => void
}) {
  const pendingCount = stats?.wiki.pending ?? submissions.filter((s) => s.status === 'pending').length
  const totalUsers = stats?.users.total ?? users.length
  const bannedCount =
    stats?.users.banned ?? users.filter((u) => u.banStatus?.isBanned).length
  const totalPages = stats?.wiki.totalPages ?? 0

  const cards = [
    {
      label: '검수 대기',
      value: pendingCount,
      sub: '확인이 필요한 새 문서/편집',
      tone: 'amber' as const,
      icon: Inbox,
      onClick: () => onJump('submissions'),
    },
    {
      label: '전체 사용자',
      value: totalUsers,
      sub: '이랑위키 등록 계정',
      tone: 'cyan' as const,
      icon: Users,
      onClick: () => onJump('users'),
    },
    {
      label: '차단된 사용자',
      value: bannedCount,
      sub: '활성 ban 상태',
      tone: 'rose' as const,
      icon: Shield,
      onClick: () => onJump('users'),
    },
    {
      label: '전체 문서',
      value: totalPages,
      sub: '위키 문서 총 수',
      tone: 'emerald' as const,
      icon: FileText,
      onClick: () => onJump('documents'),
    },
  ]

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => {
          const Icon = c.icon
          return (
            <button
              key={c.label}
              type="button"
              onClick={c.onClick}
              className="group rounded-lg border border-slate-800 bg-slate-900/60 p-4 text-left transition hover:border-cyan-500/40 hover:bg-slate-900"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] font-mono uppercase tracking-widest text-slate-400">
                    {c.label}
                  </p>
                  <p className="mt-2 font-mono text-3xl font-semibold tabular-nums text-white">
                    {c.value.toLocaleString()}
                  </p>
                  <p className="mt-1.5 text-xs text-slate-400">{c.sub}</p>
                </div>
                <span
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-md border ${toneClasses(
                    c.tone
                  )}`}
                >
                  <Icon className="h-4 w-4" />
                </span>
              </div>
            </button>
          )
        })}
      </div>

      {/* 검수 큐 단축 */}
      <section className="rounded-lg border border-slate-800 bg-slate-900/60 p-5">
        <div className="mb-4 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Inbox className="h-4 w-4 text-amber-300" />
            <h3 className="text-sm font-semibold text-white">최근 검수 대기 (상위 5건)</h3>
          </div>
          <button
            type="button"
            onClick={() => onJump('submissions')}
            className="text-xs text-cyan-400 hover:text-cyan-300"
          >
            전체 보기 →
          </button>
        </div>
        {pendingCount === 0 ? (
          <p className="py-6 text-center text-xs text-slate-500">처리 대기 중인 항목이 없습니다.</p>
        ) : (
          <ul className="space-y-2">
            {submissions
              .filter((s) => s.status === 'pending')
              .slice(0, 5)
              .map((s) => (
                <li
                  key={s._id}
                  className="flex items-start justify-between gap-3 rounded-md border border-slate-800 bg-slate-950/60 px-3 py-2"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-white">
                      <span className="mr-2 inline-block rounded bg-slate-800 px-1.5 py-0.5 text-[10px] font-mono uppercase text-slate-300">
                        {s.type === 'create' ? '신규' : '편집'}
                      </span>
                      {s.targetTitle}
                    </p>
                    <p className="mt-0.5 text-[11px] text-slate-400">
                      {s.author} · {new Date(s.createdAt).toLocaleString('ko-KR')}
                    </p>
                  </div>
                  <Clock className="h-3.5 w-3.5 shrink-0 text-amber-400" />
                </li>
              ))}
          </ul>
        )}
      </section>

      {/* 위키 상태 */}
      <section className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-5">
          <div className="mb-3 flex items-center gap-2">
            <FileText className="h-4 w-4 text-cyan-400" />
            <h3 className="text-sm font-semibold text-white">위키 검수 분포</h3>
          </div>
          <ul className="space-y-2 text-sm">
            <StatRow
              icon={CheckCircle2}
              label="승인됨"
              value={stats?.wiki.approved ?? 0}
              color="text-emerald-400"
            />
            <StatRow
              icon={XCircle}
              label="반려됨"
              value={stats?.wiki.rejected ?? 0}
              color="text-rose-400"
            />
            <StatRow
              icon={Pause}
              label="보류됨"
              value={stats?.wiki.onhold ?? 0}
              color="text-amber-400"
            />
            <StatRow
              icon={Inbox}
              label="대기 중"
              value={pendingCount}
              color="text-cyan-400"
            />
          </ul>
        </div>

        <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-5">
          <div className="mb-3 flex items-center gap-2">
            <Activity className="h-4 w-4 text-cyan-400" />
            <h3 className="text-sm font-semibold text-white">실시간 활동 ({recentActivity.length}건)</h3>
          </div>
          {recentActivity.length === 0 ? (
            <p className="py-6 text-center text-xs text-slate-500">최근 활동이 없습니다.</p>
          ) : (
            <ul className="space-y-1.5 max-h-64 overflow-y-auto">
              {recentActivity.slice(0, 8).map((a) => (
                <li
                  key={a.id}
                  className="flex items-start gap-2 rounded px-2 py-1.5 text-xs text-slate-300 hover:bg-slate-800/50"
                >
                  <span className={`mt-0.5 inline-block h-1.5 w-1.5 shrink-0 rounded-full ${activityColor(a.type)}`} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate">
                      <strong className="text-white">{a.user}</strong> · {a.action}
                    </p>
                    <p className="text-[10px] text-slate-500">
                      {new Date(a.timestamp).toLocaleTimeString('ko-KR')}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  )
}

function StatRow({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: any
  label: string
  value: number
  color: string
}) {
  return (
    <li className="flex items-center justify-between rounded px-2 py-1.5 text-sm hover:bg-slate-800/40">
      <span className="inline-flex items-center gap-2 text-slate-400">
        <Icon className={`h-3.5 w-3.5 ${color}`} />
        {label}
      </span>
      <span className={`font-mono tabular-nums font-semibold ${color}`}>{value.toLocaleString()}</span>
    </li>
  )
}

function activityColor(type: string) {
  switch (type) {
    case 'login': return 'bg-emerald-400'
    case 'edit': return 'bg-cyan-400'
    case 'upload': return 'bg-purple-400'
    case 'card': return 'bg-pink-400'
    case 'admin': return 'bg-rose-400'
    default: return 'bg-slate-400'
  }
}

function toneClasses(tone: 'amber' | 'cyan' | 'rose' | 'emerald' | 'slate'): string {
  switch (tone) {
    case 'amber': return 'border-amber-500/30 bg-amber-500/10 text-amber-300'
    case 'cyan': return 'border-cyan-500/30 bg-cyan-500/10 text-cyan-300'
    case 'rose': return 'border-rose-500/30 bg-rose-500/10 text-rose-300'
    case 'emerald': return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
    case 'slate': return 'border-slate-500/40 bg-slate-500/10 text-slate-300'
  }
}

// ── 문서 관리 탭 ─────────────────────────────────────────
function DocumentsTab() {
  return (
    <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-8 text-center">
      <FileText className="mx-auto h-10 w-10 text-slate-600" />
      <h3 className="mt-3 text-base font-semibold text-white">문서 관리</h3>
      <p className="mt-2 text-sm text-slate-400">
        문서 목록·잠금·이동·되돌리기·삭제 도구는 다음 라운드에 통합됩니다.
        <br />
        지금은 위키 페이지의 보호/잠금/되돌리기 API 가 백엔드에 이미 있습니다.
      </p>
      <div className="mt-4 flex flex-wrap justify-center gap-2 text-xs text-slate-500">
        <code className="rounded bg-slate-800 px-2 py-0.5">/api/wiki/pages/lock</code>
        <code className="rounded bg-slate-800 px-2 py-0.5">/api/wiki/pages/protect</code>
        <code className="rounded bg-slate-800 px-2 py-0.5">/api/wiki/pages/move</code>
        <code className="rounded bg-slate-800 px-2 py-0.5">/api/wiki/pages/revert</code>
      </div>
    </div>
  )
}

// ── 시스템 탭 ───────────────────────────────────────────
function SystemTab({ stats }: { stats: DashboardStats | null }) {
  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-5">
        <div className="mb-3 flex items-center gap-2">
          <Activity className="h-4 w-4 text-cyan-400" />
          <h3 className="text-sm font-semibold text-white">시스템 현황</h3>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <SystemCard label="응답 시간" value={`${stats?.system?.responseTime ?? 0}ms`} />
          <SystemCard label="활성 연결" value={String(stats?.system?.activeConnections ?? 0)} />
          <SystemCard label="서버 로드" value={`${stats?.system?.serverLoad ?? 0}%`} />
          <SystemCard label="업타임" value={stats?.system?.uptime ?? '—'} />
        </div>
        <p className="mt-4 text-[11px] text-slate-500">
          <AlertTriangle className="mr-1 inline h-3 w-3 align-[-2px]" />
          이 통계는 `/api/admin/dashboard-stats` 가 노출하는 값입니다. 실제 인프라 메트릭이 필요하면 Cloud Monitoring 대시보드 사용을 권장합니다.
        </p>
      </div>

      <DangerZone />
    </div>
  )
}

// ── 위험 영역 (Danger Zone) ──────────────────────────────
function DangerZone() {
  return (
    <div className="rounded-lg border-2 border-rose-500/30 bg-rose-500/5 p-5">
      <div className="mb-3 flex items-center gap-2">
        <Flag className="h-4 w-4 text-rose-400" />
        <h3 className="text-sm font-semibold text-rose-300">위험 영역 (Danger Zone)</h3>
      </div>

      <div className="space-y-4">
        <DestructiveAction
          title="랭킹·통계 초기화"
          confirmText="랭킹초기화"
          buttonLabel="랭킹/통계 초기화 실행"
          endpoint="/api/admin/reset-rankings"
          confirmMessage={
            '정말로 모든 사용자의 랭킹/통계(edits, pagesCreated, reputation, discussionPosts) 를 0 으로 초기화할까요?\n\n' +
            '※ 위키 본문/편집 이력(wiki_revisions) 은 보존됩니다.\n※ 되돌릴 수 없습니다.'
          }
          description={
            <>
              모든 사용자의 통계 컬럼(<code className="text-cyan-300">edits</code>,{' '}
              <code className="text-cyan-300">pagesCreated</code>,{' '}
              <code className="text-cyan-300">reputation</code>,{' '}
              <code className="text-cyan-300">discussionPosts</code>) 을{' '}
              <strong className="text-white">0</strong> 으로 reset. 기여자 페이지 / 활동 점수 / 랭킹이 모두 0 부터 다시 누적됩니다.
            </>
          }
          notes={[
            '위키 본문(wiki_pages) 은 그대로 유지됩니다.',
            '편집 이력(wiki_revisions) 은 보존됩니다 — 사용자가 다시 편집하면 통계가 새로 누적.',
            '차단 상태(banStatus) 와 권한(role / permissions) 은 영향 없음.',
          ]}
        />

        <DestructiveAction
          title="검수 큐 초기화"
          confirmText="검수큐초기화"
          buttonLabel="검수 큐 전체 삭제"
          endpoint="/api/admin/reset-submissions"
          confirmMessage={
            '정말로 wiki_submissions 의 모든 검수 큐 항목(대기/승인/반려/보류 전부)을 삭제할까요?\n\n' +
            '※ 위키 본문/리비전은 손대지 않습니다.\n※ 되돌릴 수 없습니다.'
          }
          description={
            <>
              <code className="text-cyan-300">wiki_submissions</code> 테이블의 모든 row 를 삭제. 검수
              대기/승인/반려/보류 상태 모두 비웁니다.
            </>
          }
          notes={[
            '위키 본문(wiki_pages) 과 편집 이력(wiki_revisions) 은 영향 없음.',
            '관리자/모더레이터는 isWhitelistedWikiAdmin 우회로 검수 큐를 거치지 않으므로, 큐는 일반 사용자 제출만 누적된 상태였음.',
          ]}
        />
      </div>
    </div>
  )
}

function DestructiveAction({
  title,
  confirmText: REQUIRED_TEXT,
  buttonLabel,
  endpoint,
  confirmMessage,
  description,
  notes,
}: {
  title: string
  confirmText: string
  buttonLabel: string
  endpoint: string
  confirmMessage: string
  description: React.ReactNode
  notes: string[]
}) {
  const [confirmInput, setConfirmInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<string | null>(null)

  const onRun = async () => {
    if (confirmInput !== REQUIRED_TEXT) return
    if (!confirm(confirmMessage)) return
    setBusy(true)
    setResult(null)
    try {
      const r = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ confirm: true, confirmText: REQUIRED_TEXT }),
      })
      const d = await r.json()
      if (d.success) {
        setResult(`✅ ${d.message}`)
        setConfirmInput('')
      } else {
        setResult(`❌ ${d.error || '초기화 실패'}`)
      }
    } catch {
      setResult('❌ 네트워크 오류')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="rounded-md border border-rose-500/20 bg-slate-900/60 p-4">
      <h4 className="text-sm font-semibold text-white">{title}</h4>
      <p className="mt-2 text-xs leading-relaxed text-slate-400">{description}</p>
      <ul className="mt-2 space-y-1 text-[11px] text-slate-500">
        {notes.map((n, i) => (
          <li key={i}>• {n}</li>
        ))}
      </ul>

      <div className="mt-4 space-y-2">
        <label className="block text-[11px] font-mono text-slate-400">
          실행하려면 아래에 정확히{' '}
          <code className="rounded bg-slate-800 px-1.5 text-cyan-300">{REQUIRED_TEXT}</code> 를 입력
        </label>
        <input
          type="text"
          value={confirmInput}
          onChange={(e) => setConfirmInput(e.target.value)}
          placeholder={REQUIRED_TEXT}
          className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white placeholder:text-slate-600 focus:border-rose-500 focus:outline-none"
          autoComplete="off"
          spellCheck={false}
        />
        <button
          type="button"
          onClick={onRun}
          disabled={busy || confirmInput !== REQUIRED_TEXT}
          className="inline-flex items-center gap-1 rounded-md bg-rose-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-rose-500 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {busy ? '실행 중…' : buttonLabel}
        </button>
        {result && (
          <p
            className={`text-xs ${
              result.startsWith('✅') ? 'text-emerald-300' : 'text-rose-300'
            }`}
          >
            {result}
          </p>
        )}
      </div>
    </div>
  )
}

function SystemCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-slate-800 bg-slate-950/60 px-4 py-3">
      <p className="text-[10px] font-mono uppercase tracking-widest text-slate-500">{label}</p>
      <p className="mt-1 font-mono text-xl font-semibold tabular-nums text-white">{value}</p>
    </div>
  )
}

function EmptyTab({ icon: Icon, message }: { icon: any; message: string }) {
  return (
    <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-10 text-center">
      <Icon className="mx-auto h-10 w-10 text-slate-600" />
      <p className="mt-4 text-sm text-slate-400">{message}</p>
    </div>
  )
}
