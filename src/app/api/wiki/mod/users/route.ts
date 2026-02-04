import { NextRequest, NextResponse } from 'next/server'
import dbConnect from '@/lib/mongodb'
import { WikiUser } from '@/models/Wiki'
import { isModeratorOrAbove } from '@/app/api/wiki/_utils/policy'
import jwt from 'jsonwebtoken'
import { enforceUserAccessPolicy } from '@/lib/doublejAuth'
export const dynamic = 'force-dynamic'

const JWT_SECRET = process.env.JWT_SECRET || 'rangu-wiki-secret'

async function getUserFromToken(request: NextRequest) {
  const token = request.cookies.get('wiki-token')?.value
  if (!token) return null
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any
    const user = await WikiUser.findById(decoded.userId)
    return enforceUserAccessPolicy(user as any)
  } catch {
    return null
  }
}

// PATCH /api/wiki/mod/users  body: { username, role?, permissions? }
export async function PATCH(request: NextRequest) {
  await dbConnect()
  const actor = await getUserFromToken(request)
  if (!actor || !isModeratorOrAbove(actor as any)) {
    return NextResponse.json({ success: false, error: '권한 없음' }, { status: 403 })
  }

  const { username, role, permissions } = await request.json()
  if (!username) return NextResponse.json({ success: false, error: 'username 필요' }, { status: 400 })

  const target = await WikiUser.findOne({ username })
  if (!target) return NextResponse.json({ success: false, error: '대상 사용자 없음' }, { status: 404 })

  if (role) target.role = role
  if (permissions) target.permissions = { ...target.permissions, ...permissions }
  await target.save()
  await enforceUserAccessPolicy(target as any)

  return NextResponse.json({ success: true, user: { username: target.username, role: target.role, permissions: target.permissions } })
}


