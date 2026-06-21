import crypto from 'crypto'
import jwt from 'jsonwebtoken'
import { getOptionalEnv, getRequiredEnv } from '@/lib/env'

/**
 * 랑구 택틱스 "게임 티켓" 발급/공개키 헬퍼.
 *
 * - rangu.fam 백엔드가 RS256 비대칭 키로 단명(60s) 티켓을 서명한다.
 * - 공개키는 /api/game/jwks 로 노출되어, .NET 게임서버가 stateless 검증한다.
 * - 비밀키(GAME_TICKET_PRIVATE_KEY)는 절대 노출되지 않는다(운영: Secret Manager).
 *
 * env:
 *   GAME_TICKET_PRIVATE_KEY  RS256 PKCS8 PEM (필수)
 *   GAME_TICKET_ISSUER       기본 https://rangu.fam
 *   GAME_TICKET_AUDIENCE     기본 rangu-tactics
 */

const TICKET_TTL_SECONDS = 60

function getIssuer(): string {
  return getOptionalEnv('GAME_TICKET_ISSUER') || 'https://rangu.fam'
}
function getAudience(): string {
  return getOptionalEnv('GAME_TICKET_AUDIENCE') || 'rangu-tactics'
}

interface KeyMaterial {
  privatePem: string
  kid: string
  publicJwk: Record<string, unknown>
}

// 키는 프로세스 수명 동안 캐시 (env 는 함수 내부에서 lazy 로 읽어 미설정 시 import 가 깨지지 않게 함).
let cached: KeyMaterial | null = null

// RFC 7638 JWK thumbprint → 안정적 kid. 서명자와 JWKS 가 동일 kid 를 쓰게 만든다.
function rsaThumbprint(jwk: crypto.JsonWebKey): string {
  const canonical = JSON.stringify({ e: jwk.e, kty: jwk.kty, n: jwk.n })
  return crypto.createHash('sha256').update(canonical).digest('base64url')
}

function keyMaterial(): KeyMaterial {
  if (cached) return cached
  const privatePem = getRequiredEnv('GAME_TICKET_PRIVATE_KEY')
  const jwk = crypto.createPublicKey(privatePem).export({ format: 'jwk' }) as crypto.JsonWebKey
  const kid = rsaThumbprint(jwk)
  cached = {
    privatePem,
    kid,
    publicJwk: { ...jwk, kid, use: 'sig', alg: 'RS256' },
  }
  return cached
}

export interface GameTicketClaims {
  userId: string
  username: string
  matchId?: string
}

/** 단명 game ticket(JWT) 발급. aud=rangu-tactics, exp=60s, RS256 서명. */
export function issueGameTicket(claims: GameTicketClaims): { ticket: string; expiresIn: number } {
  const { privatePem, kid } = keyMaterial()
  const ticket = jwt.sign(
    {
      username: claims.username,
      ...(claims.matchId ? { match_id: claims.matchId } : {}),
    },
    privatePem,
    {
      algorithm: 'RS256',
      issuer: getIssuer(),
      audience: getAudience(),
      subject: claims.userId, // sub
      expiresIn: TICKET_TTL_SECONDS,
      jwtid: crypto.randomUUID(), // jti — .NET 측 재사용 방지(replay)용
      keyid: kid, // header.kid — JWKS 매칭
    }
  )
  return { ticket, expiresIn: TICKET_TTL_SECONDS }
}

/** 검증용 공개키 집합(JWKS). 공개키만 포함. */
export function getGameTicketJwks(): { keys: Record<string, unknown>[] } {
  return { keys: [keyMaterial().publicJwk] }
}
