import { randomUUID } from 'crypto'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { drawClawOutcome, isClawWin, type ClawOutcome } from '@/games/claw/draw'
import { getClawState, settleClawPlay, startClawPlay } from './claw'
import { awardPoints } from './points'
import { TEST_DATABASE_URL, openTestDb, type TestDb } from './testDb'

const NOW = new Date('2026-11-27T03:00:00Z')

/** 원하는 결과가 나오는 시드를 찾는다 (추첨은 시드로 결정된다). */
function seedFor(misses: number, want: (outcome: ClawOutcome) => boolean): number {
  for (let seed = 1; seed < 200_000; seed++) if (want(drawClawOutcome(seed, misses))) return seed
  throw new Error('조건에 맞는 시드가 없습니다.')
}
const winSeed = (plush: string, misses = 0) => seedFor(misses, (o) => isClawWin(o) && o.plush === plush)
const loseSeed = (misses = 0) => seedFor(misses, (o) => !isClawWin(o))

describe.skipIf(!TEST_DATABASE_URL)('인형뽑기 (Postgres)', () => {
  let t: TestDb
  beforeAll(async () => {
    t = await openTestDb()
  })
  afterAll(async () => {
    await t?.close()
  })

  const fund = (userId: string, amount: number) =>
    awardPoints(
      { userId, amount, reason: 'test.fund', idempotencyKey: `fund:${randomUUID()}`, countsToDailyCap: false, now: NOW },
      t.db
    )
  const giveTickets = (userId: string, n: number) =>
    t.pool.query(`INSERT INTO gc_inventory (user_id, item_key, quantity) VALUES ($1, 'claw-ticket', $2)`, [userId, n])
  const balanceOf = async (userId: string) =>
    (await t.pool.query('SELECT balance FROM gc_wallets WHERE user_id = $1', [userId])).rows[0]?.balance ?? 0
  const ledgerSum = async (userId: string) =>
    (await t.pool.query('SELECT coalesce(sum(amount),0)::int AS s FROM gc_point_ledger WHERE user_id = $1', [userId])).rows[0].s
  const quantityOf = async (userId: string, itemKey: string) =>
    (await t.pool.query('SELECT quantity FROM gc_inventory WHERE user_id = $1 AND item_key = $2', [userId, itemKey])).rows[0]
      ?.quantity ?? 0
  const ledgerOf = async (userId: string) =>
    (
      await t.pool.query(
        `SELECT amount, reason FROM gc_point_ledger WHERE user_id = $1 AND reason <> 'test.fund' ORDER BY id`,
        [userId]
      )
    ).rows
  /** 한 판을 시작하고 바로 정산한다 */
  const playAndSettle = async (userId: string, seed: number) => {
    const play = await startClawPlay({ userId, now: NOW }, t.db, { seed })
    return { play, settled: await settleClawPlay({ userId, playId: play.playId, now: NOW }, t.db) }
  }

  it('포인트가 부족하면 거절하고 아무것도 남기지 않는다', async () => {
    const user = await t.createUser()
    await fund(user, 19)
    await expect(startClawPlay({ userId: user, now: NOW }, t.db)).rejects.toMatchObject({ code: 'insufficient_points' })
    expect(await balanceOf(user)).toBe(19)
    expect((await t.pool.query('SELECT count(*)::int AS n FROM gc_runs WHERE user_id = $1', [user])).rows[0].n).toBe(0)
    expect(await ledgerOf(user)).toEqual([])
  })

  it('한 판에 20P 를 차감하고 결과를 돌려준다', async () => {
    const user = await t.createUser()
    await fund(user, 50)
    const seed = loseSeed()
    const play = await startClawPlay({ userId: user, now: NOW }, t.db, { seed })
    expect(play).toMatchObject({ outcome: drawClawOutcome(seed, 0), paidWith: 'points', resumed: false, balance: 30 })
    expect(await ledgerOf(user)).toEqual([{ amount: -20, reason: 'claw.play' }])
  })

  it('무료권이 있으면 포인트 대신 무료권을 쓴다', async () => {
    const user = await t.createUser()
    await fund(user, 20)
    await giveTickets(user, 2)
    const first = await playAndSettle(user, loseSeed())
    expect(first.play).toMatchObject({ paidWith: 'ticket', tickets: 1, balance: 20 })
    const second = await playAndSettle(user, loseSeed(1))
    expect(second.play).toMatchObject({ paidWith: 'ticket', tickets: 0 })
    // 무료권이 떨어지면 포인트
    const third = await playAndSettle(user, loseSeed(2))
    expect(third.play).toMatchObject({ paidWith: 'points', balance: 0 })
    expect(await quantityOf(user, 'claw-ticket')).toBe(0)
    await expect(startClawPlay({ userId: user, now: NOW }, t.db)).rejects.toMatchObject({ code: 'insufficient_points' })
  })

  it('정산하지 않은 판이 있으면 다시 눌러도 같은 판을 돌려주고 또 차감하지 않는다 (새로고침)', async () => {
    const user = await t.createUser()
    await fund(user, 100)
    const first = await startClawPlay({ userId: user, now: NOW }, t.db)
    const again = await startClawPlay({ userId: user, now: NOW }, t.db)
    expect(again).toMatchObject({ playId: first.playId, outcome: first.outcome, resumed: true, balance: 80 })
    expect(await balanceOf(user)).toBe(80)
    // 화면을 다시 열면 그 판이 pending 으로 보인다
    expect((await getClawState(user, t.db)).pending).toEqual({ playId: first.playId, outcome: first.outcome })
  })

  it('동시에 여러 번 눌러도 한 판만 시작되고 한 번만 차감된다', async () => {
    const user = await t.createUser()
    await fund(user, 100)
    const plays = await Promise.all(Array.from({ length: 6 }, () => startClawPlay({ userId: user, now: NOW }, t.db)))
    expect(new Set(plays.map((play) => play.playId)).size).toBe(1)
    expect(plays.filter((play) => !play.resumed)).toHaveLength(1)
    expect(await balanceOf(user)).toBe(80)
  })

  it('성공하면 인형을 받고 도감 첫 등록 +50P, 같은 인형을 또 뽑으면 포인트는 없다', async () => {
    const user = await t.createUser()
    await fund(user, 100)
    const first = await playAndSettle(user, winSeed('hanul'))
    expect(first.settled).toEqual({
      alreadySettled: false,
      won: true,
      plush: 'hanul',
      firstOfKind: true,
      awarded: 50,
      clipped: 0,
      balance: 130,
    })
    const second = await playAndSettle(user, winSeed('hanul'))
    expect(second.settled).toMatchObject({ won: true, firstOfKind: false, awarded: 0, balance: 110 })
    expect(await quantityOf(user, 'plush:hanul')).toBe(2)

    // 다른 종류는 다시 +50P
    const third = await playAndSettle(user, winSeed('jaewon'))
    expect(third.settled).toMatchObject({ firstOfKind: true, awarded: 50 })
    expect(await ledgerOf(user)).toEqual([
      { amount: -20, reason: 'claw.play' },
      { amount: 50, reason: 'claw.dex' },
      { amount: -20, reason: 'claw.play' },
      { amount: -20, reason: 'claw.play' },
      { amount: 50, reason: 'claw.dex' },
    ])
    expect(await balanceOf(user)).toBe(await ledgerSum(user))
  })

  it('황금 랑구는 뽑을 때마다 +100P (도감 첫 등록 +50P 는 한 번만)', async () => {
    const user = await t.createUser()
    await fund(user, 100)
    const first = await playAndSettle(user, winSeed('gold'))
    expect(first.settled).toMatchObject({ plush: 'gold', firstOfKind: true, awarded: 150 })
    const second = await playAndSettle(user, winSeed('gold'))
    expect(second.settled).toMatchObject({ firstOfKind: false, awarded: 100 })
    expect(await quantityOf(user, 'plush:gold')).toBe(2)
  })

  it('실패한 판은 정산해도 아무것도 지급하지 않는다', async () => {
    const user = await t.createUser()
    await fund(user, 20)
    const { settled } = await playAndSettle(user, loseSeed())
    expect(settled).toMatchObject({ won: false, awarded: 0, firstOfKind: false, balance: 0 })
    expect((await t.pool.query(`SELECT count(*)::int AS n FROM gc_inventory WHERE user_id = $1 AND item_key LIKE 'plush:%'`, [user])).rows[0].n).toBe(0)
  })

  it('같은 판을 두 번 정산해도 한 번만 지급된다', async () => {
    const user = await t.createUser()
    await fund(user, 20)
    const play = await startClawPlay({ userId: user, now: NOW }, t.db, { seed: winSeed('gold') })
    const first = await settleClawPlay({ userId: user, playId: play.playId, now: NOW }, t.db)
    const second = await settleClawPlay({ userId: user, playId: play.playId, now: NOW }, t.db)
    expect(first.awarded).toBe(150)
    expect(second).toMatchObject({ alreadySettled: true, awarded: 0, balance: 150 })
    expect(await quantityOf(user, 'plush:gold')).toBe(1)
    expect(await balanceOf(user)).toBe(150)
  })

  it('정산 요청이 동시에 여러 개 와도 한 번만 지급된다', async () => {
    const user = await t.createUser()
    await fund(user, 20)
    const play = await startClawPlay({ userId: user, now: NOW }, t.db, { seed: winSeed('minseok') })
    const results = await Promise.all(
      Array.from({ length: 6 }, () => settleClawPlay({ userId: user, playId: play.playId, now: NOW }, t.db))
    )
    expect(results.filter((r) => !r.alreadySettled)).toHaveLength(1)
    expect(await quantityOf(user, 'plush:minseok')).toBe(1)
    expect(await balanceOf(user)).toBe(50)
    expect(await balanceOf(user)).toBe(await ledgerSum(user))
  })

  it('남의 판이나 없는 판은 정산할 수 없다', async () => {
    const owner = await t.createUser()
    const other = await t.createUser()
    await fund(owner, 20)
    const play = await startClawPlay({ userId: owner, now: NOW }, t.db, { seed: winSeed('jinkyu') })
    await expect(settleClawPlay({ userId: other, playId: play.playId }, t.db)).rejects.toMatchObject({ code: 'play_not_found' })
    await expect(settleClawPlay({ userId: owner, playId: randomUUID() }, t.db)).rejects.toMatchObject({ code: 'play_not_found' })
    await expect(settleClawPlay({ userId: owner, playId: "x' OR 1=1" }, t.db)).rejects.toMatchObject({ code: 'play_not_found' })
    expect(await quantityOf(other, 'plush:jinkyu')).toBe(0)
  })

  it('연속으로 놓치면 보정 횟수가 쌓이고, 성공하면 0으로 돌아간다', async () => {
    const user = await t.createUser()
    await fund(user, 200)
    expect((await getClawState(user, t.db)).misses).toBe(0)
    await playAndSettle(user, loseSeed(0))
    await playAndSettle(user, loseSeed(1))
    const state = await getClawState(user, t.db)
    expect(state.misses).toBe(2)
    expect(state.winChance).toBeCloseTo(0.35)

    // 세 번째 판은 연속 실패 2회로 추첨된다
    const seed = winSeed('seungchan', 2)
    const { play } = await playAndSettle(user, seed)
    expect(play.outcome).toEqual(drawClawOutcome(seed, 2))
    expect((await getClawState(user, t.db)).misses).toBe(0)
  })

  it('도감 보상도 하루 상한 300P 를 넘지 않는다', async () => {
    const user = await t.createUser()
    await fund(user, 20)
    await awardPoints({ userId: user, amount: 280, reason: 'tetris.clear', idempotencyKey: `cap:${user}`, now: NOW }, t.db)
    const { settled } = await playAndSettle(user, winSeed('gold'))
    expect(settled).toMatchObject({ firstOfKind: true, awarded: 20, clipped: 130 })
    expect(await quantityOf(user, 'plush:gold')).toBe(1)
  })

  it('내 상태: 도감은 6종을 항상 보여 준다', async () => {
    const user = await t.createUser()
    await fund(user, 20)
    await playAndSettle(user, winSeed('hanul'))
    const state = await getClawState(user, t.db)
    expect(state.dex).toEqual([
      { key: 'hanul', count: 1 },
      { key: 'jaewon', count: 0 },
      { key: 'minseok', count: 0 },
      { key: 'seungchan', count: 0 },
      { key: 'jinkyu', count: 0 },
      { key: 'gold', count: 0 },
    ])
    expect(state).toMatchObject({ cost: 20, tickets: 0, pending: null, balance: 50 })
  })
})
