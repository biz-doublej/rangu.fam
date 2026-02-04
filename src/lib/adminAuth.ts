import jwt from 'jsonwebtoken'
import { NextRequest } from 'next/server'
import dbConnect from '@/lib/mongodb'
import { WikiUser } from '@/models/Wiki'
import { enforceUserAccessPolicy } from '@/lib/doublejAuth'

const JWT_SECRET = process.env.JWT_SECRET || 'rangu-wiki-secret'

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

    await dbConnect()

    for (const token of tokens) {
      try {
        const decoded = jwt.verify(token, JWT_SECRET) as any
        const userId = decoded?.userId
        const username = decoded?.username
        if (!userId && !username) continue

        let user = null as any
        if (userId) {
          user = await WikiUser.findById(userId)
        } else if (username) {
          user = await WikiUser.findOne({ username })
        }
        if (!user) continue

        user = await enforceUserAccessPolicy(user)
        if (user.role !== 'admin') continue

        return {
          userId: String(user._id),
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
