import { NextRequest, NextResponse } from 'next/server'
import { and, eq, or, sql } from 'drizzle-orm'
import { getDb } from '@/db/client'
import { profiles } from '@/db/schema/profiles'

export const dynamic = 'force-dynamic'

// POST - 팔로우 / 언팔로우
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const db = getDb()
    const { userId, action } = await request.json()
    const { id: targetId } = params

    if (!userId || !action || !['follow', 'unfollow'].includes(action)) {
      return NextResponse.json(
        { success: false, error: '필수 파라미터가 누락되었거나 action이 잘못됐습니다.' },
        { status: 400 }
      )
    }

    // ID가 UUID 형식이면 userId 기준, 아니면 username 기준
    const isUuid =
      /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(targetId)

    const [targetProfile] = await db
      .select()
      .from(profiles)
      .where(isUuid ? eq(profiles.userId, targetId) : eq(profiles.username, targetId))
      .limit(1)

    if (!targetProfile) {
      return NextResponse.json(
        { success: false, error: '대상 프로필을 찾을 수 없습니다.' },
        { status: 404 }
      )
    }

    const [userProfile] = await db
      .select()
      .from(profiles)
      .where(eq(profiles.userId, userId))
      .limit(1)

    if (!userProfile) {
      return NextResponse.json(
        { success: false, error: '사용자 프로필을 찾을 수 없습니다.' },
        { status: 404 }
      )
    }

    if (userProfile.userId === targetProfile.userId) {
      return NextResponse.json(
        { success: false, error: '자기 자신을 팔로우할 수 없습니다.' },
        { status: 400 }
      )
    }

    const now = new Date()

    if (action === 'follow') {
      // 대상의 followers 에 내 userId 추가 (중복 제거)
      const newFollowers = Array.isArray(targetProfile.followers)
        ? Array.from(new Set([...targetProfile.followers, userId]))
        : [userId]
      await db
        .update(profiles)
        .set({ followers: newFollowers, updatedAt: now })
        .where(eq(profiles.id, targetProfile.id))

      // 내 following 에 대상 userId 추가
      const newFollowing = Array.isArray(userProfile.following)
        ? Array.from(new Set([...userProfile.following, targetProfile.userId]))
        : [targetProfile.userId]
      await db
        .update(profiles)
        .set({ following: newFollowing, updatedAt: now })
        .where(eq(profiles.id, userProfile.id))
    } else {
      // unfollow
      const newFollowers = Array.isArray(targetProfile.followers)
        ? targetProfile.followers.filter((f) => f !== userId)
        : []
      await db
        .update(profiles)
        .set({ followers: newFollowers, updatedAt: now })
        .where(eq(profiles.id, targetProfile.id))

      const newFollowing = Array.isArray(userProfile.following)
        ? userProfile.following.filter((f) => f !== targetProfile.userId)
        : []
      await db
        .update(profiles)
        .set({ following: newFollowing, updatedAt: now })
        .where(eq(profiles.id, userProfile.id))
    }

    return NextResponse.json({
      success: true,
      message: action === 'follow' ? '팔로우했습니다.' : '언팔로우했습니다.',
      followers: action === 'follow'
        ? (targetProfile.followers?.length || 0) + (targetProfile.followers?.includes(userId) ? 0 : 1)
        : (targetProfile.followers?.filter((f) => f !== userId).length || 0),
    })
  } catch (error) {
    console.error('팔로우 처리 오류:', error)
    return NextResponse.json(
      { success: false, error: '팔로우 처리 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
