import { NextRequest, NextResponse } from 'next/server'
import dbConnect from '@/lib/mongodb'
import Profile from '@/models/Profile'
import User from '@/models/User'
export const dynamic = 'force-dynamic'

// GET - 모든 프로필 또는 특정 사용자 프로필 가져오기
export async function GET(request: NextRequest) {
  try {
    await dbConnect()

    const { searchParams } = new URL(request.url)
    const username = searchParams.get('username')
    const userId = searchParams.get('userId')

    if (username) {
      // 특정 사용자명으로 프로필 조회
      const profile = await Profile.findOne({ username })
        .populate('userId', 'username email profileImage role')
        .lean()

      if (!profile) {
        return NextResponse.json(
          { success: false, error: '프로필을 찾을 수 없습니다.' },
          { status: 404 }
        )
      }

      // 조회수 증가
      await Profile.findByIdAndUpdate((profile as any)._id, {
        $inc: { viewCount: 1 }
      })

      return NextResponse.json({
        success: true,
        profile
      })
    }

    if (userId) {
      // 특정 사용자 ID로 프로필 조회
      const profile = await Profile.findOne({ userId })
        .populate('userId', 'username email profileImage role')
        .lean()

      if (!profile) {
        return NextResponse.json(
          { success: false, error: '프로필을 찾을 수 없습니다.' },
          { status: 404 }
        )
      }

      return NextResponse.json({
        success: true,
        profile
      })
    }

    // 모든 프로필 조회 (공개된 것만)
    const profiles = await Profile.find({ isPublic: true })
      .populate('userId', 'username email profileImage role')
      .sort({ viewCount: -1 })
      .limit(20)
      .lean()

    return NextResponse.json({
      success: true,
      profiles
    })

  } catch (error) {
    console.error('프로필 조회 오류:', error)
    return NextResponse.json(
      { success: false, error: '프로필을 가져오는데 실패했습니다.' },
      { status: 500 }
    )
  }
}

// POST - 새 프로필 생성
export async function POST(request: NextRequest) {
  try {
    await dbConnect()

    const body = await request.json()
    const { userId, username, intro, bio, location } = body

    // 필수 필드 검증
    if (!userId || !username) {
      return NextResponse.json(
        { success: false, error: '필수 필드가 누락되었습니다.' },
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

    // 기존 프로필 존재 확인
    const existingProfile = await Profile.findOne({ 
      $or: [{ userId }, { username }] 
    })
    
    if (existingProfile) {
      return NextResponse.json(
        { success: false, error: '이미 프로필이 존재합니다.' },
        { status: 409 }
      )
    }

    // 새 프로필 생성
    const newProfile = new Profile({
      userId,
      username,
      intro: intro || '',
      bio: bio || '',
      location: location || '',
      skills: [],
      projects: [],
      experience: [],
      education: [],
      socialLinks: {},
      recentPosts: [],
      viewCount: 0,
      likesReceived: 0,
      isPublic: true,
      showEmail: false,
      showPhone: false,
      allowComments: true
    })

    const savedProfile = await newProfile.save()

    // 생성된 프로필을 populate하여 반환
    const populatedProfile = await Profile.findById(savedProfile._id)
      .populate('userId', 'username email profileImage role')
      .lean()

    return NextResponse.json({
      success: true,
      profile: populatedProfile
    }, { status: 201 })

  } catch (error) {
    console.error('프로필 생성 오류:', error)
    return NextResponse.json(
      { success: false, error: '프로필 생성에 실패했습니다.' },
      { status: 500 }
    )
  }
}

// PUT - 프로필 업데이트
export async function PUT(request: NextRequest) {
  try {
    await dbConnect()

    const body = await request.json()
    const { profileId, userId, updateData } = body

    // 권한 확인 - 본인의 프로필만 수정 가능
    let profile
    if (profileId) {
      profile = await Profile.findById(profileId)
    } else if (userId) {
      profile = await Profile.findOne({ userId })
    }

    if (!profile) {
      return NextResponse.json(
        { success: false, error: '프로필을 찾을 수 없습니다.' },
        { status: 404 }
      )
    }

    // 업데이트할 수 있는 필드들만 필터링
    const allowedFields = [
      'intro', 'bio', 'location', 'website', 'phone', 'birthdate',
      'skills', 'projects', 'experience', 'education', 'socialLinks',
      'recentPosts', 'isPublic', 'showEmail', 'showPhone', 'allowComments'
    ]

    const filteredUpdate: any = {}
    Object.keys(updateData).forEach(key => {
      if (allowedFields.includes(key)) {
        filteredUpdate[key] = updateData[key]
      }
    })

    // 프로필 업데이트
    const updatedProfile = await Profile.findByIdAndUpdate(
      profile._id,
      filteredUpdate,
      { new: true, runValidators: true }
    ).populate('userId', 'username email profileImage role').lean()

    return NextResponse.json({
      success: true,
      profile: updatedProfile
    })

  } catch (error) {
    console.error('프로필 업데이트 오류:', error)
    return NextResponse.json(
      { success: false, error: '프로필 업데이트에 실패했습니다.' },
      { status: 500 }
    )
  }
} 