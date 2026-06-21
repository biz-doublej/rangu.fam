import { NextRequest, NextResponse } from 'next/server'
import { and, eq, gt, ne, sql } from 'drizzle-orm'
import { getDb } from '@/db/client'
import { cards, userCards, userCardStats } from '@/db/schema/cards'
import { wikiUsers } from '@/db/schema/wiki'
import { ensureImage } from '@/lib/cardHelpers'
import { buildClientUser, getAuthenticatedWikiUser } from '@/lib/doublejAuth'

export const dynamic = 'force-dynamic'

/**
 * 카드 강탈 — 도박. 한 판 걸어서:
 *   성공(STEAL_SUCCESS_RATE) → 상대의 랜덤 카드 1장을 뺏어온다.
 *   실패 → 내 랜덤 카드 1장을 상대에게 뺏긴다. (제로섬 베팅)
 *
 * 강탈 대상에서 제외: 프레스티지(완전 보호), 재료(조커).
 * 잠금 카드는 평소엔 안전하지만, 아주 낮은 확률(LOCK_BREAK_RATE)로 잠금이 풀리며 강탈된다.
 * 새 테이블 없이 기존 user_cards 만으로 동작 (리소스 가볍게).
 */
const STEAL_SUCCESS_RATE = 0.4 // 성공 40% — 실패 시 내 카드를 뺏긴다 (도박)
const LOCK_BREAK_RATE = 0.05 // 잠금 카드가 강탈 대상이 될 최소 확률 (5%)

class StealError extends Error {}
type Tx = Parameters<Parameters<ReturnType<typeof getDb>['transaction']>[0]>[0]

async function authUserId(request: NextRequest): Promise<string | null> {
  const wikiUser = await getAuthenticatedWikiUser(request)
  if (!wikiUser) return null
  return buildClientUser(wikiUser as any).id
}

interface PoolCard {
  cardId: string
  name: string
  imageUrl: string
  rarity: string
  type: string
  member: string | null
  year: number | null
  period: string | null
  isLocked: boolean
}

// 강탈 후보 카드: 보유(>0), 프레스티지/재료 제외. 잠금 카드도 포함(아래 pickVictim 에서 희박하게만 선택).
async function stealPool(db: ReturnType<typeof getDb>, userId: string): Promise<PoolCard[]> {
  const rows = await db
    .select({
      cardId: userCards.cardId,
      name: cards.name,
      imageUrl: cards.imageUrl,
      rarity: cards.rarity,
      type: cards.type,
      member: cards.member,
      year: cards.year,
      period: cards.period,
      isLocked: userCards.isLocked,
    })
    .from(userCards)
    .innerJoin(cards, eq(userCards.cardId, cards.cardId))
    .where(
      and(
        eq(userCards.userId, userId),
        gt(userCards.quantity, 0),
        ne(cards.type, 'prestige'),
        ne(cards.type, 'material')
      )
    )
  return rows.map((r) => ({ ...r, isLocked: Boolean(r.isLocked) }))
}

/**
 * 빼앗을 카드 1장 선택.
 * - 기본은 잠기지 않은 카드 중 랜덤.
 * - 최소 확률(LOCK_BREAK_RATE)로 잠금 카드가 대상이 되며, 이 경우 잠금이 풀려서 강탈된다.
 * - 줄 카드가 없으면 null (강탈 불발 = 잠금 보호 성공).
 */
function pickVictim(pool: PoolCard[]): { card: PoolCard; brokeLock: boolean } | null {
  const locked = pool.filter((c) => c.isLocked)
  const unlocked = pool.filter((c) => !c.isLocked)
  if (locked.length > 0 && Math.random() < LOCK_BREAK_RATE) {
    return { card: locked[Math.floor(Math.random() * locked.length)], brokeLock: true }
  }
  if (unlocked.length > 0) {
    return { card: unlocked[Math.floor(Math.random() * unlocked.length)], brokeLock: false }
  }
  return null
}

// from → to 로 카드 1장 이동 (행 잠금으로 동시성 보호).
// breakLock=true 면 잠긴 카드도 가져오고(잠금 해제), 받는 쪽엔 잠금 없이 들어간다.
async function moveOne(
  tx: Tx,
  fromId: string,
  toId: string,
  cardId: string,
  now: Date,
  breakLock: boolean
) {
  const [fromRow] = await tx
    .select()
    .from(userCards)
    .where(and(eq(userCards.userId, fromId), eq(userCards.cardId, cardId)))
    .limit(1)
    .for('update')
  if (!fromRow || fromRow.quantity <= 0) throw new StealError('GONE')
  if (fromRow.isLocked && !breakLock) throw new StealError('LOCKED')

  if (fromRow.quantity === 1) {
    await tx.delete(userCards).where(eq(userCards.id, fromRow.id))
  } else {
    await tx
      .update(userCards)
      .set({ quantity: fromRow.quantity - 1, updatedAt: now })
      .where(eq(userCards.id, fromRow.id))
  }

  const [toRow] = await tx
    .select()
    .from(userCards)
    .where(and(eq(userCards.userId, toId), eq(userCards.cardId, cardId)))
    .limit(1)
    .for('update')
  if (toRow) {
    await tx
      .update(userCards)
      .set({ quantity: toRow.quantity + 1, acquiredAt: now, updatedAt: now })
      .where(eq(userCards.id, toRow.id))
  } else {
    await tx
      .insert(userCards)
      .values({ userId: toId, cardId, quantity: 1, acquiredBy: 'steal', isLocked: false, acquiredAt: now })
  }
}

