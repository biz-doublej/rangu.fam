import { getRequiredEnv } from '@/lib/env'
import { NextRequest, NextResponse } from 'next/server'
import { and, desc, eq, ne, or, sql } from 'drizzle-orm'
import jwt from 'jsonwebtoken'
import { randomUUID } from 'crypto'
import { getDb } from '@/db/client'
import { wikiDiscussions, wikiPages, wikiUsers } from '@/db/schema/wiki'
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

// 목록 조회: /api/wiki/discussions?title=문서명
export async function GET(request: NextRequest) {
  try {
    const db = getDb()
    const { searchParams } = new URL(request.url)
    const title = searchParams.get('title')
    if (!title) {
      return NextResponse.json(
        { success: false, error: 'title 필요' },
        { status: 400 }
      )
    }

    const [page] = await db
      .select({ id: wikiPages.id })
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

    const discussions = await db
      .select()
      .from(wikiDiscussions)
      .where(eq(wikiDiscussions.pageId, page.id))
      .orderBy(desc(wikiDiscussions.updatedAt))

    return NextResponse.json({ success: true, discussions })
  } catch (e) {
    console.error('토론 조회 오류:', e)
    return NextResponse.json(
      { success: false, error: '토론 조회 중 오류' },
      { status: 500 }
    )
  }
}

// 새 토론 생성
export async function POST(request: NextRequest) {
  try {
    const db = getDb()
    const user = await getUserFromToken(request)
    if (!user) {
      return NextResponse.json({ success: false, error: '로그인이 필요합니다.' }, { status: 401 })
    }

    const { title, topic, content, category } = await request.json()
    if (!title || !topic || !content) {
      return NextResponse.json({ success: false, error: '필수 항목 누락' }, { status: 400 })
    }

    const [page] = await db
      .select({ id: wikiPages.id })
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

    const [created] = await db
      .insert(wikiDiscussions)
      .values({
        pageId: page.id,
        title: topic,
        content,
        author: user.username,
        authorId: user.id,
        category: category || 'general',
        priority: 'normal',
        status: 'open',
        replies: [],
        views: 0,
        participants: [user.id],
        tags: [],
        isLocked: false,
      })
      .returning()

    // 사용자 토론 통계 증가
    try {
      await db
        .update(wikiUsers)
        .set({ discussionPosts: sql`${wikiUsers.discussionPosts} + 1` })
        .where(eq(wikiUsers.id, user.id))
    } catch {}

    return NextResponse.json({
      success: true,
      message: '토론이 생성되었습니다.',
      discussion: created,
    })
  } catch (e) {
    console.error('토론 생성 오류:', e)
    return NextResponse.json(
      { success: false, error: '토론 생성 중 오류' },
      { status: 500 }
    )
  }
}

// 상태 변경 / 잠금 / 답글 추가
export async function PATCH(request: NextRequest) {
  try {
    const db = getDb()
    const user = await getUserFromToken(request)
    if (!user) {
      return NextResponse.json({ success: false, error: '로그인이 필요합니다.' }, { status: 401 })
    }

    const { discussionId, action, payload } = await request.json()
    if (!discussionId || !action) {
      return NextResponse.json({ success: false, error: '필수 항목 누락' }, { status: 400 })
    }

    const [d] = await db
      .select()
      .from(wikiDiscussions)
      .where(eq(wikiDiscussions.id, discussionId))
      .limit(1)

    if (!d) {
      return NextResponse.json(
        { success: false, error: '토론 스레드를 찾을 수 없습니다.' },
        { status: 404 }
      )
    }

    const now = new Date()
    const updateData: Record<string, any> = { updatedAt: now }

    switch (action) {
      case 'reply': {
        if (d.isLocked) {
          return NextResponse.json({ success: false, error: '잠긴 토론입니다.' }, { status: 403 })
        }
        const newReply = {
          id: randomUUID(),
          content: payload?.content || '',
          author: user.username,
          authorId: user.id,
          timestamp: now.toISOString(),
          isDeleted: false,
          likes: 0,
          likedBy: [] as string[],
        }
        const replies = Array.isArray(d.replies) ? [...d.replies, newReply] : [newReply]
        const participants = Array.isArray(d.participants)
          ? Array.from(new Set([...d.participants, user.id]))
          : [user.id]
        updateData.replies = replies
        updateData.participants = participants
        break
      }
      case 'status': {
        updateData.status = payload?.status || d.status
        break
      }
      case 'lock': {
        updateData.isLocked = Boolean(payload?.isLocked)
        updateData.lockedBy = user.username
        updateData.lockReason = payload?.reason ?? null
        break
      }
      default:
        return NextResponse.json(
          { success: false, error: '지원하지 않는 action' },
          { status: 400 }
        )
    }

    const [updated] = await db
      .update(wikiDiscussions)
      .set(updateData)
      .where(eq(wikiDiscussions.id, discussionId))
      .returning()

    return NextResponse.json({
      success: true,
      message: '업데이트되었습니다.',
      discussion: updated,
    })
  } catch (e) {
    console.error('토론 업데이트 오류:', e)
    return NextResponse.json(
      { success: false, error: '토론 업데이트 중 오류' },
      { status: 500 }
    )
  }
}
