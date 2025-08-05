import { NextRequest, NextResponse } from 'next/server'
import dbConnect from '@/lib/mongodb'
import User from '@/models/User'
import bcrypt from 'bcryptjs'

// POST - 새로운 사용자 추가 (관리자용)
export async function POST(request: NextRequest) {
  try {
    await dbConnect()
    
    const body = await request.json()
    const { username, email, password, role = 'member', bio = '' } = body
    
    // 필수 필드 검증
    if (!username || !email || !password) {
      return NextResponse.json(
        { success: false, error: '사용자명, 이메일, 비밀번호는 필수입니다.' },
        { status: 400 }
      )
    }
    
    // 이미 존재하는 사용자 확인
    const existingUser = await User.findOne({
      $or: [{ username }, { email }]
    })
    
    if (existingUser) {
      return NextResponse.json(
        { success: false, error: '이미 존재하는 사용자명 또는 이메일입니다.' },
        { status: 409 }
      )
    }
    
    // 비밀번호 해시화
    const hashedPassword = await bcrypt.hash(password, 12)
    
    // 새 사용자 생성
    const newUser = new User({
      username,
      email,
      password: hashedPassword,
      role,
      bio,
      profileImage: `/images/${username}.jpg`,
      favoriteGenres: [],
      favoriteTracksIds: [],
      playlistsIds: [],
      followingIds: [],
      followersIds: [],
      lastLogin: new Date(),
      isOnline: false,
      totalPlays: 0,
      totalLikes: 0
    })
    
    await newUser.save()
    
    // 비밀번호 제외하고 응답
    const userResponse = {
      id: newUser._id,
      username: newUser.username,
      email: newUser.email,
      role: newUser.role,
      bio: newUser.bio,
      profileImage: newUser.profileImage,
      createdAt: newUser.createdAt
    }
    
    return NextResponse.json({
      success: true,
      message: '사용자가 성공적으로 생성되었습니다.',
      data: userResponse
    })
    
  } catch (error) {
    console.error('사용자 추가 오류:', error)
    return NextResponse.json(
      { success: false, error: '사용자 생성에 실패했습니다.' },
      { status: 500 }
    )
  }
}

// GET - 모든 사용자 목록 조회 (관리자용)
export async function GET(request: NextRequest) {
  try {
    await dbConnect()
    
    const users = await User.find({}, '-password').lean()
    
    return NextResponse.json({
      success: true,
      data: users
    })
    
  } catch (error) {
    console.error('사용자 목록 조회 오류:', error)
    return NextResponse.json(
      { success: false, error: '사용자 목록을 불러오는데 실패했습니다.' },
      { status: 500 }
    )
  }
}