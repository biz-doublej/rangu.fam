import { NextRequest, NextResponse } from 'next/server'
import { and, asc, eq, ilike, ne, or, sql } from 'drizzle-orm'
import { getDb } from '@/db/client'
import { wikiPages } from '@/db/schema/wiki'
import { extractCategoriesFromContent, normalizeCategoryName } from '@/lib/wikiCategories'

export const dynamic = 'force-dynamic'

type CategorySummary = {
  name: string
  count: number
  sample: Array<{ title: string; slug: string; summary?: string | null }>
}

function addSampleToMap(
  map: Map<string, CategorySummary>,
  category: string,
  page: { title: string; slug: string; summary?: string | null }
) {
  const normalized = normalizeCategoryName(category)
  if (!normalized) return
  const existing = map.get(normalized) || { name: normalized, count: 0, sample: [] }
  existing.count += 1
  if (existing.sample.length < 3) {
    existing.sample.push({ title: page.title, slug: page.slug, summary: page.summary })
  }
  map.set(normalized, existing)
}

// GET /api/wiki/categories?name=분류명&limit=50&skip=0
// GET /api/wiki/categories?summary=1&limit=24
export async function GET(request: NextRequest) {
  try {
    const db = getDb()

    const { searchParams } = new URL(request.url)
    const rawName = (searchParams.get('name') || '').trim()
    const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 200)
    const skip = parseInt(searchParams.get('skip') || '0', 10)
    const summaryMode = searchParams.get('summary') === '1' || !rawName

    if (summaryMode) {
      const map = new Map<string, CategorySummary>()

      // 1) categories 배열을 unnest 해서 group by
      const aggregated = await db.execute<{
        category: string
        count: number
        title: string
        slug: string
        summary: string | null
      }>(
        sql`
          SELECT
            cat AS category,
            count(*)::int AS count,
            (array_agg(title))[1:3] AS titles,
            (array_agg(slug))[1:3] AS slugs,
            (array_agg(summary))[1:3] AS summaries
          FROM (
            SELECT title, slug, summary, unnest(categories) AS cat
            FROM wiki_pages
            WHERE is_deleted IS NOT TRUE AND array_length(categories, 1) > 0
          ) sub
          GROUP BY cat
        `
      )

      const rows = (aggregated as any).rows ?? aggregated
      for (const row of rows as any[]) {
        const normalized = normalizeCategoryName(row.category)
        if (!normalized) continue
        const titles: string[] = Array.isArray(row.titles) ? row.titles : []
        const slugs: string[] = Array.isArray(row.slugs) ? row.slugs : []
        const summaries: (string | null)[] = Array.isArray(row.summaries) ? row.summaries : []
        const sample = titles.slice(0, 3).map((t, i) => ({
          title: t,
          slug: slugs[i] || '',
          summary: summaries[i],
        }))
        map.set(normalized, { name: normalized, count: Number(row.count), sample })
      }

      // 2) categories가 비어있지만 본문에 [[분류:..]] 가 있는 경우 fallback
      const fallbackDocs = await db
        .select({
          title: wikiPages.title,
          slug: wikiPages.slug,
          summary: wikiPages.summary,
          content: wikiPages.content,
        })
        .from(wikiPages)
        .where(
          and(
            ne(wikiPages.isDeleted, true),
            sql`(array_length(${wikiPages.categories}, 1) IS NULL OR array_length(${wikiPages.categories}, 1) = 0)`,
            or(
              ilike(wikiPages.content, '%[[분류:%'),
              ilike(wikiPages.content, '%[[카테고리:%')
            )
          )
        )

      for (const doc of fallbackDocs) {
        const derived = extractCategoriesFromContent(doc.content || '')
        derived.forEach((cat) =>
          addSampleToMap(map, cat, { title: doc.title, slug: doc.slug, summary: doc.summary })
        )
      }

      const categories = Array.from(map.values())
        .sort((a, b) => {
          if (b.count !== a.count) return b.count - a.count
          return a.name.localeCompare(b.name, 'ko')
        })
        .slice(skip, skip + limit)

      return NextResponse.json({ success: true, categories, total: map.size, limit, skip })
    }

    // 단일 카테고리 페이지 조회
    const name = normalizeCategoryName(rawName)
    if (!name) {
      return NextResponse.json({ success: true, pages: [], total: 0 })
    }

    const where = and(
      ne(wikiPages.isDeleted, true),
      or(
        sql`${name} = ANY(${wikiPages.categories})`,
        ilike(wikiPages.content, `%[[분류:${name}%`),
        ilike(wikiPages.content, `%[[카테고리:${name}%`)
      )
    )

    const [{ count: total }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(wikiPages)
      .where(where as any)

    const pages = await db
      .select({
        title: wikiPages.title,
        slug: wikiPages.slug,
        namespace: wikiPages.namespace,
        summary: wikiPages.summary,
        categories: wikiPages.categories,
        content: wikiPages.content,
      })
      .from(wikiPages)
      .where(where as any)
      .orderBy(asc(wikiPages.title))
      .offset(skip)
      .limit(limit)

    const normalizedPages = pages.map((page) => {
      const derived =
        page.categories && page.categories.length > 0
          ? page.categories
          : extractCategoriesFromContent(page.content || '')
      return {
        title: page.title,
        slug: page.slug,
        namespace: page.namespace,
        summary: page.summary,
        categories: derived,
      }
    })

    return NextResponse.json({ success: true, pages: normalizedPages, total, limit, skip })
  } catch (error) {
    console.error('분류 조회 오류:', error)
    return NextResponse.json({ success: false, error: '분류 조회 중 오류' }, { status: 500 })
  }
}
