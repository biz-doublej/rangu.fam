'use client'

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useState
} from 'react'
import { useRouter, usePathname } from 'next/navigation'
import {
  Search,
  LogIn,
  LogOut,
  Shield,
  Home,
  BookOpen,
  Clock,
  Layers,
  Shuffle,
  HelpCircle,
  FileText,
  Star,
  Bell,
  Edit,
  Folder,
  Trophy,
  Info,
  Users,
  CreditCard,
  ExternalLink
} from 'lucide-react'
import dynamic from 'next/dynamic'
import { AnimatePresence, motion } from 'framer-motion'
import { Input } from '@/components/ui/Input'
import { BRANDING } from '@/config/branding'
import { useWikiAuth } from '@/contexts/WikiAuthContext'

const NotificationDropdown = dynamic(
  () => import('@/components/ui/NotificationDropdown').then(m => m.NotificationDropdown),
  { ssr: false, loading: () => <span className="inline-block h-7 w-7" /> }
)

type ActiveNav =
  | 'main'
  | 'recent'
  | 'category'
  | 'random'
  | 'search'
  | 'help'
  | 'mod'
  | 'workshop'

interface WikiShellProps {
  children: React.ReactNode
  pageHeader?: React.ReactNode
  rightRail?: React.ReactNode
  activeNav?: ActiveNav
}

interface WikiPageHeaderProps {
  title: string
  subtitle?: React.ReactNode
  hatnote?: React.ReactNode
  meta?: Array<{ label: string; value: React.ReactNode; icon?: React.ElementType }>
  tabs?: Array<{ key: string; label: string; icon?: React.ElementType }>
  activeTab?: string
  onTabChange?: (key: string) => void
  actions?: React.ReactNode
}

const NAV_LINKS: Array<{ key: ActiveNav; label: string; href: string; icon: React.ElementType }> = [
  { key: 'main', label: '대문', icon: BookOpen, href: '/wiki' },
  { key: 'recent', label: '최근 변경', icon: Clock, href: '/wiki/recent' },
  { key: 'category', label: '분류', icon: Layers, href: '/wiki/category' },
  { key: 'random', label: '임의 문서', icon: Shuffle, href: '/wiki/random' },
  { key: 'search', label: '문서 검색', icon: Search, href: '/wiki/search' }
]

const HELP_LINKS = [
  { label: '도움말', href: '/wiki/이랑위키:도움말' },
  { label: '편집 도움말', href: '/wiki/이랑위키:도움말_2026' },
  { label: '문법 안내', href: '/wiki/이랑위키:문법' },
  { label: '규정', href: '/wiki/이랑위키:규정' }
]

const TOOL_LINKS = [
  { label: '작업공작소', href: '/wiki/workshop', icon: FileText },
  { label: '50호 시상식', href: '/wiki/workshop/awards-2025', icon: Star },
  { label: '내 감시 목록', href: '/wiki/watchlist', icon: Bell },
  { label: '기여자', href: '/wiki/contributors', icon: Trophy }
]

/* 사이트 전체(랑구팸) 셀렉 메뉴 — 위키 토프바 아래에 노출. 랑구팸 본 사이트의
 * 메뉴와 동일한 6 항목을 그대로 가져옵니다. 현재 위치는 "이랑위키"이므로
 * 그 항목이 active 상태로 강조됩니다. "이랑위키" 항목에는 미러 드롭다운
 * (rangu-fam.com/wiki + irang.wiki)이 함께 따라옵니다. */
type SiteMenuItem = {
  key: 'home' | 'about' | 'members' | 'wiki' | 'cards' | 'login' | 'terms'
  label: string
  /** 한 줄 소제목 — 마우스 hover 시 표시 + tooltip / aria-label */
  subtitle: string
  href: string
  icon: React.ElementType
  external?: boolean
  mirrors?: Array<{ label: string; href: string }>
  /** 이 항목을 active로 만드는 pathname 매칭. */
  matchPaths?: RegExp[]
}

/* 이랑위키 내부 셀렉 메뉴.
 * 라벨은 랑구팸 본 사이트와 동일하지만, 각 항목은 이랑위키 안에서
 * 자연스러운 경로(대문 / 소개 / 기여자 / …)를 가리킵니다. */
