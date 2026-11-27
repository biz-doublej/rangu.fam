import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { checkIn } from './checkin'
import { InsufficientPointsError, awardPoints, spendPoints } from './points'
import { TEST_DATABASE_URL, openTestDb, type TestDb } from './testDb'

const NOW = new Date('2026-11-27T03:00:00Z') // KST 2026-11-27 12:00

async function ledgerOf(t: TestDb, userId: string) {
  const { rows } = await t.pool.query(
    'SELECT amount, reason, idempotency_key, counts_to_daily_cap, kst_day::text FROM gc_point_ledger WHERE user_id = $1 ORDER BY id',
    [userId]
  )
  return rows
}

async function walletOf(t: TestDb, userId: string) {
  const { rows } = await t.pool.query('SELECT * FROM gc_wallets WHERE user_id = $1', [userId])
  return rows[0]
}

/** 지갑 잔액 = 원장 합계 */
async function expectConsistent(t: TestDb, userId: string) {
  const { rows } = await t.pool.query(
    'SELECT coalesce(sum(amount), 0)::int AS total FROM gc_point_ledger WHERE user_id = $1',
    [userId]
  )
  expect((await walletOf(t, userId))?.balance ?? 0).toBe(rows[0].total)
}

describe.skipIf(!TEST_DATABASE_URL)('points (Postgres)', () => {
  let t: TestDb
  beforeAll(async () => {
    t = await openTestDb()
  })
  afterAll(async () => {
    await t?.close()
  })

  it('지급하면 원장 한 줄과 지갑 잔액이 함께 바뀐다', async () => {
    const user = await t.createUser()
    const result = await awardPoints(
      { userId: user, amount: 30, reason: 'climb.zone', game: 'climb', idempotencyKey: `t1:${user}`, now: NOW },
      t.db
    )
    expect(result).toEqual({ status: 'applied', amount: 30, clipped: 0, balance: 30 })
    expect(await ledgerOf(t, user)).toEqual([
      { amount: 30, reason: 'climb.zone', idempotency_key: `t1:${user}`, counts_to_daily_cap: true, kst_day: '2026-11-27' },
    ])
    expect(await walletOf(t, user)).toMatchObject({ balance: 30, lifetime_earned: 30 })
  })

  it('같은 키로 두 번 지급하면 두 번째는 무시된다', async () => {
    const user = await t.createUser()
    const input = { userId: user, amount: 20, reason: 'omok.win', idempotencyKey: `dup:${user}`, now: NOW }
    expect((await awardPoints(input, t.db)).status).toBe('applied')
    expect(await awardPoints(input, t.db)).toEqual({ status: 'duplicate', amount: 0, clipped: 0, balance: 20 })
    expect(await ledgerOf(t, user)).toHaveLength(1)
    await expectConsistent(t, user)
  })

  it('같은 키가 동시에 와도 한 번만 지급된다', async () => {
    const user = await t.createUser()
    const input = { userId: user, amount: 20, reason: 'omok.win', idempotencyKey: `race:${user}`, now: NOW }
    const results = await Promise.all(Array.from({ length: 8 }, () => awardPoints(input, t.db)))
    expect(results.filter((r) => r.status === 'applied')).toHaveLength(1)
    expect((await walletOf(t, user)).balance).toBe(20)
  })

  it('하루 상한 300P 를 넘는 부분은 잘라서 기록한다', async () => {
    const user = await t.createUser()
    await awardPoints({ userId: user, amount: 280, reason: 'a', idempotencyKey: `cap1:${user}`, now: NOW }, t.db)
    const clipped = await awardPoints({ userId: user, amount: 50, reason: 'b', idempotencyKey: `cap2:${user}`, now: NOW }, t.db)
    expect(clipped).toEqual({ status: 'applied', amount: 20, clipped: 30, balance: 300 })

    // 상한을 다 채운 뒤에는 0P 줄이 남고(키 소모), 잔액은 그대로
    const zero = await awardPoints({ userId: user, amount: 5, reason: 'c', idempotencyKey: `cap3:${user}`, now: NOW }, t.db)
    expect(zero).toEqual({ status: 'applied', amount: 0, clipped: 5, balance: 300 })
    expect((await ledgerOf(t, user)).map((row) => row.amount)).toEqual([280, 20, 0])
    await expectConsistent(t, user)
  })

  it('상한은 KST 날짜가 바뀌면 다시 열리고, 상한 밖 보상은 영향을 주지 않는다', async () => {
    const user = await t.createUser()
    await awardPoints({ userId: user, amount: 300, reason: 'a', idempotencyKey: `d1:${user}`, now: NOW }, t.db)
    // 상한 밖(출석·랭킹) 보상은 상한이 찼어도 전액
    const rank = await awardPoints(
      { userId: user, amount: 200, reason: 'weekly.rank', idempotencyKey: `d2:${user}`, countsToDailyCap: false, now: NOW },
      t.db
    )
    expect(rank.amount).toBe(200)
    // KST 자정 직전은 아직 같은 날 → 0P
    const sameDay = await awardPoints(
      { userId: user, amount: 10, reason: 'a', idempotencyKey: `d3:${user}`, now: new Date('2026-11-27T14:59:00Z') },
      t.db
    )
    expect(sameDay.amount).toBe(0)
    // KST 다음 날 → 다시 지급
    const nextDay = await awardPoints(
      { userId: user, amount: 10, reason: 'a', idempotencyKey: `d4:${user}`, now: new Date('2026-11-27T15:00:00Z') },
      t.db
    )
    expect(nextDay.amount).toBe(10)
  })

  it('동시에 여러 보상이 와도 하루 상한을 넘지 않는다', async () => {
    const user = await t.createUser()
    await Promise.all(
      Array.from({ length: 10 }, (_, i) =>
        awardPoints({ userId: user, amount: 50, reason: 'a', idempotencyKey: `many:${user}:${i}`, now: NOW }, t.db)
      )
    )
    expect((await walletOf(t, user)).balance).toBe(300)
    await expectConsistent(t, user)
  })

  it('잔액이 부족하면 차감을 거절하고 아무것도 기록하지 않는다', async () => {
    const user = await t.createUser()
    await awardPoints({ userId: user, amount: 10, reason: 'a', idempotencyKey: `s1:${user}`, now: NOW }, t.db)
    await expect(
      spendPoints({ userId: user, amount: 50, reason: 'shop.purchase', idempotencyKey: `s2:${user}`, now: NOW }, t.db)
    ).rejects.toBeInstanceOf(InsufficientPointsError)
    expect(await ledgerOf(t, user)).toHaveLength(1)
    expect((await walletOf(t, user)).balance).toBe(10)
  })

  it('차감은 음수 한 줄로 기록되고 상한 계산에 들어가지 않는다', async () => {
    const user = await t.createUser()
    await awardPoints({ userId: user, amount: 100, reason: 'a', idempotencyKey: `sp1:${user}`, now: NOW }, t.db)
    const spent = await spendPoints({ userId: user, amount: 40, reason: 'claw.play', idempotencyKey: `sp2:${user}`, now: NOW }, t.db)
    expect(spent).toEqual({ status: 'applied', amount: -40, clipped: 0, balance: 60 })
    const again = await spendPoints({ userId: user, amount: 40, reason: 'claw.play', idempotencyKey: `sp2:${user}`, now: NOW }, t.db)
    expect(again.status).toBe('duplicate')
    expect(await walletOf(t, user)).toMatchObject({ balance: 60, lifetime_earned: 100 })
    await expectConsistent(t, user)
  })

  it('동시에 차감해도 잔액이 음수가 되지 않는다', async () => {
    const user = await t.createUser()
    await awardPoints({ userId: user, amount: 100, reason: 'a', idempotencyKey: `c1:${user}`, now: NOW }, t.db)
    const results = await Promise.allSettled(
      Array.from({ length: 6 }, (_, i) =>
        spendPoints({ userId: user, amount: 40, reason: 'claw.play', idempotencyKey: `c2:${user}:${i}`, now: NOW }, t.db)
      )
    )
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(2)
    expect((await walletOf(t, user)).balance).toBe(20)
    await expectConsistent(t, user)
  })

  it('0 이하·소수 금액은 거절한다', async () => {
    const user = await t.createUser()
    for (const amount of [0, -5, 1.5, Number.NaN]) {
      await expect(awardPoints({ userId: user, amount, reason: 'a', idempotencyKey: `bad:${user}:${amount}` }, t.db)).rejects.toThrow()
    }
  })

  describe('출석', () => {
    it('하루 첫 접속 +10P, 같은 날 다시 누르면 지급 없음', async () => {
      const user = await t.createUser()
      const first = await checkIn(user, NOW, t.db)
      expect(first).toEqual({ alreadyCheckedIn: false, awarded: 10, streakBonus: false, streakDays: 1, balance: 10 })
      const second = await checkIn(user, new Date('2026-11-27T10:00:00Z'), t.db)
      expect(second).toMatchObject({ alreadyCheckedIn: true, awarded: 0, balance: 10 })
      expect(await ledgerOf(t, user)).toHaveLength(1)
    })

    it('동시에 눌러도 한 번만 지급된다', async () => {
      const user = await t.createUser()
      const results = await Promise.all(Array.from({ length: 5 }, () => checkIn(user, NOW, t.db)))
      expect(results.filter((r) => !r.alreadyCheckedIn)).toHaveLength(1)
      expect((await walletOf(t, user)).balance).toBe(10)
    })

    it('7일 연속이면 +70P 를 더 주고, 하루 거르면 1일부터 다시 센다', async () => {
      const user = await t.createUser()
      let last
      for (let i = 0; i < 7; i++) {
        last = await checkIn(user, new Date(NOW.getTime() + i * 86_400_000), t.db)
      }
      expect(last).toMatchObject({ awarded: 80, streakBonus: true, streakDays: 7, balance: 140 })

      const eighth = await checkIn(user, new Date(NOW.getTime() + 7 * 86_400_000), t.db)
      expect(eighth).toMatchObject({ awarded: 10, streakBonus: false, streakDays: 8 })

      // 하루 건너뜀
      const afterGap = await checkIn(user, new Date(NOW.getTime() + 9 * 86_400_000), t.db)
      expect(afterGap).toMatchObject({ awarded: 10, streakDays: 1 })
      await expectConsistent(t, user)
    })

    it('출석 보상은 하루 상한 밖이다', async () => {
      const user = await t.createUser()
      await awardPoints({ userId: user, amount: 300, reason: 'a', idempotencyKey: `ci:${user}`, now: NOW }, t.db)
      expect((await checkIn(user, NOW, t.db)).awarded).toBe(10)
    })
  })
})
