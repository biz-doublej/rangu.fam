import { NextRequest, NextResponse } from 'next/server'
import { asc, eq, sql } from 'drizzle-orm'
import { getDb } from '@/db/client'
import { bookmarks } from '@/db/schema'

export const dynamic = 'force-dynamic'

const VALID_USER_IDS = new Set(['jaewon', 'minseok', 'jinkyu', 'hanul', 'seungchan'])

export async function GET(request: NextRequest) {
  try {
    const userId = new URL(request.url).searchParams.get('userId')
    if (!userId) {
      return NextResponse.json({ success: false, error: '사용자 ID가 필요합니다.' }, { status: 400 })
    }
    if (!VALID_USER_IDS.has(userId)) {
      return NextResponse.json({ success: false, error: '유효하지 않은 사용자 ID입니다.' }, { status: 400 })
    }

    const db = getDb()
    const rows = await db
      .select()
      .from(bookmarks)
      .where(eq(bookmarks.userId, userId))
      .orderBy(asc(bookmarks.order))

    return NextResponse.json({ success: true, data: rows })
  } catch (error) {
    console.error('북마크 조회 오류:', error)
    return NextResponse.json({ success: false, error: '서버 오류가 발생했습니다.' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, title, url, description, icon } = body

    if (!userId || !title || !url) {
      return NextResponse.json({ success: false, error: '사용자 ID, 제목, URL은 필수입니다.' }, { status: 400 })
    }
    if (!VALID_USER_IDS.has(userId)) {
      return NextResponse.json({ success: false, error: '유효하지 않은 사용자 ID입니다.' }, { status: 400 })
    }

    try {
      new URL(url)
    } catch {
      return NextResponse.json({ success: false, error: '유효한 URL을 입력해주세요.' }, { status: 400 })
    }

    const db = getDb()
    const [{ count: existing }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(bookmarks)
      .where(eq(bookmarks.userId, userId))

    const [created] = await db
      .insert(bookmarks)
      .values({
        userId,
        title: String(title).trim(),
        url: String(url).trim(),
        description: description ? String(description).trim() : null,
        icon: icon ? String(icon).trim() : '🔗',
        order: existing,
      })
      .returning()

    return NextResponse.json({ success: true, data: created }, { status: 201 })
  } catch (error) {
    console.error('북마크 생성 오류:', error)
    return NextResponse.json({ success: false, error: '서버 오류가 발생했습니다.' }, { status: 500 })
  }
}