const SITE_MENU_ITEMS: SiteMenuItem[] = [
  {
    key: 'home',
    label: '홈',
    subtitle: '이랑위키 대문',
    href: '/wiki',
    icon: Home,
    matchPaths: [/^\/wiki\/?$/]
  },
  {
    key: 'about',
    label: '소개',
    subtitle: '이랑위키 소개 · 안내',
    href: '/wiki/이랑위키:소개',
    icon: Info,
    matchPaths: [/^\/wiki\/이랑위키:소개/, /^\/wiki\/이랑위키:도움말/]
  },
  {
    key: 'members',
    label: '멤버',
    subtitle: '기여자 목록',
    href: '/wiki/contributors',
    icon: Users,
    matchPaths: [/^\/wiki\/contributors/]
  },
  {
    key: 'wiki',
    label: '이랑위키',
    subtitle: '이랑위키 자기 자신 (메타 문서)',
    href: '/wiki/이랑위키',
    icon: BookOpen,
    matchPaths: [/^\/wiki\/이랑위키(?!:)/],
    mirrors: [
      { label: 'rangu-fam.com/wiki', href: 'https://rangu-fam.com/wiki' },
      { label: 'irang.wiki',          href: 'https://irang.wiki/' }
    ]
  },
  {
    key: 'cards',
    label: '카드',
    subtitle: '카드 분류 모아보기',
    href: '/wiki/category/카드',
    icon: CreditCard,
    matchPaths: [/^\/wiki\/category\/카드/]
  }
]

const SITE_MENU_LOGIN: SiteMenuItem = {
  key: 'login',
  label: '로그인',
  subtitle: '이랑위키 로그인',
  href: '/auth/start?callbackUrl=%2Fwiki',
  icon: LogIn
}

const SITE_MENU_TERMS: SiteMenuItem = {
  key: 'terms',
  label: '약관',
  subtitle: 'DoubleJ 통합 계정 약관',
  href: 'https://accounts.doublej.app/terms',
  icon: FileText,
  external: true
}

/* ────────────────────────────────────────────────────────────
 * Layout-mode context.
 * When `<WikiShellLayoutFrame>` is mounted (from src/app/wiki/layout.tsx),
 * each page-level `<WikiShell>` registers its chrome (header/rightRail/activeNav)
 * here instead of rendering its own chrome. This keeps the topbar/sidebar
 * mounted across navigations and lets us fade-swap the content area.
 * ────────────────────────────────────────────────────────────*/
type WikiShellRegistration = {
  pageHeader?: React.ReactNode
  rightRail?: React.ReactNode
  activeNav?: ActiveNav
}

const WikiShellLayoutContext = createContext<{
  isInLayout: boolean
  register: (key: string, value: WikiShellRegistration) => void
  unregister: (key: string) => void
}>({
  isInLayout: false,
  register: () => {},
  unregister: () => {}
})

let __wikiShellInstance = 0

/** Page-level wrapper. Use one per page. */
export function WikiShell({ children, pageHeader, rightRail, activeNav }: WikiShellProps) {
  const ctx = useContext(WikiShellLayoutContext)
  const [instanceKey] = useState(() => `ws-${++__wikiShellInstance}`)

  // When inside the layout frame, register props instead of rendering chrome.
  useLayoutEffect(() => {
    if (!ctx.isInLayout) return
    ctx.register(instanceKey, { pageHeader, rightRail, activeNav })
    return () => ctx.unregister(instanceKey)
  }, [ctx, instanceKey, pageHeader, rightRail, activeNav])

  if (ctx.isInLayout) {
    return <>{pageHeader}{children}</>
  }

  // Fallback: render the full standalone shell (used in tests/legacy).
  return (
    <WikiShellLayoutFrame>
      <WikiShell pageHeader={pageHeader} rightRail={rightRail} activeNav={activeNav}>
        {children}
      </WikiShell>
    </WikiShellLayoutFrame>
  )
}

