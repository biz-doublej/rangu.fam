import { NextRequest, NextResponse } from 'next/server'
import { eq, inArray } from 'drizzle-orm'
import { getDb } from '@/db/client'
import { profiles } from '@/db/schema/profiles'
import { users } from '@/db/schema/users'

export const dynamic = 'force-dynamic'

// GET - 팔로잉 목록 조회
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const db = getDb()
    const { id } = params

    const isIdLike = /^[0-9a-fA-F-]{24,36}$/.test(id)

    const profileRows = await db
      .select({ following: profiles.following })
      .from(profiles)
      .where(isIdLike ? eq(profiles.userId, id) : eq(profiles.username, id))
      .limit(1)

    if (profileRows.length === 0) {
      return NextResponse.json(
        { success: false, error: '프로필을 찾을 수 없습니다.' },
        { status: 404 }
      )
    }

    const followingIds = (profileRows[0].following ?? []).filter(Boolean)

    if (followingIds.length === 0) {
      return NextResponse.json({ success: true, following: [] })
    }

    const followingUsers = await db
      .select({
        _id: users.id,
        username: users.username,
        email: users.email,
      })
      .from(users)
      .where(inArray(users.id, followingIds))

    return NextResponse.json({ success: true, following: followingUsers })
  } catch (error) {
    console.error('팔로잉 목록 조회 오류:', error)
    return NextResponse.json(
      { success: false, error: '팔로잉 목록을 가져오는데 실패했습니다.' },
      { status: 500 }
    )
  }
}
