import { NextRequest, NextResponse } from 'next/server'
import { and, desc, eq, inArray, or } from 'drizzle-orm'
import { getDb } from '@/db/client'
import { cards, cardTrades, userCards } from '@/db/schema/cards'
import { wikiUsers } from '@/db/schema/wiki'
import {
  buildClientUser,
  getAuthenticatedWikiUser,
  resolveMemberIdForUser,
} from '@/lib/doublejAuth'

export const dynamic = 'force-dynamic'

const FALLBACK_IMAGE = '/images/default-music-cover.jpg'

function isMissingTableError(error: unknown): boolean {
  const msg = error instanceof Error ? error.message : String(error)
  return /card_trades.*does not exist|relation .*card_trades/i.test(msg)
}

function migrationNeededResponse() {
  return NextResponse.json(
    {
      success: false,
      needsMigration: true,
      message:
        '카드 교환 기능이 아직 활성화되지 않았습니다. 관리자가 /api/admin/maintenance/cards-trades?confirm=1 을 1회 실행해야 합니다.',
    },
    { status: 503 }
  )
}

// ── GET: 내 교환함 (받은/보낸) + 교환 가능한 파트너 + 카드 카탈로그 + 내 카드 ──
export async function GET(request: NextRequest) {
  try {
    const wikiUser = await getAuthenticatedWikiUser(request)
    if (!wikiUser) {
      return NextResponse.json(
        { success: false, message: '카드 교환은 로그인 후 이용할 수 있습니다.' },
        { status: 401 }
      )
    }
    const me = buildClientUser(wikiUser).id
    const db = getDb()

    const [incomingRaw, outgoingRaw] = await Promise.all([
      db
        .select()
        .from(cardTrades)
        .where(eq(cardTrades.toUserId, me))
        .orderBy(desc(cardTrades.createdAt))
        .limit(60),
      db
        .select()
        .from(cardTrades)
        .where(eq(cardTrades.fromUserId, me))
        .orderBy(desc(cardTrades.createdAt))
        .limit(60),
    ])

    // 상대방 사용자 정보 조회
    const counterpartIds = Array.from(
      new Set([
        ...incomingRaw.map((t) => t.fromUserId),
        ...outgoingRaw.map((t) => t.toUserId),
      ])
    )
    const counterpartUsers = counterpartIds.length
      ? await db
          .select({
            id: wikiUsers.id,
            username: wikiUsers.username,
            displayName: wikiUsers.displayName,
            avatar: wikiUsers.avatar,
          })
          .from(wikiUsers)
          .where(inArray(wikiUsers.id, counterpartIds))
      : []
    const userMap = new Map(counterpartUsers.map((u) => [u.id, u]))
    const briefUser = (id: string) => {
      const u = userMap.get(id)
      return u
        ? { id: u.id, username: u.username, displayName: u.displayName || u.username, avatar: u.avatar || null }
        : { id, username: '알 수 없음', displayName: '알 수 없음', avatar: null }
    }

    const shapeTrade = (t: typeof incomingRaw[number]) => ({
      id: t.id,
      fromUser: briefUser(t.fromUserId),
      toUser: briefUser(t.toUserId),
      offerCardId: t.offerCardId,
      offerQuantity: t.offerQuantity,
      requestCardId: t.requestCardId,
      requestQuantity: t.requestQuantity,
      status: t.status,
      message: t.message || '',
      createdAt: t.createdAt,
      respondedAt: t.respondedAt,
    })

    // 교환 가능한 파트너 — 코어 멤버 위키 계정 (자신 제외)
    const allUsers = await db
      .select({
        id: wikiUsers.id,
        username: wikiUsers.username,
        displayName: wikiUsers.displayName,
        avatar: wikiUsers.avatar,
        email: wikiUsers.email,
        discordUsername: wikiUsers.discordUsername,
        discordId: wikiUsers.discordId,
      })
      .from(wikiUsers)
    const partners = allUsers
      .filter((u) => u.id !== me)
      .map((u) => ({ u, memberId: resolveMemberIdForUser(u) }))
      .filter((x) => Boolean(x.memberId))
      .map((x) => ({
        id: x.u.id,
        username: x.u.username,
        displayName: x.u.displayName || x.u.username,
        avatar: x.u.avatar || null,
        memberId: x.memberId,
      }))

    // 카드 카탈로그 (드롭다운/렌더용)
    const catalogRows = await db
      .select({
        cardId: cards.cardId,
        name: cards.name,
        imageUrl: cards.imageUrl,
        rarity: cards.rarity,
        type: cards.type,
        member: cards.member,
      })
      .from(cards)
    const catalog = catalogRows.map((c) => ({
      ...c,
      imageUrl: c.imageUrl && c.imageUrl.trim() ? c.imageUrl : FALLBACK_IMAGE,
    }))

    // 내 카드 (제안 시 내놓을 카드 선택용)
    const myCardRows = await db
      .select({
        cardId: userCards.cardId,
        quantity: userCards.quantity,
        isLocked: userCards.isLocked,
      })
      .from(userCards)
      .where(eq(userCards.userId, me))
    const myCards = myCardRows

    return NextResponse.json({
      success: true,
      incoming: incomingRaw.map(shapeTrade),
      outgoing: outgoingRaw.map(shapeTrade),
      partners,
      catalog,
      myCards,
    })
  } catch (error) {
    if (isMissingTableError(error)) return migrationNeededResponse()
    console.error('카드 교환 목록 오류:', error)
    return NextResponse.json(
      { success: false, message: '카드 교환 정보를 불러오지 못했습니다.' },
      { status: 500 }
    )
  }
}

