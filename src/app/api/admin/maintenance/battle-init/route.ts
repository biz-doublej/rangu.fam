import { NextRequest, NextResponse } from 'next/server'
import { sql } from 'drizzle-orm'
import { getDb } from '@/db/client'
import { checkAdminAuth } from '@/lib/adminAuth'

export const dynamic = 'force-dynamic'

/**
 * 카드 배틀 DDL — card_battle_* 4개 표 생성.
 * Cloud SQL은 소켓 전용이라 로컬에서 DDL을 못 쳐서 앱 경유로 1회 적용한다.
 * CREATE TABLE IF NOT EXISTS — 멱등. 관리자 전용.
 *
 *   GET /api/admin/maintenance/battle-init            → dry-run (상태 조회)
 *   GET /api/admin/maintenance/battle-init?confirm=1  → 실제 생성
 */
const TABLES = ['card_battle_decks', 'card_battles', 'card_battle_stats', 'card_battle_log'] as const

export async function GET(request: NextRequest) {
  try {
    const admin = await checkAdminAuth(request)
    if (!admin) {
      return NextResponse.json({ success: false, error: '관리자 권한이 필요합니다.' }, { status: 403 })
    }

    const db = getDb()
    const status = async () => {
      const out: Record<string, boolean> = {}
      for (const t of TABLES) {
        const rows = await db.execute(sql`SELECT to_regclass(${'public.' + t}) AS t`)
        const r = (rows as any).rows ?? rows
        out[t] = Boolean(r?.[0]?.t)
      }
      return out
    }

    const { searchParams } = new URL(request.url)
    if (searchParams.get('confirm') !== '1') {
      return NextResponse.json({
        success: true,
        applied: false,
        message: 'dry-run — ?confirm=1 로 호출하면 카드 배틀 표 4개를 생성합니다.',
        tables: await status(),
      })
    }

    // card_battle_log 가 card_battles 를 참조하므로 생성 순서 주의
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "card_battle_decks" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "user_id" uuid NOT NULL REFERENCES "wiki_users"("id") ON DELETE CASCADE,
        "name" text NOT NULL DEFAULT '내 덱',
        "faction_a" text NOT NULL,
        "faction_b" text NOT NULL,
        "cards" jsonb NOT NULL DEFAULT '[]'::jsonb,
        "is_active" boolean NOT NULL DEFAULT false,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now()
      )
    `)
    await db.execute(sql`CREATE INDEX IF NOT EXISTS "cbd_user_active_idx" ON "card_battle_decks" ("user_id", "is_active")`)
    await db.execute(
      sql`CREATE UNIQUE INDEX IF NOT EXISTS "cbd_one_active_per_user" ON "card_battle_decks" ("user_id") WHERE "is_active"`
    )

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "card_battles" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "mode" text NOT NULL DEFAULT 'pve',
        "status" text NOT NULL DEFAULT 'mulligan',
        "player1_id" uuid NOT NULL REFERENCES "wiki_users"("id") ON DELETE CASCADE,
        "player2_id" uuid REFERENCES "wiki_users"("id") ON DELETE SET NULL,
        "p1_deck" jsonb NOT NULL DEFAULT '[]'::jsonb,
        "p2_deck" jsonb NOT NULL DEFAULT '[]'::jsonb,
        "state" jsonb,
        "seed" text NOT NULL,
        "round" integer NOT NULL DEFAULT 0,
        "active_player_id" uuid REFERENCES "wiki_users"("id") ON DELETE SET NULL,
        "winner_id" uuid REFERENCES "wiki_users"("id") ON DELETE SET NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        "expires_at" timestamptz
      )
    `)
    await db.execute(sql`CREATE INDEX IF NOT EXISTS "cb_p1_status_idx" ON "card_battles" ("player1_id", "status")`)
    await db.execute(sql`CREATE INDEX IF NOT EXISTS "cb_p2_status_idx" ON "card_battles" ("player2_id", "status")`)
    await db.execute(sql`CREATE INDEX IF NOT EXISTS "cb_status_expires_idx" ON "card_battles" ("status", "expires_at")`)

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "card_battle_stats" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "user_id" uuid NOT NULL REFERENCES "wiki_users"("id") ON DELETE CASCADE,
        "season" text NOT NULL DEFAULT '2026-S1',
        "wins" integer NOT NULL DEFAULT 0,
        "losses" integer NOT NULL DEFAULT 0,
        "draws" integer NOT NULL DEFAULT 0,
        "rating" integer NOT NULL DEFAULT 1000,
        "best_rating" integer NOT NULL DEFAULT 1000,
        "battle_points" integer NOT NULL DEFAULT 0,
        "win_streak" integer NOT NULL DEFAULT 0,
        "current_streak" integer NOT NULL DEFAULT 0,
        "daily_rewarded_wins" integer NOT NULL DEFAULT 0,
        "last_reward_date" text,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now()
      )
    `)
    await db.execute(
      sql`CREATE UNIQUE INDEX IF NOT EXISTS "cbs_user_season_unique" ON "card_battle_stats" ("user_id", "season")`
    )
    await db.execute(sql`CREATE INDEX IF NOT EXISTS "cbs_season_rating_idx" ON "card_battle_stats" ("season", "rating")`)

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "card_battle_log" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "battle_id" uuid NOT NULL REFERENCES "card_battles"("id") ON DELETE CASCADE,
        "user_id" uuid NOT NULL REFERENCES "wiki_users"("id") ON DELETE CASCADE,
        "opponent_id" uuid REFERENCES "wiki_users"("id") ON DELETE SET NULL,
        "mode" text NOT NULL,
        "result" text NOT NULL,
        "rating_delta" integer NOT NULL DEFAULT 0,
        "bp_delta" integer NOT NULL DEFAULT 0,
        "rounds" jsonb NOT NULL DEFAULT '[]'::jsonb,
        "created_at" timestamptz NOT NULL DEFAULT now()
      )
    `)
    await db.execute(sql`CREATE INDEX IF NOT EXISTS "cbl_user_created_idx" ON "card_battle_log" ("user_id", "created_at")`)
    await db.execute(
      sql`CREATE UNIQUE INDEX IF NOT EXISTS "cbl_battle_user_unique" ON "card_battle_log" ("battle_id", "user_id")`
    )

    return NextResponse.json({
      success: true,
      applied: true,
      message: '카드 배틀 표 4개 생성 완료. /api/cards/battle 가 동작합니다.',
      tables: await status(),
      appliedBy: admin.username,
    })
  } catch (error) {
    console.error('battle-init 마이그레이션 오류:', error)
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
