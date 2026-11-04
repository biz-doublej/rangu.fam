import { NextRequest, NextResponse } from 'next/server'
import { and, eq, ne, or, sql } from 'drizzle-orm'
import { getDb } from '@/db/client'
import { wikiUsers } from '@/db/schema/wiki'
import { getAuthenticatedWikiUser } from '@/lib/doublejAuth'
import { nextDisplayNameChangeAt, validateDisplayName } from '@/lib/accountRules'

export const dynamic = 'force-dynamic'

export async function PATCH(request: NextRequest) {
  const user = await getAuthenticatedWikiUser(request)
  if (!user) {
    return NextResponse.json({ success: false, error: '로그인이 필요합니다.' }, { status: 401 })
  }

  const body = await request.json().catch(() => null)
  const isAdmin = user.role === 'admin'
  const check = validateDisplayName(body?.displayName, { isAdmin })
  if (!check.ok) {
    return NextResponse.json({ success: false, error: check.error }, { status: 400 })
  }
  if (check.value === user.displayName) {
    return NextResponse.json({ success: true, displayName: check.value })
  }

  const nextChangeAt = isAdmin ? null : nextDisplayNameChangeAt(user.displayNameChangedAt)
  if (nextChangeAt) {
    return NextResponse.json(
      { success: false, error: '표시 이름은 7일에 한 번만 바꿀 수 있습니다.', nextNameChangeAt: nextChangeAt.toISOString() },
      { status: 429 }
    )
  }

  const db = getDb()
  const lower = check.value.toLowerCase()
  const [taken] = await db
    .select({ id: wikiUsers.id })
    .from(wikiUsers)
    .where(
      and(
        ne(wikiUsers.id, user.id),
        or(sql`lower(${wikiUsers.displayName}) = ${lower}`, sql`lower(${wikiUsers.username}) = ${lower}`)
      )
    )
    .limit(1)
  if (taken) {
    return NextResponse.json({ success: false, error: '이미 사용 중인 이름입니다.' }, { status: 409 })
  }

  const now = new Date()
  await db
    .update(wikiUsers)
    .set({ displayName: check.value, displayNameChangedAt: now, updatedAt: now })
    .where(eq(wikiUsers.id, user.id))

  return NextResponse.json({ success: true, displayName: check.value })
}
