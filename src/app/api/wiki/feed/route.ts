import { NextResponse } from 'next/server'
import { and, desc, eq, ne } from 'drizzle-orm'
import { getDb } from '@/db/client'
import { wikiPages, wikiRevisions } from '@/db/schema/wiki'

export const dynamic = 'force-dynamic'
export const revalidate = 600 // 10분 캐시

const SITE_URL = 'https://irang.wiki'
const FEED_TITLE = '이랑위키 — 최근 변경'
const FEED_DESC = '이랑위키에서 일어난 모든 편집/생성을 RSS 로 구독하세요.'

// XML escape
const esc = (s: string) =>
  String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')

const cdata = (s: string) => `<![CDATA[${String(s || '').replace(/]]>/g, ']]]]><![CDATA[>')}]]>`

export async function GET() {
  try {
    const db = getDb()
    const rows = await db
      .select({
        title: wikiPages.title,
        slug: wikiPages.slug,
        revisionNumber: wikiRevisions.revisionNumber,
        author: wikiRevisions.author,
        editType: wikiRevisions.editType,
        summary: wikiRevisions.summary,
        sizeChange: wikiRevisions.sizeChange,
        timestampAt: wikiRevisions.timestampAt,
        revId: wikiRevisions.id,
      })
      .from(wikiRevisions)
      .innerJoin(wikiPages, eq(wikiPages.id, wikiRevisions.pageId))
      .where(ne(wikiPages.isDeleted, true))
      .orderBy(desc(wikiRevisions.timestampAt))
      .limit(50)

    const items = rows
      .map((r) => {
        const url = `${SITE_URL}/wiki/${encodeURIComponent(r.title)}`
        const sz = r.sizeChange ?? 0
        const szLabel =
          sz > 0 ? `(+${sz.toLocaleString()})` : sz < 0 ? `(${sz.toLocaleString()})` : ''
        const typeLabel: Record<string, string> = {
          create: '생성',
          edit: '편집',
          revert: '되돌림',
          delete: '삭제',
        }
        const editLabel = typeLabel[r.editType] || r.editType
        const titleLine = `[${editLabel}] ${r.title} r${r.revisionNumber} ${szLabel}`.trim()
        const description = `<p><strong>${esc(r.author || '익명')}</strong> 님이 <strong>${esc(editLabel)}</strong> 했습니다${szLabel ? ` ${esc(szLabel)}` : ''}.</p>${
          r.summary ? `<p>요약: <em>${esc(r.summary)}</em></p>` : ''
        }`
        const pubDate = r.timestampAt ? new Date(r.timestampAt).toUTCString() : new Date().toUTCString()
        return `    <item>
      <title>${esc(titleLine)}</title>
      <link>${esc(url)}</link>
      <guid isPermaLink="false">irang-wiki-rev-${r.revId}</guid>
      <pubDate>${pubDate}</pubDate>
      <author>noreply@irang.wiki (${esc(r.author || '익명')})</author>
      <description>${cdata(description)}</description>
      <category>${esc(editLabel)}</category>
    </item>`
      })
      .join('\n')

    const lastBuild = rows[0]?.timestampAt
      ? new Date(rows[0].timestampAt).toUTCString()
      : new Date().toUTCString()

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${esc(FEED_TITLE)}</title>
    <link>${SITE_URL}/wiki/recent</link>
    <description>${esc(FEED_DESC)}</description>
    <language>ko-KR</language>
    <lastBuildDate>${lastBuild}</lastBuildDate>
    <atom:link href="${SITE_URL}/api/wiki/feed" rel="self" type="application/rss+xml" />
${items}
  </channel>
</rss>`

    return new NextResponse(xml, {
      status: 200,
      headers: {
        'Content-Type': 'application/rss+xml; charset=utf-8',
        'Cache-Control': 'public, max-age=600, s-maxage=600',
      },
    })
  } catch (e) {
    console.error('RSS 생성 실패:', e)
    return new NextResponse('RSS feed unavailable', { status: 500 })
  }
}
