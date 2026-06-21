import { NextRequest, NextResponse } from 'next/server'
import { findOrCreateWikiUserFromOidcProfile, getAuthenticatedWikiUser } from '@/lib/doublejAuth'
import { extractIdentity, fetchOidcUserInfo, type OidcTokenResponse } from '@/lib/serviceOidc'
import { issueGameTicket } from '@/lib/gameTicket'

export const dynamic = 'force-dynamic'

/**
 * 게임 전용 단명 티켓 발급 — Unity(외부 프로세스)로 세션을 안전하게 넘기기 위한 1회용 JWT.
 *
 * aud=rangu-tactics, exp=60s, RS256 서명. .NET 게임서버가 rangu.fam JWKS(/api/game/jwks)로 검증.
 * 셸은 이 티켓을 127.0.0.1 루프백 IPC 로 Unity 에 1회 전달한다(커맨드라인 노출 금지).
 */
async function resolveUser(request: NextRequest, body: unknown) {
  // 1) 세션 쿠키 — session/exchange 이후 가장 일반적인 경로.
  const byCookie = await getAuthenticatedWikiUser(request)
  if (byCookie) return byCookie

  // 2) Bearer access_token fallback — 쿠키 공유가 안 되는 네이티브 직접 호출용.
  const auth = request.headers.get('authorization')
  const headerToken = auth && auth.toLowerCase().startsWith('bearer ') ? auth.slice(7).trim() : ''
  const bodyToken = (body as { access_token?: unknown } | null)?.access_token
  const accessToken = headerToken || (typeof bodyToken === 'string' ? bodyToken.trim() : '')
  if (!accessToken) return null

  const userInfo = await fetchOidcUserInfo(accessToken)
  if (!userInfo) return null
  const identity = extractIdentity({ access_token: accessToken } as OidcTokenResponse, userInfo)
  if (!identity) return null
  return findOrCreateWikiUserFromOidcProfile(identity)
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null)
  const user = await resolveUser(request, body)
  if (!user || !user.isActive) {
    return NextResponse.json({ success: false, error: 'not_authenticated' }, { status: 401 })
  }

  // 매칭이 이미 끝났다면 match_id 를 함께 받아 티켓에 바인딩(특정 매치 입장만 허용).
  const matchId = typeof (body as { match_id?: unknown } | null)?.match_id === 'string'
    ? (body as { match_id: string }).match_id
    : undefined

  const { ticket, expiresIn } = issueGameTicket({
    userId: String((user as { id?: string; _id?: string }).id ?? (user as { _id?: string })._id),
    username: user.username,
    matchId,
  })

  return NextResponse.json({
    success: true,
    token_type: 'game-ticket',
    ticket,
    expires_in: expiresIn,
  })
}
