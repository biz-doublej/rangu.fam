import { NextRequest, NextResponse } from 'next/server'
import dbConnect from '@/lib/mongodb'
import { WikiPage } from '@/models/Wiki'

export const dynamic = 'force-dynamic'

// GET /api/wiki/recent?namespace=&type=&author=&limit=50&skip=0
export async function GET(request: NextRequest) {
  try {
    await dbConnect()
    const { searchParams } = request.nextUrl
    const namespace = searchParams.get('namespace') || undefined
    const type = searchParams.get('type') || undefined
    const author = searchParams.get('author') || undefined
    const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 100)
    const skip = parseInt(searchParams.get('skip') || '0', 10)

    const match: any = {}
    if (namespace) match.namespace = namespace

    const pipeline: any[] = [
      { $match: { isDeleted: { $ne: true }, ...(match) } },
      { $unwind: '$revisions' },
      { $sort: { 'revisions.timestamp': -1 } },
    ]

    if (type) pipeline.push({ $match: { 'revisions.editType': type } })
    if (author) pipeline.push({ $match: { 'revisions.author': author } })

    pipeline.push(
      { $skip: skip },
      { $limit: limit },
      { $project: {
        title: 1,
        slug: 1,
        namespace: 1,
        revision: '$revisions'
      } }
    )

    const docs = await (WikiPage as any).aggregate(pipeline)
    return NextResponse.json({ success: true, changes: docs })
  } catch (error) {
    console.error('최근 변경 조회 오류:', error)
    return NextResponse.json({ success: false, error: '최근 변경 조회 중 오류' }, { status: 500 })
  }
}


