import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcrypt'
import dbConnect from '@/lib/mongodb'
import { WikiUser } from '@/models/Wiki'
import User from '@/models/User'

export async function POST(request: NextRequest) {
  try {
    await dbConnect()
    
    const { username, email, password, displayName, mainUserId } = await request.json()
    
    // 필수 필드 검증
    if (!username || !email || !password) {
      return NextResponse.json(
        { success: false, error: '사용자명, 이메일, 비밀번호는 필수입니다.' },
        { status: 400 }
      )
    }
    
    // 사용자명 유효성 검증
    if (username.length < 3 || username.length > 20) {
      return NextResponse.json(
        { success: false, error: '사용자명은 3-20자 사이여야 합니다.' },
        { status: 400 }
      )
    }
    
    // 사용자명 중복 검사
    const existingUser = await WikiUser.findOne({
      $or: [
        { username: username },
        { email: email }
      ]
    })
    
    if (existingUser) {
      const duplicateField = existingUser.username === username ? '사용자명' : '이메일'
      return NextResponse.json(
        { success: false, error: `이미 사용 중인 ${duplicateField}입니다.` },
        { status: 409 }
      )
    }
    
    // 메인 사이트 사용자와 연결 검사 (선택사항)
    let linkedMainUser = null
    if (mainUserId) {
      linkedMainUser = await User.findById(mainUserId)
      if (!linkedMainUser) {
        return NextResponse.json(
          { success: false, error: '연결할 메인 사이트 사용자를 찾을 수 없습니다.' },
          { status: 404 }
        )
      }
    }
    
    // 비밀번호 해싱
    const saltRounds = 12
    const hashedPassword = await bcrypt.hash(password, saltRounds)
    
    // 새 위키 사용자 생성
    const newWikiUser = new WikiUser({
      username,
      email,
      password: hashedPassword,
      displayName: displayName || username,
      avatar: linkedMainUser?.profileImage || null,
      bio: '',
      signature: '',
      role: 'editor', // 기본 역할
      permissions: {
        canEdit: true,
        canDelete: false,
        canProtect: false,
        canBan: false,
        canManageUsers: false
      },
      edits: 0,
      pagesCreated: 0,
      discussionPosts: 0,
      reputation: 0,
      preferences: {
        theme: 'auto',
        timezone: 'Asia/Seoul',
        emailNotifications: true,
        showEmail: false,
        autoWatchPages: true
      },
      isActive: true,
      isBanned: false,
      lastLogin: new Date(),
      lastActivity: new Date(),
      mainUserId: mainUserId || null
    })
    
    const savedUser = await newWikiUser.save()
    
    // 사용자 정보 (비밀번호 제외)
    const userInfo = {
      id: savedUser._id,
      username: savedUser.username,
      displayName: savedUser.displayName,
      email: savedUser.email,
      role: savedUser.role,
      permissions: savedUser.permissions,
      avatar: savedUser.avatar,
      bio: savedUser.bio,
      signature: savedUser.signature,
      edits: savedUser.edits,
      pagesCreated: savedUser.pagesCreated,
      reputation: savedUser.reputation,
      preferences: savedUser.preferences,
      isActive: savedUser.isActive,
      mainUserId: savedUser.mainUserId
    }
    
    return NextResponse.json({
      success: true,
      message: '위키 계정이 성공적으로 생성되었습니다.',
      user: userInfo
    })
    
  } catch (error) {
    console.error('위키 회원가입 오류:', error)
    
    // MongoDB 중복 키 오류 처리
    if ((error as any).code === 11000) {
      const duplicateField = Object.keys((error as any).keyValue)[0]
      const fieldName = duplicateField === 'username' ? '사용자명' : '이메일'
      return NextResponse.json(
        { success: false, error: `이미 사용 중인 ${fieldName}입니다.` },
        { status: 409 }
      )
    }
    
    return NextResponse.json(
      { success: false, error: '회원가입 처리 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
} 