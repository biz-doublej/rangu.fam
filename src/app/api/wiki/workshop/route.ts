import { getRequiredEnv } from '@/lib/env'
import { NextRequest, NextResponse } from 'next/server'
import { eq, sql } from 'drizzle-orm'
import jwt from 'jsonwebtoken'
import { getDb } from '@/db/client'
import { wikiUsers, wikiWorkshopStatements } from '@/db/schema/wiki'
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

function toSafeStatement(row: any) {
  const p = (row.payload || {}) as any
  return {
    id: row.id,
    issueNumber: p.issueNumber,
    issueLabel: `${p.issueNumber}호`,
    speaker: p.speaker,
    message: p.message,
    listAuthor: p.listAuthor,
    listAuthorDisplayName: p.listAuthorDisplayName || p.listAuthor,
    listAuthorDiscordId: p.listAuthorDiscordId || null,
    createdAt: row.createdAt instanceof Date ? row.createdAt.toISOString() : row.createdAt,
    updatedAt: row.updatedAt instanceof Date ? row.updatedAt.toISOString() : row.updatedAt,
  }
}

export async function GET(request: NextRequest) {
  try {
    const db = getDb()
    const { searchParams } = new URL(request.url)
    const limitRaw = Number(searchParams.get('limit') || 200)
    const limit = Number.isFinite(limitRaw) ? Math.max(1, Math.min(limitRaw, 500)) : 200

    // jsonb payload 의 issueNumber 기준 desc 정렬
    const result = await db.execute<any>(
      sql`SELECT id, payload, created_at, updated_at
          FROM wiki_workshop_statements
          ORDER BY (payload->>'issueNumber')::int DESC NULLS LAST, created_at DESC
          LIMIT ${limit}`
    )
    const rows = ((result as any).rows ?? result) as any[]

    return NextResponse.json({
      success: true,
      data: {
        statements: rows.map((r) =>
          toSafeStatement({
            id: r.id,
            payload: r.payload,
            createdAt: r.created_at,
            updatedAt: r.updated_at,
          })
        ),
      },
    })
  } catch (error) {
    console.error('워크숍 발언 목록 조회 오류:', error)
    return NextResponse.json(
      { success: false, error: '발언 목록을 불러오는 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const db = getDb()
    const user: any = await getUserFromToken(request)
    if (!user) {
      return NextResponse.json(
        { success: false, error: '작성하려면 위키 로그인이 필요합니다.' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const speaker = String(body?.speaker || '').trim()
    const message = String(body?.message || '').trim()

    if (!speaker || !message) {
      return NextResponse.json(
        { success: false, error: '발언자와 발언 메시지를 모두 입력해주세요.' },
        { status: 400 }
      )
    }
    if (speaker.length > 40) {
      return NextResponse.json(
        { success: false, error: '발언자 이름은 40자 이하여야 합니다.' },
        { status: 400 }
      )
    }
    if (message.length > 1200) {
      return NextResponse.json(
        { success: false, error: '발언 메시지는 1200자 이하여야 합니다.' },
        { status: 400 }
      )
    }

    const listAuthor = user.discordUsername || user.username || user.displayName || 'unknown'
    const listAuthorDisplayName = user.displayName || user.discordUsername || user.username || 'unknown'
    const listAuthorDiscordId = user.discordId || null

    // 다음 issueNumber — payload->>'issueNumber' 의 max + 1
    const maxResult = await db.execute<any>(
      sql`SELECT COALESCE(MAX((payload->>'issueNumber')::int), 0) AS max_issue FROM wiki_workshop_statements`
    )
    const maxRows = ((maxResult as any).rows ?? maxResult) as any[]
    const nextIssueNumber = Number(maxRows[0]?.max_issue || 0) + 1

    const payload = {
      issueNumber: nextIssueNumber,
      speaker,
      message,
      listAuthor,
      listAuthorDisplayName,
      listAuthorDiscordId,
    }

    const [created] = await db
      .insert(wikiWorkshopStatements)
      .values({ payload })
      .returning()

    return NextResponse.json({
      success: true,
      data: {
        statement: toSafeStatement(created),
      },
    })
  } catch (error) {
    console.error('워크숍 발언 작성 오류:', error)
    return NextResponse.json(
      { success: false, error: '발언을 작성하는 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
