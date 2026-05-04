import { NextRequest, NextResponse } from 'next/server'
import { and, desc, eq, or, sql } from 'drizzle-orm'
import { getDb } from '@/db/client'
import { profiles } from '@/db/schema/profiles'
import { users } from '@/db/schema/users'

export const dynamic = 'force-dynamic'

const USER_PUBLIC_COLS = {
  _id: users.id,
  username: users.username,
  email: users.email,
  profileImage: users.profileImage,
  role: users.role,
} as const

const PROFILE_COLS = {
  _id: profiles.id,
  userId: profiles.userId,
  username: profiles.username,
  intro: profiles.intro,
  bio: profiles.bio,
  location: profiles.location,
  website: profiles.website,
  phone: profiles.phone,
  birthdate: profiles.birthdate,
  militaryInfo: profiles.militaryInfo,
  skills: profiles.skills,
  projects: profiles.projects,
  experience: profiles.experience,
  education: profiles.education,
  socialLinks: profiles.socialLinks,
  recentPosts: profiles.recentPosts,
  viewCount: profiles.viewCount,
  likesReceived: profiles.likesReceived,
  projectCount: profiles.projectCount,
  followers: profiles.followers,
  following: profiles.following,
  isPublic: profiles.isPublic,
  showEmail: profiles.showEmail,
  showPhone: profiles.showPhone,
  allowComments: profiles.allowComments,
  createdAt: profiles.createdAt,
  updatedAt: profiles.updatedAt,
} as const

function shapeRow(row: any) {
  const { _user, ...profile } = row
  return { ...profile, userId: _user ?? row.userId }
}

// GET - 모든 프로필 또는 특정 사용자 프로필 가져오기
export async function GET(request: NextRequest) {
  try {
    const db = getDb()
    const { searchParams } = new URL(request.url)
    const username = searchParams.get('username')
    const userId = searchParams.get('userId')

    if (username) {
      const rows = await db
        .select({ ...PROFILE_COLS, _user: USER_PUBLIC_COLS })
        .from(profiles)
        .leftJoin(users, eq(profiles.userId, users.id))
        .where(eq(profiles.username, username))
        .limit(1)

      if (rows.length === 0) {
        return NextResponse.json(
          { success: false, error: '프로필을 찾을 수 없습니다.' },
          { status: 404 }
        )
      }

      const profile = shapeRow(rows[0])

      // 조회수 증가 (await — fire-and-forget 안 함, race 위험)
      await db
        .update(profiles)
        .set({ viewCount: sql`${profiles.viewCount} + 1` })
        .where(eq(profiles.id, profile._id))

      return NextResponse.json({ success: true, profile })
    }

    if (userId) {
      const rows = await db
        .select({ ...PROFILE_COLS, _user: USER_PUBLIC_COLS })
        .from(profiles)
        .leftJoin(users, eq(profiles.userId, users.id))
        .where(eq(profiles.userId, userId))
        .limit(1)

      if (rows.length === 0) {
        return NextResponse.json(
          { success: false, error: '프로필을 찾을 수 없습니다.' },
          { status: 404 }
        )
      }

      return NextResponse.json({ success: true, profile: shapeRow(rows[0]) })
    }

    // 모든 공개 프로필
    const rows = await db
      .select({ ...PROFILE_COLS, _user: USER_PUBLIC_COLS })
      .from(profiles)
      .leftJoin(users, eq(profiles.userId, users.id))
      .where(eq(profiles.isPublic, true))
      .orderBy(desc(profiles.viewCount))
      .limit(20)

    return NextResponse.json({ success: true, profiles: rows.map(shapeRow) })
  } catch (error) {
    console.error('프로필 조회 오류:', error)
    return NextResponse.json(
      { success: false, error: '프로필을 가져오는데 실패했습니다.' },
      { status: 500 }
    )
  }
}

