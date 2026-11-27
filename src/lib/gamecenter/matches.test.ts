import { randomUUID } from 'crypto'
import jwt from 'jsonwebtoken'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { parseMatchReport, recordMatch } from './matches'
import { awardPoints } from './points'
import { RT_TOKEN_AUDIENCE, signMatchBody, signRtToken, verifyMatchSignature } from './rt'
import { TEST_DATABASE_URL, openTestDb, type TestDb } from './testDb'

describe('실시간 토큰', () => {
  it('5분짜리이고 userId·이름이 들어 있다', () => {
    const token = signRtToken({ id: 'u1', name: '정재원' }, 'secret')
    const payload = jwt.verify(token, 'secret', { audience: RT_TOKEN_AUDIENCE }) as any
    expect(payload).toMatchObject({ userId: 'u1', name: '정재원' })
    expect(payload.exp - payload.iat).toBe(300)
    expect(() => jwt.verify(token, 'other', { audience: RT_TOKEN_AUDIENCE })).toThrow()
  })
})

describe('결과 서명', () => {
  const body = JSON.stringify({ matchId: 'x', game: 'omok' })

  it('같은 비밀값으로 만든 서명만 통과한다', () => {
    const signature = signMatchBody(body, 's3cret')
    expect(signature).toMatch(/^[0-9a-f]{64}$/)
    expect(verifyMatchSignature(body, signature, 's3cret')).toBe(true)
    expect(verifyMatchSignature(body, signature.toUpperCase(), 's3cret')).toBe(true)
    expect(verifyMatchSignature(body, signMatchBody(body, 'wrong'), 's3cret')).toBe(false)
  })

  it('본문이 한 글자라도 바뀌면 통과하지 못한다', () => {
    const signature = signMatchBody(body, 's3cret')
    expect(verifyMatchSignature(body + ' ', signature, 's3cret')).toBe(false)
  })

  it('서명이 없거나 형식이 틀리거나 비밀값이 설정되지 않았으면 거절', () => {
    expect(verifyMatchSignature(body, null, 's3cret')).toBe(false)
    expect(verifyMatchSignature(body, '', 's3cret')).toBe(false)
    expect(verifyMatchSignature(body, 'zz', 's3cret')).toBe(false)
    expect(verifyMatchSignature(body, signMatchBody(body, ''), undefined)).toBe(false)
  })
})

describe('parseMatchReport', () => {
  const a = randomUUID()
  const b = randomUUID()
  const base = { matchId: randomUUID(), game: 'omok', players: [{ userId: a, rank: 1 }, { userId: b, rank: 2 }], summary: { moves: 20 } }

  it('정상', () => {
    expect(parseMatchReport(base)).toMatchObject({ game: 'omok', players: [{ userId: a, rank: 1 }, { userId: b, rank: 2 }] })
  })

  it('형식이 틀리면 거절', () => {
    expect(() => parseMatchReport({ ...base, matchId: 'nope' })).toThrow()
    expect(() => parseMatchReport({ ...base, game: 'poker' })).toThrow()
    expect(() => parseMatchReport({ ...base, players: [{ userId: a, rank: 1 }] })).toThrow()
    expect(() => parseMatchReport({ ...base, players: [{ userId: a, rank: 1 }, { userId: a, rank: 2 }] })).toThrow()
    expect(() => parseMatchReport({ ...base, players: [{ userId: a, rank: 0 }, { userId: b, rank: 2 }] })).toThrow()
    expect(() => parseMatchReport(null)).toThrow()
  })
})

