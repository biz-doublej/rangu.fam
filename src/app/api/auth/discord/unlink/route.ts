import { NextRequest, NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { getDb } from '@/db/client'
import { wikiUsers } from '@/db/schema/wiki'
import { getAuthenticatedWikiUser } from '@/lib/doublejAuth'

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
