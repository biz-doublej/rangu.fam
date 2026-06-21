'use client'

import React, { useEffect, useState } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import {
  ArrowRight,
  BarChart3,
  BookOpen,
  ChevronRight,
  Clock,
  Compass,
  Edit,
  ExternalLink,
  FileText,
  HelpCircle,
  Layers,
  Shield,
  Star,
  TrendingUp,
  Users
} from 'lucide-react'
import { WikiShell, WikiPageHeader, WikiMeter } from '@/components/wiki'
import { useWikiAuth } from '@/contexts/WikiAuthContext'

const iconLibrary = {
  FileText,
  HelpCircle,
  Compass,
  Layers,
  Shield,
  Users,
  Star,
  BookOpen
}

const resolveIcon = (name?: string): React.ElementType => {
  if (!name) return FileText
  return (iconLibrary as Record<string, React.ElementType>)[name] || FileText
}

type DashboardStats = {
  totalPages: number
  totalUsers: number
  pageViews: number
  lastEditor: string | null
  lastEditDate: string | null
  activeContributors: number
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
  links: Array<{ label: string; href: string; action?: () => void }>
}

type DashboardSupportLink = {
  title: string
  description: string
  href: string
  icon?: string
}

type DashboardCommunitySignal = {
  title: string
  detail: string
  status: string
  href: string
  updatedAt: string
}

type DashboardPayload = {
  stats: DashboardStats
  quickActions: DashboardQuickAction[]
  portals: DashboardPortal[]
  communitySignals: DashboardCommunitySignal[]
  supportLinks: DashboardSupportLink[]
}

type CategoryOverview = {
  name: string
  count: number
  sample: Array<{ title: string; slug: string; summary?: string }>
}

interface TrendingItem { title: string; slug: string; views: number }
interface RecentChange {
  title: string
  slug: string
  namespace?: string
  revision: { author?: string; timestamp?: number; editType?: string }
}

const departureHideKey = 'rangu_departure_hide_until_v2'

