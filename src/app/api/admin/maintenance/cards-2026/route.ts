import { NextRequest, NextResponse } from 'next/server'
import { inArray } from 'drizzle-orm'
import { getDb } from '@/db/client'
import { cards } from '@/db/schema/cards'
import { checkAdminAuth } from '@/lib/adminAuth'

export const dynamic = 'force-dynamic'

/**
 * 2026 카드 1차 업데이트 시드 — 년도카드(2026) 5종 + 스페셜 27종 등록.
 *
 * 카드 카탈로그는 DB 직접 관리 방식이라(과거 cardCatalogService 폐기) 신규 카드는
 * 이런 시드 라우트로 넣는다. cardId UNIQUE + ON CONFLICT DO NOTHING 으로 멱등 —
 * 여러 번 호출해도 이미 있는 카드는 건너뛴다. 드랍은 dropRate > 0 이면 자동 포함.
 *
 * 사용법 (관리자 로그인 브라우저에서):
 *   GET /api/admin/maintenance/cards-2026          → 등록 예정/기존 카드 확인 (dry-run)
 *   GET /api/admin/maintenance/cards-2026?confirm=1 → 실제 등록
 */

const MEMBER_NAMES: Record<string, string> = {
  HAN: '강한울',
  JAE: '정재원',
  JIN: '정진규',
  LEE: '이승찬',
  MIN: '정민석',
}

// 시즌카드 = 년도카드 (기존 컨벤션: rarity basic, drop 0.011, v1 = 상반기 h1)
const YEAR_CARDS_2026 = (['HAN', 'JAE', 'JIN', 'LEE', 'MIN'] as const).map((code) => ({
  cardId: `${code}_2026_v1`,
  name: `${MEMBER_NAMES[code]} 2026 v1`,
  type: 'year',
  rarity: 'basic',
  description: `2026년 ${MEMBER_NAMES[code]} 카드 v1`,
  imageUrl: `/images/cards/year/${code}_26_V1.jpg`,
  member: MEMBER_NAMES[code],
  year: 2026,
  period: 'h1',
  isGroupCard: false,
  dropRate: 0.011,
  canBeUsedForCrafting: true,
}))

// 스페셜 카드 (기존 컨벤션: rarity rare, drop 0.0119) — 파일명 stem 이 cardId
const SPECIAL_FILES_2026 = [
  'NG_HAN_V1', 'NG_HAN_V2', 'NG_JAE_V1', 'NG_JAE_V2', 'NG_JIN_V1',
  'NG_LEE_V1', 'NG_LEE_V2', 'NG_LEE_V3', 'NG_MIN_V1',
  'OL_HAN_V1', 'OL_HAN_V2', 'OL_JAE_V1', 'OL_JAE_V2', 'OL_JIN_V1',
  'OL_JIN_V2', 'OL_MIN_V1', 'OL_MIN_V2',
  'PF_HAN', 'PF_JAE', 'PF_JIN', 'PF_LEE', 'PF_MIN',
]

const SPECIAL_CARDS_2026 = SPECIAL_FILES_2026.map((stem) => {
  const [series, code, ver] = stem.split('_')
  const member = MEMBER_NAMES[code] || code
  const verLabel = ver ? ` ${ver.toLowerCase()}` : ''
  return {
    cardId: stem,
    name: `${member} ${series}${verLabel}`,
    type: 'special',
    rarity: 'rare',
    description: `2026 스페셜 카드 (${series} 시리즈) — ${member}${verLabel}`,
    imageUrl: `/images/cards/special/${stem}.jpg`,
    member,
    year: 2026,
    isGroupCard: false,
    dropRate: 0.0119,
    canBeUsedForCrafting: true,
  }
})

const NEW_CARDS = [...YEAR_CARDS_2026, ...SPECIAL_CARDS_2026]

// 재료카드 — 조커. DB에는 이미 row가 있었지만(드랍 0.05, 드랍 풀 화이트리스트 예외)
// 이미지 파일이 public 에 없어 깨져 있었음. 카드 실물 이미지로 경로를 바로잡는다.
// 없으면 생성, 있으면 imageUrl 만 갱신 (upsert).
const JOKER_CARD = {
  cardId: 'joker_card',
  name: '조커카드',
  type: 'material',
  rarity: 'material',
  description: '조커 재료 카드 — 프레스티지 제작 재료로 사용됩니다.',
  imageUrl: '/images/cards/material/JOKER_CARD.jpg',
  isGroupCard: false,
  dropRate: 0.05,
  canBeUsedForCrafting: true,
}

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
    const ids = NEW_CARDS.map((c) => c.cardId)
    const existing = await db
      .select({ cardId: cards.cardId })
      .from(cards)
      .where(inArray(cards.cardId, ids))
    const existingIds = new Set(existing.map((r) => r.cardId))

    const { searchParams } = new URL(request.url)
    if (searchParams.get('confirm') !== '1') {
      return NextResponse.json({
        success: true,
        applied: false,
        message: 'dry-run — ?confirm=1 을 붙여 호출하면 카드를 등록합니다.',
        totalPlanned: NEW_CARDS.length,
        alreadyRegistered: [...existingIds],
        toInsert: ids.filter((id) => !existingIds.has(id)),
        material: `joker_card 는 upsert — 이미지 경로를 ${JOKER_CARD.imageUrl} 로 갱신`,
      })
    }

    const inserted = await db
      .insert(cards)
      .values(NEW_CARDS)
      .onConflictDoNothing({ target: cards.cardId })
      .returning({ cardId: cards.cardId })

    // 조커 재료카드 upsert — 없으면 생성, 있으면 이미지 경로만 카드 실물로 갱신
    await db
      .insert(cards)
      .values(JOKER_CARD)
      .onConflictDoUpdate({
        target: cards.cardId,
        set: { imageUrl: JOKER_CARD.imageUrl, updatedAt: new Date() },
      })

    return NextResponse.json({
      success: true,
      applied: true,
      message: `2026 카드 1차 업데이트 — ${inserted.length}종 신규 등록 (년도 5 + 스페셜 22 중 기존 ${existingIds.size}종은 건너뜀) + 조커 재료카드 이미지 복구. 드랍에 즉시 포함됩니다.`,
      insertedCount: inserted.length,
      inserted: inserted.map((r) => r.cardId),
      skipped: [...existingIds],
      jokerCard: `upsert 완료 → ${JOKER_CARD.imageUrl}`,
      appliedBy: admin.username,
    })
  } catch (error) {
    console.error('cards-2026 시드 오류:', error)
    return NextResponse.json(
      {
        success: false,
        error: '2026 카드 등록 중 오류가 발생했습니다.',
        detail: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    )
  }
}