describe.skipIf(!TEST_DATABASE_URL)('판 결과 저장과 오목 보상 (Postgres)', () => {
  let t: TestDb
  beforeAll(async () => {
    t = await openTestDb()
  })
  afterAll(async () => {
    await t?.close()
  })

  const NOW = new Date('2026-11-27T03:00:00Z')
  const report = (winner: string, loser: string, extra: object = {}) => ({
    matchId: randomUUID(),
    game: 'omok',
    players: [
      { userId: winner, rank: 1, score: 1, role: 'black' },
      { userId: loser, rank: 2, score: 0, role: 'white' },
    ],
    summary: { reason: 'five', moves: 21 },
    ...extra,
  })
  const ledgerOf = async (userId: string) =>
    (await t.pool.query('SELECT amount, reason, game FROM gc_point_ledger WHERE user_id = $1 ORDER BY id', [userId])).rows
  const balanceOf = async (userId: string) =>
    (await t.pool.query('SELECT balance FROM gc_wallets WHERE user_id = $1', [userId])).rows[0]?.balance ?? 0

  it('승 +20P / 패 +5P, 결과는 gc_matches 에 남는다', async () => {
    const [a, b] = [await t.createUser(), await t.createUser()]
    const match = report(a, b)
    expect(await recordMatch(match, NOW, t.db)).toEqual({ duplicate: false, rewards: { [a]: 20, [b]: 5 } })
    expect(await ledgerOf(a)).toEqual([{ amount: 20, reason: 'omok.win', game: 'omok' }])
    expect(await ledgerOf(b)).toEqual([{ amount: 5, reason: 'omok.lose', game: 'omok' }])
    const { rows } = await t.pool.query('SELECT game, players, summary FROM gc_matches WHERE id = $1', [match.matchId])
    expect(rows[0]).toMatchObject({ game: 'omok', summary: { reason: 'five', moves: 21 } })
    expect(rows[0].players).toHaveLength(2)
  })

  it('같은 matchId 는 한 번만 저장·보상한다 (재전송)', async () => {
    const [a, b] = [await t.createUser(), await t.createUser()]
    const match = report(a, b)
    await recordMatch(match, NOW, t.db)
    expect(await recordMatch(match, NOW, t.db)).toEqual({ duplicate: true, rewards: {} })
    const results = await Promise.all(Array.from({ length: 5 }, () => recordMatch(match, NOW, t.db)))
    expect(results.every((result) => result.duplicate)).toBe(true)
    expect(await balanceOf(a)).toBe(20)
    expect(await balanceOf(b)).toBe(5)
  })

  it('같은 결과가 동시에 여러 번 와도 한 번만 지급된다', async () => {
    const [a, b] = [await t.createUser(), await t.createUser()]
    const match = report(a, b)
    const results = await Promise.all(Array.from({ length: 6 }, () => recordMatch(match, NOW, t.db)))
    expect(results.filter((result) => !result.duplicate)).toHaveLength(1)
    expect(await balanceOf(a)).toBe(20)
    expect((await t.pool.query('SELECT count(*)::int AS n FROM gc_matches WHERE id = $1', [match.matchId])).rows[0].n).toBe(1)
  })

  it('같은 상대와는 하루 3판까지 보상, 4판째부터 0P — 다음 날과 다른 상대는 다시 받는다', async () => {
    const [a, b, c] = [await t.createUser(), await t.createUser(), await t.createUser()]
    expect((await recordMatch(report(a, b), NOW, t.db)).rewards).toEqual({ [a]: 20, [b]: 5 })
    expect((await recordMatch(report(b, a), NOW, t.db)).rewards).toEqual({ [b]: 20, [a]: 5 }) // 이긴 사람이 바뀌어도 같은 상대
    expect((await recordMatch(report(a, b), NOW, t.db)).rewards).toEqual({ [a]: 20, [b]: 5 })

    const fourth = await recordMatch(report(a, b), NOW, t.db)
    expect(fourth).toEqual({ duplicate: false, rewards: {}, noRewardReason: 'opponent_limit' })
    await recordMatch(report(b, a), NOW, t.db)
    expect(await balanceOf(a)).toBe(45)
    expect(await balanceOf(b)).toBe(30)
    // 보상이 없어도 판 기록은 남는다
    expect((await t.pool.query(`SELECT count(*)::int AS n FROM gc_matches WHERE players @> $1::jsonb`, [JSON.stringify([{ userId: a }])])).rows[0].n).toBe(5)

    // 다른 상대와는 다시 3판
    expect((await recordMatch(report(a, c), NOW, t.db)).rewards).toEqual({ [a]: 20, [c]: 5 })
    // KST 다음 날이면 같은 상대와도 다시
    expect((await recordMatch(report(a, b), new Date('2026-11-27T15:00:00Z'), t.db)).rewards).toEqual({ [a]: 20, [b]: 5 })
  })

  it('같은 두 사람의 판이 동시에 여러 개 와도 3판까지만 보상한다', async () => {
    const [a, b] = [await t.createUser(), await t.createUser()]
    const results = await Promise.all(Array.from({ length: 6 }, () => recordMatch(report(a, b), NOW, t.db)))
    expect(results.filter((result) => Object.keys(result.rewards).length > 0)).toHaveLength(3)
    expect(await balanceOf(a)).toBe(60)
    expect(await balanceOf(b)).toBe(15)
  })

  it('9수가 안 돼 끝난 판(바로 기권)은 보상이 없지만 하루 3판에는 포함된다', async () => {
    const [a, b] = [await t.createUser(), await t.createUser()]
    const quick = await recordMatch(report(a, b, { summary: { reason: 'resign', moves: 2 } }), NOW, t.db)
    expect(quick).toEqual({ duplicate: false, rewards: {}, noRewardReason: 'too_short' })
    expect(await ledgerOf(a)).toEqual([])
  })

  it('무승부는 둘 다 +5P', async () => {
    const [a, b] = [await t.createUser(), await t.createUser()]
    const draw = { ...report(a, b), players: [{ userId: a, rank: 1 }, { userId: b, rank: 1 }], summary: { reason: 'draw', moves: 225 } }
    expect((await recordMatch(draw, NOW, t.db)).rewards).toEqual({ [a]: 5, [b]: 5 })
    expect(await ledgerOf(a)).toEqual([{ amount: 5, reason: 'omok.draw', game: 'omok' }])
  })

  it('오목 보상도 하루 상한 300P 안에서만 나온다', async () => {
    const [a, b] = [await t.createUser(), await t.createUser()]
    await awardPoints({ userId: a, amount: 290, reason: 'tetris.clear', idempotencyKey: `cap:${a}`, now: NOW }, t.db)
    expect((await recordMatch(report(a, b), NOW, t.db)).rewards).toEqual({ [a]: 10, [b]: 5 })
  })

  it('없는 사용자가 들어 있으면 저장하지 않는다', async () => {
    const a = await t.createUser()
    const match = report(a, randomUUID())
    await expect(recordMatch(match, NOW, t.db)).rejects.toMatchObject({ code: 'unknown_player' })
    expect((await t.pool.query('SELECT count(*)::int AS n FROM gc_matches WHERE id = $1', [match.matchId])).rows[0].n).toBe(0)
    expect(await ledgerOf(a)).toEqual([])
  })
})
