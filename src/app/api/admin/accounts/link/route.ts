import { NextRequest, NextResponse } from 'next/server'
import { eq, sql } from 'drizzle-orm'
import { getDb } from '@/db/client'
import { wikiLoginEvents, wikiPages, wikiRevisions, wikiSubmissions, wikiUsers } from '@/db/schema/wiki'
import { planAccountLink } from '@/lib/adminRules'
import { getStaffUser } from '@/lib/staffAuth'

export const dynamic = 'force-dynamic'

const FORBIDDEN = { success: false, error: '관리자 권한이 필요합니다.' }

async function loadPair(sourceId: unknown, targetId: unknown) {
  if (typeof sourceId !== 'string' || typeof targetId !== 'string') return null
  const db = getDb()
  const [source] = await db.select().from(wikiUsers).where(eq(wikiUsers.id, sourceId)).limit(1)
  const [target] = await db.select().from(wikiUsers).where(eq(wikiUsers.id, targetId)).limit(1)
  return source && target ? { source, target } : null
}

async function countRevisions(userId: string) {
  const [row] = await getDb()
    .select({ count: sql<number>`count(*)::int` })
    .from(wikiRevisions)
    .where(eq(wikiRevisions.authorId, userId))
  return row?.count ?? 0
}

function summary(user: typeof wikiUsers.$inferSelect) {
  return {
    id: user.id,
    username: user.username,
    displayName: user.displayName || user.username,
    email: user.email,
    isActive: user.isActive,
    google: Boolean(user.ssoSubject?.startsWith('google:')),
    naver: Boolean(user.naverId),
    lastLogin: user.lastLogin,
    createdAt: user.createdAt,
  }
}

/** 미리보기: ?source=<새 계정>&target=<기존 계정> */
export async function GET(request: NextRequest) {
  if (!(await getStaffUser(request))?.isAdmin) return NextResponse.json(FORBIDDEN, { status: 403 })
  const params = new URL(request.url).searchParams
  const pair = await loadPair(params.get('source'), params.get('target'))
  if (!pair) return NextResponse.json({ success: false, error: '두 계정을 모두 선택해 주세요.' }, { status: 400 })

  const plan = planAccountLink(pair.source, pair.target)
  return NextResponse.json({
    success: true,
    plan,
    source: { ...summary(pair.source), revisions: await countRevisions(pair.source.id) },
    target: { ...summary(pair.target), revisions: await countRevisions(pair.target.id) },
  })
}

/**
 * 실행: { source, target }. 새 계정의 로그인 수단과 편집 기록을 기존 계정으로 옮기고 새 계정은 비활성화한다.
 */
export async function POST(request: NextRequest) {
  const staff = await getStaffUser(request)
  if (!staff?.isAdmin) return NextResponse.json(FORBIDDEN, { status: 403 })
  const body = await request.json().catch(() => null)
  const pair = await loadPair(body?.source, body?.target)
  if (!pair) return NextResponse.json({ success: false, error: '두 계정을 모두 선택해 주세요.' }, { status: 400 })

  const { source, target } = pair
  const plan = planAccountLink(source, target)
  if (!plan.ok) return NextResponse.json({ success: false, error: plan.error }, { status: 409 })

  const now = new Date()
  await getDb().transaction(async (tx) => {
    // 고유 제약 때문에 새 계정의 값을 먼저 비운다.
    await tx
      .update(wikiUsers)
      .set({
        ...(plan.moveGoogle ? { ssoSubject: null } : {}),
        ...(plan.moveNaver ? { naverId: null, naverEmail: null } : {}),
        isActive: false,
        updatedAt: now,
      })
      .where(eq(wikiUsers.id, source.id))
    await tx
      .update(wikiUsers)
      .set({
        ...(plan.moveGoogle ? { ssoSubject: source.ssoSubject, googleUnlinkedAt: null } : {}),
        ...(plan.moveNaver ? { naverId: source.naverId, naverEmail: source.naverEmail } : {}),
        edits: target.edits + source.edits,
        pagesCreated: target.pagesCreated + source.pagesCreated,
        updatedAt: now,
      })
      .where(eq(wikiUsers.id, target.id))
    await tx
      .update(wikiRevisions)
      .set({ authorId: target.id, author: target.username })
      .where(eq(wikiRevisions.authorId, source.id))
    await tx
      .update(wikiPages)
      .set({ lastEditorId: target.id, lastEditor: target.username })
      .where(eq(wikiPages.lastEditorId, source.id))
    await tx
      .update(wikiSubmissions)
      .set({ authorId: target.id, author: target.username })
      .where(eq(wikiSubmissions.authorId, source.id))
    await tx.update(wikiLoginEvents).set({ userId: target.id }).where(eq(wikiLoginEvents.userId, source.id))
  })

  console.info(`[admin] account link ${source.username} -> ${target.username} by ${staff.user.username}`)
  return NextResponse.json({
    success: true,
    message: `${source.username}의 로그인을 ${target.username} 계정으로 옮겼습니다.`,
  })
}
