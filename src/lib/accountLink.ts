import jwt from 'jsonwebtoken'
import { getRequiredEnv } from '@/lib/env'

/**
 * 로그인 쿠키는 sameSite strict라 외부 로그인에서 돌아오는 요청에 실리지 않는다.
 * 연결을 시작한 브라우저를 확인하기 위한 단명 서명 쿠키.
 */
export const ACCOUNT_LINK_COOKIE = 'account-link'
const ACCOUNT_LINK_TTL_SECONDS = 10 * 60

export function createAccountLinkCookieValue(userId: string): string {
  return jwt.sign({ type: 'account-link', userId }, getRequiredEnv('JWT_SECRET'), {
    expiresIn: ACCOUNT_LINK_TTL_SECONDS,
  })
}

export function readAccountLinkUserId(value: string | undefined): string | null {
  if (!value) return null
  try {
    const payload = jwt.verify(value, getRequiredEnv('JWT_SECRET')) as { type?: string; userId?: string }
    return payload.type === 'account-link' && payload.userId ? payload.userId : null
  } catch {
    return null
  }
}

export function getAccountLinkCookieOptions(maxAge: number = ACCOUNT_LINK_TTL_SECONDS) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    maxAge,
    path: '/',
  }
}
