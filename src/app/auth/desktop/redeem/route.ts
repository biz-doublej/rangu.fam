import { NextRequest, NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { getDb } from '@/db/client'
import { wikiUsers } from '@/db/schema/wiki'
import {
  buildClientUser,
  createDoubleJToken,
  createWikiToken,
  enforceUserAccessPolicy,
  setDoubleJAuthCookie,
  setWikiAuthCookie,
  verifyDesktopHandoffCode,
} from '@/lib/doublejAuth'

export const dynamic = 'force-dynamic'

/**
 * 데스크톱 핸드오프 코드 → 정식 세션 토큰 교환.
 *
 * 네이티브 앱(런처/게임)이 루프백으로 받은 단명 handoff code 를 제출하면,
 * 검증 후 7일짜리 doublej-token 을 **응답 본문**으로 돌려준다. 네이티브 셸은
 * 이 토큰을 보관했다가 이후 rangu.fam API 호출 시 `Cookie: doublej-token=…`
 * 으로 실어 보낸다(웹뷰가 아니므로 Set-Cookie 만으론 부족 → 본문 반환 필수).
 *
 *   POST /auth/desktop/redeem  { "code": "<handoff jwt>" }
 *   → { success, doublejToken, user }
 */
export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as { code?: unknown } | null
  const code = typeof body?.code === 'string' ? body.code.trim() : ''
  if (!code) {
    return NextResponse.json({ success: false, error: 'missing_code' }, { status: 400 })
  }

  const userId = verifyDesktopHandoffCode(code)
  if (!userId) {
    return NextResponse.json({ success: false, error: 'invalid_or_expired_code' }, { status: 401 })
  }

  const db = getDb()
  const [row] = await db.select().from(wikiUsers).where(eq(wikiUsers.id, userId)).limit(1)
  if (!row) {
    return NextResponse.json({ success: false, error: 'user_not_found' }, { status: 404 })
  }
  if (!row.isActive) {
    return NextResponse.json({ success: false, error: 'account_inactive' }, { status: 403 })
  }
  const isBanned = Boolean((row as { banStatus?: { isBanned?: boolean } }).banStatus?.isBanned)
  if (isBanned) {
    return NextResponse.json({ success: false, error: 'account_banned' }, { status: 403 })
  }

  // legacy compat shape(_id) + 권한 정책 적용(웹 로그인과 동일 경로).
  ;(row as any)._id = row.id
  const user = (await enforceUserAccessPolicy(row as any)) ?? (row as any)

  const doublejToken = createDoubleJToken(user)
  const response = NextResponse.json({
    success: true,
    doublejToken,
    user: buildClientUser(user),
  })
  // 웹뷰에서 호출될 가능성을 위해 쿠키도 함께 세팅(네이티브는 본문 토큰을 사용).
  setDoubleJAuthCookie(response, doublejToken)
  setWikiAuthCookie(response, createWikiToken(user))
  return response
}
