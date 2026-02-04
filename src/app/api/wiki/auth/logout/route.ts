import { NextRequest, NextResponse } from 'next/server'
import { clearDoubleJAuthCookie, clearWikiAuthCookie } from '@/lib/doublejAuth'

export const dynamic = 'force-dynamic'

export async function POST(_: NextRequest) {
  try {
    const response = NextResponse.json({
      success: true,
      message: '로그아웃 되었습니다.',
    })

    clearDoubleJAuthCookie(response)
    clearWikiAuthCookie(response)

    return response
  } catch (error) {
    console.error('위키 로그아웃 오류:', error)
    return NextResponse.json(
      { success: false, error: '로그아웃 처리 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
