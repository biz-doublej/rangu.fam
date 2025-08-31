import { NextRequest, NextResponse } from 'next/server'
import { generateAdminToken, validateAdminPassword } from '@/lib/adminAuth'

// POST /api/admin/auth - 관리자 로그인
export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json()

    if (!username || !password) {
      return NextResponse.json({ error: '사용자명과 비밀번호가 필요합니다' }, { status: 400 })
    }

    // 비밀번호 검증
    const isValid = validateAdminPassword(username, password)
    if (!isValid) {
      return NextResponse.json({ error: '잘못된 인증 정보입니다' }, { status: 401 })
    }

    // JWT 토큰 생성
    const token = generateAdminToken(username)

    return NextResponse.json({
      success: true,
      token,
      user: { username, role: 'admin' }
    })
  } catch (error) {
    console.error('관리자 인증 오류:', error)
    return NextResponse.json({ error: '서버 오류' }, { status: 500 })
  }
}

// GET /api/admin/auth - 토큰 검증 (간단한 테스트용)
export async function GET(request: NextRequest) {
  try {
    // 테스트용 토큰 생성
    const testToken = generateAdminToken('gabriel0727')
    
    return NextResponse.json({
      success: true,
      message: '테스트용 토큰 생성됨',
      token: testToken
    })
  } catch (error) {
    console.error('테스트 토큰 생성 오류:', error)
    return NextResponse.json({ error: '서버 오류' }, { status: 500 })
  }
}