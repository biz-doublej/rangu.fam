import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/mongodb'
import { Bookmark } from '@/models/Bookmark'
export const dynamic = 'force-dynamic'

// GET: 특정 북마크 조회
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params
    
    try {
      await connectDB()
      const bookmark = await Bookmark.findById(id)
      
      if (!bookmark) {
        return NextResponse.json(
          { success: false, error: '북마크를 찾을 수 없습니다.' },
          { status: 404 }
        )
      }
      
      return NextResponse.json({
        success: true,
        data: bookmark
      })
    } catch (dbError) {
      console.warn('MongoDB 연결 실패:', dbError)
      return NextResponse.json(
        { success: false, error: 'MongoDB 연결이 필요합니다.' },
        { status: 503 }
      )
    }
  } catch (error) {
    console.error('북마크 조회 오류:', error)
    return NextResponse.json(
      { success: false, error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

// PUT: 북마크 수정
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params
    const body = await request.json()
    const { title, url, description, icon, order } = body

    // URL 유효성 검증 (제공된 경우)
    if (url) {
      try {
        new URL(url)
      } catch {
        return NextResponse.json(
          { success: false, error: '유효한 URL을 입력해주세요.' },
          { status: 400 }
        )
      }
    }

    try {
      await connectDB()
      
      // 북마크 존재 확인
      const existingBookmark = await Bookmark.findById(id)
      if (!existingBookmark) {
        return NextResponse.json(
          { success: false, error: '북마크를 찾을 수 없습니다.' },
          { status: 404 }
        )
      }

      // 업데이트할 필드만 포함
      const updateFields: any = {}
      if (title !== undefined) updateFields.title = title.trim()
      if (url !== undefined) updateFields.url = url.trim()
      if (description !== undefined) updateFields.description = description?.trim()
      if (icon !== undefined) updateFields.icon = icon?.trim() || '🔗'
      if (order !== undefined) updateFields.order = order

      // 북마크 업데이트
      const updatedBookmark = await Bookmark.findByIdAndUpdate(
        id,
        updateFields,
        { new: true, runValidators: true }
      )
      
      return NextResponse.json({
        success: true,
        data: updatedBookmark
      })
    } catch (dbError) {
      console.warn('MongoDB 연결 실패:', dbError)
      return NextResponse.json(
        { success: false, error: 'MongoDB 연결이 필요합니다.' },
        { status: 503 }
      )
    }
  } catch (error) {
    console.error('북마크 수정 오류:', error)
    return NextResponse.json(
      { success: false, error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

// DELETE: 북마크 삭제
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params
    
    try {
      await connectDB()
      
      // 북마크 존재 확인 및 삭제
      const deletedBookmark = await Bookmark.findByIdAndDelete(id)
      
      if (!deletedBookmark) {
        return NextResponse.json(
          { success: false, error: '북마크를 찾을 수 없습니다.' },
          { status: 404 }
        )
      }

      // 삭제된 북마크 이후의 order를 재정렬
      await Bookmark.updateMany(
        { 
          userId: deletedBookmark.userId,
          order: { $gt: deletedBookmark.order }
        },
        { $inc: { order: -1 } }
      )
      
      return NextResponse.json({
        success: true,
        message: '북마크가 삭제되었습니다.',
        data: deletedBookmark
      })
    } catch (dbError) {
      console.warn('MongoDB 연결 실패:', dbError)
      return NextResponse.json(
        { success: false, error: 'MongoDB 연결이 필요합니다.' },
        { status: 503 }
      )
    }
  } catch (error) {
    console.error('북마크 삭제 오류:', error)
    return NextResponse.json(
      { success: false, error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
