import { describe, expect, it } from 'vitest'
import { DONE, STATION_XY, WAITING, moveBack, moveForward } from './board'
import { YUT_MOVE_MS, YUT_THROW_MS, throwYut, yutGame, yutLegalMoves, yutThrower, type YutResult, type YutState, type YutView } from './rules'

const users = (n: number) => Array.from({ length: n }, (_, i) => ({ userId: `u${i}`, name: `사람${i}` }))
const start = (n = 2, options: Record<string, unknown> = {}, seed = 9, now = 0) => yutGame.init(users(n), { now, seed, round: 0, options })
/** 던진 것으로 치고 말 옮기기 단계로 만든다 */
function give(state: YutState, ...results: YutResult[]) {
  state.phase = 'move'
  state.throwsLeft = 0
  state.pending = [...results]
}
const move = (state: YutState, pending: number, piece: number, now = 100) =>
  yutGame.apply(state, yutThrower(state), { type: 'move', pending, piece }, now)
const positions = (state: YutState, side: number) => state.sides[side].pieces.map((piece) => piece.pos)

describe('윷판', () => {
  it('바깥 길을 한 바퀴 돌아 참먹이를 지나쳐야 난다', () => {
    expect(moveForward({ pos: WAITING }, 3).pos).toBe(3)
    expect(moveForward({ pos: 3 }, 4).pos).toBe(7) // 5 를 지나가기만 하면 바깥 길로 계속
    expect(moveForward({ pos: 17 }, 3).pos).toBe(20) // 딱 참먹이 — 아직 판 위
    expect(moveForward({ pos: 20 }, 1).pos).toBe(DONE)
    expect(moveForward({ pos: 18 }, 3).pos).toBe(DONE)
    expect(moveForward({ pos: 18 }, 5).pos).toBe(DONE)
  })

  it('모(5)에 멈춘 말은 지름길로 15까지', () => {
    expect(moveForward({ pos: 5 }, 1).pos).toBe(21)
    expect(moveForward({ pos: 5 }, 3).pos).toBe(23)
    expect(moveForward({ pos: 5 }, 5).pos).toBe(25) // 방을 지나가기만 하면 15 쪽으로 계속
    expect(moveForward({ pos: 21 }, 5).pos).toBe(15)
    expect(moveForward({ pos: 25 }, 1).pos).toBe(15)
    expect(moveForward({ pos: 15 }, 5).pos).toBe(20)
  })

  it('뒷모(10)에 멈춘 말은 방을 거쳐 참먹이로', () => {
    expect(moveForward({ pos: 10 }, 1).pos).toBe(26)
    expect(moveForward({ pos: 10 }, 3).pos).toBe(23)
    expect(moveForward({ pos: 10 }, 5).pos).toBe(29)
    expect(moveForward({ pos: 26 }, 5).pos).toBe(20)
    expect(moveForward({ pos: 27 }, 5).pos).toBe(DONE)
  })

  it('방(23)에 멈춘 말은 가장 짧은 길로 참먹이에 간다', () => {
    expect(moveForward({ pos: 23, from: 22 }, 1).pos).toBe(28) // 모 쪽에서 왔어도 방에 멈췄으면 참먹이 쪽
    expect(moveForward({ pos: 23 }, 3).pos).toBe(20)
    expect(moveForward({ pos: 23 }, 4).pos).toBe(DONE)
    expect(moveForward({ pos: 22, from: 21 }, 2).pos).toBe(24) // 지나가는 말은 가던 길로
    expect(moveForward({ pos: 27, from: 26 }, 2).pos).toBe(28)
  })

  it('빽도는 온 길로 한 칸 되돌아간다', () => {
    expect(moveBack({ pos: 7 }).pos).toBe(6)
    expect(moveBack({ pos: 1 }).pos).toBe(20) // 도 자리에서 빽도면 참먹이
    expect(moveBack({ pos: 21 }).pos).toBe(5)
    expect(moveBack({ pos: 26 }).pos).toBe(10)
    expect(moveBack(moveForward({ pos: 5 }, 5)).pos).toBe(24)
    expect(moveBack(moveForward({ pos: 24, from: 23 }, 2)).pos).toBe(25) // 15 에 지름길로 왔으면 25 로
    expect(moveBack(moveForward({ pos: 13 }, 2)).pos).toBe(14) // 바깥 길로 왔으면 14 로
    expect(moveBack(moveForward({ pos: 28, from: 23 }, 2)).pos).toBe(29)
    expect(moveBack({ pos: WAITING }).pos).toBe(WAITING)
  })

  it('자리 29개의 좌표가 모두 있다', () => {
    for (let station = 1; station <= 29; station++) expect(STATION_XY[station]).toHaveLength(2)
    expect(STATION_XY[23]).toEqual([50, 50])
  })
})

