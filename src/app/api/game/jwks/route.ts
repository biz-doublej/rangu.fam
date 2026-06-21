import { NextResponse } from 'next/server'
import { getGameTicketJwks } from '@/lib/gameTicket'

export const dynamic = 'force-dynamic'

/**
 * 게임 티켓 검증용 공개키(JWKS).
 * .NET 게임서버가 주기적으로 가져가 stateless 로 티켓 서명을 검증한다.
 * 공개키만 노출 — 비밀키(GAME_TICKET_PRIVATE_KEY)는 절대 응답에 포함되지 않는다.
 */
export async function GET() {
  return NextResponse.json(getGameTicketJwks(), {
    headers: { 'cache-control': 'public, max-age=3600, must-revalidate' },
  })
}
