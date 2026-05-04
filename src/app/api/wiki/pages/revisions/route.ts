import { NextRequest, NextResponse } from 'next/server'
import { and, asc, desc, eq, or, sql } from 'drizzle-orm'
import { getDb } from '@/db/client'
import { wikiPages, wikiRevisions } from '@/db/schema/wiki'

export const dynamic = 'force-dynamic'

// GET /api/wiki/pages/revisions
// Query:
//  - title or slug (one required)
//  - rev (optional): if provided, return detail for that revision (and prev)
//  - limit, skip, sort (desc|asc) for list mode
//  - author, type (create|edit|revert|redirect|protect|move) filters (optional)
export async function GET(request: NextRequest) {
  try {
    const db = getDb()
    const { searchParams } = new URL(request.url)
    const title = searchParams.get('title')
    const slug = searchParams.get('slug')
    const revParam = searchParams.get('rev')
    const limit = parseInt(searchParams.get('limit') || '20', 10)
    const skip = parseInt(searchParams.get('skip') || '0', 10)
    const sortAsc = (searchParams.get('sort') || 'desc').toLowerCase() === 'asc'
    const author = searchParams.get('author')
    const type = searchParams.get('type')

    if (!title && !slug) {
      return NextResponse.json(
        { success: false, error: 'title 또는 slug가 필요합니다.' },
        { status: 400 }
      )
    }

    const pageWhere = title
      ? or(eq(wikiPages.title, title), eq(wikiPages.slug, title))
      : eq(wikiPages.slug, slug as string)

    const [page] = await db
      .select({ id: wikiPages.id })
      .from(wikiPages)
      .where(pageWhere as any)
      .limit(1)

    if (!page) {
      return NextResponse.json(
        { success: false, error: '문서를 찾을 수 없습니다.' },
        { status: 404 }
      )
    }

    // Detail mode
    if (revParam) {
      const revNumber = parseInt(revParam, 10)
      if (!Number.isFinite(revNumber)) {
        return NextResponse.json(
          { success: false, error: 'rev 파라미터가 올바르지 않습니다.' },
          { status: 400 }
        )
      }

      const [current] = await db
        .select()
        .from(wikiRevisions)
        .where(
          and(
            eq(wikiRevisions.pageId, page.id),
            eq(wikiRevisions.revisionNumber, revNumber)
          )
        )
        .limit(1)

      if (!current) {
        return NextResponse.json(
          { success: false, error: '해당 리비전을 찾을 수 없습니다.' },
          { status: 404 }
        )
      }

      const [prev] = await db
        .select()
        .from(wikiRevisions)
        .where(
          and(
            eq(wikiRevisions.pageId, page.id),
            eq(wikiRevisions.revisionNumber, revNumber - 1)
          )
        )
        .limit(1)

      return NextResponse.json({
        success: true,
        revision: sanitizeRevision(current),
        previous: prev ? sanitizeRevision(prev) : null,
      })
    }

    // List mode
    const conditions: any[] = [eq(wikiRevisions.pageId, page.id)]
    if (author) conditions.push(eq(wikiRevisions.author, author))
    if (type) conditions.push(eq(wikiRevisions.editType, type))
    const where = and(...conditions)

    const [{ count: total }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(wikiRevisions)
      .where(where as any)

    const orderBy = sortAsc
      ? asc(wikiRevisions.revisionNumber)
      : desc(wikiRevisions.revisionNumber)

    const sliced = await db
      .select()
      .from(wikiRevisions)
      .where(where as any)
      .orderBy(orderBy)
      .offset(skip)
      .limit(limit)

    return NextResponse.json({
      success: true,
      total,
      limit,
      skip,
      hasMore: skip + sliced.length < total,
      revisions: sliced.map((r) => sanitizeRevision(r, /*omitContent*/ true)),
    })
  } catch (error) {
    console.error('리비전 조회 오류:', error)
    return NextResponse.json(
      { success: false, error: '리비전 조회 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

function sanitizeRevision(r: any, omitContent: boolean = false) {
  return {
    revisionNumber: r.revisionNumber,
    summary: r.summary,
    author: r.author,
    authorId: r.authorId || null,
    editType: r.editType,
    isMinorEdit: r.isMinorEdit,
    contentLength: r.contentLength,
    sizeChange: r.sizeChange,
    isReverted: r.isReverted,
    isVerified: r.isVerified,
    timestamp: r.timestampAt,
    content: omitContent ? undefined : r.content,
  }
}
