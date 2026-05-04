import { getRequiredEnv } from '@/lib/env'
import { NextRequest, NextResponse } from 'next/server'
import { and, eq, ne, or } from 'drizzle-orm'
import jwt from 'jsonwebtoken'
import { getDb } from '@/db/client'
import { wikiPages, wikiUsers } from '@/db/schema/wiki'
import { canProtectPage } from '@/app/api/wiki/_utils/policy'
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

// POST: 문서 보호 설정 변경
export async function POST(request: NextRequest) {
  try {
    const db = getDb()
    const user = await getUserFromToken(request)
    if (!user || !canProtectPage(user as any)) {
      return NextResponse.json(
        { success: false, error: '문서 보호 권한이 없습니다.' },
        { status: 403 }
      )
    }

    const { title, level, reason, protectedUntil, allowedRoles } = await request.json()
    if (!title || !level) {
      return NextResponse.json(
        { success: false, error: 'title과 level은 필수입니다.' },
        { status: 400 }
      )
    }

    const [page] = await db
      .select()
      .from(wikiPages)
      .where(
        and(
          ne(wikiPages.isDeleted, true),
          or(eq(wikiPages.title, title), eq(wikiPages.slug, title))
        )
      )
      .limit(1)

    if (!page) {
      return NextResponse.json(
        { success: false, error: '문서를 찾을 수 없습니다.' },
        { status: 404 }
      )
    }

    const currentProtection = (page.protection as any) || {}
    const nextProtection = {
      level,
      reason: reason ?? currentProtection.reason,
      protectedBy: user.username,
      protectedUntil: protectedUntil
        ? new Date(protectedUntil).toISOString()
        : currentProtection.protectedUntil,
      allowedRoles: Array.isArray(allowedRoles)
        ? allowedRoles
        : currentProtection.allowedRoles || [],
    }

    await db
      .update(wikiPages)
      .set({ protection: nextProtection, updatedAt: new Date() })
      .where(eq(wikiPages.id, page.id))

    return NextResponse.json({
      success: true,
      message: '문서 보호 설정이 업데이트되었습니다.',
    })
  } catch (error) {
    console.error('문서 보호 설정 오류:', error)
    return NextResponse.json(
      { success: false, error: '문서 보호 설정 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