// POST - 새 프로필 생성
export async function POST(request: NextRequest) {
  try {
    const db = getDb()
    const body = await request.json()
    const { userId, username, intro, bio, location } = body

    if (!userId || !username) {
      return NextResponse.json(
        { success: false, error: '필수 필드가 누락되었습니다.' },
        { status: 400 }
      )
    }

    // 사용자 존재 확인
    const userRows = await db.select().from(users).where(eq(users.id, userId)).limit(1)
    if (userRows.length === 0) {
      return NextResponse.json(
        { success: false, error: '사용자를 찾을 수 없습니다.' },
        { status: 404 }
      )
    }

    // 기존 프로필 존재 확인
    const existing = await db
      .select({ id: profiles.id })
      .from(profiles)
      .where(or(eq(profiles.userId, userId), eq(profiles.username, username)))
      .limit(1)

    if (existing.length > 0) {
      return NextResponse.json(
        { success: false, error: '이미 프로필이 존재합니다.' },
        { status: 409 }
      )
    }

    const [created] = await db
      .insert(profiles)
      .values({
        userId,
        username,
        intro: intro || '',
        bio: bio || '',
        location: location || '',
      })
      .returning()

    // populate 흉내
    const rows = await db
      .select({ ...PROFILE_COLS, _user: USER_PUBLIC_COLS })
      .from(profiles)
      .leftJoin(users, eq(profiles.userId, users.id))
      .where(eq(profiles.id, created.id))
      .limit(1)

    return NextResponse.json({ success: true, profile: shapeRow(rows[0]) }, { status: 201 })
  } catch (error) {
    console.error('프로필 생성 오류:', error)
    return NextResponse.json(
      { success: false, error: '프로필 생성에 실패했습니다.' },
      { status: 500 }
    )
  }
}

// PUT - 프로필 업데이트
export async function PUT(request: NextRequest) {
  try {
    const db = getDb()
    const body = await request.json()
    const { profileId, userId, updateData } = body

    if (!updateData || typeof updateData !== 'object') {
      return NextResponse.json(
        { success: false, error: '업데이트할 데이터가 없습니다.' },
        { status: 400 }
      )
    }

    // 대상 프로필 조회
    let targetRow:
      | { id: string }
      | undefined
    if (profileId) {
      const r = await db
        .select({ id: profiles.id })
        .from(profiles)
        .where(eq(profiles.id, profileId))
        .limit(1)
      targetRow = r[0]
    } else if (userId) {
      const r = await db
        .select({ id: profiles.id })
        .from(profiles)
        .where(eq(profiles.userId, userId))
        .limit(1)
      targetRow = r[0]
    }

    if (!targetRow) {
      return NextResponse.json(
        { success: false, error: '프로필을 찾을 수 없습니다.' },
        { status: 404 }
      )
    }

    const allowedFields = [
      'intro', 'bio', 'location', 'website', 'phone', 'birthdate',
      'skills', 'projects', 'experience', 'education', 'socialLinks',
      'recentPosts', 'isPublic', 'showEmail', 'showPhone', 'allowComments',
    ] as const
    const filteredUpdate: Record<string, any> = {}
    for (const key of Object.keys(updateData)) {
      if ((allowedFields as readonly string[]).includes(key)) {
        let val = updateData[key]
        if (key === 'birthdate' && typeof val === 'string') {
          val = new Date(val)
        }
        filteredUpdate[key] = val
      }
    }

    if (Object.keys(filteredUpdate).length > 0) {
      filteredUpdate.updatedAt = new Date()
      await db.update(profiles).set(filteredUpdate).where(eq(profiles.id, targetRow.id))
    }

    const rows = await db
      .select({ ...PROFILE_COLS, _user: USER_PUBLIC_COLS })
      .from(profiles)
      .leftJoin(users, eq(profiles.userId, users.id))
      .where(eq(profiles.id, targetRow.id))
      .limit(1)

    return NextResponse.json({ success: true, profile: shapeRow(rows[0]) })
  } catch (error) {
    console.error('프로필 업데이트 오류:', error)
    return NextResponse.json(
      { success: false, error: '프로필 업데이트에 실패했습니다.' },
      { status: 500 }
    )
  }
}
