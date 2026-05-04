import { NextRequest, NextResponse } from 'next/server'
import { and, desc, eq, ne, sql } from 'drizzle-orm'
import { getDb } from '@/db/client'
import { wikiPages, wikiRevisions } from '@/db/schema/wiki'

export const dynamic = 'force-dynamic'

// GET /api/wiki/recent?namespace=&type=&author=&limit=100&skip=0&all=false
export async function GET(request: NextRequest) {
  try {
    const db = getDb()

    const { searchParams } = request.nextUrl
    const namespace = searchParams.get('namespace') || undefined
    const type = searchParams.get('type') || undefined
    const author = searchParams.get('author') || undefined
    const all = searchParams.get('all') === 'true'
    const limit = all ? 1000 : Math.min(parseInt(searchParams.get('limit') || '50', 10), 500)
    const skip = parseInt(searchParams.get('skip') || '0', 10)

    // wiki_revisions JOIN wiki_pages
    // ── conditions ──────────────────────────────────────────────
    const conditions: any[] = [ne(wikiPages.isDeleted, true)]
    if (namespace) conditions.push(eq(wikiPages.namespace, namespace))
    if (type) conditions.push(eq(wikiRevisions.editType, type))
    if (author) conditions.push(eq(wikiRevisions.author, author))
    const where = and(...conditions)

    const rows = await db
      .select({
        title: wikiPages.title,
        slug: wikiPages.slug,
        namespace: wikiPages.namespace,
        revision: {
          _id: wikiRevisions.id,
          revisionNumber: wikiRevisions.revisionNumber,
          author: wikiRevisions.author,
          authorId: wikiRevisions.authorId,
          summary: wikiRevisions.summary,
          editType: wikiRevisions.editType,
          isMinorEdit: wikiRevisions.isMinorEdit,
          isAutomated: wikiRevisions.isAutomated,
          contentLength: wikiRevisions.contentLength,
          sizeChange: wikiRevisions.sizeChange,
          isReverted: wikiRevisions.isReverted,
          timestamp: wikiRevisions.timestampAt,
          createdAt: wikiRevisions.createdAt,
        },
      })
      .from(wikiRevisions)
      .innerJoin(wikiPages, eq(wikiPages.id, wikiRevisions.pageId))
      .where(where as any)
      .orderBy(desc(wikiRevisions.timestampAt))
      .offset(skip)
      .limit(limit)

    // count
    const [{ count: total }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(wikiRevisions)
      .innerJoin(wikiPages, eq(wikiPages.id, wikiRevisions.pageId))
      .where(where as any)

    return NextResponse.json({
      success: true,
      changes: rows,
      pagination: {
        total,
        skip,
        limit,
        hasMore: skip + rows.length < total,
      },
    })
  } catch (error) {
    console.error('최근 변경 조회 오류:', error)
    return NextResponse.json(
      { success: false, error: '최근 변경 조회 중 오류' },
      { status: 500 }
    )
  }
}
