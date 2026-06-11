import { NextRequest, NextResponse } from 'next/server'
import { and, eq, sql } from 'drizzle-orm'
import { getDb } from '@/db/client'
import { wikiPollVotes } from '@/db/schema/wiki'
import { getAuthenticatedWikiUser } from '@/lib/doublejAuth'

export const dynamic = 'force-dynamic'

const MAX_OPTIONS = 10

// 집계: pollId 의 옵션별 표수 배열 + (로그인 시) 내 표
async function tallyPoll(pollId: string, optionCount: number, voterId?: string) {
  const db = getDb()
  const rows = await db
    .select({ optionIndex: wikiPollVotes.optionIndex, c: sql<number>`count(*)::int` })
    .from(wikiPollVotes)
    .where(eq(wikiPollVotes.pollId, pollId))
    .groupBy(wikiPollVotes.optionIndex)

  const counts = new Array(optionCount).fill(0)
  let total = 0
  for (const row of rows) {
    if (row.optionIndex >= 0 && row.optionIndex < optionCount) {
      counts[row.optionIndex] = row.c
    }
    total += row.c
  }

  let myVote: number | null = null
  if (voterId) {
    const [mine] = await db
      .select({ optionIndex: wikiPollVotes.optionIndex })
      .from(wikiPollVotes)
      .where(and(eq(wikiPollVotes.pollId, pollId), eq(wikiPollVotes.voterId, voterId)))
      .limit(1)
    if (mine) myVote = mine.optionIndex
  }

  return { counts, total, myVote }
}

// GET /api/wiki/poll?pollId=p_xxx&options=3 — 결과 조회 (비로그인도 결과는 봄)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const pollId = searchParams.get('pollId')
    const optionCount = Math.min(MAX_OPTIONS, Math.max(2, parseInt(searchParams.get('options') || '2', 10)))
    if (!pollId) {
      return NextResponse.json({ success: false, error: 'pollId가 필요합니다.' }, { status: 400 })
    }

    const user = await getAuthenticatedWikiUser(request).catch(() => null)
    const result = await tallyPoll(pollId, optionCount, user ? (user as any).id : undefined)
    return NextResponse.json({ success: true, ...result })
  } catch (error) {
    console.error('투표 조회 오류:', error)
    return NextResponse.json({ success: false, error: '투표 조회 중 오류가 발생했습니다.' }, { status: 500 })
  }
}

// POST /api/wiki/poll — { pollId, optionIndex, question?, options:[] } 투표(1인 1표, 재투표 갱신)
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedWikiUser(request)
    if (!user) {
      return NextResponse.json({ success: false, error: '투표하려면 로그인이 필요합니다.' }, { status: 401 })
    }

    const body = await request.json().catch(() => ({}))
    const pollId = typeof body?.pollId === 'string' ? body.pollId : ''
    const optionIndex = Number(body?.optionIndex)
    const options = Array.isArray(body?.options) ? body.options : []
    const optionCount = Math.min(MAX_OPTIONS, Math.max(2, options.length || 2))

    if (!pollId || !Number.isInteger(optionIndex) || optionIndex < 0 || optionIndex >= optionCount) {
      return NextResponse.json({ success: false, error: '잘못된 투표 요청입니다.' }, { status: 400 })
    }

    const db = getDb()
    const voterId = (user as any).id

    // upsert — 같은 사람이 다시 투표하면 선택만 갱신
    await db
      .insert(wikiPollVotes)
      .values({
        pollId,
        voterId,
        optionIndex,
        question: typeof body?.question === 'string' ? body.question.slice(0, 500) : null,
      })
      .onConflictDoUpdate({
        target: [wikiPollVotes.pollId, wikiPollVotes.voterId],
        set: { optionIndex, updatedAt: new Date() },
      })

    const result = await tallyPoll(pollId, optionCount, voterId)
    return NextResponse.json({ success: true, ...result })
  } catch (error) {
    console.error('투표 처리 오류:', error)
    return NextResponse.json({ success: false, error: '투표 처리 중 오류가 발생했습니다.' }, { status: 500 })
  }
}
