import { createHmac, timingSafeEqual } from 'crypto'
import jwt from 'jsonwebtoken'
import { getOptionalEnv } from '@/lib/env'
import { GamecenterError } from './points'

/**
 * 실시간 서버(rangu-game-rt)와의 연결.
 * - 브라우저 → 실시간 서버: 5분짜리 JWT(RT_JWT_SECRET)로 본인임을 증명한다.
 * - 실시간 서버 → 본 서버: 판 결과 본문을 GC_INTERNAL_SECRET 으로 HMAC-SHA256 서명해 보낸다.
 */

export const RT_TOKEN_TTL_SECONDS = 5 * 60
export const RT_TOKEN_AUDIENCE = 'game-rt'
export const MATCH_SIGNATURE_HEADER = 'x-gc-signature'

export function signRtToken(user: { id: string; name: string }, secret: string): string {
  return jwt.sign({ userId: user.id, name: user.name }, secret, { expiresIn: RT_TOKEN_TTL_SECONDS, audience: RT_TOKEN_AUDIENCE })
}

/** 브라우저에 내줄 접속 정보. 설정이 없으면 503. */
export function issueRtAccess(user: { id: string; name: string }) {
  const secret = getOptionalEnv('RT_JWT_SECRET')
  const url = getOptionalEnv('GAME_RT_URL')
  if (!secret || !url) {
    throw new GamecenterError('rt_not_configured', '실시간 서버가 아직 준비되지 않았습니다.', 503)
  }
  return { token: signRtToken(user, secret), url, expiresIn: RT_TOKEN_TTL_SECONDS }
}

export function signMatchBody(body: string, secret: string): string {
  return createHmac('sha256', secret).update(body).digest('hex')
}

/** 받은 본문 그대로(raw)와 서명 헤더를 비교한다. */
export function verifyMatchSignature(body: string, signature: string | null | undefined, secret: string | undefined): boolean {
  if (!secret || !signature) return false
  const expected = Buffer.from(signMatchBody(body, secret), 'hex')
  let given: Buffer
  try {
    given = Buffer.from(signature.trim().toLowerCase(), 'hex')
  } catch {
    return false
  }
  return given.length === expected.length && timingSafeEqual(given, expected)
}
