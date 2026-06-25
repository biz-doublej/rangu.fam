import { NextRequest, NextResponse } from 'next/server'
import { sql } from 'drizzle-orm'
import { getDb } from '@/db/client'
import { checkAdminAuth } from '@/lib/adminAuth'

export const dynamic = 'force-dynamic'

/**
 * 택틱스 경제 DDL — 지갑/보유아이템/퀘스트진행/패스진행 4표 생성. [경제 E1]
 * Cloud SQL은 소켓 전용이라 앱 경유로 1회 적용. CREATE TABLE IF NOT EXISTS — 멱등. 관리자 전용.
 *
 *   GET /api/admin/maintenance/tactics-economy            → dry-run
 *   GET /api/admin/maintenance/tactics-economy?confirm=1  → 실제 생성
 */
export async function GET(request: NextRequest) {
  try {
    const admin = await checkAdminAuth(request)
    if (!admin) {
      return NextResponse.json({ success: false, error: '관리자 권한이 필요합니다.' }, { status: 403 })
    }

    const db = getDb()
    const exists = async () => {
      const rows = await db.execute(sql`
        SELECT
          to_regclass('public.tactics_wallets')        AS wallets,
          to_regclass('public.tactics_owned_items')    AS owned,
          to_regclass('public.tactics_quest_progress') AS quests,
          to_regclass('public.tactics_pass_progress')  AS pass
      `)
      const r = (rows as any).rows ?? rows
      return r?.[0] ?? null
    }

    const { searchParams } = new URL(request.url)
    if (searchParams.get('confirm') !== '1') {
      return NextResponse.json({
        success: true,
        applied: false,
        message: 'dry-run — ?confirm=1 로 호출하면 택틱스 경제 4표를 생성합니다.',
        exists: await exists(),
      })
    }

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "tactics_wallets" (
        "user_id" uuid PRIMARY KEY REFERENCES "wiki_users"("id") ON DELETE CASCADE,
        "coins" integer NOT NULL DEFAULT 0,
        "gems" integer NOT NULL DEFAULT 0,
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        "created_at" timestamptz NOT NULL DEFAULT now()
      )
    `)

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "tactics_owned_items" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "user_id" uuid NOT NULL REFERENCES "wiki_users"("id") ON DELETE CASCADE,
        "item_id" text NOT NULL,
        "acquired_at" timestamptz NOT NULL DEFAULT now()
      )
    `)
    await db.execute(
      sql`CREATE UNIQUE INDEX IF NOT EXISTS "toi_user_item_idx" ON "tactics_owned_items" ("user_id", "item_id")`,
    )

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "tactics_quest_progress" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "user_id" uuid NOT NULL REFERENCES "wiki_users"("id") ON DELETE CASCADE,
        "quest_id" text NOT NULL,
        "period_key" text NOT NULL,
        "progress" integer NOT NULL DEFAULT 0,
        "claimed" boolean NOT NULL DEFAULT false,
        "updated_at" timestamptz NOT NULL DEFAULT now()
      )
    `)
    await db.execute(
      sql`CREATE UNIQUE INDEX IF NOT EXISTS "tqp_user_quest_period_idx" ON "tactics_quest_progress" ("user_id", "quest_id", "period_key")`,
    )
    await db.execute(
      sql`CREATE INDEX IF NOT EXISTS "tqp_user_period_idx" ON "tactics_quest_progress" ("user_id", "period_key")`,
    )

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "tactics_pass_progress" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "user_id" uuid NOT NULL REFERENCES "wiki_users"("id") ON DELETE CASCADE,
        "season" text NOT NULL DEFAULT 's1',
        "xp" integer NOT NULL DEFAULT 0,
        "claimed_tiers" jsonb NOT NULL DEFAULT '[]'::jsonb,
        "updated_at" timestamptz NOT NULL DEFAULT now()
      )
    `)
    await db.execute(
      sql`CREATE UNIQUE INDEX IF NOT EXISTS "tpp_user_season_idx" ON "tactics_pass_progress" ("user_id", "season")`,
    )

    return NextResponse.json({
      success: true,
      applied: true,
      message: '택틱스 경제 4표 생성 완료(지갑/보유/퀘스트/패스). 매치 보상·상점·퀘스트·패스 활성.',
      exists: await exists(),
      appliedBy: admin.username,
    })
  } catch (error) {
    console.error('tactics-economy 마이그레이션 오류:', error)
    return NextResponse.json(
      { success: false, error: 'DDL 적용 중 오류가 발생했습니다.', detail: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    )
  }
}
