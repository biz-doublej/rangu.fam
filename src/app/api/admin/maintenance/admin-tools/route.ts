import { NextRequest, NextResponse } from 'next/server'
import { sql } from 'drizzle-orm'
import { getDb } from '@/db/client'
import { checkAdminAuth } from '@/lib/adminAuth'

export const dynamic = 'force-dynamic'

/**
 * 관리자 화면용 표(신고 wiki_reports, 공지 wiki_notices) 생성. 멱등, 관리자 전용.
 *
 *   GET /api/admin/maintenance/admin-tools            → 상태 조회
 *   GET /api/admin/maintenance/admin-tools?confirm=1  → 적용
 */
export async function GET(request: NextRequest) {
  try {
    if (!(await checkAdminAuth(request))) {
      return NextResponse.json({ success: false, error: '관리자 권한이 필요합니다.' }, { status: 403 })
    }
    const db = getDb()
    const status = async () => {
      const rows = await db.execute(sql`
        SELECT to_regclass('public.wiki_reports') IS NOT NULL AS "reports",
               to_regclass('public.wiki_notices') IS NOT NULL AS "notices"
      `)
      return ((rows as any).rows ?? rows)?.[0]
    }

    if (new URL(request.url).searchParams.get('confirm') !== '1') {
      return NextResponse.json({ success: true, applied: false, status: await status() })
    }

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS wiki_reports (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        page_title text NOT NULL,
        reason text NOT NULL,
        target_user_id uuid,
        reporter text NOT NULL,
        reporter_id uuid,
        status text NOT NULL DEFAULT 'open',
        resolved_by text,
        resolved_at timestamptz,
        created_at timestamptz NOT NULL DEFAULT now()
      )
    `)
    await db.execute(sql`CREATE INDEX IF NOT EXISTS wiki_reports_status_idx ON wiki_reports (status, created_at)`)
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS wiki_notices (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        message text NOT NULL,
        link_url text,
        tone text NOT NULL DEFAULT 'info',
        is_active boolean NOT NULL DEFAULT true,
        starts_at timestamptz,
        ends_at timestamptz,
        created_by text,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      )
    `)
    return NextResponse.json({ success: true, applied: true, status: await status() })
  } catch (error) {
    console.error('관리자 도구 DDL 오류:', error)
    return NextResponse.json({ success: false, error: 'DDL 적용에 실패했습니다.' }, { status: 500 })
  }
}
