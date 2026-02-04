import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedWikiUser, resolveMemberIdForUser } from '@/lib/doublejAuth'
import { MemberService } from '@/backend/services/memberService'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedWikiUser(request)
    if (!user) {
      return NextResponse.json(
        { success: false, error: '로그인이 필요합니다.' },
        { status: 401 }
      )
    }

    const memberId = resolveMemberIdForUser(user)
    if (!memberId) {
      return NextResponse.json(
        {
          success: false,
          error: '지정된 다섯 멤버 계정만 멤버 권한이 적용됩니다. 그 외 계정은 게스트로 동작합니다.',
        },
        { status: 403 }
      )
    }

    const memberProfile = await MemberService.getMember(memberId).catch(() => null)

    return NextResponse.json({
      success: true,
      data: {
        memberId,
        memberLinkedAt: user.createdAt || null,
        memberProfile,
      },
    })
  } catch (error) {
    console.error('Member link error:', error)
    return NextResponse.json(
      { success: false, error: '멤버 상태 확인에 실패했습니다.' },
      { status: 500 }
    )
  }
}
