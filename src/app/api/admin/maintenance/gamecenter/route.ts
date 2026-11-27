import { NextRequest, NextResponse } from 'next/server'
import { sql } from 'drizzle-orm'
import { getDb } from '@/db/client'
import { checkAdminAuth } from '@/lib/adminAuth'
import { GC_DDL_STATEMENTS, GC_TABLES, SHOP_SEED, shopSeedStatements } from '@/lib/gamecenter/ddl'

export const dynamic = 'force-dynamic'

/**
 * 이랑게임센터 DDL — gc_* 표 8개 생성 + 상점 초기 상품.
 * Cloud SQL은 소켓 전용이라 로컬에서 DDL을 못 쳐서 앱 경유로 적용한다.
 * CREATE TABLE IF NOT EXISTS / ON CONFLICT DO NOTHING — 멱등. 관리자 전용.
 *
 *   GET /api/admin/maintenance/gamecenter            → dry-run (상태 조회)
 *   GET /api/admin/maintenance/gamecenter?confirm=1  → 실제 생성
 */
export async function GET(request: NextRequest) {
  try {
    const admin = await checkAdminAuth(request)
    if (!admin) {
      return NextResponse.json({ success: false, error: '관리자 권한이 필요합니다.' }, { status: 403 })
    }

    const db = getDb()
    const rowsOf = (result: unknown) => ((result as any).rows ?? result) as any[]
    const status = async () => {
      const tables: Record<string, boolean> = {}
      for (const table of GC_TABLES) {
        const rows = rowsOf(await db.execute(sql`SELECT to_regclass(${`public.${table}`}) AS t`))
        tables[table] = Boolean(rows?.[0]?.t)
      }
      let shopItems: number | null = null
      if (tables.gc_shop_items) {
        const rows = rowsOf(await db.execute(sql`SELECT count(*)::int AS n FROM gc_shop_items`))
        shopItems = Number(rows?.[0]?.n ?? 0)
      }
      return { tables, shopItems }
    }

    const { searchParams } = new URL(request.url)
    if (searchParams.get('confirm') !== '1') {
      return NextResponse.json({
        success: true,
        applied: false,
        message: `dry-run — ?confirm=1 로 호출하면 gc_* 표 ${GC_TABLES.length}개를 만들고 상점 초기 상품 ${SHOP_SEED.length}개를 넣습니다.`,
        ...(await status()),
        seedItemIds: SHOP_SEED.map((item) => item.id),
      })
    }

    await db.transaction(async (tx) => {
      for (const statement of [...GC_DDL_STATEMENTS, ...shopSeedStatements()]) {
        await tx.execute(sql.raw(statement))
      }
    })

    return NextResponse.json({
      success: true,
      applied: true,
      message: '게임센터 표 생성과 상점 초기 상품 등록 완료. 이미 있던 표와 상품은 그대로 둡니다.',
      ...(await status()),
      appliedBy: admin.username,
    })
  } catch (error) {
    console.error('gamecenter 마이그레이션 오류:', error)
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
