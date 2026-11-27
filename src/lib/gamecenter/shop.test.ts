import { randomUUID } from 'crypto'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { adjustPoints } from './admin'
import { checkIn } from './checkin'
import { SHOP_SEED, shopSeedStatements } from './ddl'
import { awardPoints } from './points'
import { findCashLikeWord, grantOf, parseShopItemInput, purchase, resolveOrder, upsertShopItem } from './shop'
import { TEST_DATABASE_URL, openTestDb, type TestDb } from './testDb'

const NOW = new Date('2026-11-27T03:00:00Z') // KST 2026-11-27 (금) 12:00
const rid = () => randomUUID()

describe('상점 초기 상품', () => {
  it('기획안 상점 표의 가격', () => {
    const price = (id: string) => SHOP_SEED.find((item) => item.id === id)?.price
    expect(price('claw-ticket-3')).toBe(50)
    expect(price('tetris-skin-neon')).toBe(400)
    expect(SHOP_SEED.filter((item) => item.id.startsWith('climb-skin-')).map((item) => item.price)).toEqual([600, 600, 600, 600, 600])
    expect(price('title-tetris-master')).toBe(500)
    expect(price('wiki-color-30d')).toBe(800)
    expect(price('quiz-penalty-pass')).toBe(300)
    expect(price('plush-season-1')).toBe(2000)
  })

  it('현금성 상품은 없다', () => {
    for (const item of SHOP_SEED) {
      expect(findCashLikeWord(`${item.name} ${item.description}`)).toBeNull()
      expect(item.kind).not.toBe('coupon')
    }
  })

  it('무료권은 claw-ticket 3장을 지급한다', () => {
    const item = SHOP_SEED.find((entry) => entry.id === 'claw-ticket-3')!
    expect(grantOf(item)).toEqual({ itemKey: 'claw-ticket', amount: 3 })
  })
})

describe('parseShopItemInput', () => {
  const base = { id: 'drink-coupon', name: '음료 쏘기 쿠폰', kind: 'coupon', price: 700 }

  it('정상 입력', () => {
    expect(parseShopItemInput(base)).toMatchObject({ id: 'drink-coupon', kind: 'coupon', price: 700, stock: null, active: true })
  })

  it('현금성 상품은 거절한다', () => {
    expect(() => parseShopItemInput({ ...base, name: '편의점 상품권' })).toThrow(/현금성/)
    expect(() => parseShopItemInput({ ...base, description: '기프티콘으로 드립니다' })).toThrow(/현금성/)
  })

  it('가격·분류·제한이 잘못되면 거절한다', () => {
    expect(() => parseShopItemInput({ ...base, price: 0 })).toThrow()
    expect(() => parseShopItemInput({ ...base, kind: 'cash' })).toThrow()
    expect(() => parseShopItemInput({ ...base, limitPerPeriod: 1, limitPeriod: 'year' })).toThrow()
    expect(() => parseShopItemInput({ ...base, id: 'Bad Id' })).toThrow()
  })
})

