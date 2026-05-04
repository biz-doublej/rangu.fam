import { getRequiredEnv } from '@/lib/env'
import { NextRequest, NextResponse } from 'next/server'
import { and, desc, eq, ilike, isNotNull, or, sql } from 'drizzle-orm'
import jwt from 'jsonwebtoken'
import { getDb } from '@/db/client'
import { wikiUsers } from '@/db/schema/wiki'
import { enforceUserAccessPolicy } from '@/lib/doublejAuth'

export const dynamic = 'force-dynamic'

const JWT_SECRET = getRequiredEnv('JWT_SECRET')

// JWT에서 사용자 정보 추출
async function getUserFromToken(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.split(' ')[1] : null
    const cookieToken = request.cookies.get('wiki-token')?.value || null
    const tokens = [bearerToken, cookieToken].filter(Boolean) as string[]
    if (tokens.length === 0) return null

    const db = getDb()

    for (const token of tokens) {
      try {
        const decoded = jwt.verify(token, JWT_SECRET) as any
        let user
        if (decoded.userId) {
          const [row] = await db
            .select()
            .from(wikiUsers)
            .where(eq(wikiUsers.id, decoded.userId))
            .limit(1)
          user = row
        } else if (decoded.username) {
          const [row] = await db
            .select()
            .from(wikiUsers)
            .where(eq(wikiUsers.username, decoded.username))
            .limit(1)
          user = row
        } else {
          continue
        }
        if (!user) continue
        return enforceUserAccessPolicy(user as any)
      } catch {
        continue
      }
    }

    return null
  } catch (error) {
    return null
  }
}

// 관리자 권한 확인
function isAdminOrModerator(user: any) {
  return user && user.role === 'admin'
}