describe('윷 던지기', () => {
  it('같은 시드·같은 차례는 같은 결과', () => {
    expect(throwYut(123, 4)).toEqual(throwYut(123, 4))
  })

  it('확률: 개 6/16, 걸 4/16, 도 3/16, 윷·모·빽도 각 1/16', () => {
    const counts: Record<string, number> = {}
    const N = 64_000
    for (let i = 0; i < N; i++) {
      const { result, sticks } = throwYut(777, i)
      expect(sticks).toHaveLength(4)
      counts[result] = (counts[result] || 0) + 1
    }
    const near = (key: string, sixteenths: number) => {
      expect(counts[key] / N).toBeGreaterThan(sixteenths / 16 - 0.012)
      expect(counts[key] / N).toBeLessThan(sixteenths / 16 + 0.012)
    }
    near('gae', 6)
    near('geol', 4)
    near('do', 3)
    near('yut', 1)
    near('mo', 1)
    near('backdo', 1)
  })
})

describe('윷놀이', () => {
  it('편마다 말 4개, 2~4명 개인전', () => {
    for (const n of [2, 3, 4]) {
      const state = start(n)
      expect(state.sides).toHaveLength(n)
      expect(state.team).toBe(false)
      expect(state.sides.every((side) => side.pieces.length === 4 && side.pieces.every((piece) => piece.pos === WAITING))).toBe(true)
    }
    expect(yutGame.minPlayers).toBe(2)
    expect(yutGame.maxPlayers).toBe(4)
  })

  it('4명 팀전: 자리 1·3 대 2·4, 던지는 순서는 번갈아', () => {
    const state = start(4, { team: true })
    expect(state.team).toBe(true)
    expect(state.sides.map((side) => side.members)).toEqual([
      ['u0', 'u2'],
      ['u1', 'u3'],
    ])
    expect(state.order).toEqual(['u0', 'u1', 'u2', 'u3'])
    // 4명이 아니면 팀전을 골라도 개인전
    expect(start(3, { team: true }).team).toBe(false)
  })

  it('시드는 화면에 보내지 않는다', () => {
    const state = start(2, {}, 424242)
    const seen = yutGame.view(state, 'u0') as YutView
    expect(seen).not.toHaveProperty('seed')
    expect(JSON.stringify(seen)).not.toContain('424242')
    expect(seen).toMatchObject({ thrower: 'u0', mySide: 0, phase: 'throw' })
  })

  it('서버가 던진다: 차례가 아닌 사람은 못 던지고, 결과는 시드로 정해진다', () => {
    const state = start(2, {}, 55)
    expect(yutGame.apply(state, 'u1', { type: 'throw' }, 10)).toEqual({ ok: false, error: '내 차례가 아닙니다.' })
    expect(yutGame.apply(state, 'u0', { type: 'throw' }, 10)).toEqual({ ok: true })
    expect(state.lastThrow).toEqual({ by: 'u0', ...throwYut(55, 0) })
    expect(state.throws).toBe(1)
  })

  it('윷·모가 나오면 한 번 더 던지고, 결과는 쌓인다', () => {
    let checked = 0
    for (let seed = 0; seed < 400 && checked < 5; seed++) {
      const first = throwYut(seed, 0).result
      if (first !== 'yut' && first !== 'mo') continue
      const state = start(2, {}, seed)
      yutGame.apply(state, 'u0', { type: 'throw' }, 10)
      expect(state).toMatchObject({ phase: 'throw', throwsLeft: 1, pending: [first] })
      expect(yutThrower(state)).toBe('u0')
      yutGame.apply(state, 'u0', { type: 'throw' }, 20)
      const second = throwYut(seed, 1).result
      // 판에 말이 없을 때의 빽도는 쓸 수 없어 버려진다
      if (second !== 'backdo') expect(state.pending.slice(0, 2)).toEqual([first, second])
      expect(state.pending[0]).toBe(first)
      checked++
    }
    expect(checked).toBe(5)
  })

  it('판에 말이 없는데 빽도가 나오면 그대로 차례가 넘어간다', () => {
    let seed = 0
    while (throwYut(seed, 0).result !== 'backdo') seed++
    const state = start(2, {}, seed)
    yutGame.apply(state, 'u0', { type: 'throw' }, 10)
    expect(state).toMatchObject({ phase: 'throw', pending: [] })
    expect(yutThrower(state)).toBe('u1')
  })

  it('말을 옮기면 차례가 넘어간다', () => {
    const state = start(2)
    give(state, 'geol')
    expect(yutLegalMoves(state, 0)).toMatchObject([{ pending: 0, piece: 0, to: { pos: 3 } }]) // 대기 말은 어느 것이든 같은 수
    expect(yutLegalMoves(state, 0)).toHaveLength(1)
    expect(move(state, 0, 2)).toEqual({ ok: true })
    expect(positions(state, 0).filter((pos) => pos === 3)).toHaveLength(1)
    expect(state).toMatchObject({ phase: 'throw', throwsLeft: 1 })
    expect(yutThrower(state)).toBe('u1')
  })

  it('업기: 자기 말이 있는 자리에 서면 함께 다닌다', () => {
    const state = start(2)
    state.sides[0].pieces[0] = { pos: 3 }
    give(state, 'geol', 'gae')
    move(state, 0, 1) // 대기 말이 3으로 → 업힘
    expect(state.lastEvent).toContain('업었습니다')
    expect(positions(state, 0).filter((pos) => pos === 3)).toHaveLength(2)
    move(state, 0, 0) // 개: 두 말이 함께 5로
    expect(positions(state, 0).filter((pos) => pos === 5)).toHaveLength(2)
    expect(positions(state, 0).filter((pos) => pos === WAITING)).toHaveLength(2)
  })

  it('잡기: 상대 말을 잡으면 그 말은 처음으로 돌아가고 한 번 더 던진다', () => {
    const state = start(2)
    state.sides[1].pieces[0] = { pos: 2 }
    state.sides[1].pieces[1] = { pos: 2 } // 업힌 두 말
    give(state, 'gae')
    move(state, 0, 0)
    expect(positions(state, 1)).toEqual([WAITING, WAITING, WAITING, WAITING])
    expect(state.lastEvent).toContain('2개를 잡았습니다')
    expect(state).toMatchObject({ phase: 'throw', throwsLeft: 1 })
    expect(yutThrower(state)).toBe('u0') // 차례가 넘어가지 않는다
  })

  it('팀전에서는 같은 편 말을 잡지 않고 업는다', () => {
    const state = start(4, { team: true })
    state.sides[0].pieces[0] = { pos: 2 }
    give(state, 'gae')
    move(state, 0, 1)
    expect(positions(state, 0).filter((pos) => pos === 2)).toHaveLength(2)
    expect(yutThrower(state)).toBe('u1')
  })

  it('지름길: 모에 멈춘 말은 다음에 안쪽 길로 간다', () => {
    const state = start(2)
    give(state, 'mo')
    move(state, 0, 0)
    expect(positions(state, 0)).toContain(5)
    state.turn = 0
    give(state, 'geol')
    move(state, 0, 0)
    expect(positions(state, 0)).toContain(23)
  })

  it('빽도는 판 위의 말만 뒤로 보낸다', () => {
    const state = start(2)
    state.sides[0].pieces[0] = { pos: 7, from: 6 }
    give(state, 'backdo')
    expect(yutLegalMoves(state, 0)).toEqual([{ pending: 0, piece: 0, to: { pos: 6 } }])
    expect(move(state, 0, 1)).toEqual({ ok: false, error: '둘 수 없는 수입니다.' }) // 대기 말은 못 움직인다
    move(state, 0, 0)
    expect(positions(state, 0)[0]).toBe(6)
  })

  it('말 4개가 다 나면 이긴다', () => {
    const state = start(2)
    state.sides[0].pieces = [{ pos: DONE }, { pos: DONE }, { pos: 19 }, { pos: 19 }]
    give(state, 'gae')
    expect(yutGame.result(state)).toBeNull()
    move(state, 0, 2)
    expect(state).toMatchObject({ phase: 'done', winner: 0, endReason: 'finish' })
    const result = yutGame.result(state)!
    expect(result.players).toEqual([
      { userId: 'u0', rank: 1, score: 1, stats: { won: 1, stayed: 1 } },
      { userId: 'u1', rank: 2, score: 0, stats: { won: 0, stayed: 1 } },
    ])
    expect(result.summary).toMatchObject({ completed: true, reason: 'finish', team: false })
  })

  it('시간 안에 하지 않으면 자동으로 던지고, 자동으로 첫 수를 둔다', () => {
    const state = start(2, {}, 3, 0)
    expect(yutGame.tick(state, YUT_THROW_MS - 1)).toBe(false)
    expect(yutGame.tick(state, YUT_THROW_MS)).toBe(true)
    expect(state.throws).toBe(1)
    const idle = start(2)
    give(idle, 'gae')
    idle.deadline = YUT_MOVE_MS
    expect(yutGame.tick(idle, YUT_MOVE_MS)).toBe(true)
    expect(positions(idle, 0)).toContain(2)
  })

  it('무작위로 끝까지 두어도 규칙이 깨지지 않고 언젠가 끝난다', () => {
    for (const [n, options] of [[2, {}], [3, {}], [4, {}], [4, { team: true }]] as Array<[number, Record<string, unknown>]>) {
      const state = start(n, options, n * 31 + 7)
      let now = 0
      for (let guard = 0; guard < 20_000 && state.phase !== 'done'; guard++) {
        now += 100
        const thrower = yutThrower(state)
        if (state.phase === 'throw') yutGame.apply(state, thrower, { type: 'throw' }, now)
        else {
          const moves = (yutGame.view(state, thrower) as YutView).moves
          expect(moves.length).toBeGreaterThan(0)
          const pick = moves[(guard * 7) % moves.length]
          expect(yutGame.apply(state, thrower, { type: 'move', pending: pick.pending, piece: pick.piece }, now)).toEqual({ ok: true })
        }
        for (const side of state.sides) for (const piece of side.pieces) expect([WAITING, DONE, ...Array.from({ length: 29 }, (_, i) => i + 1)]).toContain(piece.pos)
      }
      expect(state.phase).toBe('done')
      expect(state.sides[state.winner!].pieces.every((piece) => piece.pos === DONE)).toBe(true)
    }
  })

  it('나가면: 혼자 남은 편이 이기고, 셋 이상이면 나간 편의 말만 치우고 계속한다', () => {
    const duo = start(2)
    yutGame.abandon(duo, 'u0', 50)
    expect(duo).toMatchObject({ phase: 'done', winner: 1, endReason: 'abandon' })

    const trio = start(3)
    trio.sides[0].pieces[0] = { pos: 4 }
    yutGame.abandon(trio, 'u0', 50)
    expect(trio.phase).toBe('throw')
    expect(trio.sides[0]).toMatchObject({ out: true })
    expect(positions(trio, 0)).toEqual([WAITING, WAITING, WAITING, WAITING])
    expect(yutThrower(trio)).toBe('u1') // 나간 사람의 차례는 건너뛴다

    const team = start(4, { team: true })
    yutGame.abandon(team, 'u0', 50)
    expect(team.phase).toBe('throw') // 같은 편 u2 가 남아 있다
    expect(team.sides[0].out).toBe(false)
    yutGame.abandon(team, 'u2', 60)
    expect(team).toMatchObject({ phase: 'done', winner: 1 })
  })
})
