import { NextRequest, NextResponse } from 'next/server'
import dbConnect from '@/lib/mongodb'
import { WikiPage } from '@/models/Wiki'
export const dynamic = 'force-dynamic'

// GET /api/wiki/pages/revisions
// Query:
//  - title or slug (one required)
//  - rev (optional): if provided, return detail for that revision (and prev)
//  - limit, skip, sort (desc|asc) for list mode
//  - author, type (create|edit|revert|redirect|protect|move) filters (optional)
export async function GET(request: NextRequest) {
  try {
    await dbConnect()
    const { searchParams } = new URL(request.url)
    const title = searchParams.get('title')
    const slug = searchParams.get('slug')
    const revParam = searchParams.get('rev')
    const limit = parseInt(searchParams.get('limit') || '20', 10)
    const skip = parseInt(searchParams.get('skip') || '0', 10)
    const sortDir = (searchParams.get('sort') || 'desc').toLowerCase() === 'asc' ? 1 : -1
    const author = searchParams.get('author')
    const type = searchParams.get('type')

    if (!title && !slug) {
      return NextResponse.json({ success: false, error: 'title 또는 slug가 필요합니다.' }, { status: 400 })
    }

    const page = await WikiPage.findOne(title ? { $or: [{ title }, { slug: title }] } : { slug })
    if (!page) {
      return NextResponse.json({ success: false, error: '문서를 찾을 수 없습니다.' }, { status: 404 })
    }

    // Detail mode
    if (revParam) {
      const revNumber = parseInt(revParam, 10)
      if (!Number.isFinite(revNumber)) {
        return NextResponse.json({ success: false, error: 'rev 파라미터가 올바르지 않습니다.' }, { status: 400 })
      }
      const current = page.revisions.find((r: any) => r.revisionNumber === revNumber)
      if (!current) {
        return NextResponse.json({ success: false, error: '해당 리비전을 찾을 수 없습니다.' }, { status: 404 })
      }
      const prev = page.revisions.find((r: any) => r.revisionNumber === revNumber - 1) || null
      return NextResponse.json({
        success: true,
        revision: sanitizeRevision(current),
        previous: prev ? sanitizeRevision(prev) : null
      })
    }

    // List mode
    let revisions: any[] = [...(page.revisions || [])]

    if (author) {
      revisions = revisions.filter(r => (r.author || '').toString() === author)
    }
    if (type) {
      revisions = revisions.filter(r => (r.editType || 'edit') === type)
    }

    revisions.sort((a, b) => (a.revisionNumber - b.revisionNumber) * sortDir)

    const total = revisions.length
    const sliced = revisions.slice(skip, skip + limit)

    return NextResponse.json({
      success: true,
      total,
      limit,
      skip,
      hasMore: skip + sliced.length < total,
      revisions: sliced.map((r) => sanitizeRevision(r, /*omitContent*/ true))
    })
  } catch (error) {
    console.error('리비전 조회 오류:', error)
    return NextResponse.json({ success: false, error: '리비전 조회 중 오류가 발생했습니다.' }, { status: 500 })
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
    timestamp: r.timestamp,
    content: omitContent ? undefined : r.content
  }
}


