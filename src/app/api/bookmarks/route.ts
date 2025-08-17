import { NextRequest, NextResponse } from 'next/server'
import { connectToDatabase } from '@/lib/mongodb'
import { Bookmark } from '@/models/Bookmark'
import { Bookmark as BookmarkType } from '@/types'
export const dynamic = 'force-dynamic'

// GET: 특정 사용자의 북마크 목록 조회
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    
    if (!userId) {
      return NextResponse.json(
        { success: false, error: '사용자 ID가 필요합니다.' },
        { status: 400 }
      )
    }

    // 유효한 사용자 ID 확인
    const validUserIds = ['jaewon', 'minseok', 'jinkyu', 'hanul', 'seungchan', 'heeyeol']
    if (!validUserIds.includes(userId)) {
      return NextResponse.json(
        { success: false, error: '유효하지 않은 사용자 ID입니다.' },
        { status: 400 }
      )
    }

    try {
      await connectToDatabase()
      // userId로 북마크 조회 (order 순으로 정렬)
      const bookmarks = await Bookmark.find({ userId }).sort({ order: 1 })
      
      return NextResponse.json({
        success: true,
        data: bookmarks
      })
    } catch (dbError) {
      console.warn('MongoDB 연결 실패, 빈 배열 반환:', dbError)
      // 데이터베이스 연결 실패 시 빈 배열 반환
      return NextResponse.json({
        success: true,
        data: [],
        message: 'MongoDB 연결이 필요합니다. 현재는 빈 목록을 표시합니다.'
      })
    }
  } catch (error) {
    console.error('북마크 조회 오류:', error)
    return NextResponse.json(
      { success: false, error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

// POST: 새 북마크 생성
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, title, url, description, icon } = body

    // 필수 필드 검증
    if (!userId || !title || !url) {
      return NextResponse.json(
        { success: false, error: '사용자 ID, 제목, URL은 필수입니다.' },
        { status: 400 }
      )
    }

    // 유효한 사용자 ID 확인
    const validUserIds = ['jaewon', 'minseok', 'jinkyu', 'hanul', 'seungchan', 'heeyeol']
    if (!validUserIds.includes(userId)) {
      return NextResponse.json(
        { success: false, error: '유효하지 않은 사용자 ID입니다.' },
        { status: 400 }
      )
    }

    // URL 유효성 검증
    try {
      new URL(url)
    } catch {
      return NextResponse.json(
        { success: false, error: '유효한 URL을 입력해주세요.' },
        { status: 400 }
      )
    }

    try {
      await connectToDatabase()
      
      // 사용자의 현재 북마크 개수 확인하여 order 설정
      const bookmarkCount = await Bookmark.countDocuments({ userId })
      
      // 새 북마크 생성
      const newBookmark = new Bookmark({
        userId,
        title: title.trim(),
        url: url.trim(),
        description: description?.trim(),
        icon: icon?.trim() || '🔗',
        order: bookmarkCount
      })

      const savedBookmark = await newBookmark.save()
      
      return NextResponse.json({
        success: true,
        data: savedBookmark
      }, { status: 201 })
    } catch (dbError) {
      console.warn('MongoDB 연결 실패:', dbError)
      return NextResponse.json(
        { success: false, error: 'MongoDB 연결이 필요합니다. 데이터베이스를 설정해주세요.' },
        { status: 503 }
      )
    }
  } catch (error) {
    console.error('북마크 생성 오류:', error)
    return NextResponse.json(
      { success: false, error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}