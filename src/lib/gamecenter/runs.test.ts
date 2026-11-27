import { randomUUID } from 'crypto'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { CLIMB_MAP, CLIMB_SUMMIT_HEIGHT } from '@/games/climb/map'
import { replayClimb, type ClimbInput } from '@/games/climb/engine'
import { solveClimb } from '@/games/climb/solver'
import { mulberry32 } from '@/games/rng'
import { applyAction, createTetris, resultOf, stepFrame, type TetrisAction, type TetrisInput } from '@/games/tetris/engine'
import { cleanSignText, getClimbBoard, writeClimbSign } from './climbBoard'
import { startClawPlay } from './claw'
import { awardPoints } from './points'
import { getRanking, settleLastWeek } from './ranking'
import { CLIMB_COMPLETED_BASE } from './rewards'
import { finishRun, startRun } from './runs'
import { TEST_DATABASE_URL, openTestDb, type TestDb } from './testDb'

/** 브라우저가 하는 것과 같은 방식으로 한 판을 진행해 입력 기록을 만든다 */
function playTetris(seed: number, botSeed: number, maxFrames: number, gentle = false) {
  const rng = mulberry32(botSeed)
  const state = createTetris(seed)
  const inputs: TetrisInput[] = []
  // gentle: 떨어뜨리지 않고 옮기기만 해서 1분 넘게 버틴다
  const actions: TetrisAction[] = gentle ? ['left', 'right', 'rotateCW'] : ['left', 'right', 'rotateCW', 'softOn', 'softOff', 'hardDrop', 'hold']
  while (!state.over && state.frame < maxFrames) {
    if (rng() < 0.15) {
      const action = actions[Math.floor(rng() * actions.length)]
      inputs.push({ frame: state.frame, action })
      applyAction(state, action)
    }
    stepFrame(state)
  }
  if (!state.over) {
    inputs.push({ frame: state.frame, action: 'end' })
    applyAction(state, 'end')
  }
  return { inputs, result: resultOf(state) }
}

describe('표지판 글 정리', () => {
  it('줄바꿈·제어 문자를 없애고 20자로 자른다', () => {
    expect(cleanSignText('  여기서\n떨어지면   끝  ')).toBe('여기서 떨어지면 끝')
    expect(cleanSignText('가'.repeat(30))).toHaveLength(20)
    expect(cleanSignText('😀'.repeat(25))).toBe('😀'.repeat(20))
    expect(cleanSignText(null)).toBe('')
  })
})

