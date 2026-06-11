import { getRequiredEnv } from '@/lib/env'
import { NextRequest, NextResponse } from 'next/server'
import { and, desc, eq } from 'drizzle-orm'
import jwt from 'jsonwebtoken'
import { getDb } from '@/db/client'
import { wikiPages, wikiRevisions, wikiSubmissions, wikiUsers } from '@/db/schema/wiki'
import { isModeratorOrAbove } from '@/app/api/wiki/_utils/policy'
import { enforceUserAccessPolicy } from '@/lib/doublejAuth'
import { parseRedirectTarget } from '@/lib/wiki/redirect'
import { DiscordWebhookService } from '@/services/discordWebhookService'

export const dynamic = 'force-dynamic'

const JWT_SECRET = getRequiredEnv('JWT_SECRET')

async function getUserFromToken(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.split(' ')[1] : null
  const cookieToken = request.cookies.get('wiki-token')?.value || null
  const tokens = [bearerToken, cookieToken].filter(Boolean) as string[]
  if (tokens.length === 0) return null

  const db = getDb()
  for (const token of tokens) {
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as any
      let user: any = null
      if (decoded.userId) {
        const [u] = await db.select().from(wikiUsers).where(eq(wikiUsers.id, decoded.userId)).limit(1)
        user = u
      } else if (decoded.username) {
        const [u] = await db.select().from(wikiUsers).where(eq(wikiUsers.username, decoded.username)).limit(1)
        user = u
      }
      if (!user) continue
      return enforceUserAccessPolicy(user)
    } catch {
      continue
    }
  }
  return null
}

// GET /api/wiki/mod?status=pending — 검토 대기 큐
export async function GET(request: NextRequest) {
  const user = await getUserFromToken(request)
  if (!user || !isModeratorOrAbove(user as any)) {
    return NextResponse.json({ success: false, error: '권한 없음' }, { status: 403 })
  }
  const { searchParams } = new URL(request.url)
  const status = (searchParams.get('status') || 'pending') as
    | 'pending' | 'approved' | 'rejected' | 'onhold'

  const db = getDb()
  const list = await db
    .select()
    .from(wikiSubmissions)
    .where(eq(wikiSubmissions.status, status))
    .orderBy(desc(wikiSubmissions.createdAt))

  // legacy mongoose 호환 — 클라이언트(`DocumentManagement`, `WikiModPage`) 가 `_id` 사용.
  // Drizzle row 의 `id` 를 `_id` 로 alias 하여 호환 유지.
  const submissions = list.map((row) => ({ ...row, _id: row.id }))

  return NextResponse.json({ success: true, submissions })
}

// POST /api/wiki/mod — { action: 'approve'|'reject'|'hold', submissionId, reason? }
export async function POST(request: NextRequest) {
  const user: any = await getUserFromToken(request)
  if (!user || !isModeratorOrAbove(user as any)) {
    return NextResponse.json({ success: false, error: '권한 없음' }, { status: 403 })
  }

  const { action, submissionId, reason } = await request.json()
  const db = getDb()

  const [sub] = await db
    .select()
    .from(wikiSubmissions)
    .where(eq(wikiSubmissions.id, submissionId))
    .limit(1)

  if (!sub || sub.status !== 'pending') {
    return NextResponse.json(
      { success: false, error: '대상이 없거나 이미 처리됨' },
      { status: 404 }
    )
  }

  const now = new Date()

  if (action === 'reject' || action === 'hold') {
    const newStatus = action === 'reject' ? 'rejected' : 'onhold'
    await db
      .update(wikiSubmissions)
      .set({
        status: newStatus,
        reason: reason || '',
        reviewedBy: user.username,
        reviewerId: user.id,
        reviewedAt: now,
        updatedAt: now,
      })
      .where(eq(wikiSubmissions.id, submissionId))

    try {
      await DiscordWebhookService.sendDocumentApprove(
        user.username,
        sub.author,
        sub.targetTitle,
        newStatus === 'onhold' ? 'hold' : newStatus,
        reason
      )
    } catch (e) {
      console.error('디스코드 웹훅 전송 오류:', e)
    }

    return NextResponse.json({
      success: true,
      message: action === 'reject' ? '반려 처리되었습니다.' : '보류 처리되었습니다.',
    })
  }

  if (action === 'approve') {
    // 본문 첫 줄 `#redirect 대상` 자동 감지 (승인 경로도 직접 편집과 동일 규칙)
    const detectedRedirect = parseRedirectTarget(sub.content)

    if (sub.type === 'create') {
      await db.insert(wikiPages).values({
        title: sub.targetTitle,
        slug: sub.targetSlug,
        namespace: sub.namespace,
        content: sub.content,
        summary: sub.summary,
        categories: sub.categories,
        tags: sub.tags,
        creator: sub.author,
        creatorId: sub.authorId,
        lastEditor: sub.author,
        lastEditorId: sub.authorId,
        lastEditDate: now,
        lastEditSummary: sub.editSummary || '문서 생성(승인)',
        currentRevision: 1,
        isRedirect: Boolean(detectedRedirect),
        redirectTarget: detectedRedirect,
        isStub: (sub.content || '').length < 500,
        edits: 1,
        watchers: [sub.authorId],
      })
    } else if (sub.pageId) {
      const [page] = await db
        .select()
        .from(wikiPages)
        .where(eq(wikiPages.id, sub.pageId))
        .limit(1)

      if (!page) {
        return NextResponse.json(
          { success: false, error: '원문서 없음' },
          { status: 404 }
        )
      }

      const prevLen = (page.content || '').length
      const newRev = page.currentRevision + 1

      await db.insert(wikiRevisions).values({
        pageId: page.id,
        revisionNumber: newRev,
        content: sub.content,
        summary: sub.editSummary || '문서 편집(승인)',
        author: sub.author,
        authorId: sub.authorId,
        editType: 'edit',
        isMinorEdit: false,
        isAutomated: false,
        contentLength: sub.content.length,
        sizeChange: sub.content.length - prevLen,
        isVerified: true,
        timestampAt: now,
      })

      await db
        .update(wikiPages)
        .set({
          content: sub.content,
          summary: sub.summary,
          lastEditor: sub.author,
          lastEditorId: sub.authorId,
          lastEditDate: now,
          lastEditSummary: sub.editSummary || '문서 편집(승인)',
          currentRevision: newRev,
          edits: page.edits + 1,
          isStub: (sub.content || '').length < 500,
          isRedirect: Boolean(detectedRedirect),
          redirectTarget: detectedRedirect,
          updatedAt: now,
        })
        .where(eq(wikiPages.id, page.id))
    }

    await db
      .update(wikiSubmissions)
      .set({
        status: 'approved',
        reviewedBy: user.username,
        reviewerId: user.id,
        reviewedAt: now,
        updatedAt: now,
      })
      .where(eq(wikiSubmissions.id, submissionId))

    try {
      await DiscordWebhookService.sendDocumentApprove(
        user.username,
        sub.author,
        sub.targetTitle,
        'approved'
      )
    } catch (e) {
      console.error('디스코드 웹훅 전송 오류:', e)
    }

    return NextResponse.json({ success: true, message: '승인 처리되었습니다.' })
  }

  return NextResponse.json({ success: false, error: '잘못된 요청' }, { status: 400 })
}
