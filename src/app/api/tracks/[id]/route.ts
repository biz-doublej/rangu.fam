import { NextRequest, NextResponse } from 'next/server'
import dbConnect from '@/lib/mongodb'
import Track from '@/models/Track'
import User from '@/models/User'
import Comment from '@/models/Comment'

// GET - 특정 트랙 가져오기
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await dbConnect()

    const track = await Track.findById(params.id)
      .populate('uploadedById', 'username profileImage')
      .populate({
        path: 'commentsIds',
        populate: {
          path: 'userById',
          select: 'username profileImage'
        },
        options: { sort: { createdAt: -1 } }
      })
      .lean()

    if (!track) {
      return NextResponse.json(
        { success: false, error: '트랙을 찾을 수 없습니다.' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      track
    })

  } catch (error) {
    console.error('트랙 조회 오류:', error)
    return NextResponse.json(
      { success: false, error: '트랙을 가져오는데 실패했습니다.' },
      { status: 500 }
    )
  }
}

// PUT - 트랙 정보 업데이트 (좋아요, 재생수 증가 등)
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await dbConnect()

    const body = await request.json()
    const { action, userId } = body

    const track = await Track.findById(params.id)
    if (!track) {
      return NextResponse.json(
        { success: false, error: '트랙을 찾을 수 없습니다.' },
        { status: 404 }
      )
    }

    let updatedTrack

    switch (action) {
      case 'play':
        // 재생수 증가
        updatedTrack = await Track.findByIdAndUpdate(
          params.id,
          { $inc: { plays: 1 } },
          { new: true }
        )
        break

      case 'like':
        // 좋아요 증가
        updatedTrack = await Track.findByIdAndUpdate(
          params.id,
          { $inc: { likes: 1 } },
          { new: true }
        )
        
        // 사용자의 즐겨찾기에 추가
        if (userId) {
          await User.findByIdAndUpdate(userId, {
            $addToSet: { favoriteTracksIds: params.id }
          })
        }
        break

      case 'unlike':
        // 좋아요 감소
        updatedTrack = await Track.findByIdAndUpdate(
          params.id,
          { $inc: { likes: -1 } },
          { new: true }
        )
        
        // 사용자의 즐겨찾기에서 제거
        if (userId) {
          await User.findByIdAndUpdate(userId, {
            $pull: { favoriteTracksIds: params.id }
          })
        }
        break

      case 'dislike':
        // 싫어요 증가
        updatedTrack = await Track.findByIdAndUpdate(
          params.id,
          { $inc: { dislikes: 1 } },
          { new: true }
        )
        break

      case 'undislike':
        // 싫어요 감소
        updatedTrack = await Track.findByIdAndUpdate(
          params.id,
          { $inc: { dislikes: -1 } },
          { new: true }
        )
        break

      case 'update':
        // 트랙 정보 업데이트
        const { title, artist, album, genre, tags, description } = body
        updatedTrack = await Track.findByIdAndUpdate(
          params.id,
          {
            title,
            artist,
            album,
            genre,
            tags,
            description
          },
          { new: true }
        )
        break

      default:
        return NextResponse.json(
          { success: false, error: '유효하지 않은 액션입니다.' },
          { status: 400 }
        )
    }

    return NextResponse.json({
      success: true,
      track: updatedTrack
    })

  } catch (error) {
    console.error('트랙 업데이트 오류:', error)
    return NextResponse.json(
      { success: false, error: '트랙 업데이트에 실패했습니다.' },
      { status: 500 }
    )
  }
}

// DELETE - 트랙 삭제
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await dbConnect()

    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    const track = await Track.findById(params.id)
    if (!track) {
      return NextResponse.json(
        { success: false, error: '트랙을 찾을 수 없습니다.' },
        { status: 404 }
      )
    }

    // 트랙 소유자 또는 관리자만 삭제 가능
    if (track.uploadedById.toString() !== userId) {
      const user = await User.findById(userId)
      if (!user || user.role !== 'admin') {
        return NextResponse.json(
          { success: false, error: '트랙을 삭제할 권한이 없습니다.' },
          { status: 403 }
        )
      }
    }

    // 관련 댓글들 삭제
    await Comment.deleteMany({ trackId: params.id })

    // 트랙 삭제
    await Track.findByIdAndDelete(params.id)

    // 모든 사용자의 즐겨찾기에서 제거
    await User.updateMany(
      { favoriteTracksIds: params.id },
      { $pull: { favoriteTracksIds: params.id } }
    )

    return NextResponse.json({
      success: true,
      message: '트랙이 성공적으로 삭제되었습니다.'
    })

  } catch (error) {
    console.error('트랙 삭제 오류:', error)
    return NextResponse.json(
      { success: false, error: '트랙 삭제에 실패했습니다.' },
      { status: 500 }
    )
  }
} 