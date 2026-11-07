import { NextRequest, NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { getDb } from '@/db/client'
import { wikiNotices } from '@/db/schema/wiki'
import { validateNoticeInput } from '@/lib/adminRules'
import { getStaffUser } from '@/lib/staffAuth'

export const dynamic = 'force-dynamic'

const FORBIDDEN = { success: false, error: '관리자 권한이 필요합니다.' }
const NOT_FOUND = { success: false, error: '공지를 찾을 수 없습니다.' }

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  if (!(await getStaffUser(request))?.isAdmin) return NextResponse.json(FORBIDDEN, { status: 403 })
  const db = getDb()
  const [current] = await db.select().from(wikiNotices).where(eq(wikiNotices.id, params.id)).limit(1)
  if (!current) return NextResponse.json(NOT_FOUND, { status: 404 })

  const check = validateNoticeInput({ ...current, ...(await request.json().catch(() => ({}))) })
  if (!check.ok) return NextResponse.json({ success: false, error: check.error }, { status: 400 })
  const [notice] = await db
    .update(wikiNotices)
    .set({ ...check.value, updatedAt: new Date() })
    .where(eq(wikiNotices.id, params.id))
    .returning()
  return NextResponse.json({ success: true, notice })
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  if (!(await getStaffUser(request))?.isAdmin) return NextResponse.json(FORBIDDEN, { status: 403 })
  const [deleted] = await getDb().delete(wikiNotices).where(eq(wikiNotices.id, params.id)).returning()
  if (!deleted) return NextResponse.json(NOT_FOUND, { status: 404 })
  return NextResponse.json({ success: true })
}
