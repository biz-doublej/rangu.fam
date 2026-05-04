import { getRequiredEnv } from '@/lib/env'
import { NextRequest, NextResponse } from 'next/server'
import { and, eq, ne, or } from 'drizzle-orm'
import jwt from 'jsonwebtoken'
import { getDb } from '@/db/client'
import { wikiPages, wikiRevisions, wikiUsers } from '@/db/schema/wiki'
import { canEditPage } from '@/app/api/wiki/_utils/policy'
import { DiscordWebhookService } from '@/services/discordWebhookService'
import { enforceUserAccessPolicy } from '@/lib/doublejAuth'

export const dynamic = 'force-dynamic'

const JWT_SECRET = getRequiredEnv('JWT_SECRET')

async function getUserFromToken(request: NextRequest) {
  const token = request.cookies.get('wiki-token')?.value
  if (!token) return null
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any
    if (!decoded?.userId) return null
    const db = getDb()
    const [user] = await db
      .select()
      .from(wikiUsers)
      .where(eq(wikiUsers.id, decoded.userId))
      .limit(1)
    if (!user) return null
    return enforceUserAccessPolicy(user as any)
  } catch {
    return null
  }
}

// POST /api/wiki/pages/revert  body: { title, revisionNumber, summary? }
export async function POST(request: NextRequest) {
  try {
    const db = getDb()
    const user = await getUserFromToken(request)
    if (!user) {
      return NextResponse.json({ success: false, error: '로그인이 필요합니다.' }, { status: 401 })
    }

    const { title, revisionNumber, summary } = await request.json()
    if (!title || !revisionNumber) {
      return NextResponse.json(
        { success: false, error: 'title과 revisionNumber는 필수입니다.' },
        { status: 400 }
      )
    }

    const [page] = await db
      .select()
      .from(wikiPages)
      .where(
        and(
          ne(wikiPages.isDeleted, true),
          or(eq(wikiPages.title, title), eq(wikiPages.slug, title))
        )
      )
      .limit(1)

    if (!page) {
      return NextResponse.json(
        { success: false, error: '문서를 찾을 수 없습니다.' },
        { status: 404 }
      )
    }

    if (!canEditPage(user as any, page as any)) {
      return NextResponse.json(
        { success: false, error: '보호된 문서이므로 되돌리기 권한이 없습니다.' },
        { status: 403 }
      )
    }

    const [targetRev] = await db
      .select({ content: wikiRevisions.content })
      .from(wikiRevisions)
      .where(
        and(
          eq(wikiRevisions.pageId, page.id),
          eq(wikiRevisions.revisionNumber, Number(revisionNumber))
        )
      )
      .limit(1)

    if (!targetRev) {
      return NextResponse.json(
        { success: false, error: '대상 리비전을 찾을 수 없습니다.' },
        { status: 404 }
      )
    }

    const now = new Date()
    const newRevisionNumber = page.currentRevision + 1
    const newContent = targetRev.content
    const sizeChange = newContent.length - (page.content?.length || 0)
    const revertSummary = summary || `Revert to r${revisionNumber}`

    await db.insert(wikiRevisions).values({
      pageId: page.id,
      revisionNumber: newRevisionNumber,
      content: newContent,
      summary: revertSummary,
      author: user.username,
      authorId: user.id,
      editType: 'revert',
      isMinorEdit: false,
      isAutomated: false,
      contentLength: newContent.length,
      sizeChange,
      timestampAt: now,
    })

    await db
      .update(wikiPages)
      .set({
        content: newContent,
        lastEditor: user.username,
        lastEditorId: user.id,
        lastEditSummary: revertSummary,
        lastEditDate: now,
        currentRevision: newRevisionNumber,
        edits: page.edits + 1,
        updatedAt: now,
      })
      .where(eq(wikiPages.id, page.id))

    try {
      await DiscordWebhookService.sendDocumentEdit(
        user.username,
        page.title,
        `문서를 버전 ${revisionNumber}로 되돌림: ${summary || ''}`,
        `문서가 이전 버전(#${revisionNumber})으로 되돌려졌습니다.`
      )
    } catch (webhookError) {
      console.error('Discord webhook 전송 실패:', webhookError)
    }

    return NextResponse.json({
      success: true,
      message: '되돌리기 완료',
      revisionNumber: newRevisionNumber,
    })
  } catch (e) {
    console.error('되돌리기 오류:', e)
    return NextResponse.json(
      { success: false, error: '되돌리기 처리 중 오류' },
      { status: 500 }
    )
  }
}