/** Top-level chrome frame used by `src/app/wiki/layout.tsx`. */
export function WikiShellLayoutFrame({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const { wikiUser, isLoggedIn, logout, isModerator } = useWikiAuth()
  const [searchQuery, setSearchQuery] = useState('')
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const [showShortcuts, setShowShortcuts] = useState(false)

  // 라우트 변경 시 모바일 사이드바 자동 닫기 (백드롭 미사용 시 본문 보이게)
  useEffect(() => {
    setMobileNavOpen(false)
  }, [pathname])
  const searchInputRef = React.useRef<HTMLInputElement>(null)
  const gPrefixRef = React.useRef(false)
  const gPrefixTimerRef = React.useRef<NodeJS.Timeout | null>(null)

  // 전역 키보드 단축키
  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Esc → 닫기
      if (e.key === 'Escape') {
        if (showShortcuts) setShowShortcuts(false)
        return
      }

      // 입력 요소에서는 단축키 비활성화 (단, Esc 제외)
      const target = e.target as HTMLElement
      const isInput =
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.tagName === 'SELECT' ||
        target.isContentEditable
      if (isInput) return

      // ?  → 단축키 도움말
      if (e.key === '?' && !e.metaKey && !e.ctrlKey) {
        e.preventDefault()
        setShowShortcuts(true)
        return
      }

      // s 또는 /  → 검색창 포커스
      if ((e.key === 's' || e.key === '/') && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault()
        searchInputRef.current?.focus()
        return
      }

      // g 입력 → 다음 키 대기
      if (e.key === 'g' && !e.metaKey && !e.ctrlKey && !e.altKey) {
        gPrefixRef.current = true
        if (gPrefixTimerRef.current) clearTimeout(gPrefixTimerRef.current)
        gPrefixTimerRef.current = setTimeout(() => {
          gPrefixRef.current = false
        }, 1500)
        return
      }

      // g + ? 조합
      if (gPrefixRef.current && !e.metaKey && !e.ctrlKey && !e.altKey) {
        gPrefixRef.current = false
        if (gPrefixTimerRef.current) clearTimeout(gPrefixTimerRef.current)
        switch (e.key) {
          case 'h': e.preventDefault(); router.push('/wiki'); break
          case 'r': e.preventDefault(); router.push('/wiki/recent'); break
          case 'c': e.preventDefault(); router.push('/wiki/category'); break
          case 'w': e.preventDefault(); router.push('/wiki/watchlist'); break
          case 'n': e.preventDefault(); router.push('/wiki/random'); break
          case 's': e.preventDefault(); router.push('/wiki/search'); break
        }
      }
    }

    window.addEventListener('keydown', handler)
    return () => {
      window.removeEventListener('keydown', handler)
      if (gPrefixTimerRef.current) clearTimeout(gPrefixTimerRef.current)
    }
  }, [router, showShortcuts])

  // Per-page chrome registrations — keep last-registered so unmount-then-mount
  // transitions (Next navigation) don't flash an empty header.
  const [registrations, setRegistrations] = useState<Record<string, WikiShellRegistration>>({})

  const register = useCallback((key: string, value: WikiShellRegistration) => {
    setRegistrations(prev => ({ ...prev, [key]: value }))
  }, [])
  const unregister = useCallback((key: string) => {
    // Keep the registration around briefly so the exiting page header
    // doesn't disappear before the new page has registered. The next
    // page's register() will overwrite. We GC stale entries when more
    // than 6 stick around.
    setRegistrations(prev => {
      const entries = Object.entries(prev).filter(([k]) => k !== key)
      if (entries.length > 6) entries.splice(0, entries.length - 6)
      return Object.fromEntries(entries)
    })
  }, [])

  const ctxValue = useMemo(() => ({ isInLayout: true, register, unregister }), [register, unregister])

  useEffect(() => { setMobileNavOpen(false) }, [pathname])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    const q = searchQuery.trim()
    if (q) router.push(`/wiki/search?q=${encodeURIComponent(q)}`)
    setSuggestionOpen(false)
  }

  // ── 검색 자동완성 ──────────────────────────────────────────
  const [suggestions, setSuggestions] = useState<Array<{ title: string; slug: string }>>([])
  const [suggestionOpen, setSuggestionOpen] = useState(false)
  const [highlightedIdx, setHighlightedIdx] = useState(-1)
  const suggestionTimerRef = React.useRef<NodeJS.Timeout | null>(null)

  React.useEffect(() => {
    const q = searchQuery.trim()
    if (!q || q.length < 2) {
      setSuggestions([])
      setSuggestionOpen(false)
      return
    }
    if (suggestionTimerRef.current) clearTimeout(suggestionTimerRef.current)
    suggestionTimerRef.current = setTimeout(async () => {
      try {
        const r = await fetch(`/api/wiki/search?q=${encodeURIComponent(q)}&limit=6`)
        const d = await r.json()
        if (d.success && Array.isArray(d.results)) {
          setSuggestions(d.results.map((x: any) => ({ title: x.title, slug: x.slug })))
          setSuggestionOpen(true)
          setHighlightedIdx(-1)
        }
      } catch {}
    }, 200)
    return () => {
      if (suggestionTimerRef.current) clearTimeout(suggestionTimerRef.current)
    }
  }, [searchQuery])

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!suggestionOpen || suggestions.length === 0) {
      if (e.key === 'Escape') setSuggestionOpen(false)
      return
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHighlightedIdx((i) => Math.min(i + 1, suggestions.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlightedIdx((i) => Math.max(i - 1, -1))
    } else if (e.key === 'Enter' && highlightedIdx >= 0) {
      e.preventDefault()
      const s = suggestions[highlightedIdx]
      if (s) {
        router.push(`/wiki/${encodeURIComponent(s.title)}`)
        setSearchQuery('')
        setSuggestionOpen(false)
      }
    } else if (e.key === 'Escape') {
      setSuggestionOpen(false)
    }
  }

  // Pick the most recent registration as the active one.
  const active = useMemo<WikiShellRegistration>(() => {
    const keys = Object.keys(registrations)
    if (keys.length === 0) return {}
    return registrations[keys[keys.length - 1]] || {}
  }, [registrations])

  return (
    <WikiShellLayoutContext.Provider value={ctxValue}>
      <div className="theme-surface min-h-screen" suppressHydrationWarning>
        {/* ── Top Bar (HUD) ─────────────────────────────────────── */}
        <header className="wiki-topbar">
          <div className="mx-auto max-w-[1280px] px-4 sm:px-6 py-2.5 flex items-center gap-3 relative z-10">
            <button
              type="button"
              className="md:hidden p-2 rounded hover:bg-white/5 text-[color:var(--wiki-ink-soft)]"
              onClick={() => setMobileNavOpen(v => !v)}
              aria-label="메뉴 열기"
            >
              <span className="block h-0.5 w-5 bg-current mb-1" />
              <span className="block h-0.5 w-5 bg-current mb-1" />
              <span className="block h-0.5 w-5 bg-current" />
            </button>

            <button
              type="button"
              onClick={() => router.push('/wiki')}
              className="flex items-center gap-2.5 group"
            >
              <span
                className="relative inline-flex h-9 w-9 items-center justify-center rounded-md border border-[color:var(--wiki-rule-strong)] bg-[color:var(--wiki-bg-2)] text-[color:var(--wiki-cyan)] overflow-hidden group-hover:border-[color:var(--wiki-cyan)]"
                aria-hidden
              >
                <span className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,rgba(34,211,238,0.45),transparent_60%)]" />
                <BookOpen className="w-4 h-4 relative" />
              </span>
              <span className="flex items-center gap-2">
                <span
                  className="text-lg sm:text-xl font-semibold text-[color:var(--wiki-ink)]"
                  style={{ fontFamily: "'Space Grotesk', 'Pretendard', sans-serif", letterSpacing: '0.005em' }}
                >
                  {BRANDING.brandWiki}
                </span>
                <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-mono text-[color:var(--wiki-cyan)] border border-[color:var(--wiki-cyan)]/40 rounded-sm px-1.5 py-0.5 tracking-[0.18em]">
                  <span className="wiki-pulse-dot" />
                  LIVE
                </span>
              </span>
            </button>

            <span
              className="hidden lg:inline-block text-[11px] tracking-[0.18em] uppercase text-[color:var(--wiki-ink-faint)]"
              style={{ fontFamily: "'JetBrains Mono', monospace" }}
            >
              {'// 여러분이 가꾸는 작은 백과사전'}
            </span>

            <form onSubmit={handleSearch} className="ml-auto flex flex-1 max-w-md items-center relative">
              <div className="relative w-full">
                <Input
                  ref={searchInputRef}
                  type="text"
                  placeholder="문서 검색 또는 새 문서 만들기 (s)"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={handleSearchKeyDown}
                  onFocus={() => suggestions.length > 0 && setSuggestionOpen(true)}
                  onBlur={() => setTimeout(() => setSuggestionOpen(false), 150)}
                  className="w-full pr-9 h-9 rounded-sm"
                />
                <button
                  type="submit"
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-[color:var(--wiki-ink-muted)] hover:text-[color:var(--wiki-cyan)]"
                  aria-label="검색"
                >
                  <Search className="w-4 h-4" />
                </button>

                {/* 자동완성 dropdown */}
                {suggestionOpen && suggestions.length > 0 && (
                  <div className="absolute left-0 right-0 top-[calc(100%+4px)] z-50 rounded-sm border border-[color:var(--wiki-rule-strong)] bg-[color:var(--wiki-bg-2)] shadow-lg overflow-hidden">
                    <ul>
                      {suggestions.map((s, i) => (
                        <li key={s.slug}>
                          <button
                            type="button"
                            onMouseDown={(e) => {
                              // onBlur 보다 먼저 발생하게 mousedown 사용
                              e.preventDefault()
                              router.push(`/wiki/${encodeURIComponent(s.title)}`)
                              setSearchQuery('')
                              setSuggestionOpen(false)
                            }}
                            onMouseEnter={() => setHighlightedIdx(i)}
                            className={`w-full text-left px-3 py-2 text-sm transition-colors ${
                              i === highlightedIdx
                                ? 'bg-[color:var(--wiki-accent)]/15 text-[color:var(--wiki-link)]'
                                : 'text-[color:var(--wiki-ink-soft)] hover:bg-[color:var(--wiki-paper-2)]'
                            }`}
                          >
                            {s.title}
                          </button>
                        </li>
                      ))}
                    </ul>
                    <div className="px-3 py-1.5 text-[10px] text-[color:var(--wiki-ink-muted)] bg-[color:var(--wiki-paper-2)] border-t border-[color:var(--wiki-rule)]">
                      <kbd className="px-1 py-0.5 font-mono rounded border border-[color:var(--wiki-rule)]">↑↓</kbd>{' '}
                      이동{' '}
                      <kbd className="ml-2 px-1 py-0.5 font-mono rounded border border-[color:var(--wiki-rule)]">Enter</kbd>{' '}
                      선택{' '}
                      <kbd className="ml-2 px-1 py-0.5 font-mono rounded border border-[color:var(--wiki-rule)]">Esc</kbd>{' '}
                      닫기
                    </div>
                  </div>
                )}
              </div>
            </form>

            <div className="hidden sm:flex items-center gap-2 ml-2">
              <NotificationDropdown />

              {isLoggedIn && isModerator && (
                <button
                  type="button"
                  onClick={() => router.push('/admin')}
                  className="inline-flex items-center gap-1 text-xs text-[color:var(--wiki-warning)] border border-[color:var(--wiki-warning)]/60 rounded-sm px-2 py-1 hover:bg-[color:var(--wiki-warning)]/10 hover:border-[color:var(--wiki-warning)]"
                  title="이랑위키 운영 도구"
                  style={{ fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.06em' }}
                >
                  <Shield className="w-3.5 h-3.5" />
                  MOD
                </button>
              )}

              {isLoggedIn ? (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => router.push('/settings/account')}
                    className="text-xs text-[color:var(--wiki-cyan)] hover:text-[color:var(--wiki-link-hover)]"
                    title="계정 설정 열기"
                  >
                    @{wikiUser?.displayName || wikiUser?.username || '내 계정'}
                  </button>
                  <button
                    type="button"
                    onClick={logout}
                    className="inline-flex items-center text-xs text-[color:var(--wiki-ink-muted)] hover:text-[color:var(--wiki-magenta)]"
                    title="로그아웃"
                  >
                    <LogOut className="w-3.5 h-3.5 mr-1" />
                    로그아웃
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => router.push('/auth/start?callbackUrl=%2Fwiki')}
                  className="inline-flex items-center gap-1 text-xs text-[color:var(--wiki-cyan)] hover:text-[color:var(--wiki-link-hover)]"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  로그인
                </button>
              )}
            </div>
          </div>

          {/* 사이트 셀렉 메뉴 — 랑구팸 본 사이트와 동일한 cross-site nav */}
          <SiteSelectMenu
            isLoggedIn={isLoggedIn}
            displayName={wikiUser?.displayName || wikiUser?.username || null}
            onLogin={() => router.push('/auth/start?callbackUrl=%2Fwiki')}
          />
        </header>

        {/* ── Sidebar + main + right rail ──────────────────────── */}
        <div className="mx-auto max-w-[1280px] grid grid-cols-1 md:grid-cols-[200px_1fr] xl:grid-cols-[200px_minmax(0,1fr)_280px]">
          {/* 모바일 백드롭 (사이드바 열림 시) */}
          {mobileNavOpen && (
            <button
              type="button"
              aria-label="메뉴 닫기"
              className="md:hidden fixed inset-0 z-30 bg-black/55 backdrop-blur-[2px]"
              onClick={() => setMobileNavOpen(false)}
            />
          )}
          <aside
            className={`wiki-sidebar md:block md:min-h-[calc(100vh-48px)] py-4 ${
              mobileNavOpen
                ? 'fixed inset-y-0 left-0 z-40 w-[78%] max-w-[300px] overflow-y-auto shadow-2xl'
                : 'hidden'
            } md:!relative md:!w-auto md:!max-w-none md:!shadow-none md:!inset-auto`}
            aria-label="이랑위키 내비게이션"
          >
            <nav className="flex flex-col">
              <h4>탐색</h4>
              {NAV_LINKS.map(item => (
                <button
                  key={item.key}
                  onClick={() => router.push(item.href)}
                  className={active.activeNav === item.key ? 'is-active' : ''}
                >
                  <item.icon className="w-4 h-4 opacity-70" />
                  <span>{item.label}</span>
                </button>
              ))}
            </nav>

            <nav className="flex flex-col">
              <h4>기여</h4>
              <button
                onClick={() => {
                  if (!isLoggedIn) {
                    router.push('/auth/start?callbackUrl=%2Fwiki')
                    return
                  }
                  router.push('/wiki/search')
                }}
              >
                <Edit className="w-4 h-4 opacity-70" />
                <span>새 문서 만들기</span>
              </button>
              {TOOL_LINKS.map(item => (
                <button key={item.label} onClick={() => router.push(item.href)}>
                  <item.icon className="w-4 h-4 opacity-70" />
                  <span>{item.label}</span>
                </button>
              ))}
              {isLoggedIn && isModerator && (
                <button
                  onClick={() => router.push('/wiki/mod')}
                  className={active.activeNav === 'mod' ? 'is-active' : ''}
                >
                  <Shield className="w-4 h-4 opacity-70" />
                  <span>편집 검수</span>
                </button>
              )}
            </nav>

            <nav className="flex flex-col">
              <h4>도움말</h4>
              {HELP_LINKS.map(item => (
                <button key={item.href} onClick={() => router.push(item.href)}>
                  <HelpCircle className="w-4 h-4 opacity-70" />
                  <span>{item.label}</span>
                </button>
              ))}
            </nav>

            <nav className="flex flex-col">
              <h4>다른 사이트</h4>
              {/* 위키 host(irang.wiki)에서는 router.push 가 same-host 내부 라우팅이라
                  /wiki/* 로 rewrite 되므로, 외부 사이트 링크는 절대 URL 로. */}
              <a
                href="https://rangu-fam.com"
                rel="noopener"
                className="cursor-pointer"
              >
                <Home className="w-4 h-4 opacity-70" />
                <span>{BRANDING.brandSite}</span>
              </a>
              <a
                href="https://rangu-fam.com/university"
                rel="noopener"
                className="cursor-pointer"
              >
                <Folder className="w-4 h-4 opacity-70" />
                <span>랑구대학</span>
              </a>
            </nav>
          </aside>

          {/* ── Main column with fade-swap ───────────────────── */}
          <main className="min-w-0 px-4 sm:px-6 py-6 relative">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={pathname || 'wiki-root'}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.18, ease: 'easeOut' }}
              >
                {children}
              </motion.div>
            </AnimatePresence>
          </main>

          {active.rightRail && (
            <aside className="hidden xl:block py-6 pr-6 space-y-4 min-w-0">
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={`${pathname || 'rail'}-rail`}
                  initial={{ opacity: 0, x: 4 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 4 }}
                  transition={{ duration: 0.18, ease: 'easeOut' }}
                  className="space-y-4"
                >
                  {active.rightRail}
                </motion.div>
              </AnimatePresence>
            </aside>
          )}
        </div>
      </div>

      {/* 단축키 도움말 모달 */}
      {showShortcuts && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-sm px-4"
          onClick={() => setShowShortcuts(false)}
        >
          <div
            className="relative w-full max-w-md overflow-hidden rounded-md border border-[color:var(--wiki-rule-strong)] bg-[color:var(--wiki-bg-2)] shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-[color:var(--wiki-rule)]">
              <h3 className="wiki-serif text-lg font-semibold text-[color:var(--wiki-ink)]">
                키보드 단축키
              </h3>
              <button
                type="button"
                onClick={() => setShowShortcuts(false)}
                className="text-[color:var(--wiki-ink-muted)] hover:text-[color:var(--wiki-ink)]"
                aria-label="닫기"
              >
                ✕
              </button>
            </div>
            <div className="px-4 py-4 text-sm text-[color:var(--wiki-ink-soft)]">
              <p className="text-xs text-[color:var(--wiki-ink-muted)] mb-3">
                입력창에 포커스가 없을 때 동작. 두 글자 단축키는 1.5초 안에 입력하세요.
              </p>
              <ul className="space-y-2">
                {[
                  { keys: ['?'], desc: '이 도움말 열기' },
                  { keys: ['s', '/'], desc: '검색창 포커스' },
                  { keys: ['Esc'], desc: '모달 / 메뉴 닫기' },
                  { keys: ['g', 'h'], desc: '대문 (위키 홈)' },
                  { keys: ['g', 'r'], desc: '최근 변경' },
                  { keys: ['g', 'c'], desc: '분류 목록' },
                  { keys: ['g', 'w'], desc: '내 감시 목록' },
                  { keys: ['g', 'n'], desc: '임의 문서 (random)' },
                  { keys: ['g', 's'], desc: '검색 페이지' },
                ].map(({ keys, desc }) => (
                  <li key={desc} className="flex items-center justify-between gap-3">
                    <span>{desc}</span>
                    <span className="flex gap-1">
                      {keys.map((k) => (
                        <kbd
                          key={k}
                          className="px-2 py-0.5 text-[11px] font-mono rounded border border-[color:var(--wiki-rule-strong)] bg-[color:var(--wiki-bg)] text-[color:var(--wiki-ink)]"
                        >
                          {k}
                        </kbd>
                      ))}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="px-4 py-2.5 border-t border-[color:var(--wiki-rule)] text-[11px] text-[color:var(--wiki-ink-muted)] text-center">
              <kbd className="px-1.5 py-0.5 font-mono rounded border border-[color:var(--wiki-rule)] bg-[color:var(--wiki-bg)]">Esc</kbd>{' '}
              로 닫기
            </div>
          </div>
        </div>
      )}
    </WikiShellLayoutContext.Provider>
  )
}

