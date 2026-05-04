import { NextResponse } from 'next/server'
import { sql } from 'drizzle-orm'
import { getDb } from '@/db/client'
import { cards } from '@/db/schema/cards'

export const dynamic = 'force-dynamic'

/**
 * 카드 시드 API.
 *
 * 과거 CardCatalogService.syncCardsFromLocalImages() 가 로컬 이미지 폴더를 스캔해서
 * Card row를 upsert 했음. Drizzle 마이그레이션 + cardService.ts 삭제 후 catalog
 * 동기화 기능은 폐기됐고, 카드는 DB의 cards 테이블에 직접 관리됨.
 *
 * 현재 이 라우트는 idempotent 카운트 조회만 수행 — 운영자가 시드 상태를 확인하는 용도.
 */
export async function POST() {
  try {
    const db = getDb()
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(cards)

    return NextResponse.json({
      success: true,
      message: `현재 ${count}개의 카드가 존재합니다.`,
      count,
      note: '카드 카탈로그는 이제 DB 직접 관리. 신규 카드는 admin UI 또는 직접 INSERT 로 추가하세요.',
    })
  } catch (error) {
    console.error('Card seed status error:', error)
    return NextResponse.json(
      {
        success: false,
        message: '카드 상태 조회 중 오류가 발생했습니다.',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
