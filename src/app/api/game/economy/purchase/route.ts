import { NextRequest, NextResponse } from 'next/server'
import { and, eq, sql } from 'drizzle-orm'
import { getAuthenticatedWikiUser } from '@/lib/doublejAuth'
import { getDb } from '@/db/client'
import { tacticsWallets, tacticsOwnedItems } from '@/db/schema/tacticsEconomy'
import { findStoreItem } from '@/lib/tactics/economyRules'

export const dynamic = 'force-dynamic'

/**
 * 상점 구매 — 통화 차감(원자적 조건부 update) + 보유 지급. [경제 E1]
 * 서버 검증: 아이템 존재 / 미보유 / 잔액. 쿠키 인증.
 *   POST { itemId } → { success, wallet, itemId }
 */
export async function POST(request: NextRequest) {
  const user = await getAuthenticatedWikiUser(request)
  if (!user) return NextResponse.json({ success: false, error: 'not_authenticated' }, { status: 401 })
  const userId = (user as { id: string }).id

  const body = (await request.json().catch(() => null)) as { itemId?: unknown } | null
  const itemId = typeof body?.itemId === 'string' ? body.itemId : ''
  const item = findStoreItem(itemId)
  if (!item) return NextResponse.json({ success: false, error: 'item_not_found' }, { status: 404 })

  const db = getDb()
  try {
    const result = await db.transaction(async (tx) => {
      const [owned] = await tx
        .select({ id: tacticsOwnedItems.id })
        .from(tacticsOwnedItems)
        .where(and(eq(tacticsOwnedItems.userId, userId), eq(tacticsOwnedItems.itemId, itemId)))
        .limit(1)
      if (owned) return { error: 'already_owned' as const }

      // 지갑 행 보장(없으면 0/0)
      await tx.insert(tacticsWallets).values({ userId }).onConflictDoNothing({ target: tacticsWallets.userId })

      // 원자적 차감 — 잔액 부족이면 WHERE 불충족 → 0행 반환.
      const balCol = item.currency === 'gem' ? tacticsWallets.gems : tacticsWallets.coins
      const dec =
        item.currency === 'gem'
          ? { gems: sql`${tacticsWallets.gems} - ${item.price}`, updatedAt: new Date() }
          : { coins: sql`${tacticsWallets.coins} - ${item.price}`, updatedAt: new Date() }
      const updated = await tx
        .update(tacticsWallets)
        .set(dec)
        .where(and(eq(tacticsWallets.userId, userId), sql`${balCol} >= ${item.price}`))
        .returning({ coins: tacticsWallets.coins, gems: tacticsWallets.gems })
      if (updated.length === 0) return { error: 'insufficient_funds' as const }

      await tx
        .insert(tacticsOwnedItems)
        .values({ userId, itemId })
        .onConflictDoNothing({ target: [tacticsOwnedItems.userId, tacticsOwnedItems.itemId] })

      return { wallet: { coins: updated[0].coins, gems: updated[0].gems } }
    })

    if ('error' in result) {
      return NextResponse.json({ success: false, error: result.error }, { status: result.error === 'already_owned' ? 409 : 400 })
    }
    return NextResponse.json({ success: true, wallet: result.wallet, itemId })
  } catch (e) {
    console.error('economy purchase 오류:', e)
    return NextResponse.json({ success: false, error: 'server_error' }, { status: 500 })
  }
}
