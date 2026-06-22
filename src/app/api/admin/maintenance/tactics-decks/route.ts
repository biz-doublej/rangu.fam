import { NextRequest, NextResponse } from 'next/server'
import { sql } from 'drizzle-orm'
import { getDb } from '@/db/client'
import { checkAdminAuth } from '@/lib/adminAuth'

export const dynamic = 'force-dynamic'

/**
 * 택틱스 덱 빌더 DDL — tactics_decks 표 생성.
 * Cloud SQL은 소켓 전용이라 로컬에서 DDL을 못 쳐서 앱 경유로 1회 적용한다.
 * CREATE TABLE IF NOT EXISTS — 멱등. 관리자 전용.
 *
 *   GET /api/admin/maintenance/tactics-decks            → dry-run (상태 조회)
 *   GET /api/admin/maintenance/tactics-decks?confirm=1  → 실제 생성
 */
export async function GET(request: NextRequest) {
  try {
    const admin = await checkAdminAuth(request)
    if (!admin) {
      return NextResponse.json({ success: false, error: '관리자 권한이 필요합니다.' }, { status: 403 })
    }

    const db = getDb()
    const exists = async () => {
      const rows = await db.execute(sql`SELECT to_regclass('public.tactics_decks') AS t`)
      const r = (rows as any).rows ?? rows
      return Boolean(r?.[0]?.t)
    }

    const { searchParams } = new URL(request.url)
    if (searchParams.get('confirm') !== '1') {
      return NextResponse.json({
        success: true,
        applied: false,
        message: 'dry-run — ?confirm=1 로 호출하면 tactics_decks 표를 생성합니다.',
        exists: await exists(),
      })
    }

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "tactics_decks" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "user_id" uuid NOT NULL REFERENCES "wiki_users"("id") ON DELETE CASCADE,
        "name" text NOT NULL DEFAULT '내 덱',
        "cards" jsonb NOT NULL DEFAULT '[]'::jsonb,
        "is_active" boolean NOT NULL DEFAULT false,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now()
      )
    `)
    await db.execute(sql`CREATE INDEX IF NOT EXISTS "td_user_active_idx" ON "tactics_decks" ("user_id", "is_active")`)
    await db.execute(
      sql`CREATE UNIQUE INDEX IF NOT EXISTS "td_one_active_per_user" ON "tactics_decks" ("user_id") WHERE "is_active"`,
    )

    return NextResponse.json({
      success: true,
      applied: true,
      message: 'tactics_decks 표 생성 완료. /deck 저장이 동작합니다.',
      exists: await exists(),
      appliedBy: admin.username,
    })
  } catch (error) {
    console.error('tactics-decks 마이그레이션 오류:', error)
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
