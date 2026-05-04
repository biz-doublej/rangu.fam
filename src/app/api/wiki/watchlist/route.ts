import { getRequiredEnv } from '@/lib/env'
import { NextRequest, NextResponse } from 'next/server'
import { and, eq, ne, sql } from 'drizzle-orm'
import jwt from 'jsonwebtoken'
import { getDb } from '@/db/client'
import { wikiPages, wikiUsers } from '@/db/schema/wiki'
import { enforceUserAccessPolicy } from '@/lib/doublejAuth'

export const dynamic = 'force-dynamic'

const JWT_SECRET = getRequiredEnv('JWT_SECRET')

async function getUserFromToken(request: NextRequest) {
  const token = request.cookies.get('wiki-token')?.value
  if (!token) return null
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any
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

// 내 감시목록 조회
export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromToken(request)
    if (!user) {
      return NextResponse.json(
        { success: false, error: '로그인이 필요합니다.' },
        { status: 401 }
      )
    }
    const db = getDb()
    const pages = await db
      .select({
        title: wikiPages.title,
        slug: wikiPages.slug,
        namespace: wikiPages.namespace,
        lastEditDate: wikiPages.lastEditDate,
        lastEditor: wikiPages.lastEditor,
      })
      .from(wikiPages)
      .where(
        and(
          ne(wikiPages.isDeleted, true),
          sql`${wikiPages.watchers} @> ARRAY[${user.id}]::text[]`
        )
      )

    return NextResponse.json({ success: true, pages })
  } catch (e) {
    console.error('감시목록 조회 오류:', e)
    return NextResponse.json(
      { success: false, error: '조회 중 오류' },
      { status: 500 }
    )
  }
}

// 감시 추가/제거: { title, action: 'add'|'remove' }
export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromToken(request)
    if (!user) {
      return NextResponse.json(
        { success: false, error: '로그인이 필요합니다.' },
        { status: 401 }
      )
    }

    const { title, action } = await request.json()
    if (!title || !action || !['add', 'remove'].includes(action)) {
      return NextResponse.json(
        { success: false, error: 'title과 action(add|remove) 필요' },
        { status: 400 }
      )
    }

    const db = getDb()
    const [page] = await db
      .select({ id: wikiPages.id, watchers: wikiPages.watchers })
      .from(wikiPages)
      .where(
        and(
          ne(wikiPages.isDeleted, true),
          sql`(${wikiPages.title} = ${title} OR ${wikiPages.slug} = ${title})`
        )
      )
      .limit(1)

    if (!page) {
      return NextResponse.json(
        { success: false, error: '문서를 찾을 수 없습니다.' },
        { status: 404 }
      )
    }

    const current = Array.isArray(page.watchers) ? page.watchers : []
    let next: string[]
    if (action === 'add') {
      next = current.includes(user.id) ? current : [...current, user.id]
    } else {
      next = current.filter((id) => id !== user.id)
    }

    await db
      .update(wikiPages)
      .set({ watchers: next, updatedAt: new Date() })
      .where(eq(wikiPages.id, page.id))

    return NextResponse.json({
      success: true,
      message: action === 'add' ? '감시목록에 추가했습니다.' : '감시목록에서 제거했습니다.',
      watching: action === 'add',
    })
  } catch (e) {
    console.error('감시목록 변경 오류:', e)
    return NextResponse.json(
      { success: false, error: '감시목록 변경 중 오류' },
      { status: 500 }
    )
  }
}
