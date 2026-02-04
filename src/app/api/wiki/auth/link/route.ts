import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedWikiUser } from '@/lib/doublejAuth'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  const user = await getAuthenticatedWikiUser(request)
  if (!user) {
    return NextResponse.json(
      { success: false, error: 'DoubleJ 통합 로그인이 필요합니다.' },
      { status: 401 }
    )
  }

  return NextResponse.json(
    {
      success: false,
      error:
        '통합 로그인 개편으로 위키 계정 별도 연동은 제거되었습니다. Discord 연결은 계정 설정에서 진행해주세요.',
    },
    { status: 400 }
  )
}