/**
 * HUD-style page header: signal badge, title, hatnote, status meta, tabs.
 */
export function WikiPageHeader({
  title,
  subtitle,
  hatnote,
  meta,
  tabs,
  activeTab,
  onTabChange,
  actions
}: WikiPageHeaderProps) {
  return (
    <div className="mb-5">
      <div className="flex items-center gap-2 mb-3">
        <span className="wiki-pulse-dot" aria-hidden />
        <span
          className="wiki-label"
          style={{ fontFamily: "'JetBrains Mono', monospace" }}
        >
          / Iranggi · DOC
        </span>
        <span className="h-px flex-1 bg-gradient-to-r from-[color:var(--wiki-cyan)]/40 via-[color:var(--wiki-violet)]/30 to-transparent" />
      </div>

      <div className="flex items-end gap-3 flex-wrap">
        <h1 className="wiki-h1 grow basis-[280px]">{title}</h1>
        {actions && <div className="ml-auto flex items-center gap-2 pb-1 flex-wrap">{actions}</div>}
      </div>

      {subtitle && (
        <p className="mt-2 text-sm text-[color:var(--wiki-ink-soft)] leading-relaxed">{subtitle}</p>
      )}

      {hatnote && <div className="wiki-hatnote">{hatnote}</div>}

      {meta && meta.length > 0 && (
        <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1.5 text-xs">
          {meta.map((m, idx) => (
            <span
              key={idx}
              className="inline-flex items-center gap-1.5 rounded-sm border border-[color:var(--wiki-rule)] bg-[color:var(--wiki-panel-strong)] px-2 py-0.5 text-[color:var(--wiki-ink-soft)]"
              style={{ fontFamily: "'JetBrains Mono', monospace" }}
            >
              {m.icon && <m.icon className="w-3 h-3 text-[color:var(--wiki-cyan)]" />}
              <span className="text-[10px] uppercase tracking-[0.14em] text-[color:var(--wiki-ink-faint)]">
                {m.label}
              </span>
              <span className="text-[color:var(--wiki-ink)]">{m.value}</span>
            </span>
          ))}
        </div>
      )}

      {tabs && tabs.length > 0 && (
        <div className="wiki-tabs mt-5">
          {tabs.map(tab => (
            <button
              key={tab.key}
              type="button"
              onClick={() => onTabChange?.(tab.key)}
              className={`wiki-tab ${activeTab === tab.key ? 'is-active' : ''}`}
            >
              {tab.icon && <tab.icon className="w-3.5 h-3.5" />}
              {tab.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

/* ────────────────────────────────────────────────────────────
 * SiteSelectMenu — 이랑위키 내부 셀렉 메뉴.
 * 위키 토프바 바로 아래 두 번째 줄에 노출. 라벨 6개(홈/소개/멤버/이랑위키/카드/로그인)
 * 는 랑구팸 본 사이트와 동일하지만, 각 링크는 위키 내부 경로를 가리킵니다.
 * - 현재 pathname을 기준으로 active 항목 자동 강조
 * - "이랑위키" 항목은 미러 드롭다운(rangu-fam.com/wiki + irang.wiki) 보유
 * - 모바일에서는 가로 스크롤되는 슬림 바
 * ────────────────────────────────────────────────────────────*/
function SiteSelectMenu({
  isLoggedIn,
  displayName,
  onLogin
}: {
  isLoggedIn: boolean
  displayName: string | null
  onLogin: () => void
}) {
  const router = useRouter()
  const pathname = usePathname() || ''
  const [mirrorsOpen, setMirrorsOpen] = useState(false)

  const matchActive = useCallback(
    (item: SiteMenuItem) =>
      Array.isArray(item.matchPaths) && item.matchPaths.some(re => re.test(pathname)),
    [pathname]
  )

  // 위키 내부 어디에 있는지에 따라 active 결정. 매칭 없으면 기본 "홈".
  const explicitActive = SITE_MENU_ITEMS.find(matchActive)?.key
  const fallbackActive: SiteMenuItem['key'] = pathname.startsWith('/wiki') ? 'home' : 'home'
  const activeKey = explicitActive ?? fallbackActive

  const handleInternal = (e: React.MouseEvent, href: string) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return
    e.preventDefault()
    router.push(href)
  }

  return (
    <nav className="wiki-sitemenu" aria-label="이랑위키 사이트 내비게이션">
      <div className="mx-auto max-w-[1280px] px-4 sm:px-6 flex items-center gap-0.5 sm:gap-1 overflow-x-auto whitespace-nowrap">
        {SITE_MENU_ITEMS.map(item => {
          const isCurrent = item.key === activeKey
          const Icon = item.icon
          if (item.key === 'wiki') {
            return (
              <div key={item.key} className="relative">
                <button
                  type="button"
                  onClick={() => setMirrorsOpen(v => !v)}
                  onBlur={() => setTimeout(() => setMirrorsOpen(false), 180)}
                  aria-current={isCurrent ? 'page' : undefined}
                  aria-haspopup="menu"
                  aria-expanded={mirrorsOpen}
                  title={item.subtitle}
                  className={`wiki-sitemenu__item ${isCurrent ? 'is-current' : ''}`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{item.label}</span>
                  <span className="wiki-sitemenu__sub">{item.subtitle}</span>
                  <span className="wiki-sitemenu__caret" aria-hidden>▾</span>
                </button>
                {mirrorsOpen && item.mirrors && (
                  <div role="menu" className="wiki-sitemenu__dropdown">
                    <button
                      type="button"
                      onMouseDown={(e) => { e.preventDefault(); router.push(item.href) }}
                      className="wiki-sitemenu__mirror"
                    >
                      <BookOpen className="w-3 h-3 text-[color:var(--wiki-cyan)]" />
                      <span>위키 메타 문서로 이동</span>
                    </button>
                    {item.mirrors.map(m => (
                      <a
                        key={m.href}
                        role="menuitem"
                        href={m.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="wiki-sitemenu__mirror"
                      >
                        <ExternalLink className="w-3 h-3 text-[color:var(--wiki-ink-muted)]" />
                        <span>{m.label}</span>
                      </a>
                    ))}
                    <p className="wiki-sitemenu__mirror-note">
                      두 도메인은 동일한 이랑위키를 가리킵니다.
                    </p>
                  </div>
                )}
              </div>
            )
          }
          return (
            <a
              key={item.key}
              href={item.href}
              target={item.external ? '_blank' : undefined}
              rel={item.external ? 'noopener noreferrer' : undefined}
              onClick={item.external ? undefined : (e) => handleInternal(e, item.href)}
              aria-current={isCurrent ? 'page' : undefined}
              title={item.subtitle}
              className={`wiki-sitemenu__item ${isCurrent ? 'is-current' : ''}`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{item.label}</span>
              <span className="wiki-sitemenu__sub">{item.subtitle}</span>
              {item.external && <ExternalLink className="w-3 h-3 opacity-50" />}
            </a>
          )
        })}

        {/* 우측: 로그인 / 사용자 표시 */}
        <span className="ml-auto" />
        {isLoggedIn ? (
          <span className="wiki-sitemenu__item is-passive" aria-disabled title="현재 로그인된 위키 계정">
            <span className="wiki-pulse-dot" aria-hidden />
            <span className="text-[color:var(--wiki-cyan)]">@{displayName || '내 계정'}</span>
          </span>
        ) : (
          <>
            <button
              type="button"
              onClick={onLogin}
              className="wiki-sitemenu__item"
              title={SITE_MENU_LOGIN.subtitle}
            >
              <SITE_MENU_LOGIN.icon className="w-3.5 h-3.5" />
              <span>{SITE_MENU_LOGIN.label}</span>
              <span className="wiki-sitemenu__sub">{SITE_MENU_LOGIN.subtitle}</span>
            </button>
            <a
              href="https://accounts.doublej.app/signup"
              target="_blank"
              rel="noopener noreferrer"
              className="wiki-sitemenu__item wiki-sitemenu__item--accent"
              title="DoubleJ 통합 회원가입"
            >
              <span>회원가입</span>
              <ExternalLink className="w-3 h-3 opacity-70" />
            </a>
          </>
        )}
        <a
          href={SITE_MENU_TERMS.href}
          target="_blank"
          rel="noopener noreferrer"
          className="wiki-sitemenu__item wiki-sitemenu__item--muted"
          title={SITE_MENU_TERMS.subtitle}
        >
          <SITE_MENU_TERMS.icon className="w-3.5 h-3.5" />
          <span>{SITE_MENU_TERMS.label}</span>
          <ExternalLink className="w-3 h-3 opacity-50" />
        </a>
      </div>
    </nav>
  )
}