describe.skipIf(!TEST_DATABASE_URL)('shop (Postgres)', () => {
  let t: TestDb
  beforeAll(async () => {
    t = await openTestDb()
  })
  afterAll(async () => {
    await t?.close()
  })

  const balanceOf = async (userId: string) =>
    (await t.pool.query('SELECT balance FROM gc_wallets WHERE user_id = $1', [userId])).rows[0]?.balance ?? 0
  const ledgerSum = async (userId: string) =>
    (await t.pool.query('SELECT coalesce(sum(amount),0)::int AS s FROM gc_point_ledger WHERE user_id = $1', [userId])).rows[0].s
  const quantityOf = async (userId: string, itemKey: string) =>
    (await t.pool.query('SELECT quantity FROM gc_inventory WHERE user_id = $1 AND item_key = $2', [userId, itemKey])).rows[0]
      ?.quantity ?? 0
  const fund = (userId: string, amount: number) =>
    awardPoints(
      { userId, amount, reason: 'test.fund', idempotencyKey: `fund:${rid()}`, countsToDailyCap: false, now: NOW },
      t.db
    )

  it('DDL 과 시드는 다시 실행해도 그대로다', async () => {
    await t.pool.query(`UPDATE gc_shop_items SET price = 55 WHERE id = 'claw-ticket-3'`)
    for (const statement of shopSeedStatements()) await t.pool.query(statement)
    const { rows } = await t.pool.query(`SELECT count(*)::int AS n, max(price) FILTER (WHERE id = 'claw-ticket-3') AS p FROM gc_shop_items`)
    expect(rows[0]).toEqual({ n: SHOP_SEED.length, p: 55 }) // 관리자가 바꾼 가격을 덮지 않는다
    await t.pool.query(`UPDATE gc_shop_items SET price = 50 WHERE id = 'claw-ticket-3'`)
  })

  it('완료 기준: 출석 +10P → 포인트 부족이면 거절 → 무료권 구매 → 원장 합계 = 잔액', async () => {
    const user = await t.createUser()
    await checkIn(user, NOW, t.db)

    // 10P 로는 50P 짜리를 살 수 없다 — 아무것도 바뀌지 않는다
    await expect(purchase({ userId: user, itemId: 'claw-ticket-3', requestId: rid(), now: NOW }, t.db)).rejects.toMatchObject({
      code: 'insufficient_points',
    })
    expect(await quantityOf(user, 'claw-ticket')).toBe(0)
    expect((await t.pool.query('SELECT count(*)::int AS n FROM gc_orders WHERE user_id = $1', [user])).rows[0].n).toBe(0)

    await fund(user, 40)
    const result = await purchase({ userId: user, itemId: 'claw-ticket-3', requestId: rid(), now: NOW }, t.db)
    expect(result).toMatchObject({
      status: 'purchased',
      balance: 0,
      granted: { itemKey: 'claw-ticket', amount: 3, quantity: 3 },
      order: { status: 'fulfilled', price: 50, itemId: 'claw-ticket-3' },
    })

    const { rows } = await t.pool.query(
      `SELECT amount, reason, ref_id FROM gc_point_ledger WHERE user_id = $1 AND reason <> 'test.fund' ORDER BY id`,
      [user]
    )
    expect(rows).toEqual([
      { amount: 10, reason: 'checkin', ref_id: null },
      { amount: -50, reason: 'shop.purchase', ref_id: result.order!.id },
    ])
    expect(await balanceOf(user)).toBe(await ledgerSum(user))
  })

  it('무료권을 또 사면 수량이 3씩 늘어난다', async () => {
    const user = await t.createUser()
    await fund(user, 100)
    await purchase({ userId: user, itemId: 'claw-ticket-3', requestId: rid(), now: NOW }, t.db)
    await purchase({ userId: user, itemId: 'claw-ticket-3', requestId: rid(), now: NOW }, t.db)
    expect(await quantityOf(user, 'claw-ticket')).toBe(6)
  })

  it('같은 requestId 는 한 번만 처리된다 (더블 클릭·재시도)', async () => {
    const user = await t.createUser()
    await fund(user, 200)
    const requestId = rid()
    const results = await Promise.all(
      Array.from({ length: 5 }, () => purchase({ userId: user, itemId: 'claw-ticket-3', requestId, now: NOW }, t.db))
    )
    expect(results.filter((r) => r.status === 'purchased')).toHaveLength(1)
    expect(await balanceOf(user)).toBe(150)
    expect(await quantityOf(user, 'claw-ticket')).toBe(3)
  })

  it('동시 구매: 잔액만큼만 성공하고 잔액은 음수가 되지 않는다', async () => {
    const user = await t.createUser()
    await fund(user, 120) // 50P 짜리 2개까지
    const results = await Promise.allSettled(
      Array.from({ length: 8 }, () => purchase({ userId: user, itemId: 'claw-ticket-3', requestId: rid(), now: NOW }, t.db))
    )
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(2)
    for (const failed of results.filter((r) => r.status === 'rejected')) {
      expect((failed as PromiseRejectedResult).reason).toMatchObject({ code: 'insufficient_points' })
    }
    expect(await balanceOf(user)).toBe(20)
    expect(await quantityOf(user, 'claw-ticket')).toBe(6)
    expect(await balanceOf(user)).toBe(await ledgerSum(user))
  })

  it('기간별 구매 제한: 주 1개 상품은 같은 주에 한 번, 다음 주에 다시', async () => {
    const user = await t.createUser()
    await fund(user, 1000)
    await purchase({ userId: user, itemId: 'quiz-penalty-pass', requestId: rid(), now: NOW }, t.db)

    // 같은 주 일요일(KST) — 거절, 포인트는 그대로
    const sunday = new Date('2026-11-29T14:00:00Z')
    await expect(
      purchase({ userId: user, itemId: 'quiz-penalty-pass', requestId: rid(), now: sunday }, t.db)
    ).rejects.toMatchObject({ code: 'purchase_limit' })
    expect(await balanceOf(user)).toBe(700)

    // 월요일 0시 KST 가 지나면 다시 가능
    const monday = new Date('2026-11-29T15:00:00Z')
    await purchase({ userId: user, itemId: 'quiz-penalty-pass', requestId: rid(), now: monday }, t.db)
    expect(await balanceOf(user)).toBe(400)
    expect(await quantityOf(user, 'quiz-penalty-pass')).toBe(2)
  })

  it('1회 한정 상품은 동시에 눌러도 한 번만 팔린다', async () => {
    const user = await t.createUser()
    await fund(user, 2000)
    const results = await Promise.allSettled(
      Array.from({ length: 4 }, () => purchase({ userId: user, itemId: 'tetris-skin-neon', requestId: rid(), now: NOW }, t.db))
    )
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1)
    expect(await balanceOf(user)).toBe(1600)
    expect(await quantityOf(user, 'skin:tetris:neon')).toBe(1)
  })

  it('재고 한정 상품은 여러 사람이 동시에 사도 재고만큼만 팔린다', async () => {
    await upsertShopItem(
      parseShopItemInput({ id: 'limited-plush', name: '한정 인형', kind: 'inventory', price: 10, stock: 2, payload: { itemKey: 'plush:limited' } }),
      t.db
    )
    const users = await Promise.all(Array.from({ length: 5 }, () => t.createUser()))
    await Promise.all(users.map((user) => fund(user, 10)))
    const results = await Promise.allSettled(
      users.map((user) => purchase({ userId: user, itemId: 'limited-plush', requestId: rid(), now: NOW }, t.db))
    )
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(2)
    expect((await t.pool.query(`SELECT stock FROM gc_shop_items WHERE id = 'limited-plush'`)).rows[0].stock).toBe(0)
  })

  it('판매 중지·없는 상품은 살 수 없다', async () => {
    const user = await t.createUser()
    await fund(user, 100)
    await upsertShopItem(parseShopItemInput({ id: 'stopped', name: '중지된 상품', kind: 'inventory', price: 10, active: false }), t.db)
    await expect(purchase({ userId: user, itemId: 'stopped', requestId: rid() }, t.db)).rejects.toMatchObject({ code: 'item_unavailable' })
    await expect(purchase({ userId: user, itemId: 'nope', requestId: rid() }, t.db)).rejects.toMatchObject({ code: 'item_unavailable' })
    expect(await balanceOf(user)).toBe(100)
  })

  it('쿠폰은 pending 주문이 되고, 관리자가 사용 완료 또는 취소(포인트 반환)한다', async () => {
    await upsertShopItem(parseShopItemInput({ id: 'drink-coupon', name: '음료 쏘기 쿠폰', kind: 'coupon', price: 700, stock: 3 }), t.db)
    const user = await t.createUser()
    const admin = await t.createUser()
    await fund(user, 1400)

    const first = await purchase({ userId: user, itemId: 'drink-coupon', requestId: rid(), now: NOW }, t.db)
    const second = await purchase({ userId: user, itemId: 'drink-coupon', requestId: rid(), now: NOW }, t.db)
    expect(first).toMatchObject({ order: { status: 'pending' }, granted: null })
    expect(await balanceOf(user)).toBe(0)

    const used = await resolveOrder({ orderId: first.order!.id, action: 'used', adminId: admin, now: NOW }, t.db)
    expect(used).toMatchObject({ status: 'used', resolvedBy: admin })

    const cancelled = await resolveOrder({ orderId: second.order!.id, action: 'cancelled', adminId: admin, now: NOW }, t.db)
    expect(cancelled.status).toBe('cancelled')
    expect(await balanceOf(user)).toBe(700)
    expect((await t.pool.query(`SELECT stock FROM gc_shop_items WHERE id = 'drink-coupon'`)).rows[0].stock).toBe(2)

    // 이미 처리된 주문은 다시 처리할 수 없다 (이중 환불 방지)
    await expect(resolveOrder({ orderId: second.order!.id, action: 'cancelled', adminId: admin }, t.db)).rejects.toMatchObject({
      code: 'order_not_pending',
    })
    await expect(resolveOrder({ orderId: first.order!.id, action: 'cancelled', adminId: admin }, t.db)).rejects.toMatchObject({
      code: 'order_not_pending',
    })
    expect(await balanceOf(user)).toBe(700)
    expect(await balanceOf(user)).toBe(await ledgerSum(user))
    // 환불은 누적 획득에 더하지 않는다
    expect((await t.pool.query('SELECT lifetime_earned FROM gc_wallets WHERE user_id = $1', [user])).rows[0].lifetime_earned).toBe(1400)
  })

  it('자동 지급 주문은 취소할 수 없다', async () => {
    const user = await t.createUser()
    await fund(user, 50)
    const result = await purchase({ userId: user, itemId: 'claw-ticket-3', requestId: rid(), now: NOW }, t.db)
    await expect(resolveOrder({ orderId: result.order!.id, action: 'cancelled', adminId: user }, t.db)).rejects.toMatchObject({
      code: 'order_not_pending',
    })
  })

  describe('포인트 수동 조정', () => {
    it("사유가 필수이고 reason 은 'admin.adjust'", async () => {
      const username = `adj-${rid().slice(0, 8)}`
      const user = await t.createUser(username)
      await expect(
        adjustPoints({ username, delta: 100, note: ' ', adminUsername: 'gabriel0727', requestId: rid() }, t.db)
      ).rejects.toMatchObject({ code: 'note_required' })

      const requestId = rid()
      const plus = await adjustPoints({ username, delta: 100, note: '오류 보상', adminUsername: 'gabriel0727', requestId, now: NOW }, t.db)
      expect(plus).toMatchObject({ status: 'applied', amount: 100, balance: 100 })
      // 같은 요청 재전송은 무시
      expect((await adjustPoints({ username, delta: 100, note: '오류 보상', adminUsername: 'gabriel0727', requestId }, t.db)).status).toBe('duplicate')

      const minus = await adjustPoints({ username, delta: -30, note: '부정 획득 회수', adminUsername: 'gabriel0727', requestId: rid(), now: NOW }, t.db)
      expect(minus).toMatchObject({ amount: -30, balance: 70 })

      const { rows } = await t.pool.query('SELECT amount, reason, ref_id, counts_to_daily_cap FROM gc_point_ledger WHERE user_id = $1 ORDER BY id', [user])
      expect(rows).toEqual([
        { amount: 100, reason: 'admin.adjust', ref_id: 'gabriel0727: 오류 보상', counts_to_daily_cap: false },
        { amount: -30, reason: 'admin.adjust', ref_id: 'gabriel0727: 부정 획득 회수', counts_to_daily_cap: false },
      ])
    })

    it('잔액보다 많이 회수할 수 없고, 없는 사용자는 거절한다', async () => {
      const username = `adj-${rid().slice(0, 8)}`
      await t.createUser(username)
      await expect(
        adjustPoints({ username, delta: -1, note: '회수', adminUsername: 'a', requestId: rid() }, t.db)
      ).rejects.toMatchObject({ code: 'insufficient_points' })
      await expect(
        adjustPoints({ username: 'no-such-user', delta: 1, note: '지급', adminUsername: 'a', requestId: rid() }, t.db)
      ).rejects.toMatchObject({ code: 'user_not_found' })
    })
  })
})
