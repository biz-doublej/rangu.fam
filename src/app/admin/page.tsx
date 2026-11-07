'use client'

import React, { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Activity,
  BarChart3,
  BookOpen,
  FileText,
  Flag,
  Image as ImageIcon,
  Inbox,
  Link2,
  LogIn,
  Megaphone,
  Shield,
  Users,
} from 'lucide-react'
import toast from 'react-hot-toast'

import { AccountLinkTab } from './components/AccountLinkTab'
import { AdManagement } from './components/AdManagement'
import { NoticesTab } from './components/NoticesTab'
import { OverviewTab, type DashboardData } from './components/OverviewTab'
import { ReportsTab } from './components/ReportsTab'
import { ReviewTab } from './components/ReviewTab'
import { SystemTab } from './components/SystemTab'
import { UsersTab } from './components/UsersTab'
import WikiDocsManagement from './components/WikiDocsManagement'
import { ROLE_LABELS, requestJson } from './components/adminUi'

interface StaffMe {
  id: string
  username: string
  displayName: string
  role: 'admin' | 'moderator'
}

type TabKey = 'overview' | 'review' | 'reports' | 'users' | 'accounts' | 'documents' | 'ads' | 'notices' | 'system'

const TABS: Array<{ key: TabKey; label: string; icon: React.ComponentType<{ className?: string }>; adminOnly: boolean }> = [
  { key: 'overview', label: '개요', icon: BarChart3, adminOnly: true },
  { key: 'review', label: '편집 검수', icon: Inbox, adminOnly: false },
  { key: 'reports', label: '신고', icon: Flag, adminOnly: false },
  { key: 'users', label: '회원', icon: Users, adminOnly: true },
  { key: 'accounts', label: '계정 연결', icon: Link2, adminOnly: true },
  { key: 'documents', label: '문서', icon: FileText, adminOnly: true },
  { key: 'ads', label: '광고', icon: ImageIcon, adminOnly: true },
  { key: 'notices', label: '공지', icon: Megaphone, adminOnly: true },
  { key: 'system', label: '시스템', icon: Activity, adminOnly: true },
]

function readTabFromUrl(): TabKey | null {
  if (typeof window === 'undefined') return null
  const tab = new URLSearchParams(window.location.search).get('tab')
  return TABS.some((item) => item.key === tab) ? (tab as TabKey) : null
}

function CenterScreen({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4 text-slate-200">
      <div className="w-full max-w-sm rounded-lg border border-slate-800 bg-slate-900/60 p-6 text-center">{children}</div>
    </div>
  )
}

