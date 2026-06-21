import { NextRequest, NextResponse } from 'next/server'
import { sql } from 'drizzle-orm'
import { getDb } from '@/db/client'
import { checkAdminAuth } from '@/lib/adminAuth'

export const dynamic = 'force-dynamic'

/**
 * 위키 통계 DDL — 일별 조회수 롤업 표(wiki_page_view_daily) 생성.
 * Cloud SQL은 소켓 전용이라 로컬에서 DDL을 못 쳐서 앱 경유로 1회 적용한다.
 * CREATE TABLE IF NOT EXISTS — 멱등. 관리자 전용.
 *
 *   GET /api/admin/maintenance/wiki-stats            → dry-run (상태 조회)
 *   GET /api/admin/maintenance/wiki-stats?confirm=1  → 실제 생성
 *
 * 적용 후: /api/wiki/trending?period=week|month 가 실지표(기간별 조회 합)를
 * 반환하고, 문서 조회 시 일별 카운트가 누적되기 시작한다.
 */
export async function GET(request: NextRequest) {
  try {
    const admin = await checkAdminAuth(request)
    if (!admin) {
      return NextResponse.json({ success: false, error: '관리자 권한이 필요합니다.' }, { status: 403 })
    }

    const db = getDb()
    const exists = async () => {
      const rows = await db.execute(sql`SELECT to_regclass('public.wiki_page_view_daily') AS t`)
      const r = (rows as any).rows ?? rows
      return Boolean(r?.[0]?.t)
    }

    const { searchParams } = new URL(request.url)
    if (searchParams.get('confirm') !== '1') {
      return NextResponse.json({
        success: true,
        applied: false,
        message: 'dry-run — ?confirm=1 로 호출하면 wiki_page_view_daily 표를 생성합니다.',
        wikiPageViewDailyExists: await exists(),
      })
    }

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "wiki_page_view_daily" (
        "page_id" uuid NOT NULL REFERENCES "wiki_pages"("id") ON DELETE CASCADE,
        "day" date NOT NULL,
        "count" integer NOT NULL DEFAULT 0,
        CONSTRAINT "wiki_page_view_daily_pk" PRIMARY KEY ("page_id", "day")
      )
    `)
    await db.execute(
      sql`CREATE INDEX IF NOT EXISTS "wiki_page_view_daily_day_idx" ON "wiki_page_view_daily" ("day")`
    )

    return NextResponse.json({
      success: true,
      applied: true,
      message:
        'wiki_page_view_daily 표 생성 완료. 이제 문서 조회가 일별로 집계되어 주간/월간 인기 문서와 연보가 실지표로 동작합니다.',
      wikiPageViewDailyExists: await exists(),
      appliedBy: admin.username,
    })
  } catch (error) {
    console.error('wiki-stats 마이그레이션 오류:', error)
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
