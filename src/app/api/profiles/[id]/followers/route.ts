import { NextRequest, NextResponse } from 'next/server'
import dbConnect from '@/lib/mongodb'
import Profile from '@/models/Profile'
export const dynamic = 'force-dynamic'

// GET - 팔로워 목록 조회
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await dbConnect()
    
    const { id } = params

    // ID가 ObjectId 형식인지 확인
    const isObjectId = /^[0-9a-fA-F]{24}$/.test(id)
    
    // 프로필 찾기
    let profile
    if (isObjectId) {
      // ObjectId로 조회 (userId 기준)
      profile = await Profile.findOne({ userId: id })
        .populate('followers', 'username email').lean()
    } else {
      // username으로 조회
      profile = await Profile.findOne({ username: id })
        .populate('followers', 'username email').lean()
    }

    if (!profile) {
      return NextResponse.json(
        { success: false, error: '프로필을 찾을 수 없습니다.' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      followers: (profile as any).followers || []
    })

  } catch (error) {
    console.error('팔로워 목록 조회 오류:', error)
    return NextResponse.json(
      { success: false, error: '팔로워 목록을 가져오는데 실패했습니다.' },
      { status: 500 }
    )
  }
}