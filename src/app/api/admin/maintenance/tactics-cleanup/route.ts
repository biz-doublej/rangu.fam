import { NextRequest, NextResponse } from 'next/server'
import { sql } from 'drizzle-orm'
import { getDb } from '@/db/client'
import { checkAdminAuth } from '@/lib/adminAuth'

export const dynamic = 'force-dynamic'

/**
 * 랑구 택틱스 + 웹 카드 배틀(LoR식) 폐기 — 관련 표 전부 삭제.
 * 기능 코드는 이미 제거됨(게임/클라이언트 기획 중단). Cloud SQL은 소켓 전용이라
 * 앱 경유로 1회 적용한다. DROP TABLE IF EXISTS ... CASCADE — 멱등. 관리자 전용.
 *
 *   GET /api/admin/maintenance/tactics-cleanup            → dry-run (상태 조회)
 *   GET /api/admin/maintenance/tactics-cleanup?confirm=1  → 실제 삭제
 */
const TABLES = [
  'card_battle_log',
  'card_battles',
  'card_battle_decks',
  'card_battle_stats',
  'card_game_defs',
  'tactics_match_results',
  'tactics_rankings',
  'tactics_owned_items',
  'tactics_quest_progress',
  'tactics_pass_progress',
  'tactics_wallets',
  'tactics_decks',
  'tactics_presence',
] as const

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
        message: 'dry-run — ?confirm=1 로 호출하면 택틱스/카드배틀 표를 전부 삭제합니다.',
        tables: await status(),
      })
    }

    for (const t of TABLES) {
      await db.execute(sql.raw(`DROP TABLE IF EXISTS "${t}" CASCADE`))
    }

    return NextResponse.json({
      success: true,
      applied: true,
      message: '택틱스/카드배틀 표 삭제 완료.',
      tables: await status(),
      appliedBy: admin.username,
    })
  } catch (error) {
    console.error('tactics-cleanup 마이그레이션 오류:', error)
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
