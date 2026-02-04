import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function POST() {
  return NextResponse.json(
    {
      success: false,
      error: '기존 위키 개별 로그인은 제거되었습니다. /login 의 DoubleJ 통합 로그인을 이용해주세요.',
    },
    { status: 410 }
  )
}
