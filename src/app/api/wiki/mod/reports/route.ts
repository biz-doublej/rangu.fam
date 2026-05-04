import { getRequiredEnv } from '@/lib/env'
import { NextRequest, NextResponse } from 'next/server'
import { and, eq, ne, or } from 'drizzle-orm'
import jwt from 'jsonwebtoken'
import { getDb } from '@/db/client'
import { wikiPages, wikiUsers } from '@/db/schema/wiki'
import { enforceUserAccessPolicy } from '@/lib/doublejAuth'

export const dynamic = 'force-dynamic'

const JWT_SECRET = getRequiredEnv('JWT_SECRET')

// 메모리 저장 (서버 재시작 시 초기화) — 데모/POC 용도.
// 실제 영속화 필요하면 별도 wiki_reports 테이블 추가.
const reports: Array<{
  id: number
  title: string
  reason: string
  targetUserId: string | null
  reporter: string
  status: 'open' | 'resolved'
  createdAt: string
}> = []

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

// 신고 생성: { title, reason, targetUserId? }
export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromToken(request)
    if (!user) {
      return NextResponse.json(
        { success: false, error: '로그인이 필요합니다.' },
        { status: 401 }
      )
    }

    const { title, reason, targetUserId } = await request.json()
    if (!title || !reason) {
      return NextResponse.json(
        { success: false, error: '필수 항목 누락' },
        { status: 400 }
      )
    }

    const db = getDb()
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

    reports.push({
      id: reports.length + 1,
      title,
      reason,
      targetUserId: targetUserId || null,
      reporter: user.username,
      status: 'open',
      createdAt: new Date().toISOString(),
    })

    return NextResponse.json({ success: true })
  } catch (e) {
    console.error('신고 생성 오류:', e)
    return NextResponse.json(
      { success: false, error: '신고 처리 중 오류' },
      { status: 500 }
    )
  }
}

// 신고 목록
export async function GET() {
  try {
    return NextResponse.json({ success: true, reports })
  } catch (e) {
    console.error('신고 목록 오류:', e)
    return NextResponse.json(
      { success: false, error: '신고 목록 조회 중 오류' },
      { status: 500 }
    )
  }
}
