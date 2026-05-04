import { NextRequest, NextResponse } from 'next/server'
import { and, asc, eq, inArray } from 'drizzle-orm'
import { getDb } from '@/db/client'
import { bookmarks } from '@/db/schema'

export const dynamic = 'force-dynamic'

const VALID_USER_IDS = new Set(['jaewon', 'minseok', 'jinkyu', 'hanul', 'seungchan'])

export async function POST(request: NextRequest) {
  try {
    const { userId, bookmarkIds } = await request.json()

    if (!userId || !Array.isArray(bookmarkIds)) {
      return NextResponse.json(
        { success: false, error: '사용자 ID와 북마크 ID 배열이 필요합니다.' },
        { status: 400 }
      )
    }
    if (!VALID_USER_IDS.has(userId)) {
      return NextResponse.json({ success: false, error: '유효하지 않은 사용자 ID입니다.' }, { status: 400 })
    }

    const db = getDb()

    // Validate all IDs belong to this user
    const owned = await db
      .select({ id: bookmarks.id })
      .from(bookmarks)
      .where(and(eq(bookmarks.userId, userId), inArray(bookmarks.id, bookmarkIds as string[])))

    if (owned.length !== bookmarkIds.length) {
      return NextResponse.json(
        { success: false, error: '유효하지 않은 북마크 ID가 포함되어 있습니다.' },
        { status: 400 }
      )
    }

    // Update each in a transaction
    await db.transaction(async (tx) => {
      for (let i = 0; i < bookmarkIds.length; i++) {
        await tx
          .update(bookmarks)
          .set({ order: i, updatedAt: new Date() })
          .where(and(eq(bookmarks.id, bookmarkIds[i] as string), eq(bookmarks.userId, userId)))
      }
    })

    const updated = await db
      .select()
      .from(bookmarks)
      .where(eq(bookmarks.userId, userId))
      .orderBy(asc(bookmarks.order))

    return NextResponse.json({
      success: true,
      data: updated,
      message: '북마크 순서가 업데이트되었습니다.',
    })
  } catch (error) {
    console.error('북마크 순서 재정렬 오류:', error)
    return NextResponse.json({ success: false, error: '서버 오류가 발생했습니다.' }, { status: 500 })
  }
}
