import { NextRequest, NextResponse } from 'next/server'
import { sql } from 'drizzle-orm'
import { getDb } from '@/db/client'
import { checkAdminAuth } from '@/lib/adminAuth'

export const dynamic = 'force-dynamic'

/**
 * 택틱스 랭크/래더 DDL — tactics_rankings 표 생성. [랭크 C1]
 * Cloud SQL은 소켓 전용이라 로컬에서 DDL을 못 쳐서 앱 경유로 1회 적용. CREATE TABLE IF NOT EXISTS — 멱등. 관리자 전용.
 *
 *   GET /api/admin/maintenance/tactics-rankings            → dry-run (상태 조회)
 *   GET /api/admin/maintenance/tactics-rankings?confirm=1  → 실제 생성
 */
export async function GET(request: NextRequest) {
  try {
    const admin = await checkAdminAuth(request)
    if (!admin) {
      return NextResponse.json({ success: false, error: '관리자 권한이 필요합니다.' }, { status: 403 })
    }

    const db = getDb()
    const exists = async () => {
      const rows = await db.execute(sql`SELECT to_regclass('public.tactics_rankings') AS t`)
      const r = (rows as any).rows ?? rows
      return Boolean(r?.[0]?.t)
    }

    const { searchParams } = new URL(request.url)
    if (searchParams.get('confirm') !== '1') {
      return NextResponse.json({
        success: true,
        applied: false,
        message: 'dry-run — ?confirm=1 로 호출하면 tactics_rankings 표를 생성합니다.',
        exists: await exists(),
      })
    }

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "tactics_rankings" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "user_id" uuid NOT NULL REFERENCES "wiki_users"("id") ON DELETE CASCADE,
        "season" text NOT NULL DEFAULT 's1',
        "lp" integer NOT NULL DEFAULT 0,
        "wins" integer NOT NULL DEFAULT 0,
        "losses" integer NOT NULL DEFAULT 0,
        "win_streak" integer NOT NULL DEFAULT 0,
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        "created_at" timestamptz NOT NULL DEFAULT now()
      )
    `)
    await db.execute(
      sql`CREATE UNIQUE INDEX IF NOT EXISTS "tr_user_season_idx" ON "tactics_rankings" ("user_id", "season")`,
    )
    await db.execute(sql`CREATE INDEX IF NOT EXISTS "tr_season_lp_idx" ON "tactics_rankings" ("season", "lp")`)

    // 멱등성 가드 + 감사 로그(match_id PK = 중복 집계 방지)
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "tactics_match_results" (
        "match_id" text PRIMARY KEY,
        "winner_user_id" uuid NOT NULL,
        "loser_user_id" uuid NOT NULL,
        "season" text NOT NULL DEFAULT 's1',
        "created_at" timestamptz NOT NULL DEFAULT now()
      )
    `)

    return NextResponse.json({
      success: true,
      applied: true,
      message: 'tactics_rankings + tactics_match_results 표 생성 완료. 랭크 LP 집계가 가능합니다.',
      exists: await exists(),
      appliedBy: admin.username,
    })
  } catch (error) {
    console.error('tactics-rankings 마이그레이션 오류:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'DDL 적용 중 오류가 발생했습니다.',
        detail: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    )
  }
}
