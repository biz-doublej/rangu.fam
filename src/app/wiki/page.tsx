
'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { motion } from 'framer-motion'
import { useRouter } from 'next/navigation'
import {
  Search,
  LogIn,
  LogOut,
  Edit,
  Clock,
  TrendingUp,
  BookOpen,
  Star,
  MessageCircle,
  ArrowRight,
  HelpCircle,
  Bell,
  ChevronRight,
  ExternalLink,
  Users,
  FileText,
  Zap,
  Shield,
  Sparkles,
  Activity,
  Compass,
  Target,
  Layers,
  CalendarClock,
  Lock,
  Eye
} from 'lucide-react'
import dynamic from 'next/dynamic'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { BRANDING } from '@/config/branding'
import { useWikiAuth } from '@/contexts/WikiAuthContext'

const IconButtonSkeleton = () => (
  <div className="h-9 w-9 rounded-md border border-gray-700/70 bg-gray-700/40 animate-pulse" />
)

const ThemeMenu = dynamic(() => import('@/components/ui/ThemeMenu'), {
  ssr: false,
  loading: () => <IconButtonSkeleton />
})

const NotificationDropdown = dynamic(
  () => import('@/components/ui/NotificationDropdown').then(mod => mod.NotificationDropdown),
  {
    ssr: false,
    loading: () => <IconButtonSkeleton />
  }
)

const iconLibrary = {
  FileText,
  HelpCircle,
  MessageCircle,
  Lock,
  Compass,
  Layers,
  Shield,
  Target,
  Zap,
  Users,
  Bell,
  CalendarClock,
  Sparkles,
  Activity,
  Eye,
  Star,
  BookOpen
}

const resolveIcon = (name?: string) => {
  if (!name) return Sparkles
  return iconLibrary[name as keyof typeof iconLibrary] || Sparkles
}

type PortalLink = {
  label: string
  href: string
  action?: () => void
}

type InsightCard = {
  label: string
  value: string
  description: string
  icon: React.ElementType
}

type DashboardStats = {
  totalPages: number
  totalUsers: number
  pageViews: number
  lastEditor: string | null
  lastEditDate: string | null
  activeContributors: number
  projectCount: number
  helpCount: number
}

type DashboardQuickAction = {
  title: string
  description: string
  href: string
  icon?: string
}

type DashboardPortal = {
  title: string
  description: string
  icon?: string
  accent: string
  chips: string[]
  links: PortalLink[]
}

type DashboardProject = {
  title: string
  description: string
  slug: string
  status: string
  progress: number
  color: string
  views: number
  tags: string[]
  lastEdited?: string
  icon?: string
}

type DashboardCommunitySignal = {
  title: string
  detail: string
  status: string
  href: string
  updatedAt: string
}

type DashboardSupportLink = {
  title: string
  description: string
  href: string
}

type CategoryOverview = {
  name: string
  count: number
  sample: Array<{ title: string; slug: string; summary?: string }>
}

type DashboardPayload = {
  stats: DashboardStats
  quickActions: DashboardQuickAction[]
  portals: DashboardPortal[]
  projects: DashboardProject[]
  communitySignals: DashboardCommunitySignal[]
  supportLinks: DashboardSupportLink[]
}

