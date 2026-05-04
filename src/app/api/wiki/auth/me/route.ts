import { getRequiredEnv } from '@/lib/env'
import { NextRequest, NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'
import { eq } from 'drizzle-orm'
import { getDb } from '@/db/client'
import { wikiUsers } from '@/db/schema/wiki'
import { isWhitelistedWikiAdmin } from '@/lib/doublejAuth'

export const dynamic = 'force-dynamic'

const JWT_SECRET = getRequiredEnv('JWT_SECRET')

export async function GET(request: NextRequest) {
  try {
    const db = getDb()

    const token = request.cookies.get('wiki-token')?.value
    if (!token) {
      return NextResponse.json({ success: false, error: '로그인이 필요합니다.' }, { status: 401 })
    }

    let decoded: any
    try {
      decoded = jwt.verify(token, JWT_SECRET)
    } catch (jwtError) {
      console.error('JWT 검증 오류:', jwtError)
      return NextResponse.json({ success: false, error: '유효하지 않은 토큰입니다.' }, { status: 401 })
    }

    const [user] = await db
      .select()
      .from(wikiUsers)
      .where(eq(wikiUsers.id, decoded.userId))
      .limit(1)

    if (!user) {
      return NextResponse.json({ success: false, error: '사용자를 찾을 수 없습니다.' }, { status: 404 })
    }
    if (!user.isActive) {
      return NextResponse.json({ success: false, error: '비활성화된 계정입니다.' }, { status: 401 })
    }

    const isBanned = Boolean(user.banStatus?.isBanned)
    if (isBanned) {
      return NextResponse.json({ success: false, error: '차단된 계정입니다.' }, { status: 403 })
    }

    // 인라인 권한 정책 적용 (enforceUserAccessPolicy의 Drizzle 버전)
    const shouldBeAdmin = isWhitelistedWikiAdmin(user as any)
    let dirty = false
    let role = user.role
    let permissions = user.permissions

    if (shouldBeAdmin) {
      if (role !== 'admin') {
        role = 'admin'
        dirty = true
      }
      const adminPerms = {
        canEdit: true,
        canDelete: true,
        canProtect: true,
        canBan: true,
        canManageUsers: true,
      }
      if (
        !permissions?.canEdit ||
        !permissions?.canDelete ||
        !permissions?.canProtect ||
        !permissions?.canBan ||
        !permissions?.canManageUsers
      ) {
        permissions = adminPerms
        dirty = true
      }
    } else {
      if (role === 'admin' || role === 'owner' || role === 'moderator') {
        role = 'editor'
        dirty = true
      }
      const editorPerms = {
        canEdit: true,
        canDelete: false,
        canProtect: false,
        canBan: false,
        canManageUsers: false,
      }
      if (
        !permissions?.canEdit ||
        permissions?.canDelete ||
        permissions?.canProtect ||
        permissions?.canBan ||
        permissions?.canManageUsers
      ) {
        permissions = editorPerms
        dirty = true
      }
    }

    const now = new Date()
    if (dirty) {
      await db
        .update(wikiUsers)
        .set({ role, permissions, lastActivity: now, updatedAt: now })
        .where(eq(wikiUsers.id, user.id))
    } else {
      await db
        .update(wikiUsers)
        .set({ lastActivity: now })
        .where(eq(wikiUsers.id, user.id))
    }

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        displayName: user.displayName || user.username,
        email: user.email,
        role,
        permissions,
        avatar: user.avatar,
        bio: user.bio,
        signature: user.signature,
        edits: user.edits,
        pagesCreated: user.pagesCreated,
        reputation: user.reputation,
        preferences: user.preferences,
        isActive: user.isActive,
        lastLogin: user.lastLogin,
        mainUserId: user.mainUserId,
      },
    })
  } catch (error) {
    console.error('위키 사용자 정보 조회 오류:', error)
    return NextResponse.json(
      { success: false, error: '사용자 정보 조회 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
