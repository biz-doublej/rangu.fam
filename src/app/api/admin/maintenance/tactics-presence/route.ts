import { NextRequest, NextResponse } from 'next/server'
import { sql } from 'drizzle-orm'
import { getDb } from '@/db/client'
import { checkAdminAuth } from '@/lib/adminAuth'

export const dynamic = 'force-dynamic'

/**
 * 택틱스 프레즌스 DDL — tactics_presence 표 생성 (0002_tactics_presence.sql).
 * Cloud SQL은 소켓 전용이라 로컬에서 DDL을 못 쳐서 앱 경유로 1회 적용한다.
 * CREATE TABLE IF NOT EXISTS — 멱등. 관리자 전용.
 *
 *   GET /api/admin/maintenance/tactics-presence            → dry-run (상태 조회)
 *   GET /api/admin/maintenance/tactics-presence?confirm=1  → 실제 생성
 */
export async function GET(request: NextRequest) {
  try {
    const admin = await checkAdminAuth(request)
    if (!admin) {
      return NextResponse.json({ success: false, error: '관리자 권한이 필요합니다.' }, { status: 403 })
    }

    const db = getDb()
    const exists = async () => {
      const rows = await db.execute(sql`SELECT to_regclass('public.tactics_presence') AS t`)
      const r = (rows as any).rows ?? rows
      return Boolean(r?.[0]?.t)
    }

    const { searchParams } = new URL(request.url)
    if (searchParams.get('confirm') !== '1') {
      return NextResponse.json({
        success: true,
        applied: false,
        message: 'dry-run — ?confirm=1 로 호출하면 tactics_presence 표를 생성합니다.',
        exists: await exists(),
      })
    }

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "tactics_presence" (
        "user_id" uuid PRIMARY KEY NOT NULL,
        "state" text DEFAULT 'lobby' NOT NULL,
        "last_heartbeat_at" timestamptz DEFAULT now() NOT NULL,
        "updated_at" timestamptz DEFAULT now() NOT NULL,
        CONSTRAINT "tactics_presence_state_check" CHECK ("state" IN ('lobby', 'in_game')),
        CONSTRAINT "tactics_presence_user_id_wiki_users_id_fk"
          FOREIGN KEY ("user_id") REFERENCES "public"."wiki_users"("id") ON DELETE CASCADE
      )
    `)
    await db.execute(
      sql`CREATE INDEX IF NOT EXISTS "tp_last_heartbeat_idx" ON "tactics_presence" USING btree ("last_heartbeat_at")`,
    )

    return NextResponse.json({
      success: true,
      applied: true,
      message: 'tactics_presence 표 생성 완료. /api/game/presence 하트비트가 동작합니다.',
      exists: await exists(),
      appliedBy: admin.username,
    })
  } catch (error) {
    console.error('tactics-presence 마이그레이션 오류:', error)
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
