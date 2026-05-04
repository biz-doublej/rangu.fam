import { getRequiredEnv } from '@/lib/env'
import { NextRequest, NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import jwt from 'jsonwebtoken'
import { getDb } from '@/db/client'
import { wikiUsers } from '@/db/schema/wiki'
import { isModeratorOrAbove } from '@/app/api/wiki/_utils/policy'
import { banIp, unbanIp, listBannedIps } from '@/app/api/wiki/_utils/blocklist'
import { enforceUserAccessPolicy } from '@/lib/doublejAuth'

export const dynamic = 'force-dynamic'

const JWT_SECRET = getRequiredEnv('JWT_SECRET')

async function getUserFromToken(request: NextRequest) {
  const token = request.cookies.get('wiki-token')?.value
  if (!token) return null
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any
    if (!decoded?.userId) return null
    const db = getDb()
    const [user] = await db
      .select()
      .from(wikiUsers)
      .where(eq(wikiUsers.id, decoded.userId))
      .limit(1)
    if (!user) return null
    return enforceUserAccessPolicy(user as any)
  } catch {
    return null
  }
}

// 사용자 차단/해제 + IP 차단/해제 (메모리 기반)
export async function POST(request: NextRequest) {
  try {
    const admin = await getUserFromToken(request)
    if (!admin || !isModeratorOrAbove(admin as any)) {
      return NextResponse.json({ success: false, error: '권한 부족' }, { status: 403 })
    }

    const { action, userId, ip, reason } = await request.json()
    const db = getDb()

    switch (action) {
      case 'banUser': {
        if (!userId) {
          return NextResponse.json({ success: false, error: 'userId 필요' }, { status: 400 })
        }
        const [u] = await db.select().from(wikiUsers).where(eq(wikiUsers.id, userId)).limit(1)
        if (!u) {
          return NextResponse.json({ success: false, error: '사용자를 찾을 수 없습니다.' }, { status: 404 })
        }
        await db
          .update(wikiUsers)
          .set({
            banStatus: {
              isBanned: true,
              reason: reason || '',
              bannedBy: (admin as any).username,
              bannedAt: new Date().toISOString(),
            },
            isActive: false,
            updatedAt: new Date(),
          })
          .where(eq(wikiUsers.id, userId))
        return NextResponse.json({ success: true })
      }

      case 'unbanUser': {
        if (!userId) {
          return NextResponse.json({ success: false, error: 'userId 필요' }, { status: 400 })
        }
        const [u] = await db.select().from(wikiUsers).where(eq(wikiUsers.id, userId)).limit(1)
        if (!u) {
          return NextResponse.json({ success: false, error: '사용자를 찾을 수 없습니다.' }, { status: 404 })
        }
        await db
          .update(wikiUsers)
          .set({
            banStatus: {
              isBanned: false,
              reason: '',
              unbannedBy: (admin as any).username,
              unbannedAt: new Date().toISOString(),
            },
            isActive: true,
            updatedAt: new Date(),
          })
          .where(eq(wikiUsers.id, userId))
        return NextResponse.json({ success: true })
      }

      case 'banIp': {
        if (!ip) {
          return NextResponse.json({ success: false, error: 'ip 필요' }, { status: 400 })
        }
        banIp(ip)
        return NextResponse.json({ success: true })
      }

      case 'unbanIp': {
        if (!ip) {
          return NextResponse.json({ success: false, error: 'ip 필요' }, { status: 400 })
        }
        unbanIp(ip)
        return NextResponse.json({ success: true })
      }

      default:
        return NextResponse.json(
          { success: false, error: '지원하지 않는 action' },
          { status: 400 }
        )
    }
  } catch (e) {
    console.error('차단 관리 오류:', e)
    return NextResponse.json({ success: false, error: '차단 처리 중 오류' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const admin = await getUserFromToken(request)
    if (!admin || !isModeratorOrAbove(admin as any)) {
      return NextResponse.json({ success: false, error: '권한 부족' }, { status: 403 })
    }
    return NextResponse.json({ success: true, bannedIps: listBannedIps() })
  } catch (e) {
    console.error('차단 목록 조회 오류:', e)
    return NextResponse.json({ success: false, error: '목록 조회 중 오류' }, { status: 500 })
  }
}
