import { NextRequest, NextResponse } from 'next/server'
import dbConnect from '@/lib/mongodb'
import { WikiPage } from '@/models/Wiki'

export const dynamic = 'force-dynamic'

// GET /api/wiki/categories?name=분류이름&limit=50&skip=0
export async function GET(request: NextRequest) {
  try {
    await dbConnect()
    const { searchParams } = new URL(request.url)
    const name = (searchParams.get('name') || '').trim()
    const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 100)
    const skip = parseInt(searchParams.get('skip') || '0', 10)
    if (!name) return NextResponse.json({ success: true, pages: [], total: 0 })

    const query = { isDeleted: { $ne: true }, categories: { $in: [name] } }
    const total = await WikiPage.countDocuments(query)
    const pages = await WikiPage.find(query)
      .sort({ title: 1 })
      .skip(skip)
      .limit(limit)
      .select('title slug namespace summary categories')
      .lean()

    return NextResponse.json({ success: true, pages, total, limit, skip })
  } catch (error) {
    console.error('분류 조회 오류:', error)
    return NextResponse.json({ success: false, error: '분류 조회 중 오류' }, { status: 500 })
  }
}


