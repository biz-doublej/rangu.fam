import { NextRequest, NextResponse } from 'next/server'
import { asc, sql } from 'drizzle-orm'
import { getDb } from '@/db/client'
import { wikiAds } from '@/db/schema/wiki'
import { checkAdminAuth } from '@/lib/adminAuth'
import { validateAdInput } from '@/lib/adRules'

export const dynamic = 'force-dynamic'

const FORBIDDEN = { success: false, error: '관리자 권한이 필요합니다.' }

export async function GET(request: NextRequest) {
  if (!(await checkAdminAuth(request))) return NextResponse.json(FORBIDDEN, { status: 403 })
  const ads = await getDb().select().from(wikiAds).orderBy(asc(wikiAds.sortOrder), asc(wikiAds.createdAt))
  return NextResponse.json({ success: true, ads })
}

export async function POST(request: NextRequest) {
  if (!(await checkAdminAuth(request))) return NextResponse.json(FORBIDDEN, { status: 403 })
  const check = validateAdInput(await request.json().catch(() => null))
  if (!check.ok) return NextResponse.json({ success: false, error: check.error }, { status: 400 })

  const db = getDb()
  const [{ next }] = await db
    .select({ next: sql<number>`coalesce(max(${wikiAds.sortOrder}), 0) + 1` })
    .from(wikiAds)
  const [ad] = await db.insert(wikiAds).values({ ...check.value, sortOrder: next }).returning()
  return NextResponse.json({ success: true, ad })
}
