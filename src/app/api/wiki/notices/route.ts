import { NextResponse } from 'next/server'
import { desc, eq } from 'drizzle-orm'
import { getDb } from '@/db/client'
import { wikiNotices } from '@/db/schema/wiki'
import { isNoticeLive } from '@/lib/adminRules'

export const dynamic = 'force-dynamic'

/** 지금 노출 중인 공지. 표가 없으면 빈 목록. */
export async function GET() {
  try {
    const rows = await getDb()
      .select({
        id: wikiNotices.id,
        message: wikiNotices.message,
        linkUrl: wikiNotices.linkUrl,
        tone: wikiNotices.tone,
        isActive: wikiNotices.isActive,
        startsAt: wikiNotices.startsAt,
        endsAt: wikiNotices.endsAt,
      })
      .from(wikiNotices)
      .where(eq(wikiNotices.isActive, true))
      .orderBy(desc(wikiNotices.createdAt))
    const notices = rows
      .filter((notice) => isNoticeLive(notice))
      .map(({ id, message, linkUrl, tone }) => ({ id, message, linkUrl, tone }))
    return NextResponse.json({ success: true, notices })
  } catch (error) {
    if ((error as { code?: string })?.code !== '42P01') console.error('공지 조회 오류:', error)
    return NextResponse.json({ success: true, notices: [] })
  }
}
