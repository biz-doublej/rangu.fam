import { describe, expect, it } from 'vitest'
import {
  MAX_CHARGE,
  SUB,
  WORLD_WIDTH,
  applyClimbAction,
  climbResultOf,
  createClimb,
  isValidClimbInputs,
  replayClimb,
  stepClimb,
  zoneAt,
  type ClimbAction,
  type ClimbInput,
  type ClimbMap,
  type ClimbState,
} from './engine'
import { CLIMB_MAP, CLIMB_SUMMIT_HEIGHT } from './map'
import { solveClimb } from './solver'
import { mulberry32 } from '../rng'

const flat = (extra: ClimbMap['platforms'] = [], wind = 0): ClimbMap => ({
  version: 0,
  zones: [
    { name: 'a', fromH: 0, wind },
    { name: 'b', fromH: 300, wind },
  ],
  platforms: [{ x: 0, h: 0, w: WORLD_WIDTH, type: 'normal' }, ...extra],
})

function run(state: ClimbState, map: ClimbMap, ticks: number) {
  for (let i = 0; i < ticks; i++) stepClimb(state, map)
}

/** 힘을 charge 틱 모아 뛰고 내려앉을 때까지 진행한다 */
function jump(state: ClimbState, map: ClimbMap, charge: number, dir: -1 | 0 | 1 = 0) {
  if (dir) applyClimbAction(state, dir < 0 ? 'leftOn' : 'rightOn')
  applyClimbAction(state, 'jumpOn')
  run(state, map, charge)
  applyClimbAction(state, 'jumpOff')
  run(state, map, 1)
  if (dir) applyClimbAction(state, dir < 0 ? 'leftOff' : 'rightOff')
  let peak = state.y
  for (let i = 0; i < 600 && state.ground < 0; i++) {
    stepClimb(state, map)
    peak = Math.min(peak, state.y)
  }
  return { peakHeight: -peak / SUB }
}