export default function AdminDashboard() {
  const [me, setMe] = useState<StaffMe | null>(null)
  const [authState, setAuthState] = useState<'loading' | 'ready' | 'denied' | 'guest'>('loading')
  const [activeTab, setActiveTab] = useState<TabKey>('review')
  const [dashboard, setDashboard] = useState<DashboardData | null>(null)

  const isAdmin = me?.role === 'admin'
  const visibleTabs = useMemo(() => TABS.filter((tab) => isAdmin || !tab.adminOnly), [isAdmin])

  const loadDashboard = useCallback(async () => {
    try {
      setDashboard(await requestJson('/api/admin/dashboard-stats'))
    } catch (error) {
      toast.error((error as Error).message)
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const response = await fetch('/api/wiki/auth/me', { credentials: 'include' })
        if (response.status === 401) {
          if (!cancelled) setAuthState('guest')
          return
        }
        const data = await response.json().catch(() => null)
        const role = data?.user?.role
        if (role !== 'admin' && role !== 'moderator') {
          if (!cancelled) setAuthState('denied')
          return
        }
        if (cancelled) return
        setMe({
          id: data.user.id,
          username: data.user.username,
          displayName: data.user.displayName || data.user.username,
          role,
        })
        const requested = readTabFromUrl()
        const allowed = TABS.find((tab) => tab.key === requested && (role === 'admin' || !tab.adminOnly))
        setActiveTab(allowed ? allowed.key : role === 'admin' ? 'overview' : 'review')
        setAuthState('ready')
      } catch {
        if (!cancelled) setAuthState('guest')
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (isAdmin) loadDashboard()
  }, [isAdmin, loadDashboard])

  const selectTab = (tab: string) => {
    if (!visibleTabs.some((item) => item.key === tab)) return
    setActiveTab(tab as TabKey)
    const url = new URL(window.location.href)
    url.searchParams.set('tab', tab)
    window.history.replaceState(null, '', url.toString())
    if ((tab === 'overview' || tab === 'system') && isAdmin) loadDashboard()
  }

  if (authState === 'loading') {
    return (
      <CenterScreen>
        <p className="text-sm text-slate-400">권한을 확인하는 중입니다.</p>
      </CenterScreen>
    )
  }

  if (authState === 'guest') {
    return (
      <CenterScreen>
        <Shield className="mx-auto h-6 w-6 text-cyan-400" />
        <p className="mt-3 text-sm font-semibold text-white">로그인이 필요합니다</p>
        <p className="mt-1 text-xs text-slate-400">관리자나 운영자 계정으로 로그인해 주세요.</p>
        <a
          href="/auth/start?callbackUrl=%2Fadmin"
          className="mt-4 inline-flex items-center gap-1.5 rounded-md bg-cyan-500 px-3 py-1.5 text-xs font-semibold text-slate-950 hover:bg-cyan-400"
        >
          <LogIn className="h-3.5 w-3.5" />
          로그인
        </a>
      </CenterScreen>
    )
  }

  if (authState === 'denied' || !me) {
    return (
      <CenterScreen>
        <Shield className="mx-auto h-6 w-6 text-rose-400" />
        <p className="mt-3 text-sm font-semibold text-white">접근 권한이 없습니다</p>
        <p className="mt-1 text-xs text-slate-400">이 화면은 관리자와 운영자만 볼 수 있습니다.</p>
        <a href="/wiki" className="mt-4 inline-block text-xs text-cyan-300 hover:underline">
          위키로 돌아가기
        </a>
      </CenterScreen>
    )
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200">
      <header className="sticky top-0 z-40 border-b border-slate-800 bg-slate-950/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div className="flex min-w-0 items-center gap-2.5">
            <Shield className="h-5 w-5 shrink-0 text-cyan-400" />
            <h1 className="truncate text-base font-bold text-white">이랑위키 운영</h1>
          </div>
          <div className="flex items-center gap-2">
            <span className="hidden text-xs text-slate-400 sm:inline">
              {me.displayName} · {ROLE_LABELS[me.role]}
            </span>
            <a
              href="/wiki"
              className="inline-flex items-center gap-1 rounded-md border border-slate-800 px-2.5 py-1.5 text-xs text-slate-300 hover:border-cyan-500/40 hover:text-cyan-300"
            >
              <BookOpen className="h-3.5 w-3.5" />
              위키
            </a>
          </div>
        </div>
        <nav className="mx-auto max-w-6xl overflow-x-auto px-4 sm:px-6" aria-label="관리 메뉴">
          <div className="flex gap-1 pb-2">
            {visibleTabs.map((tab) => {
              const Icon = tab.icon
              const active = activeTab === tab.key
              const count =
                tab.key === 'review'
                  ? dashboard?.stats.submissions.pending
                  : tab.key === 'reports'
                    ? dashboard?.stats.reports.open
                    : undefined
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => selectTab(tab.key)}
                  aria-current={active ? 'page' : undefined}
                  className={`inline-flex shrink-0 items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition ${
                    active ? 'bg-cyan-500/15 text-cyan-300' : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {tab.label}
                  {typeof count === 'number' && count > 0 && (
                    <span className="rounded-full bg-amber-500/20 px-1.5 text-[10px] font-semibold text-amber-300">{count}</span>
                  )}
                </button>
              )
            })}
          </div>
        </nav>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
        {activeTab === 'overview' && <OverviewTab data={dashboard} onJump={selectTab} />}
        {activeTab === 'review' && <ReviewTab />}
        {activeTab === 'reports' && <ReportsTab />}
        {activeTab === 'users' && <UsersTab />}
        {activeTab === 'accounts' && <AccountLinkTab />}
        {activeTab === 'documents' && <WikiDocsManagement />}
        {activeTab === 'ads' && <AdManagement />}
        {activeTab === 'notices' && <NoticesTab />}
        {activeTab === 'system' && <SystemTab data={dashboard} onRefresh={loadDashboard} />}
      </main>
    </div>
  )
}