// ── POST: 교환 제안 생성 ─────────────────────────────────────
export async function POST(request: NextRequest) {
  try {
    const wikiUser = await getAuthenticatedWikiUser(request)
    if (!wikiUser) {
      return NextResponse.json(
        { success: false, message: '카드 교환은 로그인 후 이용할 수 있습니다.' },
        { status: 401 }
      )
    }
    const me = buildClientUser(wikiUser).id
    const db = getDb()

    const body = await request.json().catch(() => ({}))
    const toUserId = typeof body?.toUserId === 'string' ? body.toUserId : ''
    const offerCardId = typeof body?.offerCardId === 'string' ? body.offerCardId : ''
    const requestCardId = typeof body?.requestCardId === 'string' ? body.requestCardId : ''
    const offerQuantity = Math.max(1, Math.min(99, Math.floor(Number(body?.offerQuantity) || 1)))
    const requestQuantity = Math.max(1, Math.min(99, Math.floor(Number(body?.requestQuantity) || 1)))
    const message = typeof body?.message === 'string' ? body.message.slice(0, 300) : ''

    if (!toUserId || !offerCardId || !requestCardId) {
      return NextResponse.json(
        { success: false, message: '받는 사람과 교환할 카드를 모두 선택해주세요.' },
        { status: 400 }
      )
    }
    if (toUserId === me) {
      return NextResponse.json(
        { success: false, message: '자기 자신과는 교환할 수 없습니다.' },
        { status: 400 }
      )
    }
    if (offerCardId === requestCardId) {
      return NextResponse.json(
        { success: false, message: '같은 카드끼리는 교환할 수 없습니다.' },
        { status: 400 }
      )
    }

    // 받는 사람 존재 확인
    const [recipient] = await db
      .select({ id: wikiUsers.id })
      .from(wikiUsers)
      .where(eq(wikiUsers.id, toUserId))
      .limit(1)
    if (!recipient) {
      return NextResponse.json(
        { success: false, message: '받는 사람을 찾을 수 없습니다.' },
        { status: 404 }
      )
    }

    // 카드 정의 존재 확인
    const cardDefs = await db
      .select({ cardId: cards.cardId })
      .from(cards)
      .where(inArray(cards.cardId, [offerCardId, requestCardId]))
    const defSet = new Set(cardDefs.map((c) => c.cardId))
    if (!defSet.has(offerCardId) || !defSet.has(requestCardId)) {
      return NextResponse.json(
        { success: false, message: '존재하지 않는 카드입니다.' },
        { status: 400 }
      )
    }

    // 내가 내놓을 카드를 충분히 보유 + 잠금 아님
    const [owned] = await db
      .select()
      .from(userCards)
      .where(and(eq(userCards.userId, me), eq(userCards.cardId, offerCardId)))
      .limit(1)
    if (!owned || owned.quantity < offerQuantity) {
      return NextResponse.json(
        { success: false, message: '내놓을 카드를 충분히 보유하고 있지 않습니다.' },
        { status: 400 }
      )
    }
    if (owned.isLocked) {
      return NextResponse.json(
        { success: false, message: '잠긴 카드는 교환에 내놓을 수 없습니다.' },
        { status: 400 }
      )
    }

    // 중복 pending 제안 방지 (동일 상대/동일 카드 조합)
    const dup = await db
      .select({ id: cardTrades.id })
      .from(cardTrades)
      .where(
        and(
          eq(cardTrades.fromUserId, me),
          eq(cardTrades.toUserId, toUserId),
          eq(cardTrades.offerCardId, offerCardId),
          eq(cardTrades.requestCardId, requestCardId),
          eq(cardTrades.status, 'pending')
        )
      )
      .limit(1)
    if (dup.length > 0) {
      return NextResponse.json(
        { success: false, message: '이미 동일한 제안이 대기 중입니다.' },
        { status: 409 }
      )
    }

    const [created] = await db
      .insert(cardTrades)
      .values({
        fromUserId: me,
        toUserId,
        offerCardId,
        offerQuantity,
        requestCardId,
        requestQuantity,
        status: 'pending',
        message: message || null,
      })
      .returning()

    return NextResponse.json({ success: true, trade: created, message: '교환 제안을 보냈습니다.' })
  } catch (error) {
    if (isMissingTableError(error)) return migrationNeededResponse()
    console.error('카드 교환 제안 오류:', error)
    return NextResponse.json(
      { success: false, message: '교환 제안 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
