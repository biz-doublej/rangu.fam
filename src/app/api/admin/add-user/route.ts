import { NextRequest, NextResponse } from 'next/server'
import { eq, or, desc } from 'drizzle-orm'
import crypto from 'crypto'
import { getDb } from '@/db/client'
import { users } from '@/db/schema/users'
import { checkAdminAuth } from '@/lib/adminAuth'

export const dynamic = 'force-dynamic'

// POST - 새로운 사용자 추가 (관리자용)
export async function POST(request: NextRequest) {
  try {
    const admin = await checkAdminAuth(request)
    if (!admin) {
      return NextResponse.json(
        { success: false, error: '관리자 권한이 필요합니다.' },
        { status: 403 }
      )
    }

    const db = getDb()
    const body = await request.json()
    const { username, email, password, role = 'member', bio = '' } = body

    if (!username || !email) {
      return NextResponse.json(
        { success: false, error: '사용자명, 이메일은 필수입니다.' },
        { status: 400 }
      )
    }

    // 중복 체크
    const [existing] = await db
      .select({ id: users.id })
      .from(users)
      .where(or(eq(users.username, username), eq(users.email, email)))
      .limit(1)

    if (existing) {
      return NextResponse.json(
        { success: false, error: '이미 존재하는 사용자명 또는 이메일입니다.' },
        { status: 409 }
      )
    }

    // SSO-only 정책 — password 필드는 NOT NULL 이므로 placeholder.
    // 사용자가 password 를 명시하면 그 값을 평문으로 저장 안 함 (어차피 로컬 인증 사용 안 함).
    const placeholderPassword =
      password
        ? `__admin_set__${crypto.randomBytes(32).toString('base64')}`
        : `__admin_seed__${crypto.randomBytes(48).toString('base64')}`

    const [newUser] = await db
      .insert(users)
      .values({
        username,
        email,
        password: placeholderPassword,
        role,
        bio,
        profileImage: `/images/${username}.jpg`,
        favoriteGenres: [],
        favoriteTracksIds: [],
        playlistsIds: [],
        followingIds: [],
        followersIds: [],
        lastLogin: new Date(),
        totalPlays: 0,
        totalLikes: 0,
      })
      .returning({
        id: users.id,
        username: users.username,
        email: users.email,
        role: users.role,
        bio: users.bio,
        profileImage: users.profileImage,
        createdAt: users.createdAt,
      })

    return NextResponse.json({
      success: true,
      message: '사용자가 성공적으로 생성되었습니다.',
      data: newUser,
    })
  } catch (error) {
    console.error('사용자 추가 오류:', error)
    return NextResponse.json(
      { success: false, error: '사용자 생성에 실패했습니다.' },
      { status: 500 }
    )
  }
}

// GET - 모든 사용자 목록 조회 (관리자용)
export async function GET(request: NextRequest) {
  try {
    const admin = await checkAdminAuth(request)
    if (!admin) {
      return NextResponse.json(
        { success: false, error: '관리자 권한이 필요합니다.' },
        { status: 403 }
      )
    }

    const db = getDb()
    const list = await db
      .select({
        id: users.id,
        username: users.username,
        email: users.email,
        profileImage: users.profileImage,
        role: users.role,
        bio: users.bio,
        favoriteGenres: users.favoriteGenres,
        followingIds: users.followingIds,
        followersIds: users.followersIds,
        lastLogin: users.lastLogin,
        totalPlays: users.totalPlays,
        totalLikes: users.totalLikes,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
      })
      .from(users)
      .orderBy(desc(users.createdAt))

    return NextResponse.json({ success: true, data: list })
  } catch (error) {
    console.error('사용자 목록 조회 오류:', error)
    return NextResponse.json(
      { success: false, error: '사용자 목록을 불러오는데 실패했습니다.' },
      { status: 500 }
    )
  }
}
