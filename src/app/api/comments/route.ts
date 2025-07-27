import { NextRequest, NextResponse } from 'next/server'
import dbConnect from '@/lib/mongodb'
import Comment from '@/models/Comment'
import Track from '@/models/Track'
import User from '@/models/User'

// GET - 댓글 가져오기 (트랙별 또는 사용자별)
export async function GET(request: NextRequest) {
  try {
    await dbConnect()

    const { searchParams } = new URL(request.url)
    const trackId = searchParams.get('trackId')
    const playlistId = searchParams.get('playlistId')
    const userId = searchParams.get('userId')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')

    // 필터 조건 구성
    const filter: any = {}
    
    if (trackId) {
      filter.trackId = trackId
      filter.parentCommentId = { $exists: false } // 대댓글 제외
    }

    if (playlistId) {
      filter.playlistId = playlistId
      filter.parentCommentId = { $exists: false }
    }

    if (userId) {
      filter.userById = userId
    }

    const skip = (page - 1) * limit

    // 댓글 조회 (populate로 관련 데이터 포함)
    const comments = await Comment.find(filter)
      .populate('userById', 'username profileImage')
      .populate({
        path: 'repliesIds',
        populate: {
          path: 'userById',
          select: 'username profileImage'
        },
        options: { limit: 5, sort: { createdAt: 1 } }
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean()

    const total = await Comment.countDocuments(filter)

    return NextResponse.json({
      success: true,
      comments,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    })

  } catch (error) {
    console.error('댓글 조회 오류:', error)
    return NextResponse.json(
      { success: false, error: '댓글을 가져오는데 실패했습니다.' },
      { status: 500 }
    )
  }
}

// POST - 새 댓글 추가
export async function POST(request: NextRequest) {
  try {
    await dbConnect()

    const body = await request.json()
    const {
      content,
      userId,
      username,
      trackId,
      playlistId,
      parentCommentId
    } = body

    // 필수 필드 검증
    if (!content || !userId || !username) {
      return NextResponse.json(
        { success: false, error: '필수 필드가 누락되었습니다.' },
        { status: 400 }
      )
    }

    if (!trackId && !playlistId) {
      return NextResponse.json(
        { success: false, error: '트랙 ID 또는 플레이리스트 ID가 필요합니다.' },
        { status: 400 }
      )
    }

    // 사용자 존재 확인
    const user = await User.findById(userId)
    if (!user) {
      return NextResponse.json(
        { success: false, error: '사용자를 찾을 수 없습니다.' },
        { status: 404 }
      )
    }

    // 부모 댓글 존재 확인 (대댓글인 경우)
    if (parentCommentId) {
      const parentComment = await Comment.findById(parentCommentId)
      if (!parentComment) {
        return NextResponse.json(
          { success: false, error: '부모 댓글을 찾을 수 없습니다.' },
          { status: 404 }
        )
      }
    }

    // 새 댓글 생성
    const newComment = new Comment({
      content,
      userId,
      userById: userId,
      username,
      trackId: trackId || undefined,
      playlistId: playlistId || undefined,
      parentCommentId: parentCommentId || undefined
    })

    const savedComment = await newComment.save()

    // 부모 댓글이 있는 경우 대댓글 목록에 추가
    if (parentCommentId) {
      await Comment.findByIdAndUpdate(parentCommentId, {
        $push: { repliesIds: savedComment._id }
      })
    }

    // 트랙의 댓글 목록에 추가
    if (trackId) {
      await Track.findByIdAndUpdate(trackId, {
        $push: { commentsIds: savedComment._id }
      })
    }

    // 생성된 댓글을 populate하여 반환
    const populatedComment = await Comment.findById(savedComment._id)
      .populate('userById', 'username profileImage')
      .lean()

    return NextResponse.json({
      success: true,
      comment: populatedComment
    }, { status: 201 })

  } catch (error) {
    console.error('댓글 생성 오류:', error)
    return NextResponse.json(
      { success: false, error: '댓글 생성에 실패했습니다.' },
      { status: 500 }
    )
  }
} 