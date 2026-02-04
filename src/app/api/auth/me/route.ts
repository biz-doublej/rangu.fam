import { NextRequest, NextResponse } from 'next/server'
import { buildClientUser, getAuthenticatedWikiUser, resolveMemberIdForUser } from '@/lib/doublejAuth'
import { MemberService } from '@/backend/services/memberService'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedWikiUser(request)
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      )
    }

    user.lastActivity = new Date()
    await user.save()

    const memberId = resolveMemberIdForUser(user)
    const memberProfile = memberId ? await MemberService.getMember(memberId).catch(() => null) : null

    return NextResponse.json({
      success: true,
      data: {
        user: buildClientUser(user),
        memberProfile,
        linkedWikiUsername: user.username,
        discordLinked: !!user.discordId,
        discordUsername: user.discordUsername || null,
        discordAvatar: user.discordAvatar || null,
      },
    })
  } catch (error) {
    console.error('통합 세션 조회 오류:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch session' },
      { status: 500 }
    )
  }
}
