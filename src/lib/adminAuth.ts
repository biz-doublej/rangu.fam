import { getRequiredEnv } from '@/lib/env'
import jwt from 'jsonwebtoken'
import { NextRequest } from 'next/server'
import { eq } from 'drizzle-orm'
import { getDb } from '@/db/client'
import { wikiUsers } from '@/db/schema/wiki'
import { enforceUserAccessPolicy } from '@/lib/doublejAuth'

const JWT_SECRET = getRequiredEnv('JWT_SECRET')

export interface AdminUser {
  userId: string
  username: string
  role: 'admin'
}

export async function checkAdminAuth(request: NextRequest): Promise<AdminUser | null> {
  try {
    const authHeader = request.headers.get('authorization')
    const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null
    const cookieToken = request.cookies.get('wiki-token')?.value || null
    const tokens = [bearerToken, cookieToken].filter(Boolean) as string[]
    if (tokens.length === 0) return null

    const db = getDb()

    for (const token of tokens) {
      try {
        const decoded = jwt.verify(token, JWT_SECRET) as any
        const userId = decoded?.userId
        const username = decoded?.username
        if (!userId && !username) continue

        let user: any = null
        if (userId) {
          const [row] = await db
            .select()
            .from(wikiUsers)
            .where(eq(wikiUsers.id, userId))
            .limit(1)
          user = row
        } else if (username) {
          const [row] = await db
            .select()
            .from(wikiUsers)
            .where(eq(wikiUsers.username, username))
            .limit(1)
          user = row
        }
        if (!user) continue

        user = await enforceUserAccessPolicy(user)
        if (user.role !== 'admin') continue

        return {
          userId: user.id,
          username: user.username,
          role: 'admin',
        }
      } catch {
        continue
      }
    }

    return null
  } catch {
    return null
  }
}
