import { NextRequest, NextResponse } from 'next/server'
import { clearDoubleJAuthCookie, clearWikiAuthCookie } from '@/lib/doublejAuth'

export const dynamic = 'force-dynamic'

export async function POST(_: NextRequest) {
  const response = NextResponse.json({
    success: true,
    message: '로그아웃되었습니다.',
  })

  clearDoubleJAuthCookie(response)
  clearWikiAuthCookie(response)

  return response
}
