import { NextRequest, NextResponse } from 'next/server'
import dbConnect from '@/lib/mongodb'
import Profile from '@/models/Profile'
export const dynamic = 'force-dynamic'

// POST - 팔로우/언팔로우
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await dbConnect()
    
    const { userId, action } = await request.json()
    const { id: targetId } = params

    if (!userId || !action) {
      return NextResponse.json(
        { success: false, error: '필수 파라미터가 누락되었습니다.' },
        { status: 400 }
      )
    }

    // ID가 ObjectId 형식인지 확인
    const isObjectId = /^[0-9a-fA-F]{24}$/.test(targetId)
    
    // 대상 프로필 찾기
    let targetProfile
    if (isObjectId) {
      // ObjectId로 조회 (userId 기준)
      targetProfile = await Profile.findOne({ userId: targetId })
    } else {
      // username으로 조회
      targetProfile = await Profile.findOne({ username: targetId })
    }

    if (!targetProfile) {
      return NextResponse.json(
        { success: false, error: '대상 프로필을 찾을 수 없습니다.' },
        { status: 404 }
      )
    }

    // 팔로우하는 사용자의 프로필 찾기
    const userProfile = await Profile.findOne({ userId })

    if (!userProfile) {
      return NextResponse.json(
        { success: false, error: '사용자 프로필을 찾을 수 없습니다.' },
        { status: 404 }
      )
    }

    if (action === 'follow') {
      // 팔로우 추가
      if (!targetProfile.followers.includes(userId)) {
        targetProfile.followers.push(userId)
        await targetProfile.save()
      }
      
      if (!userProfile.following.includes(targetProfile.userId)) {
        userProfile.following.push(targetProfile.userId)
        await userProfile.save()
      }
    } else if (action === 'unfollow') {
      // 언팔로우
      targetProfile.followers = targetProfile.followers.filter(
        (followerId: any) => followerId.toString() !== userId
      )
      await targetProfile.save()
      
      userProfile.following = userProfile.following.filter(
        (followingId: any) => followingId.toString() !== targetProfile.userId.toString()
      )
      await userProfile.save()
    }

    return NextResponse.json({
      success: true,
      message: action === 'follow' ? '팔로우했습니다.' : '언팔로우했습니다.'
    })

  } catch (error) {
    console.error('팔로우 처리 오류:', error)
    return NextResponse.json(
      { success: false, error: '팔로우 처리 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}