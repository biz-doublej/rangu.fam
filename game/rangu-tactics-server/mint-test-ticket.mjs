// 개발 전용 — 로그인 없이 .NET seam 을 테스트하기 위한 단명 게임 티켓 발급기.
// src/lib/gameTicket.ts 의 서명 로직을 그대로 미러링(같은 키 → 같은 kid → JWKS 매칭).
// 운영 경로(/api/game/ticket)를 대체하는 게 아니라, 격리 테스트용 도구다.
//
// 실행: 리포 루트에서 (next dev 와 동일한 env 사용)
//   node game/rangu-tactics-server/mint-test-ticket.mjs
import crypto from 'crypto'
import jwt from 'jsonwebtoken'

const pem = process.env.GAME_TICKET_PRIVATE_KEY
if (!pem) {
  console.error('GAME_TICKET_PRIVATE_KEY 환경변수가 필요합니다 (next dev 와 동일하게).')
  process.exit(1)
}

// RFC 7638 thumbprint → kid (gameTicket.ts 와 동일)
const jwk = crypto.createPublicKey(pem).export({ format: 'jwk' })
const kid = crypto
  .createHash('sha256')
  .update(JSON.stringify({ e: jwk.e, kty: jwk.kty, n: jwk.n }))
  .digest('base64url')

const ticket = jwt.sign(
  {
    username: process.env.TEST_USERNAME || 'jaewon',
    match_id: process.env.TEST_MATCH || 'smoke-1',
  },
  pem,
  {
    algorithm: 'RS256',
    issuer: process.env.GAME_TICKET_ISSUER || 'https://rangu.fam',
    audience: process.env.GAME_TICKET_AUDIENCE || 'rangu-tactics',
    subject: process.env.TEST_USERID || 'user-uuid-1',
    expiresIn: 60,
    jwtid: crypto.randomUUID(),
    keyid: kid,
  }
)

console.log(ticket)
