import { NextRequest, NextResponse } from 'next/server'
import { desc, eq } from 'drizzle-orm'
import { getDb } from '@/db/client'
import { gcPointLedger, gcWallets } from '@/db/schema/gamecenter'
import { gamecenterErrorResponse, requireGamecenterUser } from '@/lib/gamecenter/auth'
import { addDays, kstDay } from '@/lib/gamecenter/kst'
import { earnedTowardCap } from '@/lib/gamecenter/points'
import { DAILY_GAME_CAP } from '@/lib/gamecenter/rewards'
import { grantOf, listInventory, listShopItems } from '@/lib/gamecenter/shop'

export const dynamic = 'force-dynamic'

/** 상점 상품에 없는 보유품 이름 */
const STATIC_ITEM_LABELS: Record<string, string> = {
  'claw-ticket': '인형뽑기 무료권',
}

/**
 * GET /api/gamecenter/me — 지갑, 오늘 남은 상한, 보유품.
 * ?history=1 이면 최근 포인트 내역 50줄도 함께 준다. 읽기 전용(지갑 행을 만들지 않는다).
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await requireGamecenterUser(request)
    if (!auth.ok) return auth.response
    const { user } = auth

    const db = getDb()
    const today = kstDay()
    const [wallet] = await db.select().from(gcWallets).where(eq(gcWallets.userId, user.id)).limit(1)
    const earned = await earnedTowardCap(db, user.id, today)

    const labels: Record<string, string> = {}
    for (const item of await listShopItems(db, { includeInactive: true })) {
      const grant = grantOf(item)
      if (grant && !labels[grant.itemKey]) labels[grant.itemKey] = item.name
    }
    Object.assign(labels, STATIC_ITEM_LABELS)
    const inventory = (await listInventory(user.id, db))
      .filter((row) => row.quantity > 0)
      .map((row) => ({ ...row, label: labels[row.itemKey] || row.itemKey }))

    const history =
      new URL(request.url).searchParams.get('history') === '1'
        ? await db
            .select({
              id: gcPointLedger.id,
              amount: gcPointLedger.amount,
              reason: gcPointLedger.reason,
              game: gcPointLedger.game,
              createdAt: gcPointLedger.createdAt,
            })
            .from(gcPointLedger)
            .where(eq(gcPointLedger.userId, user.id))
            .orderBy(desc(gcPointLedger.id))
            .limit(50)
        : undefined

    return NextResponse.json({
      success: true,
      user: { id: user.id, username: user.username, displayName: user.displayName || user.username, isAdmin: user.role === 'admin' },
      wallet: {
        balance: wallet?.balance ?? 0,
        lifetimeEarned: wallet?.lifetimeEarned ?? 0,
        // 어제까지 이어 온 연속 출석은 오늘 출석 전에도 보여 주고, 하루를 거르면 0
        streakDays: wallet && (wallet.lastCheckIn === today || wallet.lastCheckIn === addDays(today, -1)) ? wallet.streakDays : 0,
        lastCheckIn: wallet?.lastCheckIn ?? null,
        checkedInToday: wallet?.lastCheckIn === today,
      },
      daily: { day: today, cap: DAILY_GAME_CAP, earned, remaining: Math.max(0, DAILY_GAME_CAP - earned) },
      inventory,
      history,
    })
  } catch (error) {
    return gamecenterErrorResponse(error, '내 정보 조회')
  }
}
