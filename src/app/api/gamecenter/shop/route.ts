import { NextRequest, NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { getDb } from '@/db/client'
import { gcWallets } from '@/db/schema/gamecenter'
import { gamecenterErrorResponse, requireGamecenterUser } from '@/lib/gamecenter/auth'
import { listShopItems, purchasedOutItemIds } from '@/lib/gamecenter/shop'

export const dynamic = 'force-dynamic'

/** GET /api/gamecenter/shop — 판매 중인 상품 목록과 내 잔액 */
export async function GET(request: NextRequest) {
  try {
    const auth = await requireGamecenterUser(request)
    if (!auth.ok) return auth.response

    const db = getDb()
    const items = await listShopItems(db)
    const limitReached = new Set(await purchasedOutItemIds(auth.user.id, items, new Date(), db))
    const [wallet] = await db.select().from(gcWallets).where(eq(gcWallets.userId, auth.user.id)).limit(1)

    return NextResponse.json({
      success: true,
      balance: wallet?.balance ?? 0,
      items: items.map((item) => ({
        id: item.id,
        name: item.name,
        description: item.description,
        kind: item.kind,
        price: item.price,
        stock: item.stock,
        limitPerPeriod: item.limitPerPeriod,
        limitPeriod: item.limitPeriod,
        limitReached: limitReached.has(item.id),
      })),
    })
  } catch (error) {
    return gamecenterErrorResponse(error, '상점 조회')
  }
}
