import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const response = NextResponse.json({
      success: true,
      message: '로그아웃 되었습니다.'
    })
    
    // 위키 토큰 쿠키 제거
    response.cookies.set('wiki-token', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 0 // 즉시 만료
    })
    
    return response
    
  } catch (error) {
    console.error('위키 로그아웃 오류:', error)
    return NextResponse.json(
      { success: false, error: '로그아웃 처리 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
} 