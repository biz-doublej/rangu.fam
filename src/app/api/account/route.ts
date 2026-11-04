import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedWikiUser } from '@/lib/doublejAuth'
import { countLoginMethods, isGoogleLinked, nextDisplayNameChangeAt } from '@/lib/accountRules'

export const dynamic = 'force-dynamic'

/** 설정 화면에 필요한 내 계정 요약 */
export async function GET(request: NextRequest) {
  const user = await getAuthenticatedWikiUser(request)
  if (!user) {
    return NextResponse.json({ success: false, error: '로그인이 필요합니다.' }, { status: 401 })
  }

  const isAdmin = user.role === 'admin'
  return NextResponse.json({
    success: true,
    account: {
      username: user.username,
      displayName: user.displayName || user.username,
      email: user.email,
      avatar: user.avatar || null,
      nextNameChangeAt: isAdmin ? null : nextDisplayNameChangeAt(user.displayNameChangedAt)?.toISOString() ?? null,
      loginMethodCount: countLoginMethods(user),
      identities: {
        google: { linked: isGoogleLinked(user.ssoSubject) },
        naver: { linked: Boolean(user.naverId), detail: user.naverEmail || null },
        discord: { linked: Boolean(user.discordId), detail: user.discordUsername || null },
      },
    },
  })
}
