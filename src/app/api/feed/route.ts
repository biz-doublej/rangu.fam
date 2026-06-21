import { NextResponse } from 'next/server'
import { desc, eq, inArray } from 'drizzle-orm'
import { getDb } from '@/db/client'
import { wikiPages, wikiRevisions, wikiUsers } from '@/db/schema/wiki'
import { cardDrops, cards, cardTrades } from '@/db/schema/cards'
import { resolveMemberIdForUser } from '@/lib/doublejAuth'

export const dynamic = 'force-dynamic'

const FALLBACK_IMAGE = '/images/default-music-cover.jpg'

export interface FeedItem {
  id: string
  type: 'wiki_edit' | 'card_drop' | 'card_trade'
  ts: string // ISO
  [k: string]: unknown
}

/**
 * 멤버 활동 피드 — 위키 편집 + 카드 획득 + 카드 교환(성사) 을 시간순으로 통합.
 * card_trades 표가 없으면(마이그레이션 전) 해당 소스만 건너뛴다.
 */
export async function GET() {
  try {
    const db = getDb()

    // 1) 위키 편집 (자동 편집 제외)
    const edits = await db
      .select({
        author: wikiRevisions.author,
        editType: wikiRevisions.editType,
        sizeChange: wikiRevisions.sizeChange,
        timestampAt: wikiRevisions.timestampAt,
        revisionNumber: wikiRevisions.revisionNumber,
        title: wikiPages.title,
        slug: wikiPages.slug,
      })
      .from(wikiRevisions)
      .leftJoin(wikiPages, eq(wikiRevisions.pageId, wikiPages.id))
      .where(eq(wikiRevisions.isAutomated, false))
      .orderBy(desc(wikiRevisions.timestampAt))
      .limit(30)

    // 2) 카드 획득 (드랍)
    const drops = await db
      .select({
        id: cardDrops.id,
        cardId: cardDrops.cardId,
        droppedAt: cardDrops.droppedAt,
        username: wikiUsers.username,
        displayName: wikiUsers.displayName,
        avatar: wikiUsers.avatar,
        email: wikiUsers.email,
        discordUsername: wikiUsers.discordUsername,
        discordId: wikiUsers.discordId,
      })
      .from(cardDrops)
      .leftJoin(wikiUsers, eq(cardDrops.userId, wikiUsers.id))
      .orderBy(desc(cardDrops.droppedAt))
      .limit(30)

    // 3) 카드 교환 성사 (표 없으면 skip) — ids 만 가져오고 이름/카드는 뒤에서 일괄 조회
    let tradeRows: Array<{
      id: string
      offerCardId: string
      requestCardId: string
      respondedAt: Date | null
      createdAt: Date
      fromUserId: string
      toUserId: string
    }> = []
    try {
      tradeRows = await db
        .select({
          id: cardTrades.id,
          offerCardId: cardTrades.offerCardId,
          requestCardId: cardTrades.requestCardId,
          respondedAt: cardTrades.respondedAt,
          createdAt: cardTrades.createdAt,
          fromUserId: cardTrades.fromUserId,
          toUserId: cardTrades.toUserId,
        })
        .from(cardTrades)
        .where(eq(cardTrades.status, 'accepted'))
        .orderBy(desc(cardTrades.respondedAt))
        .limit(15)
    } catch {
      tradeRows = []
    }

    // 카드 메타 일괄 조회 (드랍 + 교환 카드)
    const allCardIds = Array.from(
      new Set([
        ...drops.map((d) => d.cardId),
        ...tradeRows.flatMap((t) => [t.offerCardId, t.requestCardId]),
      ])
    )
    const cardRows = allCardIds.length
      ? await db
          .select({ cardId: cards.cardId, name: cards.name, imageUrl: cards.imageUrl, rarity: cards.rarity })
          .from(cards)
          .where(inArray(cards.cardId, allCardIds))
      : []
    const cardMap = new Map(cardRows.map((c) => [c.cardId, c]))
    const cardName = (id: string) => cardMap.get(id)?.name || id

    // 교환 당사자 이름 조회
    const tradeUserIds = Array.from(new Set(tradeRows.flatMap((t) => [t.fromUserId, t.toUserId])))
    const tradeUsers = tradeUserIds.length
      ? await db
          .select({ id: wikiUsers.id, username: wikiUsers.username, displayName: wikiUsers.displayName })
          .from(wikiUsers)
          .where(inArray(wikiUsers.id, tradeUserIds))
      : []
    const tradeUserMap = new Map(tradeUsers.map((u) => [u.id, u.displayName || u.username]))

    const items: FeedItem[] = []

    for (const e of edits) {
      if (!e.title) continue
      items.push({
        id: `edit-${e.slug}-${e.revisionNumber}`,
        type: 'wiki_edit',
        ts: new Date(e.timestampAt).toISOString(),
        actor: e.author || '익명',
        title: e.title,
        slug: e.slug || e.title,
        editType: e.editType || 'edit',
        sizeChange: e.sizeChange ?? 0,
      })
    }

    for (const d of drops) {
      const card = cardMap.get(d.cardId)
      const memberId = resolveMemberIdForUser({
        username: d.username,
        displayName: d.displayName,
        email: d.email,
        discordUsername: d.discordUsername,
        discordId: d.discordId,
      } as any)
      items.push({
        id: `drop-${d.id}`,
        type: 'card_drop',
        ts: new Date(d.droppedAt).toISOString(),
        actor: d.displayName || d.username || '멤버',
        memberId: memberId || null,
        cardName: card?.name || d.cardId,
        cardImage: card?.imageUrl && card.imageUrl.trim() ? card.imageUrl : FALLBACK_IMAGE,
        rarity: card?.rarity || 'basic',
      })
    }

    for (const t of tradeRows) {
      items.push({
        id: `trade-${t.id}`,
        type: 'card_trade',
        ts: new Date(t.respondedAt || t.createdAt).toISOString(),
        from: tradeUserMap.get(t.fromUserId) || '멤버',
        to: tradeUserMap.get(t.toUserId) || '멤버',
        offerCardName: cardName(t.offerCardId),
        requestCardName: cardName(t.requestCardId),
      })
    }

    items.sort((a, b) => new Date(b.ts).getTime() - new Date(a.ts).getTime())

    return NextResponse.json({ success: true, items: items.slice(0, 40) })
  } catch (error) {
    console.error('활동 피드 오류:', error)
    // [DEV-MOCK] DB 없는 로컬 개발 환경 전용 폴백 — 피드 렌더 경로 프리뷰 검증용.
    if (process.env.NODE_ENV !== 'production') {
      const now = Date.now()
      const mock: FeedItem[] = [
        { id: 'm1', type: 'wiki_edit', ts: new Date(now - 5 * 60000).toISOString(), actor: '정재원', title: '정재원', slug: '정재원', editType: 'edit', sizeChange: 320 },
        { id: 'm2', type: 'card_drop', ts: new Date(now - 42 * 60000).toISOString(), actor: '강한울', memberId: 'hanul', cardName: '강한울 2021 H1', cardImage: FALLBACK_IMAGE, rarity: 'rare' },
        { id: 'm3', type: 'card_trade', ts: new Date(now - 3 * 3600000).toISOString(), from: '정민석', to: '이승찬', offerCardName: '정민석 2020 H1', requestCardName: '이승찬 2021 H2' },
        { id: 'm4', type: 'wiki_edit', ts: new Date(now - 26 * 3600000).toISOString(), actor: '강한울', title: '강한울/플레이 스타일', slug: '강한울/플레이 스타일', editType: 'create', sizeChange: 1840 },
      ]
      return NextResponse.json({ success: true, items: mock, mock: true })
    }
    return NextResponse.json({ success: false, error: '활동 피드를 불러오지 못했습니다.' }, { status: 500 })
  }
}
