import { NextRequest, NextResponse } from 'next/server'
import { sql } from 'drizzle-orm'
import { getDb } from '@/db/client'
import { checkAdminAuth } from '@/lib/adminAuth'

export const dynamic = 'force-dynamic'

/**
 * 유저 설정 DDL. Cloud SQL은 소켓 전용이라 앱을 통해 1회 적용한다. 멱등, 관리자 전용.
 *
 *   GET /api/admin/maintenance/user-settings            → 상태 조회
 *   GET /api/admin/maintenance/user-settings?confirm=1  → 적용
 *
 * wikiUsers 스키마를 쓰는 코드보다 먼저 배포하고 실행해야 인증 조회가 깨지지 않는다.
 */
export async function GET(request: NextRequest) {
  try {
    const admin = await checkAdminAuth(request)
    if (!admin) {
      return NextResponse.json({ success: false, error: '관리자 권한이 필요합니다.' }, { status: 403 })
    }

    const db = getDb()
    const status = async () => {
      const rows = await db.execute(sql`
        SELECT
          to_regclass('public.wiki_login_events') IS NOT NULL AS "loginEvents",
          EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'wiki_users' AND column_name = 'google_unlinked_at'
          ) AS "userColumns"
      `)
      return ((rows as any).rows ?? rows)?.[0]
    }

    if (new URL(request.url).searchParams.get('confirm') !== '1') {
      return NextResponse.json({ success: true, dryRun: true, status: await status() })
    }

    await db.execute(sql`ALTER TABLE wiki_users ADD COLUMN IF NOT EXISTS naver_id text`)
    await db.execute(sql`ALTER TABLE wiki_users ADD COLUMN IF NOT EXISTS naver_email text`)
    await db.execute(sql`ALTER TABLE wiki_users ADD COLUMN IF NOT EXISTS display_name_changed_at timestamptz`)
    await db.execute(sql`ALTER TABLE wiki_users ADD COLUMN IF NOT EXISTS google_unlinked_at timestamptz`)
    await db.execute(sql`CREATE UNIQUE INDEX IF NOT EXISTS wiki_users_naver_id_key ON wiki_users (naver_id)`)
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS wiki_login_events (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id uuid NOT NULL REFERENCES wiki_users(id) ON DELETE CASCADE,
        provider text NOT NULL,
        ip text,
        user_agent text,
        created_at timestamptz NOT NULL DEFAULT now()
      )
    `)
    await db.execute(
      sql`CREATE INDEX IF NOT EXISTS wiki_login_events_user_created_idx ON wiki_login_events (user_id, created_at DESC)`
    )

    return NextResponse.json({ success: true, status: await status() })
  } catch (error) {
    console.error('유저 설정 DDL 오류:', error)
    return NextResponse.json({ success: false, error: 'DDL 적용에 실패했습니다.' }, { status: 500 })
  }
}