describe.skipIf(!TEST_DATABASE_URL)('아케이드 판 검증 (Postgres)', () => {
  let t: TestDb
  let climbSolution: ClimbInput[]
  beforeAll(async () => {
    t = await openTestDb()
    climbSolution = solveClimb(CLIMB_MAP)!.inputs
  })
  afterAll(async () => {
    await t?.close()
  })

  const startedAt = async (runId: string) =>
    (await t.pool.query('SELECT started_at FROM gc_runs WHERE id = $1', [runId])).rows[0].started_at as Date
  /** 입력 기록 길이만큼 실제로 시간이 흐른 뒤의 시각 */
  const after = async (runId: string, frames: number) => new Date((await startedAt(runId)).getTime() + (frames / 60) * 1000 + 500)
  const runRow = async (runId: string) => (await t.pool.query('SELECT status, score, stats FROM gc_runs WHERE id = $1', [runId])).rows[0]
  const ledgerOf = async (userId: string) =>
    (await t.pool.query('SELECT amount, reason FROM gc_point_ledger WHERE user_id = $1 ORDER BY id', [userId])).rows
  const balanceOf = async (userId: string) =>
    (await t.pool.query('SELECT balance FROM gc_wallets WHERE user_id = $1', [userId])).rows[0]?.balance ?? 0
  const ledgerSum = async (userId: string) =>
    (await t.pool.query('SELECT coalesce(sum(amount),0)::int AS s FROM gc_point_ledger WHERE user_id = $1', [userId])).rows[0].s

  /** 테트리스 한 판을 시작해 봇으로 치고 제출한다 */
  async function tetrisRun(userId: string, opts: { seed?: number; botSeed?: number; frames?: number; quick?: boolean; tamper?: 'score' | 'inputs' | 'fast' } = {}) {
    const run = await startRun({ userId, game: 'tetris' }, t.db, { seed: opts.seed ?? 1234 })
    const played = playTetris(run.seed, opts.botSeed ?? 1, opts.frames ?? 4000, !opts.quick && opts.tamper !== 'inputs')
    const now = opts.tamper === 'fast' ? new Date((await startedAt(run.runId)).getTime() + 2000) : await after(run.runId, played.result.frames)
    const finished = await finishRun(
      {
        userId,
        runId: run.runId,
        inputs: opts.tamper === 'inputs' ? played.inputs.filter((_, i) => i % 2 === 0) : played.inputs,
        clientScore: opts.tamper === 'score' ? played.result.score + 50_000 : played.result.score,
        now,
      },
      t.db
    )
    return { run, played, finished }
  }

  describe('테트리스', () => {
    it('브라우저와 같은 seed + inputs 를 서버가 다시 실행해 같은 점수로 확정한다', async () => {
      const user = await t.createUser()
      const { run, played, finished } = await tetrisRun(user)
      expect(finished).toMatchObject({ status: 'verified', alreadyFinished: false, score: played.result.score, result: played.result })
      expect(await runRow(run.runId)).toMatchObject({ status: 'verified', score: played.result.score })
      expect(played.result.frames).toBeGreaterThanOrEqual(3600)
      // 1분 넘게 했으므로 한 판 완료 +5P
      expect(finished.awards).toContainEqual({ reason: 'tetris.clear', amount: 5, clipped: 0 })
      expect(await balanceOf(user)).toBe(await ledgerSum(user))
    })

    it('조작한 점수는 rejected 이고 포인트가 없다', async () => {
      const user = await t.createUser()
      const { run, finished } = await tetrisRun(user, { tamper: 'score' })
      expect(finished).toMatchObject({ status: 'rejected', rejectReason: 'score_mismatch', awards: [], score: null })
      expect((await runRow(run.runId)).status).toBe('rejected')
      expect(await ledgerOf(user)).toEqual([])
    })

    it('입력 기록을 고치면 점수가 맞지 않아 rejected', async () => {
      const user = await t.createUser()
      const { finished } = await tetrisRun(user, { tamper: 'inputs' })
      expect(finished).toMatchObject({ status: 'rejected', rejectReason: 'score_mismatch' })
    })

    it('서버 기준 경과 시간보다 긴 기록(빨리 감기)은 rejected', async () => {
      const user = await t.createUser()
      const { finished } = await tetrisRun(user, { tamper: 'fast' })
      expect(finished).toMatchObject({ status: 'rejected', rejectReason: 'too_fast', awards: [] })
    })

    it('형식이 틀린 입력은 rejected', async () => {
      const user = await t.createUser()
      const run = await startRun({ userId: user, game: 'tetris' }, t.db)
      const finished = await finishRun({ userId: user, runId: run.runId, inputs: [{ frame: 0, action: 'win' }], clientScore: 999 }, t.db)
      expect(finished).toMatchObject({ status: 'rejected', rejectReason: 'invalid_inputs' })
    })

    it('같은 판을 다시 제출해도 두 번 지급되지 않는다', async () => {
      const user = await t.createUser()
      const { run, played, finished } = await tetrisRun(user)
      const again = await finishRun(
        { userId: user, runId: run.runId, inputs: played.inputs, clientScore: played.result.score, now: await after(run.runId, played.result.frames) },
        t.db
      )
      expect(again).toMatchObject({ alreadyFinished: true, status: 'verified', awards: [], awarded: 0 })
      expect(await balanceOf(user)).toBe(finished.awarded)
      // rejected 된 판을 올바른 값으로 다시 내도 되살릴 수 없다
      const bad = await tetrisRun(user, { tamper: 'score' })
      const retry = await finishRun(
        { userId: user, runId: bad.run.runId, inputs: bad.played.inputs, clientScore: bad.played.result.score, now: await after(bad.run.runId, bad.played.result.frames) },
        t.db
      )
      expect(retry).toMatchObject({ alreadyFinished: true, status: 'rejected' })
    })

    it('동시에 여러 번 제출해도 한 번만 지급된다', async () => {
      const user = await t.createUser()
      const run = await startRun({ userId: user, game: 'tetris' }, t.db, { seed: 77 })
      const played = playTetris(77, 3, 4000, true)
      const now = await after(run.runId, played.result.frames)
      const results = await Promise.all(
        Array.from({ length: 5 }, () => finishRun({ userId: user, runId: run.runId, inputs: played.inputs, clientScore: played.result.score, now }, t.db))
      )
      expect(results.filter((r) => !r.alreadyFinished)).toHaveLength(1)
      expect((await ledgerOf(user)).filter((row) => row.reason === 'tetris.clear')).toHaveLength(1)
    })

    it('남의 판·없는 판·인형뽑기 판은 제출할 수 없다', async () => {
      const owner = await t.createUser()
      const other = await t.createUser()
      const run = await startRun({ userId: owner, game: 'tetris' }, t.db)
      await expect(finishRun({ userId: other, runId: run.runId, inputs: [], clientScore: 0 }, t.db)).rejects.toMatchObject({ code: 'run_not_found' })
      await expect(finishRun({ userId: owner, runId: randomUUID(), inputs: [], clientScore: 0 }, t.db)).rejects.toMatchObject({ code: 'run_not_found' })
      await awardPoints({ userId: owner, amount: 20, reason: 'x', idempotencyKey: `x:${owner}`, countsToDailyCap: false }, t.db)
      const claw = await startClawPlay({ userId: owner }, t.db)
      await expect(finishRun({ userId: owner, runId: claw.playId, inputs: [], clientScore: 0 }, t.db)).rejects.toMatchObject({ code: 'run_not_found' })
    })

    it('1분이 안 되는 판은 완료 보상이 없고, 완료 보상은 하루 10판까지', async () => {
      const user = await t.createUser()
      const short = await tetrisRun(user, { frames: 600 })
      expect(short.finished).toMatchObject({ status: 'verified', awards: [] })
      for (let i = 0; i < 11; i++) await tetrisRun(user, { seed: 500 + i, botSeed: 9 })
      expect((await ledgerOf(user)).filter((row) => row.reason === 'tetris.clear')).toHaveLength(10)
    })

    it('개인 최고 기록 경신 +20P 는 이전 기록이 있을 때만, 하루 1회', async () => {
      const user = await t.createUser()
      // 점수가 낮은 판 → 높은 판 → 더 높은 판 순서로 친다
      const plays = [11, 12, 13, 14, 15, 16].map((botSeed) => ({ botSeed, score: playTetris(4321, botSeed, 4000).result.score }))
      const quick = true
      const sorted = [...plays].sort((a, b) => a.score - b.score)
      const distinct = sorted.filter((play, i) => i === 0 || play.score > sorted[i - 1].score).slice(0, 3)
      expect(distinct).toHaveLength(3)

      const first = await tetrisRun(user, { seed: 4321, botSeed: distinct[0].botSeed, quick })
      expect(first.finished.awards.some((award) => award.reason === 'tetris.best')).toBe(false)
      const second = await tetrisRun(user, { seed: 4321, botSeed: distinct[1].botSeed, quick })
      expect(second.finished.awards).toContainEqual({ reason: 'tetris.best', amount: 20, clipped: 0 })
      expect(second.finished.personalBest).toBe(true)
      const third = await tetrisRun(user, { seed: 4321, botSeed: distinct[2].botSeed, quick })
      expect(third.finished.personalBest).toBe(true)
      expect(third.finished.awards.some((award) => award.reason === 'tetris.best')).toBe(false) // 오늘은 이미 받음
    })
  })

  describe('랑구 등반', () => {
    const solved = () => replayClimb(CLIMB_MAP, climbSolution)

    it('완주 기록을 다시 실행해 확정한다: 구역 7개 +210P, 정상 첫 도달 +500P(상한 밖)', async () => {
      const user = await t.createUser()
      const run = await startRun({ userId: user, game: 'climb' }, t.db)
      const expected = solved()
      const finished = await finishRun(
        { userId: user, runId: run.runId, inputs: climbSolution, clientScore: CLIMB_SUMMIT_HEIGHT, now: await after(run.runId, expected.frames) },
        t.db
      )
      expect(finished).toMatchObject({ status: 'verified', result: expected, score: CLIMB_COMPLETED_BASE - expected.completedAt! })
      expect(finished.awards.filter((award) => award.reason === 'climb.zone')).toHaveLength(7)
      expect(finished.awards).toContainEqual({ reason: 'climb.summit', amount: 500, clipped: 0 })
      expect(finished.awarded).toBe(710)
      expect(await balanceOf(user)).toBe(710)

      // 다시 완주해도 구역·정상 보상은 한 번뿐
      const run2 = await startRun({ userId: user, game: 'climb' }, t.db)
      const again = await finishRun(
        { userId: user, runId: run2.runId, inputs: climbSolution, clientScore: CLIMB_SUMMIT_HEIGHT, now: await after(run2.runId, expected.frames) },
        t.db
      )
      expect(again).toMatchObject({ status: 'verified', awards: [] })
      expect(await balanceOf(user)).toBe(await ledgerSum(user))
    })

    it('기존 완주 기록을 단축하면 +50P', async () => {
      const user = await t.createUser()
      const expected = solved()
      // 더 느린 완주 기록이 이미 있다
      await t.pool.query(
        `INSERT INTO gc_runs (user_id, game, seed, status, score, stats, finished_at)
         VALUES ($1, 'climb', 1, 'verified', $2, $3, now() - interval '1 hour')`,
        [user, CLIMB_COMPLETED_BASE - (expected.completedAt! + 5000), JSON.stringify({ result: { ...expected, completedAt: expected.completedAt! + 5000 } })]
      )
      const run = await startRun({ userId: user, game: 'climb' }, t.db)
      const finished = await finishRun(
        { userId: user, runId: run.runId, inputs: climbSolution, clientScore: CLIMB_SUMMIT_HEIGHT, now: await after(run.runId, expected.frames) },
        t.db
      )
      expect(finished.awards).toContainEqual({ reason: 'climb.faster', amount: 50, clipped: 0 })
      expect(finished.personalBest).toBe(true)
    })

    it('도중에 그만둔 판은 올라간 구역까지만 보상한다', async () => {
      const user = await t.createUser()
      // 풀이의 앞부분만 치고 그만둔다
      const cut = climbSolution.slice(0, Math.floor(climbSolution.length / 3))
      const inputs: ClimbInput[] = [...cut, { frame: cut[cut.length - 1].frame + 300, action: 'end' }]
      const expected = replayClimb(CLIMB_MAP, inputs)
      expect(expected.completedAt).toBeNull()
      expect(expected.maxZone).toBeGreaterThan(1)

      const run = await startRun({ userId: user, game: 'climb' }, t.db)
      const finished = await finishRun(
        { userId: user, runId: run.runId, inputs, clientScore: expected.maxHeight, now: await after(run.runId, expected.frames) },
        t.db
      )
      expect(finished).toMatchObject({ status: 'verified', score: expected.maxHeight })
      expect(finished.awards.map((award) => award.reason)).toEqual(Array(expected.maxZone - 1).fill('climb.zone'))
    })

    it('높이를 부풀리거나, 끝 표시가 없거나, 빨리 감은 기록은 rejected', async () => {
      const user = await t.createUser()
      const expected = solved()
      const lie = await startRun({ userId: user, game: 'climb' }, t.db)
      expect(
        await finishRun({ userId: user, runId: lie.runId, inputs: [{ frame: 600, action: 'end' }], clientScore: 9600, now: await after(lie.runId, 600) }, t.db)
      ).toMatchObject({ status: 'rejected', rejectReason: 'score_mismatch' })

      const noEnd = await startRun({ userId: user, game: 'climb' }, t.db)
      expect(
        await finishRun({ userId: user, runId: noEnd.runId, inputs: climbSolution.slice(0, -1), clientScore: CLIMB_SUMMIT_HEIGHT, now: await after(noEnd.runId, expected.frames) }, t.db)
      ).toMatchObject({ status: 'rejected', rejectReason: 'invalid_inputs' })

      const fast = await startRun({ userId: user, game: 'climb' }, t.db)
      expect(
        await finishRun({ userId: user, runId: fast.runId, inputs: climbSolution, clientScore: CLIMB_SUMMIT_HEIGHT, now: new Date((await startedAt(fast.runId)).getTime() + 3000) }, t.db)
      ).toMatchObject({ status: 'rejected', rejectReason: 'too_fast' })
      expect(await ledgerOf(user)).toEqual([])
    })

    it('5분 이상 플레이 +5P 는 하루 3회', async () => {
      const user = await t.createUser()
      const inputs: ClimbInput[] = [{ frame: 18_000, action: 'end' }]
      for (let i = 0; i < 4; i++) {
        const run = await startRun({ userId: user, game: 'climb' }, t.db)
        await finishRun({ userId: user, runId: run.runId, inputs, clientScore: 0, now: await after(run.runId, 18_000) }, t.db)
      }
      expect(await ledgerOf(user)).toEqual(Array(3).fill({ amount: 5, reason: 'climb.play' }))
    })

    it('깃발·표지판: 올라가 본 구역에만 표지판을 남길 수 있고, 새로 쓰면 덮는다', async () => {
      const climber = await t.createUser('climber-' + randomUUID().slice(0, 6))
      const rookie = await t.createUser()
      const expected = solved()
      const run = await startRun({ userId: climber, game: 'climb' }, t.db)
      await finishRun({ userId: climber, runId: run.runId, inputs: climbSolution, clientScore: CLIMB_SUMMIT_HEIGHT, now: await after(run.runId, expected.frames) }, t.db)

      await expect(writeClimbSign({ userId: rookie, zone: 3, text: '나도 왔다' }, t.db)).rejects.toMatchObject({ code: 'zone_not_reached' })
      await expect(writeClimbSign({ userId: climber, zone: 9, text: 'x' }, t.db)).rejects.toMatchObject({ code: 'invalid_zone' })
      await expect(writeClimbSign({ userId: climber, zone: 3, text: '   ' }, t.db)).rejects.toMatchObject({ code: 'empty_sign' })
      await writeClimbSign({ userId: rookie, zone: 1, text: '출발!' }, t.db)
      await writeClimbSign({ userId: climber, zone: 3, text: '여기 미끄러움' }, t.db)
      await writeClimbSign({ userId: climber, zone: 3, text: '얼음 조심 '.repeat(10) }, t.db)

      const board = await getClimbBoard(rookie, new Date(), t.db)
      const sign = board.signs.find((entry) => entry.zone === 3)!
      expect(sign.text).toHaveLength(20)
      expect(sign.mine).toBe(false)
      expect(board.signs.find((entry) => entry.zone === 1)).toMatchObject({ text: '출발!', mine: true })
      expect(board.flags.find((flag) => flag.userId === climber)).toMatchObject({ height: CLIMB_SUMMIT_HEIGHT, mine: false })
      expect(board.me).toEqual({ bestHeight: 0, maxZone: 1, bestTime: null })
      expect((await getClimbBoard(climber, new Date(), t.db)).me).toEqual({ bestHeight: CLIMB_SUMMIT_HEIGHT, maxZone: 8, bestTime: expected.completedAt })
    })
  })
})

