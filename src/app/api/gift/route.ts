import { NextRequest, NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { getDb } from '@/db/client'
import { userPerks } from '@/db/schema/cards'
import { buildClientUser, getAuthenticatedWikiUser } from '@/lib/doublejAuth'
import { GIFT_BOX_COUNT, kstDateString, rollGiftReward } from '@/lib/giftbox'

export const dynamic = 'force-dynamic'

async function authUserId(request: NextRequest): Promise<string | null> {
  const wikiUser = await getAuthenticatedWikiUser(request)
  if (!wikiUser) return null
  return buildClientUser(wikiUser as any).id
}

/**
 * GET /api/gift  (로그인 필요)
 * 오늘의 선물상자 상태 — 개수, 이미 연 index, 현재 보유 혜택.
 * 위치는 클라이언트가 (userId+date) 로 결정적으로 계산한다.
 */
export async function GET(request: NextRequest) {
  try {
    const userId = await authUserId(request)
    if (!userId) {
      return NextResponse.json({ success: false, enabled: false }, { status: 401 })
    }

    const today = kstDateString(new Date())
    const db = getDb()

    let openedIndexes: number[] = []
    let bonusDrops = 0
    let craftProtections = 0
    try {
      const [row] = await db
        .select()
        .from(userPerks)
        .where(eq(userPerks.userId, userId))
        .limit(1)
      if (row) {
        bonusDrops = row.bonusDrops
        craftProtections = row.craftProtections
        openedIndexes = row.giftDate === today ? (row.giftOpened as number[]) : []
      }
    } catch {
      // user_perks 테이블 아직 없음 → 기능 비활성(클라이언트는 박스 안 띄움)
      return NextResponse.json({ success: true, enabled: false })
    }

    return NextResponse.json({
      success: true,
      enabled: true,
      date: today,
      count: GIFT_BOX_COUNT,
      openedIndexes,
      perks: { bonusDrops, craftProtections },
    })
  } catch (error) {
    console.error('gift GET error:', error)
    return NextResponse.json({ success: false, enabled: false }, { status: 500 })
  }
}

/**
 * POST /api/gift  (로그인 필요)  body: { index }
 * 상자 1개 개봉 — 서버에서 가중 추첨 → 보상 지급 + 중복 방지.
 */
export async function POST(request: NextRequest) {
  try {
    const userId = await authUserId(request)
    if (!userId) {
      return NextResponse.json(
        { success: false, message: '로그인 후 이용할 수 있습니다.' },
        { status: 401 }
      )
    }

    const body = await request.json().catch(() => ({}))
    const index = Number(body?.index)
    if (!Number.isInteger(index) || index < 0 || index >= GIFT_BOX_COUNT) {
      return NextResponse.json({ success: false, message: '잘못된 상자입니다.' }, { status: 400 })
    }

    const today = kstDateString(new Date())
    const now = new Date()
    const db = getDb()

    // 혜택 row 확보 (없으면 생성). 테이블 자체가 없으면 503.
    let row
    try {
      ;[row] = await db.select().from(userPerks).where(eq(userPerks.userId, userId)).limit(1)
      if (!row) {
        await db
          .insert(userPerks)
          .values({ userId, giftDate: today, giftOpened: [] })
          .onConflictDoNothing()
        ;[row] = await db.select().from(userPerks).where(eq(userPerks.userId, userId)).limit(1)
      }
    } catch {
      return NextResponse.json(
        { success: false, message: '선물상자 기능이 아직 준비 중입니다.' },
        { status: 503 }
      )
    }
    if (!row) {
      return NextResponse.json({ success: false, message: '상태를 불러오지 못했습니다.' }, { status: 500 })
    }

    // 날짜가 바뀌었으면 그날 개봉 기록 리셋
    const sameDay = row.giftDate === today
    const opened = sameDay ? [...(row.giftOpened as number[])] : []

    if (opened.includes(index)) {
      return NextResponse.json({ success: false, already: true, message: '이미 연 상자예요.' })
    }

    // 서버 추첨
    const reward = rollGiftReward()
    opened.push(index)

    let bonusDrops = row.bonusDrops
    let craftProtections = row.craftProtections
    if (reward.kind === 'drops') bonusDrops += reward.amount
    else if (reward.kind === 'protect') craftProtections += reward.amount

    await db
      .update(userPerks)
      .set({
        giftDate: today,
        giftOpened: opened,
        bonusDrops,
        craftProtections,
        updatedAt: now,
      })
      .where(eq(userPerks.userId, userId))

    return NextResponse.json({
      success: true,
      reward: { key: reward.key, label: reward.label, kind: reward.kind, amount: reward.amount, flavor: reward.flavor },
      perks: { bonusDrops, craftProtections },
    })
  } catch (error) {
    console.error('gift POST error:', error)
    return NextResponse.json(
      { success: false, message: '상자를 여는 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