describe('랑구 등반 엔진', () => {
  it('오래 모을수록 높이 뛴다 (최대 약 147px), 다 모이면 저절로 뛴다', () => {
    const map = flat()
    const low = jump(createClimb(map), map, 4).peakHeight
    const high = jump(createClimb(map), map, 30).peakHeight
    const full = jump(createClimb(map), map, MAX_CHARGE + 20).peakHeight
    expect(low).toBeLessThan(40)
    expect(high).toBeGreaterThan(low + 60)
    expect(full).toBeGreaterThan(140)
    expect(full).toBeLessThan(155)
  })

  it('떼는 순간 누르고 있던 방향으로 뛰고, 공중에서는 방향을 바꿀 수 없다', () => {
    const map = flat()
    const straight = createClimb(map)
    jump(straight, map, 20)
    expect(straight.x).toBe((WORLD_WIDTH / 2) * SUB)

    const right = createClimb(map)
    jump(right, map, 20, 1)
    expect(right.x).toBeGreaterThan((WORLD_WIDTH / 2 + 60) * SUB)

    // 오른쪽으로 뛴 뒤 공중에서 왼쪽을 눌러도 궤적은 같다
    const steer = createClimb(map)
    applyClimbAction(steer, 'rightOn')
    applyClimbAction(steer, 'jumpOn')
    run(steer, map, 20)
    applyClimbAction(steer, 'jumpOff')
    run(steer, map, 1)
    applyClimbAction(steer, 'rightOff')
    applyClimbAction(steer, 'leftOn')
    for (let i = 0; i < 600 && steer.ground < 0; i++) stepClimb(steer, map)
    expect(steer.x).toBe(right.x)
  })

  it('힘을 모으는 동안에는 걷지 않는다', () => {
    const map = flat()
    const state = createClimb(map)
    applyClimbAction(state, 'rightOn')
    applyClimbAction(state, 'jumpOn')
    run(state, map, 10)
    expect(state.x).toBe((WORLD_WIDTH / 2) * SUB)
  })

  it('발판은 아래에서 위로 통과하고 위에서 내려올 때만 선다', () => {
    const map = flat([{ x: 200, h: 100, w: 80, type: 'normal' }])
    const state = createClimb(map)
    jump(state, map, 36)
    expect(state.ground).toBe(1)
    expect(state.y).toBe(-100 * SUB)
    expect(state.maxHeight).toBe(100)
  })

  it('가짜 발판에는 설 수 없다', () => {
    const map = flat([{ x: 200, h: 100, w: 80, type: 'fake' }])
    const state = createClimb(map)
    jump(state, map, 36)
    expect(state.ground).toBe(0)
    expect(state.maxHeight).toBe(0)
  })

  it('얼음 발판에서는 멈추려 해도 미끄러진다', () => {
    const ice: ClimbMap = { ...flat(), platforms: [{ x: 0, h: 0, w: WORLD_WIDTH, type: 'ice' }] }
    const normal = flat()
    const slide = (map: ClimbMap) => {
      const state = createClimb(map)
      applyClimbAction(state, 'rightOn')
      run(state, map, 40)
      applyClimbAction(state, 'rightOff')
      const stopAt = state.x
      run(state, map, 60)
      return state.x - stopAt
    }
    expect(slide(normal)).toBe(0)
    expect(slide(ice)).toBeGreaterThan(10 * SUB)
  })

  it('바람은 공중에서만 밀어낸다', () => {
    const calm = createClimb(flat())
    jump(calm, flat(), 30)
    const windy = createClimb(flat([], 12))
    const map = flat([], 12)
    run(windy, map, 30)
    expect(windy.x).toBe((WORLD_WIDTH / 2) * SUB) // 서 있을 때는 그대로
    jump(windy, map, 30)
    expect(windy.x).toBeGreaterThan(calm.x + 30 * SUB)
  })

  it('벽에 부딪히면 튕겨 나온다', () => {
    const map = flat()
    const state = createClimb(map)
    state.x = (WORLD_WIDTH - 30) * SUB
    applyClimbAction(state, 'rightOn')
    applyClimbAction(state, 'jumpOn')
    run(state, map, 30)
    applyClimbAction(state, 'jumpOff')
    let bounced = false
    for (let i = 0; i < 300; i++) {
      stepClimb(state, map)
      if (state.ground < 0 && state.vx < 0) bounced = true
    }
    expect(bounced).toBe(true)
    expect(state.x).toBeLessThanOrEqual((WORLD_WIDTH - 10) * SUB)
  })

  it('떨어진 높이: 뛴 곳보다 낮은 곳에 내려앉은 차이만 센다', () => {
    const map = flat([{ x: 200, h: 100, w: 80, type: 'normal' }])
    const state = createClimb(map)
    jump(state, map, 36) // 0 → 100 으로 올라감
    expect(state.biggestFall).toBe(0)
    applyClimbAction(state, 'rightOn')
    run(state, map, 80) // 발판 끝으로 걸어가 떨어진다
    applyClimbAction(state, 'rightOff')
    run(state, map, 120)
    expect(state.ground).toBe(0)
    expect(state.biggestFall).toBe(100)
    expect(state.maxHeight).toBe(100) // 최고 높이는 유지
  })

  it('구역: 높이로 정해지고 발판에 선 순간 도달로 센다', () => {
    const map = flat([{ x: 200, h: 100, w: 80, type: 'normal' }])
    expect(zoneAt(map, 0)).toBe(1)
    expect(zoneAt(map, 299)).toBe(1)
    expect(zoneAt(map, 300)).toBe(2)
    expect(zoneAt(CLIMB_MAP, CLIMB_SUMMIT_HEIGHT)).toBe(8)
  })

  it('정상 발판에 서면 완주로 끝난다', () => {
    const map = flat([{ x: 200, h: 100, w: 80, type: 'normal', summit: true }])
    const state = createClimb(map)
    jump(state, map, 36)
    expect(state.over).toBe(true)
    expect(state.completedAt).toBe(state.frame)
  })

  it('위치와 속도는 언제나 정수다 (고정소수점)', () => {
    const rng = mulberry32(99)
    const state = createClimb(CLIMB_MAP)
    const actions: ClimbAction[] = ['leftOn', 'leftOff', 'rightOn', 'rightOff', 'jumpOn', 'jumpOff']
    for (let i = 0; i < 20_000; i++) {
      if (rng() < 0.1) applyClimbAction(state, actions[Math.floor(rng() * actions.length)])
      stepClimb(state, CLIMB_MAP)
      if (![state.x, state.y, state.vx, state.vy].every(Number.isSafeInteger)) throw new Error(`정수가 아님: 프레임 ${state.frame}`)
    }
    expect(state.frame).toBe(20_000)
  })
})

