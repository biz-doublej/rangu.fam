import type { NextRequest } from 'next/server'
import jwt from 'jsonwebtoken'
import { eq } from 'drizzle-orm'
import { getDb } from '@/db/client'
import { wikiUsers } from '@/db/schema/wiki'
import { enforceUserAccessPolicy, type IWikiUser } from '@/lib/doublejAuth'
import { getRequiredEnv } from '@/lib/env'

export interface StaffUser {
  user: IWikiUser
  isAdmin: boolean
  isModerator: boolean
}

/** 위키 로그인 쿠키(또는 Bearer)로 운영진 여부를 판정한다. 비활성·차단 계정은 제외한다. */
export async function getStaffUser(request: NextRequest): Promise<StaffUser | null> {
  const header = request.headers.get('authorization')
  const tokens = [header?.startsWith('Bearer ') ? header.slice(7) : null, request.cookies.get('wiki-token')?.value]
    .filter(Boolean) as string[]

  for (const token of tokens) {
    try {
      const decoded = jwt.verify(token, getRequiredEnv('JWT_SECRET')) as { userId?: string }
      if (!decoded.userId) continue
      const [row] = await getDb().select().from(wikiUsers).where(eq(wikiUsers.id, decoded.userId)).limit(1)
      if (!row || !row.isActive || row.banStatus?.isBanned) continue
      ;(row as any)._id = row.id
      const user = await enforceUserAccessPolicy(row as any)
      if (!user) continue
      const isAdmin = user.role === 'admin' || user.role === 'owner'
      return { user, isAdmin, isModerator: isAdmin || user.role === 'moderator' }
    } catch {
      continue
    }
  }
  return null
}