// GET /api/wiki/users - 사용자 목록 조회 (관리자만)
export async function GET(request: NextRequest) {
  try {
    const db = getDb()

    const user = await getUserFromToken(request)
    if (!isAdminOrModerator(user)) {
      return NextResponse.json(
        { success: false, error: '권한이 없습니다.' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100)
    const search = searchParams.get('search') || ''
    const role = searchParams.get('role') || ''
    const status = searchParams.get('status') || ''
    // ssoOnly=true → DoubleJ OIDC 로 가입한 사용자만 (ssoSubject IS NOT NULL).
    // 위키 자체 회원가입 잔재(가짜 도메인 user 등) 를 admin 화면에서 제외할 때 사용.
    const ssoOnly = searchParams.get('ssoOnly') === 'true'

    const skip = (page - 1) * limit

    const conditions: any[] = []

    if (ssoOnly) {
      conditions.push(isNotNull(wikiUsers.ssoSubject))
    }

    if (search) {
      conditions.push(
        or(
          ilike(wikiUsers.username, `%${search}%`),
          ilike(wikiUsers.email, `%${search}%`)
        )
      )
    }

    if (role) {
      conditions.push(eq(wikiUsers.role, role))
    }

    if (status === 'active') {
      conditions.push(eq(wikiUsers.isActive, true))
      conditions.push(sql`(${wikiUsers.banStatus}->>'isBanned' IS NULL OR ${wikiUsers.banStatus}->>'isBanned' <> 'true')`)
    } else if (status === 'banned') {
      conditions.push(sql`${wikiUsers.banStatus}->>'isBanned' = 'true'`)
    } else if (status === 'inactive') {
      conditions.push(eq(wikiUsers.isActive, false))
    }

    const where = conditions.length > 0 ? and(...conditions) : undefined

    const [{ count: total }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(wikiUsers)
      .where(where as any)

    const users = await db
      .select({
        id: wikiUsers.id,
        username: wikiUsers.username,
        email: wikiUsers.email,
        displayName: wikiUsers.displayName,
        avatar: wikiUsers.avatar,
        bio: wikiUsers.bio,
        role: wikiUsers.role,
        permissions: wikiUsers.permissions,
        edits: wikiUsers.edits,
        pagesCreated: wikiUsers.pagesCreated,
        reputation: wikiUsers.reputation,
        isActive: wikiUsers.isActive,
        banStatus: wikiUsers.banStatus,
        warnings: wikiUsers.warnings,
        discordId: wikiUsers.discordId,
        discordUsername: wikiUsers.discordUsername,
        lastLogin: wikiUsers.lastLogin,
        lastActivity: wikiUsers.lastActivity,
        createdAt: wikiUsers.createdAt,
      })
      .from(wikiUsers)
      .where(where as any)
      .orderBy(desc(wikiUsers.createdAt))
      .offset(skip)
      .limit(limit)

    return NextResponse.json({
      success: true,
      users,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error('사용자 목록 조회 오류:', error)
    return NextResponse.json(
      { success: false, error: '사용자 목록 조회 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

// POST /api/wiki/users - 사용자 관리 작업 (warn / ban / unban / role)
export async function POST(request: NextRequest) {
  try {
    const db = getDb()

    const adminUser: any = await getUserFromToken(request)
    if (!isAdminOrModerator(adminUser)) {
      return NextResponse.json({ success: false, error: '권한이 없습니다.' }, { status: 403 })
    }

    const { action, userId, data } = await request.json()
    if (!action || !userId) {
      return NextResponse.json({ success: false, error: '필수 항목 누락' }, { status: 400 })
    }

    const [targetUser] = await db
      .select()
      .from(wikiUsers)
      .where(eq(wikiUsers.id, userId))
      .limit(1)

    if (!targetUser) {
      return NextResponse.json(
        { success: false, error: '사용자를 찾을 수 없습니다.' },
        { status: 404 }
      )
    }

    if (targetUser.id === adminUser.id) {
      return NextResponse.json(
        { success: false, error: '자기 자신에게는 조치를 취할 수 없습니다.' },
        { status: 400 }
      )
    }

    if (targetUser.role === 'admin') {
      return NextResponse.json(
        { success: false, error: '관리자에게는 조치를 취할 수 없습니다.' },
        { status: 400 }
      )
    }

    const now = new Date()
    // dynamic import to avoid circular ref at module load
    const { DiscordWebhookService } = await import('@/services/discordWebhookService')

    switch (action) {
      case 'warn': {
        const warnings = Array.isArray(targetUser.warnings) ? [...targetUser.warnings] : []
        warnings.push({
          reason: data?.reason || '',
          warnedBy: adminUser.username,
          warnedAt: now.toISOString(),
        })
        await db
          .update(wikiUsers)
          .set({ warnings, updatedAt: now })
          .where(eq(wikiUsers.id, userId))

        try {
          await DiscordWebhookService.sendUserModeration(
            adminUser.username,
            targetUser.username,
            'warn',
            data?.reason || ''
          )
        } catch (e) {
          console.error('디스코드 웹훅 전송 오류:', e)
        }

        return NextResponse.json({
          success: true,
          message: `${targetUser.username}에게 경고를 부여했습니다.`,
        })
      }

      case 'ban': {
        const duration = Number(data?.duration || 0)
        const bannedUntil =
          duration > 0 ? new Date(Date.now() + duration * 24 * 60 * 60 * 1000) : null

        await db
          .update(wikiUsers)
          .set({
            banStatus: {
              isBanned: true,
              reason: data?.reason || '',
              bannedBy: adminUser.username,
              bannedAt: now.toISOString(),
              bannedUntil: bannedUntil ? bannedUntil.toISOString() : undefined,
            },
            isActive: false,
            updatedAt: now,
          })
          .where(eq(wikiUsers.id, userId))

        try {
          await DiscordWebhookService.sendUserModeration(
            adminUser.username,
            targetUser.username,
            'ban',
            data?.reason || '',
            duration > 0 ? String(duration) : '0'
          )
        } catch (e) {
          console.error('디스코드 웹훅 전송 오류:', e)
        }

        return NextResponse.json({
          success: true,
          message: `${targetUser.username}을(를) 차단했습니다.`,
        })
      }

      case 'unban': {
        await db
          .update(wikiUsers)
          .set({
            banStatus: {
              isBanned: false,
              reason: '',
              unbannedBy: adminUser.username,
              unbannedAt: now.toISOString(),
            },
            isActive: true,
            updatedAt: now,
          })
          .where(eq(wikiUsers.id, userId))

        try {
          await DiscordWebhookService.sendUserModeration(
            adminUser.username,
            targetUser.username,
            'unban',
            '차단 해제'
          )
        } catch (e) {
          console.error('디스코드 웹훅 전송 오류:', e)
        }

        return NextResponse.json({
          success: true,
          message: `${targetUser.username}의 차단을 해제했습니다.`,
        })
      }

      case 'role': {
        const allowedRoles = ['user', 'editor', 'moderator']
        const newRole = String(data?.role || '')
        if (!allowedRoles.includes(newRole)) {
          return NextResponse.json(
            { success: false, error: '유효하지 않은 권한입니다.' },
            { status: 400 }
          )
        }
        if (newRole === 'moderator' && adminUser.role !== 'admin') {
          return NextResponse.json(
            { success: false, error: '운영자 권한은 관리자만 부여할 수 있습니다.' },
            { status: 403 }
          )
        }

        await db
          .update(wikiUsers)
          .set({ role: newRole, updatedAt: now })
          .where(eq(wikiUsers.id, userId))

        return NextResponse.json({
          success: true,
          message: `${targetUser.username}의 권한을 ${newRole}로 변경했습니다.`,
        })
      }

      default:
        return NextResponse.json(
          { success: false, error: '유효하지 않은 작업입니다.' },
          { status: 400 }
        )
    }
  } catch (error) {
    console.error('사용자 관리 오류:', error)
    return NextResponse.json(
      { success: false, error: '사용자 관리 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
