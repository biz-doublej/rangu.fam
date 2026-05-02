import { NextRequest, NextResponse } from 'next/server'
import { MemberService } from '@/services/memberService'
import {
  buildClientUser,
  getAuthenticatedWikiUser,
  resolveMemberIdForUser,
} from '@/lib/doublejAuth'

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

    const memberId = resolveMemberIdForUser(user)
    const memberProfile = memberId
      ? await MemberService.getMember(memberId).catch(() => null)
      : null

    return NextResponse.json({
      success: true,
      data: {
        ...buildClientUser(user),
        discordId: user.discordId || null,
        discordUsername: user.discordUsername || null,
        discordAvatar: user.discordAvatar || null,
        memberId,
        memberLinkedAt: memberId ? user.createdAt || null : null,
        memberProfile,
        wikiUsername: user.username,
        wikiLinkedAt: user.createdAt || null,
      },
    })
  } catch (error) {
    console.error('Account session error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch account session' },
      { status: 500 }
    )
  }
}
