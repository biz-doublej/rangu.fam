import { NextRequest, NextResponse } from 'next/server'
import { sql } from 'drizzle-orm'
import { getDb } from '@/db/client'
import { checkAdminAuth } from '@/lib/adminAuth'

export const dynamic = 'force-dynamic'

/**
 * 카드 트레이딩 DDL — card_trades 표 생성.
 * Cloud SQL은 소켓 전용이라 로컬에서 DDL을 못 쳐서 앱 경유로 1회 적용한다.
 * CREATE TABLE IF NOT EXISTS — 멱등. 관리자 전용.
 *
 *   GET /api/admin/maintenance/cards-trades            → dry-run (상태 조회)
 *   GET /api/admin/maintenance/cards-trades?confirm=1  → 실제 생성
 */
export async function GET(request: NextRequest) {
  try {
    const admin = await checkAdminAuth(request)
    if (!admin) {
      return NextResponse.json({ success: false, error: '관리자 권한이 필요합니다.' }, { status: 403 })
    }

    const db = getDb()
    const exists = async () => {
      const rows = await db.execute(sql`SELECT to_regclass('public.card_trades') AS t`)
      const r = (rows as any).rows ?? rows
      return Boolean(r?.[0]?.t)
    }

    const { searchParams } = new URL(request.url)
    if (searchParams.get('confirm') !== '1') {
      return NextResponse.json({
        success: true,
        applied: false,
        message: 'dry-run — ?confirm=1 로 호출하면 card_trades 표를 생성합니다.',
        cardTradesExists: await exists(),
      })
    }

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "card_trades" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "from_user_id" uuid NOT NULL REFERENCES "wiki_users"("id") ON DELETE CASCADE,
        "to_user_id" uuid NOT NULL REFERENCES "wiki_users"("id") ON DELETE CASCADE,
        "offer_card_id" text NOT NULL,
        "offer_quantity" integer NOT NULL DEFAULT 1,
        "request_card_id" text NOT NULL,
        "request_quantity" integer NOT NULL DEFAULT 1,
        "status" text NOT NULL DEFAULT 'pending',
        "message" text,
        "responded_at" timestamptz,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now()
      )
    `)
    await db.execute(
      sql`CREATE INDEX IF NOT EXISTS "card_trades_to_status_idx" ON "card_trades" ("to_user_id", "status")`
    )
    await db.execute(
      sql`CREATE INDEX IF NOT EXISTS "card_trades_from_status_idx" ON "card_trades" ("from_user_id", "status")`
    )
    await db.execute(
      sql`CREATE INDEX IF NOT EXISTS "card_trades_created_idx" ON "card_trades" ("created_at")`
    )

    return NextResponse.json({
      success: true,
      applied: true,
      message: 'card_trades 표 생성 완료. 카드 교환(트레이딩)이 동작합니다.',
      cardTradesExists: await exists(),
      appliedBy: admin.username,
    })
  } catch (error) {
    console.error('cards-trades 마이그레이션 오류:', error)
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
