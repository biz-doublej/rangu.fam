import { NextRequest, NextResponse } from 'next/server'
import dbConnect from '@/lib/mongodb'
import { WikiPage } from '@/models/Wiki'

export const dynamic = 'force-dynamic'

// GET /api/wiki/search?q=...&namespace=&limit=20&skip=0
export async function GET(request: NextRequest) {
  try {
    await dbConnect()
    const { searchParams } = request.nextUrl
    const q = (searchParams.get('q') || '').trim()
    const namespace = searchParams.get('namespace') || undefined
    const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10), 50)
    const skip = parseInt(searchParams.get('skip') || '0', 10)

    if (!q) {
      return NextResponse.json({ success: true, results: [], total: 0, limit, skip })
    }

    const query: any = {}
    if (namespace) query.namespace = namespace

    let docs: any[] = []
    let total = 0

    // 1) 텍스트 인덱스 검색 시도
    try {
      docs = await WikiPage.find(
        {
          ...query,
          $text: { $search: q },
          isDeleted: { $ne: true }
        },
        { score: { $meta: 'textScore' } }
      )
        .sort({ score: { $meta: 'textScore' } })
        .skip(skip)
        .limit(limit)
        .select('title slug namespace summary categories lastEditDate lastEditor edits views')
        .lean()

      total = await WikiPage.countDocuments({ ...query, $text: { $search: q }, isDeleted: { $ne: true } })
    } catch (err) {
      // 텍스트 인덱스가 없거나 오류일 경우 바로 정규식 검색으로 폴백
      console.warn('Text search failed, falling back to regex search:', (err as any)?.message || err)
    }

    // 텍스트 인덱스가 결과 없으면 부분 매칭 fallback
    if (docs.length === 0) {
      const regex = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')
      const orQuery = {
        ...query,
        isDeleted: { $ne: true },
        $or: [
          { title: regex },
          { content: regex },
          { summary: regex },
          { tags: { $in: [regex] } }
        ]
      }
      total = await WikiPage.countDocuments(orQuery)
      docs = await WikiPage.find(orQuery)
        .sort({ lastEditDate: -1 })
        .skip(skip)
        .limit(limit)
        .select('title slug namespace summary categories lastEditDate lastEditor edits views')
        .lean()
    }

    // 검색 결과 문서들의 조회수 증가
    if (docs.length > 0) {
      const ids = docs.map(doc => doc._id)
      await WikiPage.updateMany({ _id: { $in: ids } }, { $inc: { views: 1 } })
    }
    return NextResponse.json({ success: true, results: docs, total, limit, skip })
  } catch (error) {
    console.error('검색 오류:', error)
    return NextResponse.json({ success: false, error: '검색 처리 중 오류가 발생했습니다.' }, { status: 500 })
  }
}

