import { and, eq, inArray, sql } from 'drizzle-orm'
import {
  tacticsWallets,
  tacticsOwnedItems,
  tacticsQuestProgress,
  tacticsPassProgress,
} from '@/db/schema/tacticsEconomy'
import {
  MATCH_REWARD,
  PASS_SEASON,
  PASS_TIERS,
  PASS_MAX_XP,
  QUEST_DEFS,
  STORE_ITEMS,
  dailyKey,
  weeklyKey,
  passLevelForXp,
  periodKeyFor,
  type Currency,
} from './economyRules'

// drizzle 트랜잭션/DB 핸들 (둘 다 동일 쿼리 API) — 느슨한 타입으로 받는다.
type Db = any

export interface WalletView {
  coins: number
  gems: number
}

// ── 통화/아이템 지급 헬퍼(트랜잭션 내) ──────────────────────────
export async function addCurrency(tx: Db, userId: string, currency: Currency, amount: number): Promise<void> {
  if (amount <= 0) return
  const col = currency === 'gem' ? tacticsWallets.gems : tacticsWallets.coins
  const set =
    currency === 'gem'
      ? { gems: sql`${tacticsWallets.gems} + ${amount}`, updatedAt: new Date() }
      : { coins: sql`${tacticsWallets.coins} + ${amount}`, updatedAt: new Date() }
  await tx
    .insert(tacticsWallets)
    .values({ userId, coins: currency === 'coin' ? amount : 0, gems: currency === 'gem' ? amount : 0 })
    .onConflictDoUpdate({ target: tacticsWallets.userId, set })
  void col
}

export async function grantItem(tx: Db, userId: string, itemId: string): Promise<void> {
  await tx
    .insert(tacticsOwnedItems)
    .values({ userId, itemId })
    .onConflictDoNothing({ target: [tacticsOwnedItems.userId, tacticsOwnedItems.itemId] })
}

/**
 * 매치 1회의 서버권위 경제 지급 — match-result 트랜잭션 안에서 승자/패자 각각 호출.
 * 멱등성은 match-result 의 match_id 선점이 보장(중복 매치면 이 함수 자체가 호출 안 됨).
 *  · 코인: 승 +winCoins / 패 +lossCoins
 *  · 패스 XP: 승 +winXp / 패 +lossXp
 *  · 퀘스트: play(양쪽 +1) · win(승자 +1) · streak(승자 = max(현재, 새 연승))
 */
export async function grantMatchEconomy(
  tx: Db,
  userId: string,
  didWin: boolean,
  newWinStreak: number,
  now: Date,
): Promise<void> {
  // 코인
  await addCurrency(tx, userId, 'coin', didWin ? MATCH_REWARD.winCoins : MATCH_REWARD.lossCoins)

  // 패스 XP
  const xpDelta = didWin ? MATCH_REWARD.winXp : MATCH_REWARD.lossXp
  await tx
    .insert(tacticsPassProgress)
    .values({ userId, season: PASS_SEASON, xp: xpDelta })
    .onConflictDoUpdate({
      target: [tacticsPassProgress.userId, tacticsPassProgress.season],
      set: { xp: sql`${tacticsPassProgress.xp} + ${xpDelta}`, updatedAt: new Date() },
    })

  // 퀘스트
  for (const def of QUEST_DEFS) {
    let initial: number
    let setExpr
    if (def.type === 'play' || (def.type === 'win' && didWin)) {
      initial = 1
      setExpr = sql`LEAST(${def.target}, ${tacticsQuestProgress.progress} + 1)`
    } else if (def.type === 'streak' && didWin) {
      initial = Math.min(def.target, newWinStreak)
      setExpr = sql`LEAST(${def.target}, GREATEST(${tacticsQuestProgress.progress}, ${newWinStreak}))`
    } else {
      continue // 패자의 win/streak 퀘스트 → 변화 없음
    }
    const periodKey = periodKeyFor(def.period, now)
    await tx
      .insert(tacticsQuestProgress)
      .values({ userId, questId: def.id, periodKey, progress: initial })
      .onConflictDoUpdate({
        target: [tacticsQuestProgress.userId, tacticsQuestProgress.questId, tacticsQuestProgress.periodKey],
        set: { progress: setExpr, updatedAt: new Date() },
      })
  }
}

// ── 조회(유저 인증 라우트) ───────────────────────────────────────
export async function getWallet(db: Db, userId: string): Promise<WalletView> {
  const [row] = await db.select().from(tacticsWallets).where(eq(tacticsWallets.userId, userId)).limit(1)
  return { coins: row?.coins ?? 0, gems: row?.gems ?? 0 }
}

export interface EconomySnapshot {
  wallet: WalletView
  store: { items: typeof STORE_ITEMS; owned: string[] }
  quests: Array<{
    id: string
    title: string
    type: string
    target: number
    period: string
    reward: { currency: Currency; amount: number }
    progress: number
    claimed: boolean
  }>
  pass: {
    season: string
    xp: number
    level: number
    maxXp: number
    claimedTiers: number[]
    tiers: typeof PASS_TIERS
  }
}

/** 클라 1회 하이드레이션 — 지갑 + 상점(카탈로그+보유) + 퀘스트(현재기간 진행) + 패스. */
export async function loadEconomySnapshot(db: Db, userId: string, now: Date): Promise<EconomySnapshot> {
  const wallet = await getWallet(db, userId)

  const ownedRows = await db
    .select({ itemId: tacticsOwnedItems.itemId })
    .from(tacticsOwnedItems)
    .where(eq(tacticsOwnedItems.userId, userId))
  const owned = ownedRows.map((r: { itemId: string }) => r.itemId)

  const dKey = dailyKey(now)
  const wKey = weeklyKey(now)
  const qrows = await db
    .select()
    .from(tacticsQuestProgress)
    .where(and(eq(tacticsQuestProgress.userId, userId), inArray(tacticsQuestProgress.periodKey, [dKey, wKey])))
  const quests = QUEST_DEFS.map((def) => {
    const pk = def.period === 'daily' ? dKey : wKey
    const row = qrows.find((r: { questId: string; periodKey: string }) => r.questId === def.id && r.periodKey === pk)
    return {
      id: def.id,
      title: def.title,
      type: def.type,
      target: def.target,
      period: def.period,
      reward: def.reward,
      progress: row?.progress ?? 0,
      claimed: row?.claimed ?? false,
    }
  })

  const [passRow] = await db
    .select()
    .from(tacticsPassProgress)
    .where(and(eq(tacticsPassProgress.userId, userId), eq(tacticsPassProgress.season, PASS_SEASON)))
    .limit(1)
  const xp = passRow?.xp ?? 0
  const claimedTiers: number[] = passRow?.claimedTiers ?? []

  return {
    wallet,
    store: { items: STORE_ITEMS, owned },
    quests,
    pass: { season: PASS_SEASON, xp, level: passLevelForXp(xp), maxXp: PASS_MAX_XP, claimedTiers, tiers: PASS_TIERS },
  }
}