describe('랑구 등반 맵', () => {
  it('구역 8개, 정상은 하나, 좌표는 정수이고 화면 안에 있다', () => {
    expect(CLIMB_MAP.zones).toHaveLength(8)
    expect(CLIMB_MAP.platforms.filter((platform) => platform.summit)).toHaveLength(1)
    for (const platform of CLIMB_MAP.platforms) {
      expect([platform.x, platform.h, platform.w].every(Number.isInteger)).toBe(true)
      expect(platform.x).toBeGreaterThanOrEqual(0)
      expect(platform.x + platform.w).toBeLessThanOrEqual(WORLD_WIDTH)
    }
    const types = new Set(CLIMB_MAP.platforms.map((platform) => platform.type))
    expect([...types].sort()).toEqual(['fake', 'ice', 'normal'])
    expect(CLIMB_MAP.zones.some((zone) => zone.wind !== 0)).toBe(true)
  })

  it('정상까지 갈 수 있고, 그 입력 기록을 다시 실행하면 완주가 나온다', () => {
    const solution = solveClimb(CLIMB_MAP)
    expect(solution).not.toBeNull()
    const result = replayClimb(CLIMB_MAP, solution!.inputs)
    expect(result.completedAt).not.toBeNull()
    expect(result.maxHeight).toBe(CLIMB_SUMMIT_HEIGHT)
    expect(result.maxZone).toBe(8)
  })
})

describe('랑구 등반 재실행', () => {
  /** 화면 쪽과 같은 방식으로 진행하며 입력을 기록한다 (무작위 봇) */
  function playRandom(botSeed: number, frames: number) {
    const rng = mulberry32(botSeed)
    const state = createClimb(CLIMB_MAP)
    const inputs: ClimbInput[] = []
    const actions: ClimbAction[] = ['leftOn', 'leftOff', 'rightOn', 'rightOff', 'jumpOn', 'jumpOn', 'jumpOff']
    while (!state.over && state.frame < frames) {
      if (rng() < 0.08) {
        const action = actions[Math.floor(rng() * actions.length)]
        inputs.push({ frame: state.frame, action })
        applyClimbAction(state, action)
      }
      stepClimb(state, CLIMB_MAP)
    }
    inputs.push({ frame: state.frame, action: 'end' })
    applyClimbAction(state, 'end')
    return { inputs, result: climbResultOf(state) }
  }

  it('같은 inputs 는 화면에서 진행한 결과와 정확히 같다', () => {
    for (let seed = 1; seed <= 15; seed++) {
      const { inputs, result } = playRandom(seed, 12_000)
      expect(replayClimb(CLIMB_MAP, inputs)).toEqual(result)
      expect(replayClimb(CLIMB_MAP, JSON.parse(JSON.stringify(inputs)))).toEqual(result)
      expect(result.frames).toBe(12_000)
    }
  })

  it('무작위로 눌러도 조금은 올라간다 (맵이 첫 발판부터 막혀 있지 않다)', () => {
    const best = Math.max(...[1, 2, 3, 4, 5, 6].map((seed) => playRandom(seed, 12_000).result.maxHeight))
    expect(best).toBeGreaterThan(0)
  })

  it("'end' 프레임에서 끝난다", () => {
    expect(replayClimb(CLIMB_MAP, [{ frame: 500, action: 'end' }]).frames).toBe(500)
  })

  it('입력을 고치면 결과가 달라진다', () => {
    const solution = solveClimb(CLIMB_MAP)!
    const tampered = solution.inputs.filter((_, index) => index !== 5)
    expect(replayClimb(CLIMB_MAP, tampered).completedAt).toBeNull()
  })

  it('입력 형식 검사', () => {
    expect(isValidClimbInputs([{ frame: 0, action: 'jumpOn' }, { frame: 10, action: 'jumpOff' }])).toBe(true)
    expect(isValidClimbInputs([{ frame: 0, action: 'teleport' }])).toBe(false)
    expect(isValidClimbInputs([{ frame: 3, action: 'jumpOn' }, { frame: 2, action: 'jumpOff' }])).toBe(false)
    expect(isValidClimbInputs({})).toBe(false)
  })
})
