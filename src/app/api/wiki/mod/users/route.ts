import { getRequiredEnv } from '@/lib/env'
import { NextRequest, NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import jwt from 'jsonwebtoken'
import { getDb } from '@/db/client'
import { wikiUsers } from '@/db/schema/wiki'
import { isModeratorOrAbove } from '@/app/api/wiki/_utils/policy'
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

// PATCH /api/wiki/mod/users  body: { username, role?, permissions? }
export async function PATCH(request: NextRequest) {
  const actor = await getUserFromToken(request)
  if (!actor || !isModeratorOrAbove(actor as any)) {
    return NextResponse.json({ success: false, error: '권한 없음' }, { status: 403 })
  }

  const { username, role, permissions } = await request.json()
  if (!username) {
    return NextResponse.json({ success: false, error: 'username 필요' }, { status: 400 })
  }

  const db = getDb()
  const [target] = await db
    .select()
    .from(wikiUsers)
    .where(eq(wikiUsers.username, username))
    .limit(1)

  if (!target) {
    return NextResponse.json(
      { success: false, error: '대상 사용자 없음' },
      { status: 404 }
    )
  }

  const updates: Record<string, any> = { updatedAt: new Date() }
  if (role) updates.role = role
  if (permissions && typeof permissions === 'object') {
    updates.permissions = { ...(target.permissions as any), ...permissions }
  }

  const [updated] = await db
    .update(wikiUsers)
    .set(updates)
    .where(eq(wikiUsers.id, target.id))
    .returning({
      username: wikiUsers.username,
      role: wikiUsers.role,
      permissions: wikiUsers.permissions,
    })

  return NextResponse.json({ success: true, user: updated })
}
