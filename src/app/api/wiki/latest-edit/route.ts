import { NextRequest, NextResponse } from 'next/server'
import dbConnect from '@/lib/mongodb'
import { WikiPage } from '@/models/Wiki'

export const dynamic = 'force-dynamic'

// GET /api/wiki/latest-edit - 전체 위키에서 가장 최근 편집 정보 가져오기
export async function GET(request: NextRequest) {
  try {
    await dbConnect()
    
    // 가장 최근에 편집된 페이지 찾기 (삭제되지 않은 페이지만)
    const latestPage = await WikiPage
      .findOne({ 
        isDeleted: { $ne: true },
        lastEditDate: { $exists: true }
      })
      .sort({ lastEditDate: -1 })
      .select('title lastEditDate lastEditor lastEditSummary')
      .lean()
    
    if (!latestPage) {
      return NextResponse.json({
        success: false,
        error: '편집된 페이지가 없습니다.'
      }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      latestEdit: {
        title: (latestPage as any).title,
        lastEditDate: (latestPage as any).lastEditDate,
        lastEditor: (latestPage as any).lastEditor || '알수없음',
        lastEditSummary: (latestPage as any).lastEditSummary || ''
      }
    })
    
  } catch (error) {
    console.error('최근 편집 조회 오류:', error)
    return NextResponse.json(
      { success: false, error: '최근 편집 조회 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
