import { NextRequest, NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { getDb } from '@/db/client'
import { wikiUsers } from '@/db/schema/wiki'
import { getAuthenticatedWikiUser } from '@/lib/doublejAuth'
import { countLoginMethods, isGoogleLinked } from '@/lib/accountRules'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest, { params }: { params: { provider: string } }) {
  const user = await getAuthenticatedWikiUser(request)
  if (!user) {
    return NextResponse.json({ success: false, error: '로그인이 필요합니다.' }, { status: 401 })
  }

  const { provider } = params
  if (provider !== 'google' && provider !== 'naver') {
    return NextResponse.json({ success: false, error: '해제할 수 없는 연결입니다.' }, { status: 404 })
  }
  const linked = provider === 'google' ? isGoogleLinked(user.ssoSubject) : Boolean(user.naverId)
  if (!linked) {
    return NextResponse.json({ success: false, error: '연결되어 있지 않습니다.' }, { status: 400 })
  }
  if (countLoginMethods(user) <= 1) {
    return NextResponse.json(
      { success: false, error: '로그인 수단이 하나만 남아 해제할 수 없습니다. 다른 계정을 먼저 연결해 주세요.' },
      { status: 400 }
    )
  }

  const now = new Date()
  await getDb()
    .update(wikiUsers)
    .set(
      provider === 'google'
        ? { ssoSubject: null, googleUnlinkedAt: now, updatedAt: now }
        : { naverId: null, naverEmail: null, updatedAt: now }
    )
    .where(eq(wikiUsers.id, user.id))

  return NextResponse.json({ success: true })
}
