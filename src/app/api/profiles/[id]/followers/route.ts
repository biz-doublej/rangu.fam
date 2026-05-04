import { NextRequest, NextResponse } from 'next/server'
import { eq, inArray } from 'drizzle-orm'
import { getDb } from '@/db/client'
import { profiles } from '@/db/schema/profiles'
import { users } from '@/db/schema/users'

export const dynamic = 'force-dynamic'

// GET - 팔로워 목록 조회
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const db = getDb()
    const { id } = params

    // UUID-ish (32 hex digits with dashes optional). Mongo 시절 ObjectId(24-hex)도 옴.
    const isIdLike = /^[0-9a-fA-F-]{24,36}$/.test(id)

    const profileRows = await db
      .select({ followers: profiles.followers })
      .from(profiles)
      .where(isIdLike ? eq(profiles.userId, id) : eq(profiles.username, id))
      .limit(1)

    if (profileRows.length === 0) {
      return NextResponse.json(
        { success: false, error: '프로필을 찾을 수 없습니다.' },
        { status: 404 }
      )
    }

    const followerIds = (profileRows[0].followers ?? []).filter(Boolean)

    if (followerIds.length === 0) {
      return NextResponse.json({ success: true, followers: [] })
    }

    const followerUsers = await db
      .select({
        _id: users.id,
        username: users.username,
        email: users.email,
      })
      .from(users)
      .where(inArray(users.id, followerIds))

    return NextResponse.json({ success: true, followers: followerUsers })
  } catch (error) {
    console.error('팔로워 목록 조회 오류:', error)
    return NextResponse.json(
      { success: false, error: '팔로워 목록을 가져오는데 실패했습니다.' },
      { status: 500 }
    )
  }
}
