import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  return NextResponse.json(
    {
      success: false,
      error: '관리자 개별 로그인은 제거되었습니다. DoubleJ 통합 로그인을 이용해주세요.',
    },
    { status: 410 }
  )
}

export async function POST() {
  return NextResponse.json(
    {
      success: false,
      error: '관리자 개별 로그인은 제거되었습니다. DoubleJ 통합 로그인을 이용해주세요.',
    },
    { status: 410 }
  )
}
