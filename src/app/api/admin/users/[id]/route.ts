import { NextRequest, NextResponse } from 'next/server'
import { desc, eq } from 'drizzle-orm'
import { getDb } from '@/db/client'
import { wikiLoginEvents, wikiPages, wikiRevisions, wikiUsers } from '@/db/schema/wiki'
import { maskIp, summarizeUserAgent } from '@/lib/accountRules'
import { getStaffUser } from '@/lib/staffAuth'

export const dynamic = 'force-dynamic'

/** 회원 상세: 연결 계정, 최근 로그인, 최근 편집, 경고·차단 내역 */
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  if (!(await getStaffUser(request))?.isAdmin) {
    return NextResponse.json({ success: false, error: '관리자 권한이 필요합니다.' }, { status: 403 })
  }
  const db = getDb()
  const [user] = await db.select().from(wikiUsers).where(eq(wikiUsers.id, params.id)).limit(1)
  if (!user) return NextResponse.json({ success: false, error: '회원을 찾을 수 없습니다.' }, { status: 404 })

  const [logins, edits] = await Promise.all([
    db
      .select()
      .from(wikiLoginEvents)
      .where(eq(wikiLoginEvents.userId, user.id))
      .orderBy(desc(wikiLoginEvents.createdAt))
      .limit(10)
      .catch(() => []),
    db
      .select({
        id: wikiRevisions.id,
        title: wikiPages.title,
        summary: wikiRevisions.summary,
        sizeChange: wikiRevisions.sizeChange,
        timestamp: wikiRevisions.timestampAt,
      })
      .from(wikiRevisions)
      .innerJoin(wikiPages, eq(wikiPages.id, wikiRevisions.pageId))
      .where(eq(wikiRevisions.authorId, user.id))
      .orderBy(desc(wikiRevisions.timestampAt))
      .limit(10),
  ])

  return NextResponse.json({
    success: true,
    user: {
      id: user.id,
      username: user.username,
      displayName: user.displayName || user.username,
      email: user.email,
      avatar: user.avatar,
      role: user.role,
      isActive: user.isActive,
      banStatus: user.banStatus,
      warnings: user.warnings,
      edits: user.edits,
      pagesCreated: user.pagesCreated,
      lastLogin: user.lastLogin,
      createdAt: user.createdAt,
      identities: {
        google: Boolean(user.ssoSubject?.startsWith('google:')),
        legacySso: Boolean(user.ssoSubject && !user.ssoSubject.startsWith('google:')),
        naver: user.naverEmail || (user.naverId ? '연결됨' : null),
        discord: user.discordUsername || (user.discordId ? '연결됨' : null),
      },
    },
    logins: logins.map((login) => ({
      id: login.id,
      provider: login.provider,
      device: summarizeUserAgent(login.userAgent),
      ip: maskIp(login.ip),
      createdAt: login.createdAt,
    })),
    edits,
  })
}
