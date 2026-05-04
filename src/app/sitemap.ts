import type { MetadataRoute } from 'next'
import { ne } from 'drizzle-orm'
import { getDb } from '@/db/client'
import { wikiPages } from '@/db/schema/wiki'

// 빌드 환경에는 DATABASE_URL 이 없어 정적 생성 시 DB 조회가 실패.
// force-dynamic 으로 첫 요청 시 런타임 DB 조회 → Next.js가 결과를 캐싱.
export const dynamic = 'force-dynamic'
export const revalidate = 3600

const RANGU = 'https://rangu-fam.com'
const WIKI = 'https://irang.wiki'

const STATIC_RANGU_PAGES: Array<{ path: string; priority: number; changeFrequency: MetadataRoute.Sitemap[number]['changeFrequency'] }> = [
  { path: '/', priority: 1.0, changeFrequency: 'daily' },
  { path: '/about', priority: 0.8, changeFrequency: 'monthly' },
  { path: '/members', priority: 0.8, changeFrequency: 'weekly' },
  { path: '/cards', priority: 0.7, changeFrequency: 'daily' },
  { path: '/university', priority: 0.7, changeFrequency: 'monthly' },
  { path: '/login', priority: 0.3, changeFrequency: 'yearly' },
  { path: '/privacy', priority: 0.3, changeFrequency: 'yearly' },
  { path: '/terms', priority: 0.3, changeFrequency: 'yearly' },
]

const STATIC_WIKI_PAGES: Array<{ path: string; priority: number; changeFrequency: MetadataRoute.Sitemap[number]['changeFrequency'] }> = [
  { path: '/wiki', priority: 1.0, changeFrequency: 'daily' },
  { path: '/wiki/recent', priority: 0.7, changeFrequency: 'always' },
  { path: '/wiki/category', priority: 0.6, changeFrequency: 'weekly' },
  { path: '/wiki/random', priority: 0.4, changeFrequency: 'always' },
  { path: '/wiki/search', priority: 0.4, changeFrequency: 'monthly' },
  { path: '/wiki/이랑위키:도움말', priority: 0.5, changeFrequency: 'monthly' },
  { path: '/wiki/이랑위키:문법', priority: 0.5, changeFrequency: 'monthly' },
  { path: '/wiki/이랑위키:규정', priority: 0.5, changeFrequency: 'monthly' },
]

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date()
  const entries: MetadataRoute.Sitemap = []

  // rangu-fam 메인 사이트 정적 페이지
  for (const p of STATIC_RANGU_PAGES) {
    entries.push({
      url: `${RANGU}${p.path}`,
      lastModified: now,
      changeFrequency: p.changeFrequency,
      priority: p.priority,
    })
  }

  // 이랑위키 정적 페이지
  for (const p of STATIC_WIKI_PAGES) {
    entries.push({
      url: `${WIKI}${p.path}`,
      lastModified: now,
      changeFrequency: p.changeFrequency,
      priority: p.priority,
    })
  }

  // 위키 동적 페이지 (DB 조회)
  try {
    const db = getDb()
    const pages = await db
      .select({
        title: wikiPages.title,
        lastEditDate: wikiPages.lastEditDate,
        views: wikiPages.views,
      })
      .from(wikiPages)
      .where(ne(wikiPages.isDeleted, true))
      .limit(5000) // 안전 한도

    for (const p of pages) {
      // 조회수 기반 우선순위 (1~50회 = 0.4, 50~500 = 0.5, 500+ = 0.6)
      const priority =
        (p.views || 0) > 500 ? 0.6 : (p.views || 0) > 50 ? 0.5 : 0.4
      entries.push({
        url: `${WIKI}/wiki/${encodeURIComponent(p.title)}`,
        lastModified: p.lastEditDate || now,
        changeFrequency: 'weekly',
        priority,
      })
    }
  } catch (e) {
    console.warn('sitemap: 위키 페이지 조회 실패:', e)
  }

  return entries
}