export default function WikiMainPage() {
  const router = useRouter()
  const { wikiUser, isLoggedIn, logout, isModerator } = useWikiAuth()
  const [searchQuery, setSearchQuery] = useState('')
  const [mainPageData, setMainPageData] = useState<{
    lastEditDate: string
    lastEditor: string
    views: number
  } | null>(null)
  const [viewportSize, setViewportSize] = useState<'mobile' | 'tablet' | 'desktop'>('desktop')
  const [dashboardData, setDashboardData] = useState<DashboardPayload | null>(null)
  const [dashboardLoading, setDashboardLoading] = useState(true)
  const [dashboardError, setDashboardError] = useState<string | null>(null)

  interface TrendingItem { title: string; slug: string; views: number }
  const [realtimeSearch, setRealtimeSearch] = useState<TrendingItem[]>([])
  useEffect(() => {
    fetch('/api/wiki/trending?limit=10')
      .then(res => res.json())
      .then(data => {
        if (data.success && data.trending) setRealtimeSearch(data.trending)
      })
      .catch(() => setRealtimeSearch([]))
  }, [])

  interface RecentChange {
    title: string
    slug: string
    namespace?: string
    revision: {
      author?: string
      timestamp?: number
      editType?: string
    }
  }
  const [recentChanges, setRecentChanges] = useState<RecentChange[]>([])
  useEffect(() => {
    fetch('/api/wiki/recent?limit=6')
      .then(res => res.json())
      .then(data => {
        if (data.success && data.changes) setRecentChanges(data.changes)
      })
      .catch(() => setRecentChanges([]))
  }, [])

  const [categoryOverview, setCategoryOverview] = useState<CategoryOverview[]>([])
  const [categoryLoading, setCategoryLoading] = useState(true)
  useEffect(() => {
    let isMounted = true
    setCategoryLoading(true)
    fetch('/api/wiki/categories?summary=1&limit=18')
      .then(res => res.json())
      .then(data => {
        if (!isMounted) return
        if (data.success && Array.isArray(data.categories)) {
          setCategoryOverview(data.categories)
        } else {
          setCategoryOverview([])
        }
      })
      .catch(() => {
        if (isMounted) setCategoryOverview([])
      })
      .finally(() => {
        if (isMounted) setCategoryLoading(false)
      })
    return () => {
      isMounted = false
    }
  }, [])

  type NewsItem = { title: string; url: string }
  const [news, setNews] = useState<NewsItem[]>([])
  useEffect(() => {
    fetch('/api/news')
      .then(res => res.json())
      .then(data => {
        if (data.news) setNews(data.news)
      })
      .catch(() => setNews([]))
  }, [])

  useEffect(() => {
    let mounted = true
    const loadDashboard = async () => {
      try {
        setDashboardLoading(true)
        setDashboardError(null)
        const response = await fetch('/api/wiki/dashboard', { cache: 'no-store' })
        if (!response.ok) {
          throw new Error('대시보드 정보를 불러오지 못했습니다.')
        }
        const payload = await response.json()
        if (mounted) {
          setDashboardData(payload.data)
        }
      } catch (error) {
        if (mounted) {
          setDashboardError(error instanceof Error ? error.message : '위키 데이터 로딩 실패')
        }
      } finally {
        if (mounted) {
          setDashboardLoading(false)
        }
      }
    }

    loadDashboard()
    return () => {
      mounted = false
    }
  }, [])

  useEffect(() => {
    const fetchLatestEditData = async () => {
      try {
        const response = await fetch('/api/wiki/latest-edit')
        const data = await response.json()

        if (data.success && data.latestEdit) {
          setMainPageData({
            lastEditDate: data.latestEdit.lastEditDate,
            lastEditor: data.latestEdit.lastEditor,
            views: data.latestEdit.views || 20000
          })
        }
      } catch (error) {
        console.error('Failed to fetch latest edit data:', error)
      }
    }

    fetchLatestEditData()
  }, [])

  useEffect(() => {
    const detectViewport = () => {
      if (typeof window === 'undefined') return
      const width = window.innerWidth
      if (width < 640) {
        setViewportSize('mobile')
      } else if (width < 1024) {
        setViewportSize('tablet')
      } else {
        setViewportSize('desktop')
      }
    }

    detectViewport()
    window.addEventListener('resize', detectViewport)
    return () => window.removeEventListener('resize', detectViewport)
  }, [])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      router.push(`/wiki/search?q=${encodeURIComponent(searchQuery)}`)
    }
  }

  const handleCategoryNavigate = (categoryName: string) => {
    router.push(`/wiki/category/${encodeURIComponent(categoryName)}`)
  }

  const goToRandomPage = () => {
    const randomPages = ['RANGU.FAM', 'Next.js', 'React', 'TypeScript']
    const randomPage = randomPages[Math.floor(Math.random() * randomPages.length)]
    router.push(`/wiki/${encodeURIComponent(randomPage)}`)
  }

  const responsiveLayout = useMemo(() => {
    switch (viewportSize) {
      case 'mobile':
        return {
          containerWidth: 'max-w-full',
          horizontalPadding: 'px-4',
          sectionPadding: 'py-4',
          gridGap: 'gap-4',
          panelPadding: 'p-4',
          heroPadding: 'p-6',
          primaryStack: 'space-y-4',
          sidebarStack: 'space-y-4',
          sidebarPanelPadding: 'p-4'
        }
      case 'tablet':
        return {
          containerWidth: 'max-w-5xl',
          horizontalPadding: 'px-6',
          sectionPadding: 'py-5',
          gridGap: 'gap-5',
          panelPadding: 'p-5',
          heroPadding: 'p-7',
          primaryStack: 'space-y-5',
          sidebarStack: 'space-y-5',
          sidebarPanelPadding: 'p-4'
        }
      default:
        return {
          containerWidth: 'max-w-7xl',
          horizontalPadding: 'px-8',
          sectionPadding: 'py-6',
          gridGap: 'gap-6',
          panelPadding: 'p-6',
          heroPadding: 'p-8',
          primaryStack: 'space-y-6',
          sidebarStack: 'space-y-6',
          sidebarPanelPadding: 'p-5'
        }
    }
  }, [viewportSize])

  const handleEditMainPage = () => {
    if (!isLoggedIn) {
      router.push('/wiki/login')
      return
    }

    if (!isModerator) {
      alert('이랑위키:대문은 관리자만 편집할 수 있습니다.')
      return
    }

    router.push('/wiki/이랑위키:대문')
  }

  const resolvedStats = dashboardData?.stats || null
  const pageViews = resolvedStats?.pageViews ?? mainPageData?.views ?? 20000
  const lastEditor = resolvedStats?.lastEditor || mainPageData?.lastEditor || '공동 편집자'
  const lastEditDisplay = resolvedStats?.lastEditDate
    ? new Date(resolvedStats.lastEditDate)
        .toLocaleString('ko-KR', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false
        })
        .replace(/\. /g, '.')
        .replace(/\.$/, '')
    : mainPageData
      ? new Date(mainPageData.lastEditDate)
          .toLocaleString('ko-KR', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false
          })
          .replace(/\. /g, '.')
          .replace(/\.$/, '')
      : '방금 전 동기화'

  const heroStats: InsightCard[] = useMemo(() => {
    if (!resolvedStats) {
      return [
        { label: '누적 문서', value: '-', description: '데이터 동기화 중', icon: BookOpen },
        { label: '활성 기여자', value: '-', description: '로딩 중', icon: Users },
        { label: '최근 편집자', value: lastEditor, description: lastEditDisplay, icon: Activity },
        { label: '메인 페이지 조회', value: `${(pageViews / 1000).toFixed(1)}K`, description: '기본값', icon: Star }
      ]
    }

    return [
      {
        label: '누적 문서',
        value: `${resolvedStats.totalPages.toLocaleString()}개`,
        description: `${resolvedStats.projectCount.toLocaleString()}개의 프로젝트`,
        icon: BookOpen
      },
      {
        label: '활성 기여자',
        value: `${resolvedStats.activeContributors.toLocaleString()}명`,
        description: '최근 24시간 내 활동',
        icon: Users
      },
      {
        label: '최근 편집자',
        value: lastEditor,
        description: lastEditDisplay,
        icon: Activity
      },
      {
        label: '메인 페이지 조회',
        value: `${(pageViews / 1000).toFixed(1)}K`,
        description: '실시간 집계',
        icon: Star
      }
    ]
  }, [resolvedStats, lastEditor, lastEditDisplay, pageViews])

  const quickActions = useMemo(() => {
    if (!dashboardData?.quickActions) return []
    if (viewportSize === 'mobile') return dashboardData.quickActions.slice(0, 2)
    if (viewportSize === 'tablet') return dashboardData.quickActions.slice(0, 3)
    return dashboardData.quickActions
  }, [dashboardData, viewportSize])

  const portalCards = dashboardData?.portals ?? []
  const projectCampaigns = dashboardData?.projects ?? []
  const supportLinks = dashboardData?.supportLinks ?? []

  const insightCards: InsightCard[] = useMemo(() => {
    if (!resolvedStats) {
      return [
        { label: '메인 조회수', value: `${(pageViews / 1000).toFixed(1)}K`, description: '기본값', icon: Eye },
        { label: '활성 토론', value: '-', description: '집계 중', icon: Activity },
        { label: '도움말 열람', value: '-', description: '집계 중', icon: Bell }
      ]
    }

    const activeSessions = Math.max(1, Math.round(resolvedStats.activeContributors / 4))
    return [
      {
        label: '메인 조회수',
        value: `${resolvedStats.pageViews.toLocaleString()}회`,
        description: '오늘의 방문',
        icon: Eye
      },
      {
        label: '동시 편집 세션',
        value: `${activeSessions}건`,
        description: '잠금 모니터링',
        icon: Activity
      },
      {
        label: '도움말 열람',
        value: `${resolvedStats.helpCount.toLocaleString()}건`,
        description: '가이드 허브',
        icon: Bell
      }
    ]
  }, [resolvedStats, pageViews])

  const newsFeed = news.length
    ? news
    : [
        { title: '새로운 문서 동시 편집 잠금 기능이 적용되었습니다.', url: '/wiki/도움말' },
        { title: '이달의 프로젝트 스프린트 참가 신청이 열렸습니다.', url: '/wiki/프로젝트:목록' },
        { title: '위키 검색 인덱스가 새로 고침되었습니다.', url: '/wiki/이랑위키:공지' }
      ]
  return (
    <div className="min-h-screen theme-surface text-gray-100" suppressHydrationWarning>
      <header className="border-b border-gray-800 bg-gray-950/80 backdrop-blur supports-[backdrop-filter]:bg-gray-950/70 sticky top-0 z-30">
        <div className={`${responsiveLayout.containerWidth} mx-auto ${responsiveLayout.horizontalPadding} py-3`}>
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center space-x-6">
              <button
                onClick={() => router.push('/')}
                className="flex items-center space-x-2 text-green-300 hover:text-green-200 transition-colors"
              >
                <BookOpen className="w-5 h-5" />
                <span className="font-bold text-lg">{BRANDING.brandWiki}</span>
                <span className="inline-flex items-center text-xs font-semibold rounded-full bg-green-500/20 px-2 py-0.5 text-green-200">
                  LIVE
                </span>
              </button>

              <nav className="hidden md:flex items-center space-x-3 text-sm text-gray-300">
                <button
                  onClick={() => router.push('/wiki')}
                  className="px-3 py-1 rounded-full bg-gray-800/80 border border-gray-700 text-white"
                >
                  대문
                </button>
                <button onClick={() => router.push('/wiki/recent')} className="px-3 py-1 rounded-full hover:bg-gray-800/60">
                  최근 변경
                </button>
                <button onClick={() => router.push('/wiki/프로젝트:목록')} className="px-3 py-1 rounded-full hover:bg-gray-800/60">
                  프로젝트
                </button>
                <button onClick={goToRandomPage} className="px-3 py-1 rounded-full hover:bg-gray-800/60">
                  임의 문서
                </button>
              </nav>
            </div>

            <div className="flex items-center space-x-3">
              <form onSubmit={handleSearch} className="relative hidden lg:block">
                <Input
                  type="text"
                  placeholder="문서 검색 또는 새 문서 만들기"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-72 bg-gray-900/60 border-gray-700 text-gray-100 placeholder-gray-500 pr-10"
                />
                <button
                  type="submit"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-200"
                >
                  <Search className="w-4 h-4" />
                </button>
              </form>

              <NotificationDropdown />

              {isLoggedIn && isModerator && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => router.push('/admin')}
                  className="flex items-center space-x-1 text-yellow-300 hover:text-yellow-200 border border-yellow-400/70 hover:border-yellow-300 h-8 px-3"
                  title="이랑위키 운영 도구"
                >
                  <Shield className="w-4 h-4" />
                  <span className="hidden sm:block">운영</span>
                </Button>
              )}

              <ThemeMenu />

              {isLoggedIn ? (
                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => router.push('/settings/account')}
                    className="text-sm text-gray-300 hidden sm:inline hover:text-white focus:outline-none"
                    title="계정 설정 열기"
                  >
                    {wikiUser?.displayName || wikiUser?.username}
                  </button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={logout}
                    className="text-gray-400 hover:text-gray-200 h-8 px-2"
                    title="�α׾ƿ�"
                  >
                    <LogOut className="w-4 h-4" />
                  </Button>
                </div>
              ) : (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => router.push('/wiki/login')}
                  className="text-gray-300 hover:text-white h-8"
                >
                  <LogIn className="w-4 h-4 mr-1" />
                  로그인
                </Button>
              )}
            </div>
          </div>

          <div className="mt-4 flex flex-col gap-3 border-t border-gray-800 pt-3 text-sm text-gray-400 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center space-x-2">
              <Sparkles className="w-4 h-4 text-amber-300" />
              <span>이랑위키:대문</span>
              <span className="text-gray-500">•</span>
              <span>마지막 편집 {lastEditDisplay}</span>
              <span className="text-gray-500">•</span>
              <span>{lastEditor}</span>
              {isLoggedIn && (
                <button
                  onClick={handleEditMainPage}
                  className="ml-3 inline-flex items-center text-blue-300 hover:text-blue-200"
                >
                  <Edit className="w-3.5 h-3.5 mr-1" />
                  대문 편집
                </button>
              )}
            </div>
            <div className="flex items-center space-x-4 text-gray-400">
              <div className="flex items-center space-x-1">
                <Star className="w-4 h-4 text-yellow-300" />
                <span>{(pageViews / 1000).toFixed(1)}K 뷰</span>
              </div>
              <div className="flex items-center space-x-1">
                <Users className="w-4 h-4 text-emerald-300" />
                <span>기여자 {heroStats[1].value}</span>
              </div>
            </div>
          </div>
        </div>
      </header>
      <main className={`${responsiveLayout.containerWidth} mx-auto ${responsiveLayout.horizontalPadding} py-10 space-y-10`}>
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="relative overflow-hidden rounded-3xl border border-gray-800 bg-gradient-to-br from-[#111b2d] via-[#101629] to-[#090b12] p-8"
        >
          <div className="grid gap-8 lg:grid-cols-2">
            <div>
              <p className="inline-flex items-center text-xs uppercase tracking-[0.3em] text-sky-300">
                <Sparkles className="w-3 h-3 mr-2" />
                이랑위키 v4.0.0
              </p>
              <h1 className="mt-3 text-3xl font-bold text-white md:text-4xl">
                모두가 만드는 지식 아카이브, 실시간으로 진화 중입니다.
              </h1>
              <p className="mt-4 text-lg text-gray-300">
                새 문서를 제안하고, 프로젝트에 참여하고, 빠르게 검수 요청을 남기세요. 이제 대문에서
                주요 작업 흐름을 한눈에 확인할 수 있습니다.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Button
                  onClick={() => router.push('/wiki/search')}
                  className="bg-blue-500 hover:bg-blue-400 text-white px-6 py-2 flex items-center"
                >
                  문서 찾아보기
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => router.push('/wiki/recent')}
                  className="border-gray-600 text-gray-200 hover:bg-gray-800 px-6 py-2"
                >
                  실시간 변경
                </Button>
              </div>
              <div className="mt-8 grid gap-4 sm:grid-cols-2">
                {heroStats.map((stat) => (
                  <div key={stat.label} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <div className="flex items-center justify-between text-gray-400 text-xs font-medium uppercase tracking-wide">
                      <span>{stat.label}</span>
                      <stat.icon className="w-4 h-4 text-gray-300" />
                    </div>
                    <div className="mt-2 text-2xl font-semibold text-white">{stat.value}</div>
                    <p className="mt-1 text-sm text-gray-400">{stat.description}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl bg-gray-900/70 border border-gray-800 p-6 backdrop-blur">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <p className="text-sm text-gray-400">크리에이터 도구</p>
                  <h3 className="text-xl font-semibold text-white">오늘의 작업 시작하기</h3>
                </div>
                <div className="text-sm text-gray-500">새 요청 4건</div>
              </div>
              <div className="space-y-4">
                {dashboardLoading && quickActions.length === 0
                  ? Array.from({ length: 2 }).map((_, index) => (
                      <div
                        key={`quick-action-skeleton-${index}`}
                        className="w-full rounded-xl border border-gray-800 bg-gray-900/40 p-4 animate-pulse h-20"
                      />
                    ))
                  : quickActions.map((action) => {
                      const ActionIcon = resolveIcon(action.icon)
                      return (
                        <button
                          key={action.title}
                          onClick={() => router.push(action.href)}
                          className="w-full rounded-xl border border-gray-800 bg-gray-900/40 p-4 text-left hover:border-gray-600 hover:bg-gray-900/80 transition-colors"
                        >
                          <div className="flex items-start space-x-3">
                            <div className="rounded-lg bg-gray-800 p-2">
                              <ActionIcon className="w-4 h-4 text-blue-300" />
                            </div>
                            <div>
                              <p className="text-sm font-semibold text-white">{action.title}</p>
                              <p className="text-sm text-gray-400">{action.description}</p>
                            </div>
                            <ChevronRight className="w-4 h-4 text-gray-500 ml-auto" />
                          </div>
                        </button>
                      )
                    })}
                {!dashboardLoading && quickActions.length === 0 && !dashboardError && (
                  <p className="text-sm text-gray-500">표시할 추천 작업이 없습니다.</p>
                )}
                {dashboardError && (
                  <p className="text-xs text-red-300">실시간 데이터를 불러오지 못했습니다: {dashboardError}</p>
                )}
              </div>
            </div>
          </div>
          <div className="pointer-events-none absolute inset-0 rounded-3xl border border-white/5"></div>
        </motion.section>
        <section className="space-y-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.2em] text-gray-400">portal</p>
              <h2 className="text-2xl font-semibold text-white">이랑위키 허브</h2>
              <p className="text-gray-400 text-sm">주요 기능과 안내서를 단일 허브에 모았습니다.</p>
            </div>
          </div>
          <div className="grid gap-6 md:grid-cols-2">
            {dashboardLoading && portalCards.length === 0
              ? Array.from({ length: 2 }).map((_, index) => (
                  <div key={`portal-skeleton-${index}`} className="rounded-2xl border border-gray-800 bg-gray-900/70 p-6 animate-pulse h-48" />
                ))
              : portalCards.map((portal) => {
                  const PortalIcon = resolveIcon(portal.icon)
                  return (
                    <motion.div
                      key={portal.title}
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.5 }}
                      className="relative overflow-hidden rounded-2xl border border-gray-800 bg-gray-900/70 p-6"
                    >
                      <div className={`absolute inset-0 opacity-40 bg-gradient-to-br ${portal.accent}`} />
                      <div className="relative">
                        <div className="flex items-center space-x-3 mb-4">
                          <div className="rounded-xl bg-gray-900/80 p-3">
                            <PortalIcon className="w-5 h-5 text-white" />
                          </div>
                          <div>
                            <h3 className="text-lg font-semibold text-white">{portal.title}</h3>
                            <p className="text-sm text-gray-300">{portal.description}</p>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-2 mb-4">
                          {portal.chips.map((chip) => (
                            <span key={chip} className="text-xs rounded-full bg-black/30 border border-white/10 px-2 py-0.5 text-gray-100">
                              {chip}
                            </span>
                          ))}
                        </div>
                        <div className="flex flex-wrap gap-3">
                          {portal.links.map((link) => (
                            <button
                              key={link.label}
                              onClick={() => {
                                if (link.action) link.action()
                                else router.push(link.href)
                              }}
                              className="inline-flex items-center text-sm font-medium text-white hover:text-blue-200"
                            >
                              {link.label}
                              <ChevronRight className="w-4 h-4 ml-1" />
                            </button>
                          ))}
                        </div>
                      </div>
                    </motion.div>
                  )
                })}
            {!dashboardLoading && portalCards.length === 0 && (
              <p className="text-sm text-gray-500">표시할 포털 정보가 없습니다.</p>
            )}
          </div>
        </section>
        <section className="space-y-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.2em] text-gray-400">live pulse</p>
              <h2 className="text-2xl font-semibold text-white">실시간 활동</h2>
              <p className="text-gray-400 text-sm">트렌드와 최신 편집 내역을 한눈에 확인하세요.</p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push('/wiki/recent')}
                className="text-gray-300 hover:text-white"
              >
                전체 변경 기록
                <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="rounded-2xl border border-gray-800 bg-gray-900/60 p-6"
            >
              <div className="flex items-center space-x-2 mb-4">
                <TrendingUp className="w-4 h-4 text-red-400" />
                <h3 className="text-lg font-semibold text-white">실시간 검색어</h3>
              </div>
              <div className="space-y-3 text-sm">
                {realtimeSearch.length === 0 ? (
                  <p className="text-gray-500 text-sm">아직 데이터가 수집되는 중입니다.</p>
                ) : (
                  realtimeSearch.map((item, index) => (
                    <button
                      key={item.slug || item.title}
                      onClick={() => router.push(`/wiki/${encodeURIComponent(item.slug || item.title)}`)}
                      className="flex items-center justify-between w-full rounded-lg bg-gray-800/60 px-3 py-2 text-left hover:bg-gray-800"
                    >
                      <div className="flex items-center space-x-3">
                        <span className={`text-xs font-semibold w-5 text-center rounded-full ${index < 3 ? 'bg-red-500 text-white' : 'bg-gray-700 text-gray-200'}`}>
                          {index + 1}
                        </span>
                        <div>
                          <p className="text-white">{item.title}</p>
                          <p className="text-xs text-gray-400">{item.views.toLocaleString()}회</p>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-gray-400" />
                    </button>
                  ))
                )}
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="rounded-2xl border border-gray-800 bg-gray-900/60 p-6 lg:col-span-2"
            >
              <div className="flex items-center space-x-2 mb-4">
                <Clock className="w-4 h-4 text-blue-400" />
                <h3 className="text-lg font-semibold text-white">최근 편집 타임라인</h3>
              </div>
              <div className="space-y-4">
                {recentChanges.length === 0 ? (
                  <p className="text-sm text-gray-500">최근 편집 내역이 없습니다.</p>
                ) : (
                  recentChanges.map((change, index) => (
                    <div key={`${change.slug}-${index}`} className="rounded-xl border border-gray-800/60 bg-gray-900/40 p-4">
                      <div className="flex items-center justify-between">
                        <button
                          onClick={() => router.push(`/wiki/${encodeURIComponent(change.slug || change.title)}`)}
                          className="text-white font-semibold hover:text-blue-300"
                        >
                          {change.title}
                        </button>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-200">
                          {change.revision.editType || '편집'}
                        </span>
                      </div>
                      <div className="mt-1 text-xs text-gray-400 flex items-center justify-between">
                        <span>{change.revision.author || '익명'}</span>
                        {change.revision.timestamp && (
                          <span>{new Date(change.revision.timestamp).toLocaleString('ko-KR', { hour12: false })}</span>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="rounded-2xl border border-gray-800 bg-gray-900/60 p-6"
            >
              <div className="flex items-center space-x-2 mb-4">
                <Bell className="w-4 h-4 text-yellow-400" />
                <h3 className="text-lg font-semibold text-white">공지 & 소식</h3>
              </div>
              <div className="space-y-3">
                {newsFeed.map((item) => (
                  <a
                    key={item.title}
                    href={item.url}
                    target={item.url.startsWith('http') ? '_blank' : '_self'}
                    rel="noopener noreferrer"
                    className="flex items-start justify-between rounded-xl border border-gray-800/50 bg-gray-900/40 px-4 py-3 hover:border-gray-600"
                  >
                    <div>
                      <p className="text-white text-sm font-semibold">{item.title}</p>
                      <p className="text-xs text-gray-400">운영팀</p>
                    </div>
                    <ExternalLink className="w-4 h-4 text-gray-500" />
                  </a>
                ))}
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="rounded-2xl border border-gray-800 bg-gray-900/60 p-6"
            >
              <div className="flex items-center space-x-2 mb-4">
                <Star className="w-4 h-4 text-emerald-300" />
                <h3 className="text-lg font-semibold text-white">운영 인사이트</h3>
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                {insightCards.map((card) => (
                  <div key={card.label} className="rounded-2xl border border-gray-800 bg-gray-900/50 p-4">
                    <card.icon className="w-4 h-4 text-gray-300" />
                    <div className="mt-2 text-xl font-semibold text-white">{card.value}</div>
                    <p className="text-xs text-gray-400">{card.label}</p>
                    <p className="text-xs text-gray-500">{card.description}</p>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        </section>
        <section className="space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.2em] text-gray-400">projects</p>
              <h2 className="text-2xl font-semibold text-white">이랑위키 프로젝트 보드</h2>
            </div>
            <Button
              variant="ghost"
              onClick={() => router.push('/wiki/프로젝트:목록')}
              className="text-gray-300 hover:text-white"
            >
              전체 보기
              <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {projectCampaigns.length === 0 && dashboardLoading && (
              <div className="col-span-full text-sm text-gray-500">프로젝트 정보를 불러오는 중입니다.</div>
            )}
            {projectCampaigns.map((project) => {
              const ProjectIcon = resolveIcon(project.icon)
              return (
                <motion.button
                  key={project.slug}
                  onClick={() => router.push(`/wiki/${encodeURIComponent(project.slug)}`)}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5 }}
                  className="rounded-2xl border border-gray-800 bg-gray-900/60 p-6 text-left hover:border-gray-600 transition-colors"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="rounded-xl bg-gray-800 p-3">
                      <ProjectIcon className="w-5 h-5 text-white" />
                    </div>
                    <span className="text-xs px-3 py-1 rounded-full bg-white/10 text-white">{project.status}</span>
                  </div>
                  <h3 className="text-lg font-semibold text-white">{project.title}</h3>
                  <p className="text-sm text-gray-400 mt-1">{project.description}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {project.tags.map((tag) => (
                      <span key={tag} className="text-xs rounded-full bg-gray-800 px-2 py-0.5 text-gray-300">
                        {tag}
                      </span>
                    ))}
                  </div>
                  <div className="mt-4">
                    <div className="flex items-center justify-between text-xs text-gray-400 mb-1">
                      <span>진행률</span>
                      <span>{project.progress}%</span>
                    </div>
                    <div className="h-2 rounded-full bg-gray-800 overflow-hidden">
                      <div className={`h-full rounded-full bg-gradient-to-r ${project.color}`} style={{ width: `${project.progress}%` }} />
                    </div>
                  </div>
                </motion.button>
              )
            })}
            {!dashboardLoading && projectCampaigns.length === 0 && (
              <div className="col-span-full text-sm text-gray-500">현재 등록된 프로젝트가 없습니다.</div>
            )}
          </div>
        </section>
        <section className="space-y-6" id="wiki-category-section">
          <div className="flex flex-col gap-2">
            <p className="text-sm uppercase tracking-[0.2em] text-gray-400">categories</p>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-2xl font-semibold text-white">분류 살펴보기</h2>
                <p className="text-gray-400 text-sm">
                  문서를 분류로 묶고 탐색하세요. 분류를 클릭하면 해당 분류의 문서를 한 번에 볼 수 있습니다.
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  className="text-gray-300 hover:text-white"
                  onClick={() => router.push('/wiki/category')}
                >
                  전체 분류 보기
                  <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </div>
          </div>
          <div className="grid gap-6 lg:grid-cols-3">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="rounded-2xl border border-gray-800 bg-gray-900/60 p-6 lg:col-span-2"
            >
              <h3 className="text-lg font-semibold text-white mb-4">대표 분류</h3>
              {categoryLoading && (
                <p className="text-sm text-gray-500">분류 정보를 불러오는 중입니다...</p>
              )}
              {!categoryLoading && categoryOverview.length === 0 && (
                <p className="text-sm text-gray-500">표시할 분류가 아직 없습니다.</p>
              )}
              <div className="grid gap-4 md:grid-cols-2">
                {categoryOverview.slice(0, 10).map((category) => (
                  <div key={category.name} className="rounded-2xl border border-gray-800 bg-gray-900/70 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <button
                          onClick={() => handleCategoryNavigate(category.name)}
                          className="text-left text-white font-semibold hover:text-blue-300"
                        >
                          {category.name}
                        </button>
                        <p className="text-xs text-gray-400">{category.count.toLocaleString()}개의 문서</p>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-gray-300 hover:text-white"
                        onClick={() => handleCategoryNavigate(category.name)}
                      >
                        보기
                        <ArrowRight className="w-4 h-4 ml-1" />
                      </Button>
                    </div>
                    <div className="mt-3 space-y-2">
                      {category.sample.length === 0 ? (
                        <p className="text-xs text-gray-500">대표 문서가 아직 없습니다.</p>
                      ) : (
                        category.sample.map((doc) => (
                          <button
                            key={`${category.name}-${doc.slug}`}
                            onClick={() => router.push(`/wiki/${encodeURIComponent(doc.slug || doc.title)}`)}
                            className="w-full rounded-lg border border-gray-800 bg-gray-900/50 px-3 py-2 text-left hover:border-gray-600 transition-colors"
                          >
                            <p className="text-sm text-white font-medium">{doc.title}</p>
                            {doc.summary && <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{doc.summary}</p>}
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="rounded-2xl border border-gray-800 bg-gray-900/60 p-6"
            >
              <h3 className="text-lg font-semibold text-white mb-4">지원 링크</h3>
              <div className="space-y-4">
                {supportLinks.length === 0 && dashboardLoading && (
                  <p className="text-sm text-gray-500">지원 링크를 불러오는 중입니다.</p>
                )}
                {supportLinks.map((link) => (
                  <button
                    key={link.title}
                    onClick={() => router.push(link.href)}
                    className="w-full rounded-xl border border-gray-800 bg-gray-900/40 p-4 text-left hover:border-gray-600 transition-colors"
                  >
                    <p className="text-white font-semibold">{link.title}</p>
                    <p className="text-sm text-gray-400">{link.description}</p>
                  </button>
                ))}
                {!dashboardLoading && supportLinks.length === 0 && (
                  <p className="text-sm text-gray-500">표시할 지원 링크가 없습니다.</p>
                )}
              </div>
            </motion.div>
          </div>
        </section>
      </main>
    </div>
  )
}
