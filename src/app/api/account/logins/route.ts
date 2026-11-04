import { NextRequest, NextResponse } from 'next/server'
import { desc, eq } from 'drizzle-orm'
import { getDb } from '@/db/client'
import { wikiLoginEvents } from '@/db/schema/wiki'
import { getAuthenticatedWikiUser } from '@/lib/doublejAuth'
import { maskIp, summarizeUserAgent } from '@/lib/accountRules'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const user = await getAuthenticatedWikiUser(request)
  if (!user) {
    return NextResponse.json({ success: false, error: '로그인이 필요합니다.' }, { status: 401 })
  }

  const rows = await getDb()
    .select()
    .from(wikiLoginEvents)
    .where(eq(wikiLoginEvents.userId, user.id))
    .orderBy(desc(wikiLoginEvents.createdAt))
    .limit(10)

  return NextResponse.json({
    success: true,
    logins: rows.map((row) => ({
      id: row.id,
      provider: row.provider,
      device: summarizeUserAgent(row.userAgent),
      ip: maskIp(row.ip),
      createdAt: row.createdAt,
    })),
  })
}
