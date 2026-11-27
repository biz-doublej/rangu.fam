import jwt from 'jsonwebtoken'
import { NextRequest, NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { getDb } from '@/db/client'
import { wikiUsers, type WikiUser } from '@/db/schema/wiki'
import { getRequiredEnv } from '@/lib/env'
import { GamecenterError } from './points'

/**
 * 게임센터 로그인 = 이랑위키 로그인.
 * 쿠키 wiki-token(JWT_SECRET, payload.userId) → wiki_users.
 * 거절 규칙은 /api/wiki/auth/me 와 같다 (없는 계정 404, 비활성 401, 차단 403).
 */

/** 이랑위키 로그인 쿠키 (src/lib/doublejAuth.ts 의 WIKI_AUTH_COOKIE 와 같은 값) */
const WIKI_AUTH_COOKIE = 'wiki-token'

export interface AccountRejection {
  status: number
  error: string
}

/** 계정 상태로 거절해야 하면 그 이유, 통과면 null */
export function rejectionFor(user: Pick<WikiUser, 'isActive' | 'banStatus'> | null | undefined): AccountRejection | null {
  if (!user) return { status: 404, error: '사용자를 찾을 수 없습니다.' }
  if (!user.isActive) return { status: 401, error: '비활성화된 계정입니다.' }
  if (user.banStatus?.isBanned) return { status: 403, error: '차단된 계정입니다.' }
  return null
}

export type GamecenterAuth = { ok: true; user: WikiUser } | { ok: false; response: NextResponse }

function deny(status: number, error: string): GamecenterAuth {
  return { ok: false, response: NextResponse.json({ success: false, error }, { status }) }
}

export async function requireGamecenterUser(request: NextRequest): Promise<GamecenterAuth> {
  const token = request.cookies.get(WIKI_AUTH_COOKIE)?.value
  if (!token) return deny(401, '로그인이 필요합니다.')

  let userId: string | undefined
  try {
    const decoded = jwt.verify(token, getRequiredEnv('JWT_SECRET')) as { userId?: string }
    userId = decoded?.userId
  } catch {
    return deny(401, '유효하지 않은 토큰입니다.')
  }
  if (!userId) return deny(401, '유효하지 않은 토큰입니다.')

  const [user] = await getDb().select().from(wikiUsers).where(eq(wikiUsers.id, userId)).limit(1)
  const rejection = rejectionFor(user)
  if (rejection) return deny(rejection.status, rejection.error)
  return { ok: true, user }
}

/** API 라우트 공통 오류 응답 */
export function gamecenterErrorResponse(error: unknown, context: string): NextResponse {
  if (error instanceof GamecenterError) {
    return NextResponse.json({ success: false, error: error.message, code: error.code }, { status: error.status })
  }
  console.error(`게임센터 ${context} 오류:`, error)
  return NextResponse.json({ success: false, error: '요청을 처리하는 중 오류가 발생했습니다.' }, { status: 500 })
}
