import { NextRequest, NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { getDb } from '@/db/client'
import { wikiUsers } from '@/db/schema/wiki'
import { getAuthenticatedWikiUser, isWhitelistedWikiAdmin, resolveMemberIdForUser } from '@/lib/doublejAuth'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const authUser = await getAuthenticatedWikiUser(request)
    if (!authUser) {
      return NextResponse.json(
        { success: false, error: '로그인이 필요합니다.' },
        { status: 401 }
      )
    }

    // 멤버나 관리자 자격이 Discord 연결에만 달려 있으면 해제로 권한이 사라지므로 막는다.
    const withoutDiscord = { ...authUser, discordId: null, discordUsername: null }
    const losesAdmin = isWhitelistedWikiAdmin(authUser) && !isWhitelistedWikiAdmin(withoutDiscord)
    const losesMember = Boolean(resolveMemberIdForUser(authUser)) && !resolveMemberIdForUser(withoutDiscord)
    if (losesAdmin || losesMember) {
      return NextResponse.json(
        { success: false, error: 'Discord 연결로 유지되는 권한이 있어 해제할 수 없습니다. 운영진에게 문의해 주세요.' },
        { status: 400 }
      )
    }

    const db = getDb()
    const userId = (authUser as any).id || (authUser as any)._id

    await db
      .update(wikiUsers)
      .set({
        discordId: null,
        discordUsername: null,
        discordAvatar: null,
        updatedAt: new Date(),
      })
      .where(eq(wikiUsers.id, userId))

    return NextResponse.json({
      success: true,
      message: '디스코드 연결이 해제되었습니다.',
    })
  } catch (error) {
    console.error('Discord 연결 해제 오류:', error)
    return NextResponse.json(
      { success: false, error: '디스코드 연결 해제 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
