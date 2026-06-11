import { NextRequest, NextResponse } from 'next/server'
import { sql } from 'drizzle-orm'
import { getDb } from '@/db/client'
import { checkAdminAuth } from '@/lib/adminAuth'

export const dynamic = 'force-dynamic'

/**
 * 위키 신기능 DDL — 인라인 투표 표(wiki_poll_votes) 생성.
 * Cloud SQL은 소켓 전용이라 로컬에서 DDL을 못 쳐서 앱 경유로 1회 적용한다.
 * CREATE TABLE IF NOT EXISTS — 멱등. 관리자 전용.
 *
 *   GET /api/admin/maintenance/wiki-features            → dry-run (상태 조회)
 *   GET /api/admin/maintenance/wiki-features?confirm=1  → 실제 생성
 */
export async function GET(request: NextRequest) {
  try {
    const admin = await checkAdminAuth(request)
    if (!admin) {
      return NextResponse.json({ success: false, error: '관리자 권한이 필요합니다.' }, { status: 403 })
    }

    const db = getDb()
    const exists = async () => {
      const rows = await db.execute(sql`SELECT to_regclass('public.wiki_poll_votes') AS t`)
      const r = (rows as any).rows ?? rows
      return Boolean(r?.[0]?.t)
    }

    const { searchParams } = new URL(request.url)
    if (searchParams.get('confirm') !== '1') {
      return NextResponse.json({
        success: true,
        applied: false,
        message: 'dry-run — ?confirm=1 로 호출하면 wiki_poll_votes 표를 생성합니다.',
        wikiPollVotesExists: await exists(),
      })
    }

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "wiki_poll_votes" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "poll_id" text NOT NULL,
        "voter_id" uuid NOT NULL REFERENCES "wiki_users"("id") ON DELETE CASCADE,
        "option_index" integer NOT NULL,
        "question" text,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now()
      )
    `)
    await db.execute(
      sql`CREATE UNIQUE INDEX IF NOT EXISTS "wiki_poll_votes_poll_voter_unique" ON "wiki_poll_votes" ("poll_id", "voter_id")`
    )
    await db.execute(
      sql`CREATE INDEX IF NOT EXISTS "wiki_poll_votes_poll_idx" ON "wiki_poll_votes" ("poll_id")`
    )

    return NextResponse.json({
      success: true,
      applied: true,
      message: 'wiki_poll_votes 표 생성 완료. 문서 내 :::poll 투표가 동작합니다.',
      wikiPollVotesExists: await exists(),
      appliedBy: admin.username,
    })
  } catch (error) {
    console.error('wiki-features 마이그레이션 오류:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'DDL 적용 중 오류가 발생했습니다.',
        detail: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    )
  }
}
