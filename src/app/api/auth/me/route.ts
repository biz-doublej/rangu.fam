import { NextRequest, NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { buildClientUser, getAuthenticatedWikiUser, resolveMemberIdForUser } from '@/lib/doublejAuth'
import { MemberService } from '@/services/memberService'
import { getDb } from '@/db/client'
import { wikiUsers } from '@/db/schema/wiki'

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

    // 마지막 활동 시간 업데이트 (Drizzle row이라 .save() 없음)
    try {
      const db = getDb()
      const userId = (user as any).id || (user as any)._id
      if (userId) {
        await db
          .update(wikiUsers)
          .set({ lastActivity: new Date() })
          .where(eq(wikiUsers.id, userId))
      }
    } catch (e) {
      console.warn('lastActivity update failed:', e)
    }

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
