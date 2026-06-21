import { NextRequest, NextResponse } from 'next/server'
import { inArray } from 'drizzle-orm'
import { getDb } from '@/db/client'
import { cards } from '@/db/schema/cards'
import { checkAdminAuth } from '@/lib/adminAuth'

export const dynamic = 'force-dynamic'

/**
 * 프레스티지 카드 시드/복구 — 6종(멤버 5 + 단체 1).
 *
 * 제작(craft) 라우트는 성공 시 `prestige_{slug}` / `prestige_group_special` cardId 로
 * 카드를 지급하는데, 그 row 가 cards 테이블에 없으면 성공 굴림이 나와도 500 → "제작 실패"
 * 로 보였다(시드가 소스 어디에도 없었음). 도감 만렙 보상도 같은 카드를 지급하므로 함께 복구된다.
 *
 * dropRate=0 → 랜덤 드랍 풀에는 들어가지 않음(드랍 라우트가 type='prestige' 를 이미 제외).
 * upsert — 없으면 생성, 있으면 이미지/메타를 올바른 값으로 교정.
 *
 * 사용법 (관리자 로그인 브라우저에서):
 *   GET /api/admin/maintenance/prestige-cards            → dry-run (등록/기존 확인)
 *   GET /api/admin/maintenance/prestige-cards?confirm=1  → 실제 시드/복구
 */

const MEMBER_PRESTIGE = [
  { cardId: 'prestige_hanul', member: '강한울', code: 'HAN' },
  { cardId: 'prestige_jaewon', member: '정재원', code: 'JAE' },
  { cardId: 'prestige_jinkyu', member: '정진규', code: 'JIN' },
  { cardId: 'prestige_seungchan', member: '이승찬', code: 'LEE' },
  { cardId: 'prestige_minseok', member: '정민석', code: 'MIN' },
].map((c) => ({
  cardId: c.cardId,
  name: `${c.member} 프레스티지`,
  type: 'prestige',
  rarity: 'legendary',
  description: `${c.member} 프레스티지 카드 — 조합 또는 ${c.member} 도감 완성으로만 얻을 수 있는 전설 카드.`,
  imageUrl: `/images/cards/prestige/BG_${c.code}_PRE.jpg`,
  member: c.member,
  year: null as number | null,
  period: null as string | null,
  isGroupCard: false,
  dropRate: 0,
  canBeUsedForCrafting: false,
}))

const GROUP_PRESTIGE = {
  cardId: 'prestige_group_special',
  name: '랑구팸 프레스티지',
  type: 'prestige',
  rarity: 'legendary',
  description: '랑구팸 단체 프레스티지 카드 — 다섯 멤버 도감을 모두 완성한 자에게 주어지는 최고 등급 카드.',
  imageUrl: '/images/cards/prestige/PGBG.jpg',
  member: null as string | null,
  year: null as number | null,
  period: null as string | null,
  isGroupCard: true,
  dropRate: 0,
  canBeUsedForCrafting: false,
}

const ALL_PRESTIGE = [...MEMBER_PRESTIGE, GROUP_PRESTIGE]

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
    const ids = ALL_PRESTIGE.map((c) => c.cardId)
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
        message: 'dry-run — ?confirm=1 을 붙여 호출하면 프레스티지 카드를 시드/복구합니다.',
        totalPlanned: ALL_PRESTIGE.length,
        alreadyRegistered: [...existingIds],
        toInsert: ids.filter((id) => !existingIds.has(id)),
        note: '기존 row 는 이미지/메타가 올바른 값으로 upsert 됩니다.',
      })
    }

    // upsert — 없으면 생성, 있으면 이미지/메타 교정
    for (const card of ALL_PRESTIGE) {
      await db
        .insert(cards)
        .values(card)
        .onConflictDoUpdate({
          target: cards.cardId,
          set: {
            name: card.name,
            type: card.type,
            rarity: card.rarity,
            description: card.description,
            imageUrl: card.imageUrl,
            member: card.member,
            isGroupCard: card.isGroupCard,
            dropRate: card.dropRate,
            canBeUsedForCrafting: card.canBeUsedForCrafting,
            updatedAt: new Date(),
          },
        })
    }

    return NextResponse.json({
      success: true,
      applied: true,
      message: `프레스티지 카드 ${ALL_PRESTIGE.length}종 시드/복구 완료 (신규 ${ids.filter((id) => !existingIds.has(id)).length}종 + 기존 ${existingIds.size}종 이미지/메타 교정). 제작 성공 지급과 도감 만렙 보상이 정상 동작합니다.`,
      cardIds: ids,
      newlyInserted: ids.filter((id) => !existingIds.has(id)),
      repaired: [...existingIds],
      appliedBy: admin.username,
    })
  } catch (error) {
    console.error('prestige-cards 시드 오류:', error)
    return NextResponse.json(
      {
        success: false,
        error: '프레스티지 카드 시드 중 오류가 발생했습니다.',
        detail: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    )
  }
}
