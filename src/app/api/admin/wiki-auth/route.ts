import { NextRequest, NextResponse } from 'next/server'
import dbConnect from '@/lib/mongodb'
import { WikiUser } from '@/models/Wiki'
import jwt from 'jsonwebtoken'

export const dynamic = 'force-dynamic'

// GET - 현재 로그인한 WikiUser 정보 확인
export async function GET(request: NextRequest) {
  try {
    await dbConnect()
    
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, error: '인증 토큰이 없습니다.' },
        { status: 401 }
      )
    }
    
    const token = authHeader.split(' ')[1]
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret') as any
    
    const user = await WikiUser.findOne({ username: decoded.username })
      .select('-password')
      .lean()
    
    if (!user) {
      return NextResponse.json(
        { success: false, error: '사용자를 찾을 수 없습니다.' },
        { status: 404 }
      )
    }
    
    const isAdmin = (user as any).role === 'admin' || (user as any).role === 'owner'
    
    return NextResponse.json({
      success: true,
      user: {
        ...user,
        isAdmin
      }
    })
    
  } catch (error) {
    console.error('WikiUser 인증 확인 오류:', error)
    return NextResponse.json(
      { success: false, error: '인증 확인 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

// POST - WikiUser 로그인
export async function POST(request: NextRequest) {
  try {
    await dbConnect()
    
    const { username, password } = await request.json()
    
    if (!username || !password) {
      return NextResponse.json(
        { success: false, error: '사용자명과 비밀번호를 입력해주세요.' },
        { status: 400 }
      )
    }
    
    const user = await WikiUser.findOne({ username })
    
    if (!user) {
      return NextResponse.json(
        { success: false, error: '존재하지 않는 사용자입니다.' },
        { status: 401 }
      )
    }
    
    // 비밀번호 확인 (실제로는 bcrypt 등을 사용해야 함)
    if (user.password !== password) {
      return NextResponse.json(
        { success: false, error: '비밀번호가 올바르지 않습니다.' },
        { status: 401 }
      )
    }
    
    // 관리자 권한 확인
    if (user.role !== 'admin' && user.role !== 'owner') {
      return NextResponse.json(
        { success: false, error: '관리자 권한이 필요합니다.' },
        { status: 403 }
      )
    }
    
    // 계정 상태 확인
    if (!user.isActive) {
      return NextResponse.json(
        { success: false, error: '비활성화된 계정입니다.' },
        { status: 403 }
      )
    }
    
    if (user.banStatus?.isBanned) {
      return NextResponse.json(
        { success: false, error: '차단된 계정입니다.' },
        { status: 403 }
      )
    }
    
    // JWT 토큰 생성
    const token = jwt.sign(
      { 
        userId: user._id,
        username: user.username,
        role: user.role 
      },
      process.env.JWT_SECRET || 'fallback-secret',
      { expiresIn: '7d' }
    )
    
    // 로그인 시간 업데이트
    user.lastLogin = new Date()
    user.lastActivity = new Date()
    await user.save()
    
    return NextResponse.json({
      success: true,
      token,
      user: {
        id: user._id,
        username: user.username,
        displayName: user.displayName,
        role: user.role,
        avatar: user.avatar,
        isAdmin: user.role === 'admin' || user.role === 'owner'
      }
    })
    
  } catch (error) {
    console.error('WikiUser 로그인 오류:', error)
    return NextResponse.json(
      { success: false, error: '로그인 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
