import { NextRequest, NextResponse } from 'next/server'
import { desc, isNotNull, ne, and } from 'drizzle-orm'
import { getDb } from '@/db/client'
import { wikiPages } from '@/db/schema/wiki'

export const dynamic = 'force-dynamic'

// GET /api/wiki/latest-edit - 전체 위키에서 가장 최근 편집 정보
export async function GET(request: NextRequest) {
  try {
    const db = getDb()

    const [latest] = await db
      .select({
        title: wikiPages.title,
        lastEditDate: wikiPages.lastEditDate,
        lastEditor: wikiPages.lastEditor,
        lastEditSummary: wikiPages.lastEditSummary,
      })
      .from(wikiPages)
      .where(and(ne(wikiPages.isDeleted, true), isNotNull(wikiPages.lastEditDate)))
      .orderBy(desc(wikiPages.lastEditDate))
      .limit(1)

    if (!latest) {
      return NextResponse.json(
        { success: false, error: '편집된 페이지가 없습니다.' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      latestEdit: {
        title: latest.title,
        lastEditDate: latest.lastEditDate,
        lastEditor: latest.lastEditor || '알수없음',
        lastEditSummary: latest.lastEditSummary || '',
      },
    })
  } catch (error) {
    console.error('최근 편집 조회 오류:', error)
    return NextResponse.json(
      { success: false, error: '최근 편집 조회 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
