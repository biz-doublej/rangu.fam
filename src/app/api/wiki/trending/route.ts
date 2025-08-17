import { NextResponse } from 'next/server'
import dbConnect from '@/lib/mongodb'
import { WikiPage } from '@/models/Wiki'

export const dynamic = 'force-dynamic'

// GET /api/wiki/trending?limit=10
export async function GET(request: Request) {
  await dbConnect()
  const { searchParams } = new URL(request.url)
  const limit = Math.min(parseInt(searchParams.get('limit') || '10', 10), 50)

  // 최근 24시간 내에 조회수(views)가 1 이상인 문서 기준
  const since = new Date(Date.now() - 1000 * 60 * 60 * 24)
  const docs = await WikiPage.find({
    isDeleted: { $ne: true },
    updatedAt: { $gte: since },
    views: { $gte: 1 }
  })
    .sort({ views: -1 })
    .limit(limit)
    .select('title slug views')
    .lean()

  return NextResponse.json({ success: true, trending: docs })
}
