import type { Metadata } from 'next'
import { eq, and, ne, or } from 'drizzle-orm'
import { getDb } from '@/db/client'
import { wikiPages } from '@/db/schema/wiki'

/**
 * 위키 문서 페이지의 동적 메타데이터 + JSON-LD 구조화 데이터.
 * 자식 page.tsx 는 'use client' 이지만, 이 layout 은 서버 컴포넌트라
 * generateMetadata + 인라인 <script> 로 SEO/공유/리치 스니펫 정보를 제공.
 */

// 본문에서 마크업 제거 → 자연스러운 설명문 추출
function cleanWikiContent(content: string): string {
  return (content || '')
    .replace(/\{\{[\s\S]*?\}\}/g, '')
    .replace(/\[\[(?:목차|탭바|카드그리드|분류|category|TOC)[^\]]*\]\]/gi, '')
    .replace(/\[\[([^\]]+)\]\]/g, (_m, inner) => String(inner).split('|').pop() || '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/\[(?:이미지|파일):[^\]]+\]/g, '')
    .replace(/^:::(?:info|warn|warning|success|error|danger|note|tip)\s*$/gm, '')
    .replace(/^:::\s*$/gm, '')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/[#=*_`~]+/g, '')
    .replace(/!icon:\{[^}]+\}/g, '')
    .replace(/^분류:.*$/gm, '')
    .replace(/\s+/g, ' ')
    .trim()
}

async function fetchPage(slug: string) {
  const db = getDb()
  const [page] = await db
    .select({
      title: wikiPages.title,
      summary: wikiPages.summary,
      content: wikiPages.content,
      namespace: wikiPages.namespace,
      creator: wikiPages.creator,
      lastEditor: wikiPages.lastEditor,
      lastEditDate: wikiPages.lastEditDate,
      createdAt: wikiPages.createdAt,
    })
    .from(wikiPages)
    .where(
      and(
        ne(wikiPages.isDeleted, true),
        or(eq(wikiPages.title, slug), eq(wikiPages.slug, slug))
      )
    )
    .limit(1)
  return page
}

export async function generateMetadata(
  { params }: { params: { slug: string[] } }
): Promise<Metadata> {
  const slug = decodeURIComponent(params.slug?.join('/') || '').trim()
  if (!slug) return { title: '이랑위키' }

  try {
    const page = await fetchPage(slug)

    if (!page) {
      return {
        title: slug,
        description: `이랑위키에서 "${slug}" 문서를 찾고 있습니다. 새로 작성하거나 비슷한 문서를 검색해 보세요.`,
        robots: { index: false },
      }
    }

    const cleanContent = cleanWikiContent(page.content || '')
    const trimmedSummary = page.summary?.trim() || ''
    const looksLikeEditSummary = trimmedSummary.length < 30
    const contentExcerpt =
      cleanContent.length > 160 ? cleanContent.slice(0, 157) + '…' : cleanContent
    const description =
      (!looksLikeEditSummary && trimmedSummary) ||
      contentExcerpt ||
      trimmedSummary ||
      `이랑위키의 ${page.title} 문서.`

    return {
      title: page.title,
      description,
      openGraph: {
        title: `${page.title} | 이랑위키`,
        description,
        siteName: '이랑위키',
        type: 'article',
        modifiedTime: page.lastEditDate?.toString(),
        publishedTime: page.createdAt?.toString(),
        authors: page.creator ? [page.creator] : undefined,
        url: `https://irang.wiki/wiki/${encodeURIComponent(page.title)}`,
      },
      twitter: {
        card: 'summary',
        title: `${page.title} | 이랑위키`,
        description,
      },
      alternates: {
        canonical: `https://irang.wiki/wiki/${encodeURIComponent(page.title)}`,
      },
    }
  } catch (e) {
    console.warn('wiki metadata generation failed:', e)
    return { title: slug }
  }
}

// JSON-LD 구조화 데이터 — Google 리치 스니펫
async function getStructuredData(slug: string): Promise<object | null> {
  try {
    const page = await fetchPage(slug)
    if (!page) return null

    const cleanContent = cleanWikiContent(page.content || '')
    const wordCount = cleanContent.split(/\s+/).filter(Boolean).length
    const url = `https://irang.wiki/wiki/${encodeURIComponent(page.title)}`

    // description 같은 fallback 로직 (summary 너무 짧으면 본문 발췌)
    const trimmedSummary = page.summary?.trim() || ''
    const looksLikeEditSummary = trimmedSummary.length < 30
    const contentExcerpt =
      cleanContent.length > 200 ? cleanContent.slice(0, 197) + '…' : cleanContent
    const description =
      (!looksLikeEditSummary && trimmedSummary) || contentExcerpt || trimmedSummary || page.title

    // ISO 8601 형식 (schema.org 표준)
    const toIso = (d: any): string | undefined => {
      if (!d) return undefined
      const date = d instanceof Date ? d : new Date(d)
      return Number.isNaN(date.getTime()) ? undefined : date.toISOString()
    }

    return {
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: page.title,
      description,
      author: {
        '@type': 'Person',
        name: page.creator || '이랑위키 사용자',
      },
      editor: page.lastEditor
        ? { '@type': 'Person', name: page.lastEditor }
        : undefined,
      publisher: {
        '@type': 'Organization',
        name: '이랑위키',
        url: 'https://irang.wiki',
      },
      datePublished: toIso(page.createdAt),
      dateModified: toIso(page.lastEditDate),
      url,
      mainEntityOfPage: { '@type': 'WebPage', '@id': url },
      wordCount,
      inLanguage: 'ko-KR',
      isAccessibleForFree: true,
    }
  } catch (e) {
    console.warn('structured data generation failed:', e)
    return null
  }
}

export default async function WikiSlugLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: { slug: string[] }
}) {
  const slug = decodeURIComponent(params.slug?.join('/') || '').trim()
  const structured = slug ? await getStructuredData(slug) : null

  return (
    <>
      {structured && (
        <script
          type="application/ld+json"
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structured) }}
        />
      )}
      {children}
    </>
  )
}
