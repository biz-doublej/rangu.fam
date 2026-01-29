import { NextResponse } from 'next/server'
import dbConnect from '@/lib/mongodb'
import SiteHistory from '@/models/SiteHistory'
import { WikiPage, WikiUser, WikiDiscussion, WikiNamespace } from '@/models/Wiki'

export const dynamic = 'force-dynamic'

const accentPalette = [
  'from-indigo-500/50 via-blue-600/60 to-sky-500/50',
  'from-emerald-500/50 via-teal-500/40 to-lime-500/40',
  'from-rose-500/40 via-orange-500/40 to-amber-500/40',
  'from-violet-500/50 via-purple-500/40 to-fuchsia-500/40',
  'from-sky-500/40 via-blue-500/40 to-cyan-500/40',
  'from-amber-500/40 via-orange-500/40 to-yellow-500/40'
]

const iconPalette = ['Compass', 'HelpCircle', 'Layers', 'Shield', 'Target', 'Zap']

export async function GET() {
  try {
    await dbConnect()

    const now = new Date()
    const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000)

    const [
      totalPages,
      activeContributors,
      totalUsers,
      latestEditedPage,
      helpPagesRaw,
      openDiscussionsRaw,
      namespacesRaw,
      siteHistory
    ] = await Promise.all([
      WikiPage.countDocuments({ isDeleted: { $ne: true } }),
      WikiUser.countDocuments({ lastActivity: { $gte: last24Hours }, isActive: true }).catch(() => 0),
      WikiUser.countDocuments({}).catch(() => 0),
      WikiPage.findOne({ isDeleted: { $ne: true } })
        .sort({ lastEditDate: -1 })
        .select('title slug lastEditor lastEditDate views summary categories tags edits currentRevision')
        .lean(),
      WikiPage.find({ namespace: 'help', isDeleted: { $ne: true } })
        .sort({ views: -1 })
        .limit(5)
        .select('title slug summary views')
        .lean(),
      WikiDiscussion.find({ status: 'open' })
        .sort({ updatedAt: -1 })
        .limit(5)
        .populate('pageId', 'title slug')
        .lean(),
      WikiNamespace.find({ isActive: true }).sort({ createdAt: 1 }).limit(6).lean(),
      SiteHistory.findOne().select('stats').lean<{ stats?: any }>()
    ]) as any[]

    const safeSiteStats = siteHistory?.stats || {}
    const derivedStats = {
      totalPages: safeSiteStats.totalPages || totalPages,
      totalUsers: safeSiteStats.totalUsers || totalUsers,
      pageViews: latestEditedPage?.views || safeSiteStats.totalVisits || 0,
      lastEditor: latestEditedPage?.lastEditor || null,
      lastEditDate: latestEditedPage?.lastEditDate?.toISOString() || null,
      activeContributors: activeContributors || Math.min(totalUsers, 5),
      helpCount: helpPagesRaw.length
    }

    const quickActions = [
      {
        title: '새 문서 만들기',
        description: `${derivedStats.totalPages.toLocaleString()}개의 문서가 운영 중`,
        href: '/wiki/search',
        icon: 'FileText'
      },
      {
        title: helpPagesRaw[0]?.title || '도움말 허브',
        description: helpPagesRaw[0]?.summary || '도움말 문서를 참고하고 편집 팁을 확인하세요.',
        href: helpPagesRaw[0] ? `/wiki/${encodeURIComponent(helpPagesRaw[0].slug)}` : '/wiki/도움말',
        icon: 'HelpCircle'
      },
      {
        title: '열린 토론',
        description: `${openDiscussionsRaw.length.toLocaleString()}건 진행 중`,
        href: openDiscussionsRaw[0]?.pageId
          ? `/wiki/${encodeURIComponent((openDiscussionsRaw[0].pageId as any).slug)}#discussions`
          : '/wiki/recent',
        icon: 'MessageCircle'
      }
    ]

    const staticPortals = [
      {
        title: '이랑위키 허브',
        description: '주요 기능과 안내서를 한 곳에서 빠르게 찾아보세요.',
        accent: accentPalette[0],
        icon: 'Sparkles',
        chips: ['가이드', '검색', '도움말'],
        links: [
          { label: '검색', href: '/wiki/search' },
          { label: '도움말', href: '/wiki/도움말' },
          { label: '최근 편집', href: '/wiki/recent' }
        ]
      }
    ]

    const portals = [
      ...staticPortals,
      ...namespacesRaw.map((ns: any, index: number) => ({
        title: ns.displayName,
        description: ns.description || `${ns.displayName} 문서를 탐색해 보세요.`,
        accent: accentPalette[index % accentPalette.length],
        icon: iconPalette[index % iconPalette.length],
        chips: [
        ns.prefix,
        ns.allowSubpages ? '하위 문서 허용' : '단일 문서',
        `${ns.pageCount?.toLocaleString?.() || 0}문서`
      ],
          links: [
            { label: '문서 찾기', href: `/wiki/search?namespace=${encodeURIComponent(ns.name)}` },
            { label: '최근 편집', href: `/wiki/recent?namespace=${encodeURIComponent(ns.name)}` }
          ]
      }))
    ]

    const communitySignals = openDiscussionsRaw.map((discussion: any) => {
      const preview =
        (discussion.content || '').replace(/<[^>]+>/g, '').slice(0, 90).trim() +
        ((discussion.content || '').length > 90 ? '…' : '')
      const page = discussion.pageId as { title?: string; slug?: string } | undefined
      return {
        title: discussion.title,
        detail: preview || '토론이 진행 중입니다.',
        status: discussion.priority || 'normal',
        href: page?.slug ? `/wiki/${encodeURIComponent(page.slug)}#discussions` : '/wiki/recent',
        updatedAt: discussion.updatedAt?.toISOString() || discussion.createdAt?.toISOString() || new Date().toISOString()
      }
    })

    const staticSupportLinks = [
      {
        title: '랑구팸',
        description: '랑구팸 메인으로 돌아가기',
        href: '/',
        icon: 'Home'
      },
      {
        title: 'DoubleJ',
        description: 'DoubleJ 회사 소개 보기',
        href: '/about/company',
        icon: 'Building2'
      }
    ]

    const supportLinks = [
      ...staticSupportLinks,
      ...helpPagesRaw.map((help: any) => ({
        title: help.title,
        description: help.summary || `${help.views?.toLocaleString?.() || 0}명이 열람`,
        href: `/wiki/${encodeURIComponent(help.slug)}`,
        icon: 'HelpCircle'
      }))
    ]

    return NextResponse.json({
      success: true,
      data: {
        stats: derivedStats,
        quickActions,
        portals,
        communitySignals,
        supportLinks
      }
    })
  } catch (error) {
    console.error('Failed to load wiki dashboard data:', error)
    return NextResponse.json(
      { success: false, error: '이랑위키 대시보드 데이터를 불러오지 못했습니다.' },
      { status: 500 }
    )
  }
}
