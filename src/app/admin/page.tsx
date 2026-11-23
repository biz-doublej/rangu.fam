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
  Wand2,
} from 'lucide-react'
import toast from 'react-hot-toast'

import { AccountLinkTab } from './components/AccountLinkTab'
import { AdManagement } from './components/AdManagement'
import { NamuImportTab } from './components/NamuImportTab'
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

type TabKey = 'overview' | 'review' | 'reports' | 'users' | 'accounts' | 'documents' | 'import' | 'ads' | 'notices' | 'system'

const TABS: Array<{ key: TabKey; label: string; icon: React.ComponentType<{ className?: string }>; adminOnly: boolean; group: string }> = [
  { key: 'overview', label: '오늘', icon: BarChart3, adminOnly: true, group: '할 일' },
  { key: 'review', label: '편집 검수', icon: Inbox, adminOnly: false, group: '할 일' },
  { key: 'reports', label: '신고', icon: Flag, adminOnly: false, group: '할 일' },
  { key: 'users', label: '회원', icon: Users, adminOnly: true, group: '회원' },
  { key: 'accounts', label: '계정 연결', icon: Link2, adminOnly: true, group: '회원' },
  { key: 'documents', label: '문서', icon: FileText, adminOnly: true, group: '위키' },
  { key: 'import', label: '나무위키 가져오기', icon: Wand2, adminOnly: false, group: '위키' },
  { key: 'ads', label: '광고', icon: ImageIcon, adminOnly: true, group: '위키' },
  { key: 'notices', label: '공지', icon: Megaphone, adminOnly: true, group: '위키' },
  { key: 'system', label: '서버와 DB', icon: Activity, adminOnly: true, group: '서버' },
]

function readTabFromUrl(): TabKey | null {
  if (typeof window === 'undefined') return null
  const tab = new URLSearchParams(window.location.search).get('tab')
  return TABS.some((item) => item.key === tab) ? (tab as TabKey) : null
}

