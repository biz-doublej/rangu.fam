import { NextRequest, NextResponse } from 'next/server'
import dbConnect from '@/lib/mongodb'
import { WikiPage } from '@/models/Wiki'
import { extractCategoriesFromContent, normalizeCategoryName, buildCategoryRegex } from '@/lib/wikiCategories'

export const dynamic = 'force-dynamic'

type CategorySummary = {
  name: string
  count: number
  sample: Array<{ title: string; slug: string; summary?: string }>
}

function addSampleToMap(
  map: Map<string, CategorySummary>,
  category: string,
  page: { title: string; slug: string; summary?: string }
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
    await dbConnect()
    const { searchParams } = new URL(request.url)
    const rawName = (searchParams.get('name') || '').trim()
    const limitParam = Math.min(parseInt(searchParams.get('limit') || '50', 10), 200)
    const skip = parseInt(searchParams.get('skip') || '0', 10)
    const summaryMode = searchParams.get('summary') === '1' || !rawName

    if (summaryMode) {
      const map = new Map<string, CategorySummary>()

      const aggregated = await WikiPage.aggregate([
        { $match: { isDeleted: { $ne: true }, categories: { $exists: true, $ne: [] } } },
        { $project: { title: 1, slug: 1, summary: 1, categories: 1 } },
        { $unwind: '$categories' },
        {
          $group: {
            _id: '$categories',
            count: { $sum: 1 },
            sample: { $push: { title: '$title', slug: '$slug', summary: '$summary' } }
          }
        }
      ])

      aggregated.forEach((entry: any) => {
        const normalized = normalizeCategoryName(entry._id)
        if (!normalized) return
        map.set(normalized, {
          name: normalized,
          count: entry.count,
          sample: (entry.sample || []).slice(0, 3)
        })
      })

      const fallbackDocs = await WikiPage.find({
        isDeleted: { $ne: true },
        $or: [{ categories: { $exists: false } }, { categories: { $size: 0 } }],
        content: { $regex: /\[\[(?:분류|카테고리):/i }
      })
        .select('title slug summary content')
        .lean()

      fallbackDocs.forEach((doc) => {
        const derived = extractCategoriesFromContent(doc.content)
        derived.forEach((cat) =>
          addSampleToMap(map, cat, { title: doc.title, slug: doc.slug, summary: doc.summary })
        )
      })

      const categories = Array.from(map.values())
        .sort((a, b) => {
          if (b.count !== a.count) return b.count - a.count
          return a.name.localeCompare(b.name, 'ko')
        })
        .slice(skip, skip + limitParam)

      return NextResponse.json({
        success: true,
        categories,
        total: map.size,
        limit: limitParam,
        skip
      })
    }

    const name = normalizeCategoryName(rawName)
    if (!name) {
      return NextResponse.json({ success: true, pages: [], total: 0 })
    }

    const regex = buildCategoryRegex(name)
    const query = {
      isDeleted: { $ne: true },
      $or: [{ categories: { $in: [name] } }, { content: { $regex: regex } }]
    }

    const total = await WikiPage.countDocuments(query)
    const pages = await WikiPage.find(query)
      .sort({ title: 1 })
      .skip(skip)
      .limit(limitParam)
      .select('title slug namespace summary categories content')
      .lean()

    const normalizedPages = pages.map((page) => {
      const derived =
        page.categories && page.categories.length > 0
          ? page.categories
          : extractCategoriesFromContent(page.content as string)
      return {
        title: page.title,
        slug: page.slug,
        namespace: page.namespace,
        summary: page.summary,
        categories: derived
      }
    })

    return NextResponse.json({
      success: true,
      pages: normalizedPages,
      total,
      limit: limitParam,
      skip
    })
  } catch (error) {
    console.error('분류 조회 오류:', error)
    return NextResponse.json({ success: false, error: '분류 조회 중 오류' }, { status: 500 })
  }
}
