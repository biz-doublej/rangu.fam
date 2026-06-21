import { NextRequest, NextResponse } from 'next/server'
import { and, eq } from 'drizzle-orm'
import { getDb } from '@/db/client'
import { cardTrades, userCards, userCardStats } from '@/db/schema/cards'
import { buildClientUser, getAuthenticatedWikiUser } from '@/lib/doublejAuth'

export const dynamic = 'force-dynamic'

// 사용자에게 보여줄 거부 사유 (트랜잭션 롤백 + 400)
class TradeError extends Error {}

function isMissingTableError(error: unknown): boolean {
  const msg = error instanceof Error ? error.message : String(error)
  return /card_trades.*does not exist|relation .*card_trades/i.test(msg)
}

type Tx = Parameters<Parameters<ReturnType<typeof getDb>['transaction']>[0]>[0]

// from → to 로 카드 qty 만큼 이동 (행 잠금으로 동시성 보호)
async function moveCard(
  tx: Tx,
  fromUserId: string,
  toUserId: string,
  cardId: string,
  qty: number,
  now: Date
) {
  const [fromRow] = await tx
    .select()
    .from(userCards)
    .where(and(eq(userCards.userId, fromUserId), eq(userCards.cardId, cardId)))
    .limit(1)
    .for('update')

  if (!fromRow || fromRow.quantity < qty) {
    throw new TradeError('상대방 또는 본인의 카드 보유 수량이 부족하여 교환이 취소되었습니다.')
  }
  if (fromRow.isLocked) {
    throw new TradeError('잠긴 카드가 포함되어 교환할 수 없습니다.')
  }

  if (fromRow.quantity === qty) {
    await tx.delete(userCards).where(eq(userCards.id, fromRow.id))
  } else {
    await tx
      .update(userCards)
      .set({ quantity: fromRow.quantity - qty, updatedAt: now })
      .where(eq(userCards.id, fromRow.id))
  }

  const [toRow] = await tx
    .select()
    .from(userCards)
    .where(and(eq(userCards.userId, toUserId), eq(userCards.cardId, cardId)))
    .limit(1)
    .for('update')

  if (toRow) {
    await tx
      .update(userCards)
      .set({ quantity: toRow.quantity + qty, acquiredAt: now, updatedAt: now })
      .where(eq(userCards.id, toRow.id))
  } else {
    await tx.insert(userCards).values({
      userId: toUserId,
      cardId,
      quantity: qty,
      acquiredBy: 'gift',
      acquiredAt: now,
    })
  }
}

// 교환 후 양측 집계 통계 재계산 (denormalized 카운트 정합성 유지)
async function recomputeStats(tx: Tx, userId: string, now: Date) {
  const rows = await tx
    .select({ quantity: userCards.quantity })
    .from(userCards)
    .where(eq(userCards.userId, userId))
  const total = rows.reduce((s, r) => s + (r.quantity || 0), 0)
  await tx
    .update(userCardStats)
    .set({ totalCardsOwned: total, uniqueCardsOwned: rows.length, updatedAt: now })
    .where(eq(userCardStats.userId, userId))
}

// ── POST: 교환 제안 응답 (accept | reject | cancel) ──────────
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const wikiUser = await getAuthenticatedWikiUser(request)
    if (!wikiUser) {
      return NextResponse.json(
        { success: false, message: '카드 교환은 로그인 후 이용할 수 있습니다.' },
        { status: 401 }
      )
    }
    const me = buildClientUser(wikiUser).id
    const tradeId = params.id

    const body = await request.json().catch(() => ({}))
    const action = body?.action
    if (action !== 'accept' && action !== 'reject' && action !== 'cancel') {
      return NextResponse.json(
        { success: false, message: '올바르지 않은 동작입니다.' },
        { status: 400 }
      )
    }

    const db = getDb()
    const [trade] = await db
      .select()
      .from(cardTrades)
      .where(eq(cardTrades.id, tradeId))
      .limit(1)

    if (!trade) {
      return NextResponse.json({ success: false, message: '교환 제안을 찾을 수 없습니다.' }, { status: 404 })
    }
    if (trade.status !== 'pending') {
      return NextResponse.json({ success: false, message: '이미 처리된 제안입니다.' }, { status: 409 })
    }

    // 권한: 수락/거절은 받는 사람만, 취소는 보낸 사람만
    if (action === 'cancel' && trade.fromUserId !== me) {
      return NextResponse.json({ success: false, message: '본인이 보낸 제안만 취소할 수 있습니다.' }, { status: 403 })
    }
    if ((action === 'accept' || action === 'reject') && trade.toUserId !== me) {
      return NextResponse.json({ success: false, message: '본인이 받은 제안만 처리할 수 있습니다.' }, { status: 403 })
    }

    const now = new Date()

    if (action !== 'accept') {
      const status = action === 'cancel' ? 'cancelled' : 'rejected'
      await db
        .update(cardTrades)
        .set({ status, respondedAt: now, updatedAt: now })
        .where(eq(cardTrades.id, tradeId))
      return NextResponse.json({
        success: true,
        status,
        message: action === 'cancel' ? '제안을 취소했습니다.' : '제안을 거절했습니다.',
      })
    }

    // 수락 — 트랜잭션 맞교환
    try {
      await db.transaction(async (tx) => {
        // 더블 수락 방지 — 잠금 후 상태 재확인
        const [fresh] = await tx
          .select()
          .from(cardTrades)
          .where(eq(cardTrades.id, tradeId))
          .limit(1)
          .for('update')
        if (!fresh || fresh.status !== 'pending') {
          throw new TradeError('이미 처리된 제안입니다.')
        }

        // 결정적 순서로 이동 (데드락 최소화): 제안자 offer → recipient, recipient request → 제안자
        await moveCard(tx, fresh.fromUserId, fresh.toUserId, fresh.offerCardId, fresh.offerQuantity, now)
        await moveCard(tx, fresh.toUserId, fresh.fromUserId, fresh.requestCardId, fresh.requestQuantity, now)

        await tx
          .update(cardTrades)
          .set({ status: 'accepted', respondedAt: now, updatedAt: now })
          .where(eq(cardTrades.id, tradeId))

        await recomputeStats(tx, fresh.fromUserId, now)
        await recomputeStats(tx, fresh.toUserId, now)
      })
    } catch (txError) {
      if (txError instanceof TradeError) {
        return NextResponse.json({ success: false, message: txError.message }, { status: 409 })
      }
      throw txError
    }

    return NextResponse.json({ success: true, status: 'accepted', message: '교환이 완료되었습니다!' })
  } catch (error) {
    if (isMissingTableError(error)) {
      return NextResponse.json(
        {
          success: false,
          needsMigration: true,
          message: '카드 교환 기능이 아직 활성화되지 않았습니다. 관리자에게 문의하세요.',
        },
        { status: 503 }
      )
    }
    console.error('카드 교환 응답 오류:', error)
    return NextResponse.json(
      { success: false, message: '교환 처리 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