function CenterScreen({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-adm-bg px-4">
      <div className="w-full max-w-sm rounded-md border border-adm-rule bg-adm-sheet p-7 text-center">{children}</div>
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
      const data = await requestJson<DashboardData>('/api/admin/dashboard-stats')
      // 모양이 다른 응답이 와도 화면 전체가 멈추지 않게 확인하고 넣는다
      setDashboard(data?.stats && data?.system ? data : null)
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
        <p className="text-sm text-adm-muted">권한을 확인하는 중입니다.</p>
      </CenterScreen>
    )
  }

  if (authState === 'guest') {
    return (
      <CenterScreen>
        <Shield className="mx-auto h-6 w-6 text-adm-accent" />
        <p className="mt-3 text-base font-semibold text-adm-ink">로그인이 필요합니다</p>
        <p className="mt-1 text-[13px] text-adm-muted">관리자나 운영자 계정으로 로그인해 주세요.</p>
        <a
          href="/auth/start?callbackUrl=%2Fadmin"
          className="mt-4 inline-flex items-center gap-1.5 rounded bg-adm-accent px-3 py-1.5 text-[13px] font-semibold text-adm-onaccent hover:bg-adm-accent/90"
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
        <Shield className="mx-auto h-6 w-6 text-adm-pencil" />
        <p className="mt-3 text-base font-semibold text-adm-ink">접근 권한이 없습니다</p>
        <p className="mt-1 text-[13px] text-adm-muted">이 화면은 관리자와 운영자만 볼 수 있습니다.</p>
        <a href="/wiki" className="mt-4 inline-block text-[13px] text-adm-accent hover:underline">
          위키로 돌아가기
        </a>
      </CenterScreen>
    )
  }

  const countFor = (key: TabKey) =>
    key === 'review' ? dashboard?.stats?.submissions?.pending : key === 'reports' ? dashboard?.stats?.reports?.open ?? undefined : undefined
  const groups = Array.from(new Set(visibleTabs.map((tab) => tab.group)))
  const current = TABS.find((tab) => tab.key === activeTab)!

  const navButton = (tab: (typeof TABS)[number], compact: boolean) => {
    const Icon = tab.icon
    const active = activeTab === tab.key
    const count = countFor(tab.key)
    return (
      <button
        key={tab.key}
        type="button"
        onClick={() => selectTab(tab.key)}
        aria-current={active ? 'page' : undefined}
        className={
          compact
            ? `inline-flex shrink-0 items-center gap-1.5 rounded px-3 py-1.5 text-[13px] ${
                active ? 'bg-adm-ink font-medium text-adm-sheet' : 'text-adm-muted'
              }`
            : `relative flex w-full items-center gap-2.5 rounded px-2.5 py-[7px] text-left text-sm transition-colors ${
                active ? 'bg-adm-sheet font-semibold text-adm-ink shadow-[0_0_0_1px_rgb(var(--adm-rule))]' : 'text-adm-soft hover:bg-adm-sheet/60 hover:text-adm-ink'
              }`
        }
      >
        {!compact && <Icon className={`h-4 w-4 shrink-0 ${active ? 'text-adm-accent' : 'text-adm-faint'}`} />}
        <span className="min-w-0 flex-1 truncate">{tab.label}</span>
        {typeof count === 'number' && count > 0 && <span className="adm-mark" aria-label={`${count}건`}>{count}</span>}
      </button>
    )
  }

  return (
    <div className="min-h-screen bg-adm-bg md:grid md:grid-cols-[232px_minmax(0,1fr)]">
      <aside className="sticky top-0 hidden h-screen flex-col border-r border-adm-rule px-3 py-5 md:flex">
        <a href="/admin" className="flex items-center gap-2.5 px-2.5">
          <img src="/assets/irang_emblem_96.png" alt="" className="h-7 w-7" />
          <span className="leading-tight">
            <span className="block text-[15px] font-bold text-adm-ink">이랑위키</span>
            <span className="block text-xs text-adm-muted">운영 데스크</span>
          </span>
        </a>
        <nav className="mt-7 flex-1 space-y-5 overflow-y-auto" aria-label="관리 메뉴">
          {groups.map((group) => (
            <div key={group}>
              <p className="mb-1 px-2.5 text-xs text-adm-faint">{group}</p>
              <div className="space-y-0.5">{visibleTabs.filter((tab) => tab.group === group).map((tab) => navButton(tab, false))}</div>
            </div>
          ))}
        </nav>
        <div className="border-t border-adm-rule px-2.5 pt-4">
          <p className="truncate text-sm font-medium text-adm-ink">{me.displayName}</p>
          <p className="text-xs text-adm-muted">{ROLE_LABELS[me.role]}</p>
          <a href="/wiki" className="mt-3 inline-flex items-center gap-1.5 text-[13px] text-adm-accent hover:underline">
            <BookOpen className="h-3.5 w-3.5" />
            위키로 돌아가기
          </a>
        </div>
      </aside>

      <header className="sticky top-0 z-40 border-b border-adm-rule bg-adm-bg/95 backdrop-blur md:hidden">
        <div className="flex items-center justify-between px-4 pb-2 pt-3">
          <a href="/admin" className="flex items-center gap-2">
            <img src="/assets/irang_emblem_96.png" alt="" className="h-6 w-6" />
            <span className="text-[15px] font-bold text-adm-ink">운영 데스크</span>
          </a>
          <a href="/wiki" className="text-[13px] text-adm-accent">
            위키로
          </a>
        </div>
        <nav className="adm-scroll-x flex gap-1 overflow-x-auto px-4 pb-2.5" aria-label="관리 메뉴">
          {visibleTabs.map((tab) => navButton(tab, true))}
        </nav>
      </header>

      <main className="min-w-0 px-3 py-4 sm:px-6 md:px-10 md:py-8">
        <p className="mx-auto mb-3 hidden max-w-5xl text-[13px] text-adm-muted md:block">
          {current.group} / <span className="text-adm-ink">{current.label}</span>
        </p>
        <div key={activeTab} className="adm-sheet-enter mx-auto max-w-5xl overflow-hidden rounded-md border border-adm-rule bg-adm-sheet">
          {activeTab === 'overview' && <OverviewTab data={dashboard} onJump={selectTab} />}
          {activeTab === 'review' && <ReviewTab />}
          {activeTab === 'reports' && <ReportsTab />}
          {activeTab === 'users' && <UsersTab />}
          {activeTab === 'accounts' && <AccountLinkTab />}
          {activeTab === 'documents' && <div className="p-5 sm:p-6"><WikiDocsManagement /></div>}
          {activeTab === 'import' && <NamuImportTab />}
          {activeTab === 'ads' && <div className="p-5 sm:p-6"><AdManagement /></div>}
          {activeTab === 'notices' && <NoticesTab />}
          {activeTab === 'system' && <SystemTab data={dashboard} onRefresh={loadDashboard} />}
        </div>
      </main>
    </div>
  )
}
