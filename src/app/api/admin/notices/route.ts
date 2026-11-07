import { NextRequest, NextResponse } from 'next/server'
import { desc } from 'drizzle-orm'
import { getDb } from '@/db/client'
import { wikiNotices } from '@/db/schema/wiki'
import { validateNoticeInput } from '@/lib/adminRules'
import { getStaffUser } from '@/lib/staffAuth'

export const dynamic = 'force-dynamic'

const FORBIDDEN = { success: false, error: '관리자 권한이 필요합니다.' }

export async function GET(request: NextRequest) {
  if (!(await getStaffUser(request))?.isAdmin) return NextResponse.json(FORBIDDEN, { status: 403 })
  const notices = await getDb().select().from(wikiNotices).orderBy(desc(wikiNotices.createdAt))
  return NextResponse.json({ success: true, notices })
}

export async function POST(request: NextRequest) {
  const staff = await getStaffUser(request)
  if (!staff?.isAdmin) return NextResponse.json(FORBIDDEN, { status: 403 })
  const check = validateNoticeInput(await request.json().catch(() => null))
  if (!check.ok) return NextResponse.json({ success: false, error: check.error }, { status: 400 })
  const [notice] = await getDb()
    .insert(wikiNotices)
    .values({ ...check.value, createdBy: staff.user.username })
    .returning()
  return NextResponse.json({ success: true, notice })
}
