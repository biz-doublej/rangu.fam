import { eq } from 'drizzle-orm'
import { getDb, type DB } from '@/db/client'
import { gcWallets } from '@/db/schema/gamecenter'
import { addDays, kstDay } from './kst'
import { awardPointsTx, lockWallet } from './points'
import { COMMON_REWARDS, REASONS, isStreakBonusDay } from './rewards'

export interface CheckInResult {
  /** 오늘 이미 출석했으면 true (아무것도 지급하지 않음) */
  alreadyCheckedIn: boolean
  /** 이번 요청으로 받은 포인트 */
  awarded: number
  /** 7일 연속 보너스를 받았는지 */
  streakBonus: boolean
  streakDays: number
  balance: number
}

/**
 * 하루 첫 접속 보상 + 연속 출석.
 * 날짜는 KST 기준이고, 어제 출석했으면 연속 일수를 잇고 아니면 1일부터 다시 센다.
 * 연속 7일째(14, 21 …)마다 추가 보상. 둘 다 하루 상한 밖이다.
 */
export async function checkIn(userId: string, now: Date = new Date(), db: DB = getDb()): Promise<CheckInResult> {
  return db.transaction(async (tx) => {
    const wallet = await lockWallet(tx, userId)
    const today = kstDay(now)

    if (wallet.lastCheckIn === today) {
      return {
        alreadyCheckedIn: true,
        awarded: 0,
        streakBonus: false,
        streakDays: wallet.streakDays,
        balance: wallet.balance,
      }
    }

    const streakDays = wallet.lastCheckIn === addDays(today, -1) ? wallet.streakDays + 1 : 1
    await tx
      .update(gcWallets)
      .set({ lastCheckIn: today, streakDays, updatedAt: now })
      .where(eq(gcWallets.userId, userId))

    const daily = await awardPointsTx(tx, {
      userId,
      amount: COMMON_REWARDS.dailyCheckIn,
      reason: REASONS.checkIn,
      idempotencyKey: `checkin:${userId}:${today}`,
      countsToDailyCap: false,
      now,
    })
    let awarded = daily.amount
    let balance = daily.balance

    const streakBonus = isStreakBonusDay(streakDays)
    if (streakBonus) {
      const bonus = await awardPointsTx(tx, {
        userId,
        amount: COMMON_REWARDS.streak7,
        reason: REASONS.streak7,
        idempotencyKey: `checkin.streak7:${userId}:${today}`,
        countsToDailyCap: false,
        now,
      })
      awarded += bonus.amount
      balance = bonus.balance
    }

    return { alreadyCheckedIn: false, awarded, streakBonus, streakDays, balance }
  })
}
