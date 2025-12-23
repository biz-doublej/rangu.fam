import { NextRequest, NextResponse } from 'next/server'
import { connectToDatabase } from '@/lib/mongodb'
import { Bookmark } from '@/models/Bookmark'
export const dynamic = 'force-dynamic'

// POST: 북마크 순서 재정렬
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, bookmarkIds } = body

    // 필수 필드 검증
    if (!userId || !Array.isArray(bookmarkIds)) {
      return NextResponse.json(
        { success: false, error: '사용자 ID와 북마크 ID 배열이 필요합니다.' },
        { status: 400 }
      )
    }

    // 유효한 사용자 ID 확인
    const validUserIds = ['jaewon', 'minseok', 'jinkyu', 'hanul', 'seungchan']
    if (!validUserIds.includes(userId)) {
      return NextResponse.json(
        { success: false, error: '유효하지 않은 사용자 ID입니다.' },
        { status: 400 }
      )
    }

    try {
      await connectToDatabase()
      
      // 해당 사용자의 모든 북마크 조회
      const userBookmarks = await Bookmark.find({ userId })
      
      // 제공된 ID들이 모두 해당 사용자의 북마크인지 확인
      const userBookmarkIds = userBookmarks.map(bookmark => bookmark._id.toString())
      const validIds = bookmarkIds.filter(id => userBookmarkIds.includes(id))
      
      if (validIds.length !== bookmarkIds.length) {
        return NextResponse.json(
          { success: false, error: '유효하지 않은 북마크 ID가 포함되어 있습니다.' },
          { status: 400 }
        )
      }

      // 순서 업데이트
      const bulkOps = bookmarkIds.map((bookmarkId: string, index: number) => ({
        updateOne: {
          filter: { _id: bookmarkId, userId },
          update: { order: index }
        }
      }))

      await Bookmark.bulkWrite(bulkOps)
      
      // 업데이트된 북마크 목록 반환
      const updatedBookmarks = await Bookmark.find({ userId }).sort({ order: 1 })
      
      return NextResponse.json({
        success: true,
        data: updatedBookmarks,
        message: '북마크 순서가 업데이트되었습니다.'
      })
    } catch (dbError) {
      console.warn('MongoDB 연결 실패:', dbError)
      return NextResponse.json(
        { success: false, error: 'MongoDB 연결이 필요합니다.' },
        { status: 503 }
      )
    }
  } catch (error) {
    console.error('북마크 순서 재정렬 오류:', error)
    return NextResponse.json(
      { success: false, error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
