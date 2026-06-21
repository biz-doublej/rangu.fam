import { NextRequest, NextResponse } from 'next/server'
import { sql } from 'drizzle-orm'
import { getDb } from '@/db/client'
import { checkAdminAuth } from '@/lib/adminAuth'

export const dynamic = 'force-dynamic'

/**
 * 랜덤 선물상자 DDL — user_perks 표 생성.
 * Cloud SQL은 소켓 전용이라 로컬에서 DDL을 못 쳐서 앱 경유로 1회 적용한다.
 * CREATE TABLE IF NOT EXISTS — 멱등. 관리자 전용.
 *
 *   GET /api/admin/maintenance/gift-boxes            → dry-run (상태 조회)
 *   GET /api/admin/maintenance/gift-boxes?confirm=1  → 실제 생성
 */
export async function GET(request: NextRequest) {
  try {
    const admin = await checkAdminAuth(request)
    if (!admin) {
      return NextResponse.json({ success: false, error: '관리자 권한이 필요합니다.' }, { status: 403 })
    }

    const db = getDb()
    const exists = async () => {
      const rows = await db.execute(sql`SELECT to_regclass('public.user_perks') AS t`)
      const r = (rows as any).rows ?? rows
      return Boolean(r?.[0]?.t)
    }

    const { searchParams } = new URL(request.url)
    if (searchParams.get('confirm') !== '1') {
      return NextResponse.json({
        success: true,
        applied: false,
        message: 'dry-run — ?confirm=1 로 호출하면 user_perks 표를 생성합니다.',
        userPerksExists: await exists(),
      })
    }

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "user_perks" (
        "user_id" uuid PRIMARY KEY REFERENCES "wiki_users"("id") ON DELETE CASCADE,
        "bonus_drops" integer NOT NULL DEFAULT 0,
        "craft_protections" integer NOT NULL DEFAULT 0,
        "gift_date" text,
        "gift_opened" jsonb NOT NULL DEFAULT '[]'::jsonb,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now()
      )
    `)

    return NextResponse.json({
      success: true,
      applied: true,
      message: 'user_perks 표 생성 완료. 랜덤 선물상자 + 보너스 드랍/조합 보호권이 동작합니다.',
      userPerksExists: await exists(),
      appliedBy: admin.username,
    })
  } catch (error) {
    console.error('gift-boxes 마이그레이션 오류:', error)
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
