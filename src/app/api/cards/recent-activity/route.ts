import { createHash } from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { and, desc, eq, inArray, ne, or } from 'drizzle-orm'
import { getDb } from '@/db/client'
import { cards, cardDrops } from '@/db/schema/cards'
import { wikiUsers } from '@/db/schema/wiki'
import { resolveMemberIdForUser } from '@/lib/doublejAuth'

export const dynamic = 'force-dynamic'

const FALLBACK_IMAGE = '/images/default-music-cover.jpg'
const TARGET_MEMBER_IDS = new Set(['hanul', 'jaewon', 'jinkyu', 'seungchan', 'minseok'])
const MEMBER_ID_TO_NAME: Record<string, string> = {
  hanul: '강한울',
  jaewon: '정재원',
  jinkyu: '정진규',
  seungchan: '이승찬',
  minseok: '정민석',
}

const MEMBER_SEEDS: Record<string, string[]> = {
  hanul: ['hanul', 'k.seoljin', 'kanghu05', 'HAN'],
  jaewon: ['jaewon', 'gabrieljung0727', 'gabriel0727', 'JAE'],
  jinkyu: ['jinkyu', 'jingyu', 'jinq09012239', 'JIN'],
  seungchan: ['seungchan', 'sd_kim.h.s', 'LEE'],
  minseok: ['minseok', 'txxse0k', 'seoko1752', 'MIN'],
}

// 시드 문자열 → UUID (Mongo ObjectId 호환). 24-char hex를 32-char로 패딩 후 UUID 포맷.
function seedToUuid(seed: string): string {
  const hex = createHash('md5').update(seed || 'guest').digest('hex').slice(0, 24)
  const padded = hex.padEnd(32, '0')
  return `${padded.slice(0, 8)}-${padded.slice(8, 12)}-${padded.slice(12, 16)}-${padded.slice(16, 20)}-${padded.slice(20, 32)}`
}

type ActivityType = 'drop' | 'craft' | 'upgrade'

export async function GET(request: NextRequest) {
  try {
    const db = getDb()

    const { searchParams } = new URL(request.url)
    const rawLimit = Number(searchParams.get('limit') || 40)
    const limit = Number.isFinite(rawLimit) ? Math.min(Math.max(rawLimit, 10), 120) : 40

    const targetMemberByUserId = new Map<string, string>()

    // 실사용 계정 매핑 (wiki_users)
    const users = await db
      .select({
        id: wikiUsers.id,
        username: wikiUsers.username,
        discordUsername: wikiUsers.discordUsername,
        discordId: wikiUsers.discordId,
      })
      .from(wikiUsers)

    for (const user of users) {
      const memberId = resolveMemberIdForUser(user as any)
      if (!memberId || !TARGET_MEMBER_IDS.has(memberId)) continue
      targetMemberByUserId.set(user.id, memberId)
    }

    // 과거 시드 기반 로그도 포함
    for (const [memberId, seeds] of Object.entries(MEMBER_SEEDS)) {
      for (const seed of seeds) {
        targetMemberByUserId.set(seedToUuid(seed), memberId)
      }
    }

    const targetUserIds = Array.from(targetMemberByUserId.keys())
    if (!targetUserIds.length) {
      return NextResponse.json({ success: true, activities: [] })
    }

    // CardDrop 조회
    const logs = await db
      .select()
      .from(cardDrops)
      .where(
        and(
          inArray(cardDrops.userId, targetUserIds),
          or(eq(cardDrops.dropType, 'daily'), and(eq(cardDrops.dropType, 'craft'), ne(cardDrops.cardId, 'craft_fail')))
        )
      )
      .orderBy(desc(cardDrops.droppedAt), desc(cardDrops.createdAt))
      .limit(limit)

    if (!logs.length) {
      return NextResponse.json({ success: true, activities: [] })
    }

    const cardIds = Array.from(
      new Set(logs.map((l) => String(l.cardId || '')).filter((id) => id && id !== 'craft_fail'))
    )

    const cardRows = cardIds.length
      ? await db
          .select({
            cardId: cards.cardId,
            name: cards.name,
            imageUrl: cards.imageUrl,
            rarity: cards.rarity,
          })
          .from(cards)
          .where(inArray(cards.cardId, cardIds))
      : []

    const cardById = new Map(cardRows.map((c) => [c.cardId, c]))

    const activities = logs.map((log) => {
      const memberId = targetMemberByUserId.get(log.userId) || ''
      const memberName = MEMBER_ID_TO_NAME[memberId] || '랑구팸 멤버'
      const usedCardsCount = Array.isArray(log.craftingAttempt?.usedCards)
        ? log.craftingAttempt.usedCards.length
        : 0

      let activityType: ActivityType = 'drop'
      if (log.dropType === 'craft') {
        activityType = usedCardsCount > 0 ? 'craft' : 'upgrade'
      }

      const cardId = String(log.cardId || '')
      const card = cardById.get(cardId)
      const cardName =
        card?.name ||
        (cardId === 'prestige_random' ? '프레스티지 카드' : cardId || '알 수 없는 카드')

      return {
        id: log.id,
        memberId,
        memberName,
        activityType,
        activityLabel:
          activityType === 'drop' ? '드롭' : activityType === 'craft' ? '제작' : '강화',
        cardId,
        cardName,
        cardImageUrl: card?.imageUrl || FALLBACK_IMAGE,
        cardRarity: card?.rarity || null,
        droppedAt: log.droppedAt || log.createdAt,
      }
    })

    return NextResponse.json({ success: true, activities })
  } catch (error) {
    console.error('Recent card activity error:', error)
    return NextResponse.json(
      { success: false, message: '최근 카드 활동을 불러오지 못했습니다.' },
      { status: 500 }
    )
  }
}