describe.skipIf(!TEST_DATABASE_URL)('랭킹과 주간 정산 (Postgres)', () => {
  let t: TestDb
  beforeAll(async () => {
    t = await openTestDb()
  })
  afterAll(async () => {
    await t?.close()
  })

  // 2026-11-30(월) 00:05 KST — 지난주는 2026-W48 (11-23 ~ 11-29)
  const MONDAY = new Date('2026-11-29T15:05:00Z')
  const LAST_WEEK = '2026-11-25T03:00:00Z'
  const THIS_WEEK = '2026-11-29T15:01:00Z'
  const insertRun = (userId: string, game: string, score: number, finishedAt: string, result: object = {}) =>
    t.pool.query(
      `INSERT INTO gc_runs (user_id, game, seed, status, score, stats, finished_at) VALUES ($1, $2, 1, 'verified', $3, $4, $5)`,
      [userId, game, score, JSON.stringify({ result }), finishedAt]
    )
  const weeklyLedger = async (userId: string) =>
    (await t.pool.query(`SELECT amount, reason, idempotency_key, counts_to_daily_cap FROM gc_point_ledger WHERE user_id = $1 ORDER BY id`, [userId])).rows

  it('지난주 1~3위와 가장 크게 떨어진 사람에게 한 번만 지급한다', async () => {
    const [a, b, c, d, e] = await Promise.all(Array.from({ length: 5 }, () => t.createUser()))
    await insertRun(a, 'tetris', 5000, LAST_WEEK)
    await insertRun(a, 'tetris', 90_000, LAST_WEEK) // 사람마다 가장 좋은 판 하나
    await insertRun(b, 'tetris', 70_000, LAST_WEEK)
    await insertRun(c, 'tetris', 30_000, LAST_WEEK)
    await insertRun(d, 'tetris', 10_000, LAST_WEEK) // 4위 — 보상 없음
    await insertRun(e, 'tetris', 999_999, THIS_WEEK) // 이번 주 판은 지난주 정산에 들어가지 않는다
    await t.pool.query(`INSERT INTO gc_runs (user_id, game, seed, status, score, stats, finished_at) VALUES ($1, 'tetris', 1, 'rejected', 5000000, '{}', $2)`, [d, LAST_WEEK])
    await insertRun(c, 'climb', 4000, LAST_WEEK, { maxHeight: 4000, biggestFall: 300 })
    await insertRun(d, 'climb', 2000, LAST_WEEK, { maxHeight: 2000, biggestFall: 1800 })

    const first = await settleLastWeek(MONDAY, t.db)
    expect(first).toEqual({ weekId: '2026-W48', awards: 6 })

    expect(await weeklyLedger(a)).toEqual([{ amount: 200, reason: 'weekly.rank', idempotency_key: 'weekly:tetris:2026-W48:1', counts_to_daily_cap: false }])
    expect(await weeklyLedger(b)).toEqual([{ amount: 100, reason: 'weekly.rank', idempotency_key: 'weekly:tetris:2026-W48:2', counts_to_daily_cap: false }])
    expect((await weeklyLedger(c)).map((row) => row.idempotency_key)).toEqual(['weekly:tetris:2026-W48:3', 'weekly:climb:2026-W48:1'])
    expect((await weeklyLedger(d)).map((row) => [row.amount, row.idempotency_key])).toEqual([
      [100, 'weekly:climb:2026-W48:2'],
      [50, 'weekly:climb-fall:2026-W48:1'],
    ])
    expect(await weeklyLedger(e)).toEqual([])

    // 다시 불러도, 다른 서버 인스턴스(새 연결)에서 불러도 추가 지급이 없다
    expect((await settleLastWeek(MONDAY, t.db)).awards).toBe(0)
    const other = await openTestDb()
    await other.close()
    const { rows } = await t.pool.query(`SELECT count(*)::int AS n FROM gc_point_ledger WHERE idempotency_key LIKE 'weekly:%'`)
    expect(rows[0].n).toBe(6)
  })

  it('주간 랭킹은 월요일 0시 KST 부터, 역대 랭킹은 전체', async () => {
    const me = await t.createUser('rank-me-' + randomUUID().slice(0, 6))
    await insertRun(me, 'tetris', 1_500_000, THIS_WEEK, { lines: 300 })
    const week = await getRanking({ game: 'tetris', period: 'week', userId: me, now: MONDAY }, t.db)
    expect(week.weekStart).toBe('2026-11-30')
    expect(week.entries.map((entry) => entry.score)).toEqual([1_500_000, 999_999])
    expect(week.me).toMatchObject({ rank: 1, score: 1_500_000, result: { lines: 300 } })

    const all = await getRanking({ game: 'tetris', period: 'all', userId: me, now: MONDAY }, t.db)
    expect(all.entries.map((entry) => entry.score)).toEqual([1_500_000, 999_999, 90_000, 70_000, 30_000, 10_000])
    // 일요일 23:59 KST 에는 아직 지난주
    const sunday = await getRanking({ game: 'tetris', period: 'week', now: new Date('2026-11-29T14:59:00Z') }, t.db)
    expect(sunday.weekStart).toBe('2026-11-23')
    expect(sunday.entries).toHaveLength(4)
    expect(sunday.me).toBeNull()
  })
})
