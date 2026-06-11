import { NextRequest, NextResponse } from 'next/server'
import { sql } from 'drizzle-orm'
import { getDb } from '@/db/client'
import { checkAdminAuth } from '@/lib/adminAuth'

export const dynamic = 'force-dynamic'

/**
 * 일회성 유지보수 — 카드 테이블 FK 재지정 (users → wiki_users).
 *
 * 배경: 카드 테이블(user_cards / user_card_stats / card_drops)의 user_id FK가
 * 레거시 music-app `users` 테이블을 가리키는데, SSO 인증은 `wiki_users` id를
 * 발급하므로 모든 카드 INSERT가 FK 위반(23503)으로 실패했다 (카드 드랍 500 오류).
 *
 * 이 라우트는 관리자 인증 후 운영 DB에서 FK를 wiki_users(id)로 재지정한다.
 * `NOT VALID` 로 추가하므로 레거시 user_id가 남아있는 기존 row는 건드리지 않고,
 * 새로 들어오는 row부터 검증된다. 멱등(idempotent) — 여러 번 호출해도 안전.
 *
 * 사용법: 관리자로 로그인한 브라우저에서
 *   GET /api/admin/maintenance/cards-fk          → 현재 FK 상태 조회 (dry-run)
 *   GET /api/admin/maintenance/cards-fk?confirm=1 → 실제 적용
 */

const CARD_TABLES = ['user_cards', 'user_card_stats', 'card_drops'] as const

export async function GET(request: NextRequest) {
  try {
    const admin = await checkAdminAuth(request)
    if (!admin) {
      return NextResponse.json(
        { success: false, error: '관리자 권한이 필요합니다.' },
        { status: 403 }
      )
    }

    const db = getDb()

    // 현재 카드 테이블의 user_id FK가 어느 테이블을 가리키는지 조회
    const inspect = async () => {
      const rows = await db.execute(sql`
        SELECT tc.table_name, tc.constraint_name, ccu.table_name AS referenced_table
        FROM information_schema.table_constraints tc
        JOIN information_schema.constraint_column_usage ccu
          ON ccu.constraint_name = tc.constraint_name AND ccu.constraint_schema = tc.constraint_schema
        WHERE tc.constraint_type = 'FOREIGN KEY'
          AND tc.table_schema = 'public'
          AND tc.table_name IN ('user_cards', 'user_card_stats', 'card_drops')
          AND tc.constraint_name LIKE '%user_id%'
      `)
      return (rows as any).rows ?? rows
    }

    const { searchParams } = new URL(request.url)
    if (searchParams.get('confirm') !== '1') {
      return NextResponse.json({
        success: true,
        applied: false,
        message: 'dry-run — ?confirm=1 을 붙여 호출하면 FK를 wiki_users로 재지정합니다.',
        currentForeignKeys: await inspect(),
      })
    }

    // 적용 — 테이블별로 구/신 제약을 멱등하게 정리 후 wiki_users FK 추가
    for (const table of CARD_TABLES) {
      await db.execute(
        sql.raw(`ALTER TABLE "${table}" DROP CONSTRAINT IF EXISTS "${table}_user_id_users_id_fk"`)
      )
      await db.execute(
        sql.raw(
          `ALTER TABLE "${table}" DROP CONSTRAINT IF EXISTS "${table}_user_id_wiki_users_id_fk"`
        )
      )
      await db.execute(
        sql.raw(
          `ALTER TABLE "${table}" ADD CONSTRAINT "${table}_user_id_wiki_users_id_fk" ` +
            `FOREIGN KEY ("user_id") REFERENCES "wiki_users"("id") ON DELETE CASCADE NOT VALID`
        )
      )
    }

    return NextResponse.json({
      success: true,
      applied: true,
      message:
        '카드 테이블 FK를 wiki_users(id)로 재지정했습니다. 카드 드랍이 다시 동작합니다. (기존 레거시 row는 NOT VALID로 보존)',
      currentForeignKeys: await inspect(),
      appliedBy: admin.username,
    })
  } catch (error) {
    console.error('cards-fk 마이그레이션 오류:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'FK 재지정 중 오류가 발생했습니다.',
        detail: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    )
  }
}