export default function WikiMainPage() {
  const router = useRouter()
  const { isLoggedIn, isModerator } = useWikiAuth()

  const [showDepartureModal, setShowDepartureModal] = useState(true)
  const [isClient, setIsClient] = useState(false)
  useEffect(() => { setIsClient(true) }, [])
  useEffect(() => {
    if (!isClient) return
    const raw = localStorage.getItem(departureHideKey)
    if (!raw) return
    const until = Number(raw)
    if (Number.isNaN(until)) {
      localStorage.removeItem(departureHideKey)
      return
    }
    if (until > Date.now()) setShowDepartureModal(false)
  }, [isClient])

  const [dashboard, setDashboard] = useState<DashboardPayload | null>(null)
  const [dashboardError, setDashboardError] = useState<string | null>(null)
  const [trending, setTrending] = useState<TrendingItem[]>([])
  const [trendingPeriod, setTrendingPeriod] = useState<'week' | 'month'>('week')
  const [trendingFallback, setTrendingFallback] = useState(false)
  const [recent, setRecent] = useState<RecentChange[]>([])
  const [categories, setCategories] = useState<CategoryOverview[]>([])
  const [latestEdit, setLatestEdit] = useState<{ lastEditDate: string; lastEditor: string; views: number } | null>(null)

  useEffect(() => {
    let mounted = true
    const load = async () => {
      try {
        const r = await fetch('/api/wiki/dashboard', { cache: 'no-store' })
        if (!r.ok) throw new Error('대시보드를 불러오지 못했습니다.')
        const data = await r.json()
        if (mounted) setDashboard(data.data)
      } catch (e) {
        if (mounted) setDashboardError(e instanceof Error ? e.message : '대시보드 로딩 실패')
      }
    }
    load()
    return () => { mounted = false }
  }, [])

  useEffect(() => {
    let mounted = true
    fetch(`/api/wiki/trending?period=${trendingPeriod}&limit=10`)
      .then(r => r.json())
      .then(d => {
        if (!mounted) return
        if (d.success && d.trending) {
          setTrending(d.trending)
          setTrendingFallback(Boolean(d.fallback))
        }
      })
      .catch(() => { if (mounted) setTrending([]) })
    return () => { mounted = false }
  }, [trendingPeriod])

  useEffect(() => {
    fetch('/api/wiki/recent?limit=8')
      .then(r => r.json())
      .then(d => { if (d.success && d.changes) setRecent(d.changes) })
      .catch(() => setRecent([]))
  }, [])

  useEffect(() => {
    fetch('/api/wiki/categories?summary=1&limit=12')
      .then(r => r.json())
      .then(d => {
        if (d.success && Array.isArray(d.categories)) setCategories(d.categories)
        else setCategories([])
      })
      .catch(() => setCategories([]))
  }, [])

  useEffect(() => {
    fetch('/api/wiki/latest-edit')
      .then(r => r.json())
      .then(d => {
        if (d.success && d.latestEdit) {
          setLatestEdit({
            lastEditDate: d.latestEdit.lastEditDate,
            lastEditor: d.latestEdit.lastEditor,
            views: d.latestEdit.views || 0
          })
        }
      })
      .catch(() => {})
  }, [])

  const stats = dashboard?.stats || null
  const lastEditor = stats?.lastEditor || latestEdit?.lastEditor || '—'
  const lastEditDateRaw = stats?.lastEditDate || latestEdit?.lastEditDate
  const lastEditDisplay = lastEditDateRaw
    ? new Date(lastEditDateRaw)
        .toLocaleString('ko-KR', {
          year: 'numeric', month: '2-digit', day: '2-digit',
          hour: '2-digit', minute: '2-digit', hour12: false
        })
        .replace(/\. /g, '.').replace(/\.$/, '')
    : '동기화 중'
  const totalPages = stats?.totalPages ?? 0
  const totalUsers = stats?.totalUsers ?? 0
  const pageViews = stats?.pageViews ?? latestEdit?.views ?? 0

  const handleEditMainPage = () => {
    if (!isLoggedIn) {
      router.push('/auth/start?callbackUrl=%2Fwiki')
      return
    }
    if (!isModerator) {
      alert('이랑위키:대문은 관리자만 편집할 수 있습니다.')
      return
    }
    router.push('/wiki/이랑위키:대문')
  }

  return (
    <WikiShell
      activeNav="main"
      pageHeader={
        <WikiPageHeader
          title="이랑위키:대문"
          subtitle="여러분이 직접 가꾸는 작은 백과사전 — 누구나 읽고, 로그인하면 누구나 기여할 수 있습니다."
          hatnote={
            <>
              이 문서는 이랑위키의 대문(메인) 페이지입니다. 일반 문서를 찾으려면 상단 검색 또는{' '}
              <a className="text-[color:var(--wiki-link)] hover:underline" href="/wiki/category">분류</a>를 이용하세요.
            </>
          }
          meta={[
            { label: '마지막 편집', value: lastEditDisplay, icon: Clock },
            { label: '편집자', value: lastEditor, icon: Users },
            { label: '조회', value: `${pageViews.toLocaleString()}회`, icon: Star }
          ]}
          actions={
            <button
              type="button"
              onClick={handleEditMainPage}
              className="inline-flex items-center gap-1 rounded-sm border border-[color:var(--wiki-rule-strong)] bg-[color:var(--wiki-bg-2)] px-2.5 py-1 text-xs text-[color:var(--wiki-link)] hover:border-[color:var(--wiki-accent)] hover:text-[color:var(--wiki-link-hover)]"
            >
              <Edit className="w-3.5 h-3.5" />
              대문 편집
            </button>
          }
        />
      }
      rightRail={
        <>
          {/* 통계 인포박스 */}
          <table className="wiki-infobox">
            <caption>이랑위키 통계</caption>
            <tbody>
              <tr>
                <th className="text-left">누적 문서</th>
                <td className="text-right">{totalPages.toLocaleString()}개</td>
              </tr>
              <tr>
                <th className="text-left">등록 사용자</th>
                <td className="text-right">{totalUsers.toLocaleString()}명</td>
              </tr>
              <tr>
                <th className="text-left">최근 편집자</th>
                <td className="text-right truncate" title={lastEditor}>{lastEditor}</td>
              </tr>
              <tr>
                <th className="text-left">대문 조회</th>
                <td className="text-right">{pageViews.toLocaleString()}회</td>
              </tr>
              <tr>
                <th className="text-left">활동 점수</th>
                <td>
                  <WikiMeter
                    label="ACTIVITY"
                    valueLabel={`${(stats?.activeContributors ?? 0).toLocaleString()}명`}
                    value={stats?.activeContributors ?? 0}
                    max={Math.max(stats?.totalUsers ?? 1, (stats?.activeContributors ?? 0) + 1)}
                    tone="cyan"
                    size="sm"
                  />
                </td>
              </tr>
              <tr>
                <th className="text-left">도움말 열람</th>
                <td>
                  <WikiMeter
                    label="HELP READS"
                    valueLabel={`${(stats?.helpCount ?? 0).toLocaleString()}건`}
                    value={stats?.helpCount ?? 0}
                    max={Math.max(50, (stats?.helpCount ?? 0))}
                    tone="violet"
                    size="sm"
                  />
                </td>
              </tr>
            </tbody>
          </table>

          {/* 인기 문서 — 기간별 실지표 */}
          <section className="wiki-panel">
            <div className="flex items-center justify-between gap-2">
              <h4 className="flex items-center gap-2 wiki-serif text-base font-semibold">
                <TrendingUp className="w-4 h-4 text-[color:var(--wiki-danger)]" />
                인기 문서
              </h4>
              <button
                type="button"
                onClick={() => router.push('/wiki/stats')}
                className="inline-flex items-center gap-1 text-[11px] text-[color:var(--wiki-ink-muted)] hover:text-[color:var(--wiki-link)]"
                title="이랑위키 연보 — 전체 통계"
              >
                <BarChart3 className="w-3 h-3" />
                연보
              </button>
            </div>
            {/* 기간 토글 */}
            <div className="mt-2 inline-flex rounded-md border border-[color:var(--wiki-rule)] p-0.5 text-[11px]">
              {([
                { key: 'week', label: '이번 주' },
                { key: 'month', label: '한 달' },
              ] as const).map(opt => (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() => setTrendingPeriod(opt.key)}
                  className={`rounded px-2.5 py-1 font-medium transition-colors ${
                    trendingPeriod === opt.key
                      ? 'bg-[color:var(--wiki-danger)]/15 text-[color:var(--wiki-danger)]'
                      : 'text-[color:var(--wiki-ink-muted)] hover:text-[color:var(--wiki-ink)]'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            {trendingFallback && trending.length > 0 && (
              <p className="mt-1.5 text-[10px] text-[color:var(--wiki-ink-muted)]">
                * 기간 집계 데이터가 쌓이는 중 — 현재는 누적 조회 기준입니다.
              </p>
            )}
            <ol className="mt-2 space-y-1 text-sm">
              {trending.length === 0 && (
                <li className="text-xs text-[color:var(--wiki-ink-muted)]">집계 중입니다.</li>
              )}
              {trending.slice(0, 10).map((item, i) => (
                <li key={item.slug || item.title} className="flex items-center gap-2">
                  <span
                    className={`inline-flex w-5 justify-center text-[11px] font-semibold ${
                      i < 3 ? 'text-[color:var(--wiki-danger)]' : 'text-[color:var(--wiki-ink-muted)]'
                    }`}
                  >
                    {i + 1}
                  </span>
                  <button
                    type="button"
                    className="text-[color:var(--wiki-link)] hover:underline truncate text-left"
                    onClick={() => router.push(`/wiki/${encodeURIComponent(item.slug || item.title)}`)}
                  >
                    {item.title}
                  </button>
                  <span className="ml-auto text-[10px] text-[color:var(--wiki-ink-muted)]">
                    {item.views.toLocaleString()}
                  </span>
                </li>
              ))}
            </ol>
          </section>

          {/* 도움말 / 지원 링크 */}
          <section className="wiki-panel">
            <h4 className="wiki-serif text-base font-semibold">도움말 · 지원</h4>
            <ul className="mt-2 space-y-1 text-sm">
              {(dashboard?.supportLinks || []).slice(0, 6).map(link => {
                const Icon = resolveIcon(link.icon)
                const external = link.href.startsWith('http')
                return (
                  <li key={link.title}>
                    <button
                      type="button"
                      onClick={() => external ? window.open(link.href, '_blank', 'noopener') : router.push(link.href)}
                      className="flex w-full items-start gap-2 text-left text-[color:var(--wiki-link)] hover:underline"
                    >
                      <Icon className="w-3.5 h-3.5 mt-0.5 text-[color:var(--wiki-ink-muted)]" />
                      <span className="leading-tight">
                        <span className="block">{link.title}</span>
                        <span className="block text-[11px] text-[color:var(--wiki-ink-muted)] no-underline">
                          {link.description}
                        </span>
                      </span>
                      {external && <ExternalLink className="w-3 h-3 mt-1 ml-auto text-[color:var(--wiki-ink-muted)]" />}
                    </button>
                  </li>
                )
              })}
            </ul>
          </section>
        </>
      }
    >
      {/* ── 환영 / 미션 브리프 ─────────────────────────── */}
      <section className="relative wiki-panel mb-5 overflow-hidden">
        <div className="absolute inset-0 pointer-events-none opacity-50">
          <div className="absolute -top-16 -right-16 h-48 w-48 rounded-full bg-[color:var(--wiki-cyan)]/10 blur-3xl" />
          <div className="absolute -bottom-20 -left-12 h-52 w-52 rounded-full bg-[color:var(--wiki-violet)]/10 blur-3xl" />
        </div>
        <div className="relative flex items-start gap-3">
          <BookOpen className="w-5 h-5 mt-0.5 text-[color:var(--wiki-cyan)]" />
          <div>
            <p
              className="text-[10px] uppercase tracking-[0.22em] text-[color:var(--wiki-cyan)]"
              style={{ fontFamily: "'JetBrains Mono', monospace" }}
            >
              MISSION&nbsp;BRIEF · v2026.05
            </p>
            <h2 className="mt-1 text-lg font-semibold text-[color:var(--wiki-ink)]"
                style={{ fontFamily: "'Space Grotesk', 'Pretendard', sans-serif" }}>
              이랑위키에 오신 것을 환영합니다.
            </h2>
            <p className="mt-1.5 text-sm text-[color:var(--wiki-ink-soft)] leading-relaxed">
              이랑위키는 누구나 읽고, 로그인 후에는 누구나 편집할 수 있는 분산형 백과사전입니다.
              새로운 모듈은 검증 단계를 거쳐 본 데이터베이스에 합류합니다.
              규정 · 도움말을 먼저 확인하고{' '}
              <button
                type="button"
                className="text-[color:var(--wiki-cyan)] hover:underline"
                onClick={() => router.push('/wiki/이랑위키:도움말_2026')}
              >
                편집 도움말 (2026)
              </button>
              에서 자주 쓰는 문법을 살펴보세요.
            </p>
          </div>
        </div>
      </section>

      {/* ── 빠른 작업 ─────────────────────────────────── */}
      <section className="mb-6">
        <h2 className="wiki-h2">오늘의 작업</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {(dashboard?.quickActions || []).slice(0, 4).map((action, idx) => {
            const Icon = resolveIcon(action.icon)
            return (
              <button
                key={`${action.title}-${idx}`}
                type="button"
                onClick={() => router.push(action.href)}
                className="wiki-panel text-left hover:border-[color:var(--wiki-accent)] transition-colors"
              >
                <div className="flex items-start gap-3">
                  <Icon className="w-5 h-5 mt-0.5 text-[color:var(--wiki-accent)]" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-[color:var(--wiki-ink)]">{action.title}</p>
                    <p className="text-xs text-[color:var(--wiki-ink-muted)] mt-0.5 line-clamp-2">{action.description}</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-[color:var(--wiki-ink-muted)]" />
                </div>
              </button>
            )
          })}
          {!dashboard && !dashboardError && (
            <p className="text-xs text-[color:var(--wiki-ink-muted)]">데이터를 불러오는 중입니다…</p>
          )}
          {dashboardError && (
            <p className="text-xs text-[color:var(--wiki-danger)]">
              실시간 데이터를 불러오지 못했습니다: {dashboardError}
            </p>
          )}
        </div>
      </section>

      {/* ── 포털 ─────────────────────────────────── */}
      <section className="mb-6">
        <h2 className="wiki-h2">이랑위키 포털</h2>
        <p className="text-sm text-[color:var(--wiki-ink-soft)] mb-3">
          주요 기능과 안내서를 분류해 두었습니다. 원하는 항목을 따라가 보세요.
        </p>
        <div className="grid gap-3 md:grid-cols-2">
          {(dashboard?.portals || []).map(portal => {
            const Icon = resolveIcon(portal.icon)
            return (
              <article key={portal.title} className="wiki-panel">
                <div className="flex items-start gap-3">
                  <Icon className="w-5 h-5 mt-0.5 text-[color:var(--wiki-accent)]" />
                  <div className="min-w-0 flex-1">
                    <h3 className="wiki-serif text-base font-semibold text-[color:var(--wiki-ink)]">
                      {portal.title}
                    </h3>
                    <p className="text-xs text-[color:var(--wiki-ink-muted)] mt-0.5">{portal.description}</p>
                    {portal.chips.length > 0 && (
                      <ul className="mt-2 flex flex-wrap gap-1">
                        {portal.chips.map(chip => (
                          <li key={chip} className="wiki-chip">{chip}</li>
                        ))}
                      </ul>
                    )}
                    {portal.links.length > 0 && (
                      <ul className="mt-2 text-sm">
                        {portal.links.map(link => (
                          <li key={link.label}>
                            <button
                              type="button"
                              onClick={() => link.action ? link.action() : router.push(link.href)}
                              className="text-[color:var(--wiki-link)] hover:underline inline-flex items-center"
                            >
                              {link.label}
                              <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              </article>
            )
          })}
          {!dashboard && (
            <p className="text-xs text-[color:var(--wiki-ink-muted)]">포털 정보를 불러오는 중입니다…</p>
          )}
        </div>
      </section>

      {/* ── 최근 변경 ─────────────────────────────────── */}
      <section className="mb-6">
        <div className="flex items-end gap-2">
          <h2 className="wiki-h2 grow">최근 변경</h2>
          <button
            type="button"
            onClick={() => router.push('/wiki/recent')}
            className="text-xs text-[color:var(--wiki-link)] hover:underline pb-1"
          >
            전체 변경 보기 →
          </button>
        </div>
        <div className="wiki-panel p-0">
          <table className="w-full text-sm">
            <thead className="text-xs text-[color:var(--wiki-ink-muted)] bg-[color:var(--wiki-paper-2)] border-b border-[color:var(--wiki-rule)]">
              <tr>
                <th className="text-left py-1.5 px-3 font-medium">문서</th>
                <th className="text-left py-1.5 px-3 font-medium hidden sm:table-cell">유형</th>
                <th className="text-left py-1.5 px-3 font-medium">편집자</th>
                <th className="text-right py-1.5 px-3 font-medium">시각</th>
              </tr>
            </thead>
            <tbody>
              {recent.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-3 py-4 text-center text-xs text-[color:var(--wiki-ink-muted)]">
                    최근 변경 내역이 없습니다.
                  </td>
                </tr>
              )}
              {recent.map((c, i) => (
                <tr
                  key={`${c.slug}-${i}`}
                  className="border-b border-[color:var(--wiki-rule)] last:border-b-0 hover:bg-[color:var(--wiki-paper-2)]"
                >
                  <td className="px-3 py-1.5">
                    <button
                      type="button"
                      onClick={() => router.push(`/wiki/${encodeURIComponent(c.slug || c.title)}`)}
                      className="text-[color:var(--wiki-link)] hover:underline"
                    >
                      {c.title}
                    </button>
                  </td>
                  <td className="px-3 py-1.5 hidden sm:table-cell">
                    <span className="wiki-chip">{c.revision.editType || '편집'}</span>
                  </td>
                  <td className="px-3 py-1.5 text-[color:var(--wiki-ink-soft)]">{c.revision.author || '익명'}</td>
                  <td className="px-3 py-1.5 text-right text-xs text-[color:var(--wiki-ink-muted)]">
                    {c.revision.timestamp
                      ? new Date(c.revision.timestamp).toLocaleString('ko-KR', { hour12: false })
                      : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* ── 분류 살펴보기 ─────────────────────────────────── */}
      <section className="mb-6">
        <div className="flex items-end gap-2">
          <h2 className="wiki-h2 grow">분류 살펴보기</h2>
          <button
            type="button"
            onClick={() => router.push('/wiki/category')}
            className="text-xs text-[color:var(--wiki-link)] hover:underline pb-1"
          >
            전체 분류 →
          </button>
        </div>
        <p className="text-sm text-[color:var(--wiki-ink-soft)] mb-3">
          문서를 분류로 묶고 탐색하세요. 분류명을 클릭하면 해당 분류의 문서를 한 번에 볼 수 있습니다.
        </p>
        <div className="grid gap-3 md:grid-cols-2">
          {categories.length === 0 && (
            <p className="text-xs text-[color:var(--wiki-ink-muted)]">분류 정보를 불러오는 중입니다…</p>
          )}
          {categories.slice(0, 8).map(cat => (
            <article key={cat.name} className="wiki-panel">
              <div className="flex items-baseline justify-between gap-2">
                <button
                  type="button"
                  onClick={() => router.push(`/wiki/category/${encodeURIComponent(cat.name)}`)}
                  className="wiki-serif text-base font-semibold text-[color:var(--wiki-link)] hover:underline truncate"
                >
                  {cat.name}
                </button>
                <span className="text-[11px] text-[color:var(--wiki-ink-muted)] shrink-0">
                  {cat.count.toLocaleString()}개 문서
                </span>
              </div>
              {cat.sample.length > 0 && (
                <ul className="mt-2 space-y-0.5 text-sm">
                  {cat.sample.slice(0, 4).map(doc => (
                    <li key={doc.slug || doc.title}>
                      <button
                        type="button"
                        onClick={() => router.push(`/wiki/${encodeURIComponent(doc.slug || doc.title)}`)}
                        className="text-[color:var(--wiki-link)] hover:underline"
                      >
                        {doc.title}
                      </button>
                      {doc.summary && (
                        <span className="text-[11px] text-[color:var(--wiki-ink-muted)] ml-2">
                          {doc.summary}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </article>
          ))}
        </div>
      </section>

      {/* ── 라이선스 / 안내 ─────────────────────────────────── */}
      <section className="wiki-mbox wiki-mbox--info">
        <BookOpen className="w-4 h-4 mt-0.5 text-[color:var(--wiki-accent)]" />
        <p>
          이랑위키의 모든 문서는 <strong>이랑위키 사용자</strong>가 함께 만들어 갑니다.
          저작권 정책과 라이선스를 준수하여 기여해 주세요.
        </p>
      </section>

      {/* ── 민석 이별 모달 ─────────────────────────────────── */}
      {showDepartureModal && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm px-4"
          onClick={() => setShowDepartureModal(false)}
        >
          <div
            className="relative w-full max-w-3xl overflow-hidden rounded-md border border-[color:var(--wiki-rule-strong)] bg-[color:var(--wiki-bg-2)] p-6 text-[color:var(--wiki-ink)] shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="overflow-hidden rounded-sm border border-[color:var(--wiki-rule)]">
              <Image
                src="/images/minseok-farewell.jpg"
                alt="민석 이별 이미지"
                width={1280}
                height={720}
                priority
                className="h-auto w-full object-cover"
              />
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
              <button
                type="button"
                className="rounded-sm border border-[color:var(--wiki-rule-strong)] bg-[color:var(--wiki-paper-2)] px-3 py-1.5 text-[color:var(--wiki-ink-soft)] hover:border-[color:var(--wiki-accent)]"
                onClick={() => {
                  localStorage.setItem(departureHideKey, String(Date.now() + 24 * 60 * 60 * 1000))
                  setShowDepartureModal(false)
                }}
              >
                하루 안 보기
              </button>
              <button
                type="button"
                className="rounded-sm border border-[color:var(--wiki-rule-strong)] bg-[color:var(--wiki-bg-2)] px-3 py-1.5 text-[color:var(--wiki-ink-soft)] hover:border-[color:var(--wiki-accent)]"
                onClick={() => setShowDepartureModal(false)}
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}
    </WikiShell>
  )
}
