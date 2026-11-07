import { NextRequest, NextResponse } from 'next/server'
import { and, desc, eq, ne, or } from 'drizzle-orm'
import { getDb } from '@/db/client'
import { wikiPages, wikiReports, wikiUsers } from '@/db/schema/wiki'
import { getStaffUser } from '@/lib/staffAuth'
import jwt from 'jsonwebtoken'
import { getRequiredEnv } from '@/lib/env'

export const dynamic = 'force-dynamic'

function readUserId(request: NextRequest): string | null {
  const token = request.cookies.get('wiki-token')?.value
  if (!token) return null
  try {
    return (jwt.verify(token, getRequiredEnv('JWT_SECRET')) as { userId?: string }).userId || null
  } catch {
    return null
  }
}

// 신고 생성: { title, reason, targetUserId? } — 로그인한 회원
export async function POST(request: NextRequest) {
  try {
    const userId = readUserId(request)
    const db = getDb()
    const [reporter] = userId
      ? await db
          .select({ id: wikiUsers.id, username: wikiUsers.username, isActive: wikiUsers.isActive })
          .from(wikiUsers)
          .where(eq(wikiUsers.id, userId))
          .limit(1)
      : []
    if (!reporter?.isActive) {
      return NextResponse.json({ success: false, error: '로그인이 필요합니다.' }, { status: 401 })
    }

    const body = await request.json().catch(() => null)
    const title = typeof body?.title === 'string' ? body.title.trim() : ''
    const reason = typeof body?.reason === 'string' ? body.reason.trim().slice(0, 1000) : ''
    if (!title || !reason) {
      return NextResponse.json({ success: false, error: '필수 항목 누락' }, { status: 400 })
    }

    const [page] = await db
      .select({ title: wikiPages.title })
      .from(wikiPages)
      .where(and(ne(wikiPages.isDeleted, true), or(eq(wikiPages.title, title), eq(wikiPages.slug, title))))
      .limit(1)
    if (!page) {
      return NextResponse.json({ success: false, error: '문서를 찾을 수 없습니다.' }, { status: 404 })
    }

    await db.insert(wikiReports).values({
      pageTitle: page.title,
      reason,
      targetUserId: typeof body?.targetUserId === 'string' ? body.targetUserId : null,
      reporter: reporter.username,
      reporterId: reporter.id,
    })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('신고 생성 오류:', error)
    return NextResponse.json({ success: false, error: '신고 처리 중 오류' }, { status: 500 })
  }
}

// 신고 목록 — 운영진 전용. ?status=open|resolved|all
export async function GET(request: NextRequest) {
  const staff = await getStaffUser(request)
  if (!staff?.isModerator) {
    return NextResponse.json({ success: false, error: '권한 없음' }, { status: 403 })
  }
  const status = new URL(request.url).searchParams.get('status') || 'open'
  try {
    const query = getDb().select().from(wikiReports)
    const reports = await (status === 'all' ? query : query.where(eq(wikiReports.status, status)))
      .orderBy(desc(wikiReports.createdAt))
      .limit(200)
    return NextResponse.json({ success: true, reports })
  } catch (error) {
    if ((error as { code?: string })?.code === '42P01') return NextResponse.json({ success: true, reports: [] })
    console.error('신고 목록 오류:', error)
    return NextResponse.json({ success: false, error: '신고 목록 조회 중 오류' }, { status: 500 })
  }
}

// 신고 처리 — { id, status: 'open'|'resolved' }
export async function PATCH(request: NextRequest) {
  const staff = await getStaffUser(request)
  if (!staff?.isModerator) {
    return NextResponse.json({ success: false, error: '권한 없음' }, { status: 403 })
  }
  const body = await request.json().catch(() => null)
  const status = body?.status === 'open' ? 'open' : 'resolved'
  if (typeof body?.id !== 'string') {
    return NextResponse.json({ success: false, error: '신고를 지정해 주세요.' }, { status: 400 })
  }
  const [report] = await getDb()
    .update(wikiReports)
    .set(
      status === 'resolved'
        ? { status, resolvedBy: staff.user.username, resolvedAt: new Date() }
        : { status, resolvedBy: null, resolvedAt: null }
    )
    .where(eq(wikiReports.id, body.id))
    .returning()
  if (!report) return NextResponse.json({ success: false, error: '신고를 찾을 수 없습니다.' }, { status: 404 })
  return NextResponse.json({ success: true, report })
}
