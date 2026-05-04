import { NextRequest, NextResponse } from 'next/server'
import { and, eq, gt, sql } from 'drizzle-orm'
import { getDb } from '@/db/client'
import { bookmarks } from '@/db/schema'

export const dynamic = 'force-dynamic'

export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const db = getDb()
    const [row] = await db.select().from(bookmarks).where(eq(bookmarks.id, params.id)).limit(1)
    if (!row) {
      return NextResponse.json({ success: false, error: '북마크를 찾을 수 없습니다.' }, { status: 404 })
    }
    return NextResponse.json({ success: true, data: row })
  } catch (error) {
    console.error('북마크 조회 오류:', error)
    return NextResponse.json({ success: false, error: '서버 오류가 발생했습니다.' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await request.json()
    const { title, url, description, icon, order } = body

    if (url) {
      try {
        new URL(url)
      } catch {
        return NextResponse.json({ success: false, error: '유효한 URL을 입력해주세요.' }, { status: 400 })
      }
    }

    const db = getDb()
    const updates: Record<string, unknown> = { updatedAt: new Date() }
    if (title !== undefined) updates.title = String(title).trim()
    if (url !== undefined) updates.url = String(url).trim()
    if (description !== undefined) updates.description = description ? String(description).trim() : null
    if (icon !== undefined) updates.icon = icon ? String(icon).trim() : '🔗'
    if (order !== undefined) updates.order = Number(order)

    const [updated] = await db
      .update(bookmarks)
      .set(updates)
      .where(eq(bookmarks.id, params.id))
      .returning()

    if (!updated) {
      return NextResponse.json({ success: false, error: '북마크를 찾을 수 없습니다.' }, { status: 404 })
    }
    return NextResponse.json({ success: true, data: updated })
  } catch (error) {
    console.error('북마크 수정 오류:', error)
    return NextResponse.json({ success: false, error: '서버 오류가 발생했습니다.' }, { status: 500 })
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const db = getDb()
    const [deleted] = await db.delete(bookmarks).where(eq(bookmarks.id, params.id)).returning()
    if (!deleted) {
      return NextResponse.json({ success: false, error: '북마크를 찾을 수 없습니다.' }, { status: 404 })
    }

    // Re-pack subsequent orders
    await db
      .update(bookmarks)
      .set({ order: sql`${bookmarks.order} - 1` })
      .where(and(eq(bookmarks.userId, deleted.userId), gt(bookmarks.order, deleted.order)))

    return NextResponse.json({
      success: true,
      message: '북마크가 삭제되었습니다.',
      data: deleted,
    })
  } catch (error) {
    console.error('북마크 삭제 오류:', error)
    return NextResponse.json({ success: false, error: '서버 오류가 발생했습니다.' }, { status: 500 })
  }
}
