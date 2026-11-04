import { NextResponse } from 'next/server'
import { asc, eq } from 'drizzle-orm'
import { getDb } from '@/db/client'
import { wikiAds } from '@/db/schema/wiki'

export const dynamic = 'force-dynamic'

/** 노출 중인 광고 목록. 표가 아직 없으면 광고 없이 동작한다. */
export async function GET() {
  try {
    const ads = await getDb()
      .select({
        id: wikiAds.id,
        title: wikiAds.title,
        linkUrl: wikiAds.linkUrl,
        desktopImage: wikiAds.desktopImage,
        mobileImage: wikiAds.mobileImage,
      })
      .from(wikiAds)
      .where(eq(wikiAds.isActive, true))
      .orderBy(asc(wikiAds.sortOrder), asc(wikiAds.createdAt))
    return NextResponse.json({ success: true, ads })
  } catch (error) {
    if ((error as { code?: string })?.code !== '42P01') console.error('광고 조회 오류:', error)
    return NextResponse.json({ success: true, ads: [] })
  }
}
