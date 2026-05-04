import { NextRequest, NextResponse } from 'next/server'
import { and, desc, eq, ilike, inArray, ne, or, sql } from 'drizzle-orm'
import { getDb } from '@/db/client'
import { wikiPages } from '@/db/schema/wiki'

export const dynamic = 'force-dynamic'

// GET /api/wiki/search?q=...&namespace=&limit=20&skip=0
export async function GET(request: NextRequest) {
  try {
    const db = getDb()
    const { searchParams } = request.nextUrl
    const q = (searchParams.get('q') || '').trim()
    const namespace = searchParams.get('namespace') || undefined
    const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10), 50)
    const skip = parseInt(searchParams.get('skip') || '0', 10)

    if (!q) {
      return NextResponse.json({ success: true, results: [], total: 0, limit, skip })
    }

    // ILIKE 패턴 (대소문자 무시 부분일치). %, _ 이스케이프.
    const pattern = `%${q.replace(/[%_]/g, (c) => `\\${c}`)}%`

    const baseConditions = [ne(wikiPages.isDeleted, true)]
    if (namespace) baseConditions.push(eq(wikiPages.namespace, namespace))

    // title / content / summary / tags 중 하나라도 매치
    const matchExpr = or(
      ilike(wikiPages.title, pattern),
      ilike(wikiPages.content, pattern),
      ilike(wikiPages.summary, pattern),
      // tags text[] 부분일치 (배열 중 하나의 원소가 q를 포함)
      sql`EXISTS (SELECT 1 FROM unnest(${wikiPages.tags}) AS t WHERE t ILIKE ${pattern})`
    )

    const whereClause = and(...baseConditions, matchExpr)

    const [{ count: total }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(wikiPages)
      .where(whereClause as any)

    const docs = await db
      .select({
        _id: wikiPages.id,
        title: wikiPages.title,
        slug: wikiPages.slug,
        namespace: wikiPages.namespace,
        summary: wikiPages.summary,
        content: wikiPages.content,
        categories: wikiPages.categories,
        lastEditDate: wikiPages.lastEditDate,
        lastEditor: wikiPages.lastEditor,
        edits: wikiPages.edits,
        views: wikiPages.views,
      })
      .from(wikiPages)
      .where(whereClause as any)
      .orderBy(desc(wikiPages.lastEditDate))
      .offset(skip)
      .limit(limit)

    // 본문에서 매칭 위치 주변 스니펫 추출 (앞뒤 ~80자)
    const qLower = q.toLowerCase()
    const buildSnippet = (content: string): string | null => {
      if (!content) return null
      const lower = content.toLowerCase()
      const idx = lower.indexOf(qLower)
      if (idx < 0) return null
      const start = Math.max(0, idx - 80)
      const end = Math.min(content.length, idx + qLower.length + 80)
      let snippet = content.slice(start, end).replace(/\s+/g, ' ').trim()
      if (start > 0) snippet = '… ' + snippet
      if (end < content.length) snippet = snippet + ' …'
      return snippet
    }

    const enriched = docs.map(({ content, ...rest }) => ({
      ...rest,
      snippet: buildSnippet(content || ''),
    }))

    // 검색 결과 문서들의 조회수 증가 (best effort)
    if (docs.length > 0) {
      try {
        const ids = docs.map((d) => d._id as string)
        await db
          .update(wikiPages)
          .set({ views: sql`${wikiPages.views} + 1` })
          .where(inArray(wikiPages.id, ids))
      } catch (e) {
        console.warn('view increment failed:', e)
      }
    }

    return NextResponse.json({ success: true, results: enriched, total, limit, skip })
  } catch (error) {
    console.error('검색 오류:', error)
    return NextResponse.json(
      { success: false, error: '검색 처리 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