// 보유 집계 재계산 (stats row 없으면 noop)
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

// ── GET: 강탈 대상 목록 + 내 베팅 가능 여부 ──────────────────
export async function GET(request: NextRequest) {
  try {
    const me = await authUserId(request)
    if (!me) {
      return NextResponse.json({ success: false, message: '로그인 후 이용할 수 있습니다.' }, { status: 401 })
    }
    const db = getDb()

    const targets = await db
      .select({
        userId: userCards.userId,
        username: wikiUsers.username,
        displayName: wikiUsers.displayName,
        avatar: wikiUsers.avatar,
        count: sql<number>`count(*)::int`,
      })
      .from(userCards)
      .innerJoin(cards, eq(userCards.cardId, cards.cardId))
      .innerJoin(wikiUsers, eq(userCards.userId, wikiUsers.id))
      .where(
        and(
          ne(userCards.userId, me),
          gt(userCards.quantity, 0),
          ne(cards.type, 'prestige'),
          ne(cards.type, 'material')
        )
      )
      .groupBy(userCards.userId, wikiUsers.username, wikiUsers.displayName, wikiUsers.avatar)

    const myPool = await stealPool(db, me)

    return NextResponse.json({
      success: true,
      successRate: STEAL_SUCCESS_RATE,
      myStake: myPool.length,
      targets: targets
        .map((t) => ({
          userId: t.userId,
          name: t.displayName || t.username || '익명',
          avatar: t.avatar || null,
          count: t.count,
        }))
        .sort((a, b) => b.count - a.count),
    })
  } catch (error) {
    console.error('steal GET error:', error)
    return NextResponse.json({ success: false, message: '대상을 불러오지 못했습니다.' }, { status: 500 })
  }
}

// ── POST: 강탈 시도 (도박) ──────────────────────────────────
export async function POST(request: NextRequest) {
  try {
    const me = await authUserId(request)
    if (!me) {
      return NextResponse.json({ success: false, message: '로그인 후 이용할 수 있습니다.' }, { status: 401 })
    }

    const body = await request.json().catch(() => ({}))
    const targetUserId = typeof body?.targetUserId === 'string' ? body.targetUserId : ''
    if (!targetUserId || targetUserId === me) {
      return NextResponse.json({ success: false, message: '강탈 대상이 올바르지 않습니다.' }, { status: 400 })
    }

    const db = getDb()
    const myPool = await stealPool(db, me)
    if (myPool.length === 0) {
      return NextResponse.json({
        success: false,
        message: '베팅할 카드가 없어요. (프레스티지·재료 제외) 카드부터 모으고 오세요!',
      })
    }
    const targetPool = await stealPool(db, targetUserId)
    if (targetPool.length === 0) {
      return NextResponse.json({ success: false, message: '상대가 강탈할 카드가 없어요.' })
    }

    const now = new Date()
    const win = Math.random() < STEAL_SUCCESS_RATE
    const victimPool = win ? targetPool : myPool
    const pick = pickVictim(victimPool)
    const fromId = win ? targetUserId : me
    const toId = win ? me : targetUserId

    let outcome: 'win' | 'lose' | 'miss' = pick ? (win ? 'win' : 'lose') : 'miss'

    if (pick) {
      try {
        await db.transaction(async (tx) => {
          await moveOne(tx, fromId, toId, pick.card.cardId, now, pick.brokeLock)
          await recomputeStats(tx, me, now)
          await recomputeStats(tx, targetUserId, now)
        })
      } catch (txErr) {
        if (txErr instanceof StealError) outcome = 'miss'
        else throw txErr
      }
    }

    if (outcome === 'miss') {
      return NextResponse.json({ success: true, result: 'miss', message: '아무 일도 일어나지 않았어요. (운 좋게 무사)' })
    }

    const c = pick!.card
    const lockTag = pick!.brokeLock ? '🔓 잠금 해제! ' : ''
    const card = {
      cardId: c.cardId,
      name: c.name,
      imageUrl: ensureImage({ imageUrl: c.imageUrl }).imageUrl,
      rarity: c.rarity,
      type: c.type,
      member: c.member,
      year: c.year,
      period: c.period,
    }

    if (outcome === 'win') {
      return NextResponse.json({
        success: true,
        result: 'win',
        lockBroken: pick!.brokeLock,
        card,
        message: `${lockTag}강탈 성공! ${card.name} 획득 🎉`,
      })
    }
    return NextResponse.json({
      success: true,
      result: 'lose',
      lockBroken: pick!.brokeLock,
      card,
      message: `${lockTag}강탈 실패… ${card.name}을(를) 뺏겼어요 😭`,
    })
  } catch (error) {
    console.error('steal POST error:', error)
    return NextResponse.json({ success: false, message: '강탈 시도 중 오류가 발생했습니다.' }, { status: 500 })
  }
}
