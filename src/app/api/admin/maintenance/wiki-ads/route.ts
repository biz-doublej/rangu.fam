import { NextRequest, NextResponse } from 'next/server'
import { sql } from 'drizzle-orm'
import { getDb } from '@/db/client'
import { checkAdminAuth } from '@/lib/adminAuth'

export const dynamic = 'force-dynamic'

const DEFAULT_AD_LINK = 'https://drive.google.com/drive/folders/11IbEqqoRrEcqnjfyVEa_4eQvqJD0CeTy?usp=sharing'

/**
 * 위키 광고 표 생성과 첫 광고 2개 등록. 멱등, 관리자 전용.
 * 표가 없어도 /api/wiki/ads 는 빈 목록을 돌려주므로 배포 후 실행해도 된다.
 *
 *   GET /api/admin/maintenance/wiki-ads            → 상태 조회
 *   GET /api/admin/maintenance/wiki-ads?confirm=1  → 적용
 */
export async function GET(request: NextRequest) {
  try {
    if (!(await checkAdminAuth(request))) {
      return NextResponse.json({ success: false, error: '관리자 권한이 필요합니다.' }, { status: 403 })
    }

    const db = getDb()
    const tableExists = async () => {
      const rows = await db.execute(sql`SELECT to_regclass('public.wiki_ads') IS NOT NULL AS "exists"`)
      return Boolean(((rows as any).rows ?? rows)?.[0]?.exists)
    }

    if (new URL(request.url).searchParams.get('confirm') !== '1') {
      return NextResponse.json({ success: true, dryRun: true, tableExists: await tableExists() })
    }

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS wiki_ads (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        title text NOT NULL,
        link_url text NOT NULL,
        desktop_image text NOT NULL,
        mobile_image text NOT NULL,
        sort_order integer NOT NULL DEFAULT 0,
        is_active boolean NOT NULL DEFAULT true,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      )
    `)
    await db.execute(sql`CREATE INDEX IF NOT EXISTS wiki_ads_sort_idx ON wiki_ads (sort_order)`)
    await db.execute(sql`
      INSERT INTO wiki_ads (title, link_url, desktop_image, mobile_image, sort_order)
      SELECT * FROM (VALUES
        ('흔들리지 않는 신념으로', ${DEFAULT_AD_LINK}, '/ads/ad1-pc.webp', '/ads/ad1-mobile.webp', 1),
        ('공작소의 밤', ${DEFAULT_AD_LINK}, '/ads/ad2-pc.webp', '/ads/ad2-mobile.webp', 2)
      ) AS seed(title, link_url, desktop_image, mobile_image, sort_order)
      WHERE NOT EXISTS (SELECT 1 FROM wiki_ads)
    `)

    const rows = await db.execute(sql`SELECT count(*)::int AS count FROM wiki_ads`)
    return NextResponse.json({ success: true, tableExists: true, adCount: ((rows as any).rows ?? rows)?.[0]?.count })
  } catch (error) {
    console.error('위키 광고 DDL 오류:', error)
    return NextResponse.json({ success: false, error: 'DDL 적용에 실패했습니다.' }, { status: 500 })
  }
}
