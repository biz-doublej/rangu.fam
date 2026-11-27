/**
 * 랑구 등반 엔진 — 화면과 서버 검증이 같이 쓰는 순수 로직.
 *
 * 60Hz 고정 시간 단위, 모든 위치·속도는 정수(1px = 256 단위)라서
 * 브라우저와 서버에서 부동소수점 차이 없이 같은 결과가 나온다.
 *
 * 조작: 점프를 누르고 있으면 힘이 모이고, 떼면 그때 누르고 있던 방향으로 뛴다.
 * 공중에서는 방향을 바꿀 수 없다. 체크포인트는 없다.
 */

/** 1px = 256 단위 */
export const SUB = 256
export const CLIMB_FPS = 60
export const WORLD_WIDTH = 480
export const PLAYER_W = 20
export const PLAYER_H = 28
/** 점프 힘이 다 모이는 데 걸리는 틱 (다 모이면 저절로 뛴다) */
export const MAX_CHARGE = 36

const GRAVITY = 115 // 약 0.45px/틱²
const MAX_FALL = 3072 // 12px/틱
const JUMP_VY_MIN = 896 // 3.5px/틱
const JUMP_VY_MAX = 2944 // 11.5px/틱 → 최고 약 147px
const JUMP_VX = 819 // 3.2px/틱
const WALK = 460 // 1.8px/틱
const ICE_ACCEL = 20

export type PlatformType = 'normal' | 'ice' | 'fake'

export interface ClimbPlatform {
  /** 왼쪽 끝 (px) */
  x: number
  /** 윗면 높이 (바닥에서 위로, px) */
  h: number
  /** 너비 (px) */
  w: number
  type: PlatformType
  summit?: boolean
}

export interface ClimbZone {
  name: string
  /** 이 구역이 시작하는 높이 (px) */
  fromH: number
  /** 공중에서 받는 바람 (단위/틱², +오른쪽) */
  wind: number
}

export interface ClimbMap {
  version: number
  zones: ClimbZone[]
  platforms: ClimbPlatform[]
}

export const CLIMB_ACTIONS = ['leftOn', 'leftOff', 'rightOn', 'rightOff', 'jumpOn', 'jumpOff', 'end'] as const
export type ClimbAction = (typeof CLIMB_ACTIONS)[number]

export interface ClimbInput {
  frame: number
  action: ClimbAction
}

export const CLIMB_MAX_FRAMES = CLIMB_FPS * 60 * 60 * 3
export const CLIMB_MAX_INPUTS = 300_000

export interface ClimbState {
  /** 몸 가운데 x, 발 y (단위). y 는 아래로 갈수록 커지고 바닥이 0, 위는 음수. */
  x: number
  y: number
  vx: number
  vy: number
  /** 서 있는 발판 번호 (공중이면 -1) */
  ground: number
  left: boolean
  right: boolean
  jump: boolean
  charge: number
  /** 마지막으로 본 방향 (-1 | 1) — 그림용 */
  facing: number
  frame: number
  over: boolean
  /** 정상에 닿은 프레임 */
  completedAt: number | null
  /** 발판에 서 본 가장 높은 높이 (px) */
  maxHeight: number
  /** 가장 크게 떨어진 높이 (px) — 뛴 곳보다 낮은 곳에 내려앉은 차이 */
  biggestFall: number
  /** 도달한 가장 높은 구역 (1부터) */
  maxZone: number
  /** 발이 땅을 떠난 순간의 발 y */
  takeoffY: number
  jumps: number
}

export interface ClimbResult {
  maxHeight: number
  biggestFall: number
  completedAt: number | null
  maxZone: number
  frames: number
  jumps: number
}

/** 그 높이가 속한 구역 번호 (1부터) */
export function zoneAt(map: ClimbMap, h: number): number {
  let zone = 1
  map.zones.forEach((entry, index) => {
    if (h >= entry.fromH) zone = index + 1
  })
  return zone
}

export function createClimb(map: ClimbMap): ClimbState {
  const ground = map.platforms.findIndex((platform) => platform.h === 0 && platform.type !== 'fake')
  return {
    x: (WORLD_WIDTH / 2) * SUB,
    y: 0,
    vx: 0,
    vy: 0,
    ground,
    left: false,
    right: false,
    jump: false,
    charge: 0,
    facing: 1,
    frame: 0,
    over: false,
    completedAt: null,
    maxHeight: 0,
    biggestFall: 0,
    maxZone: 1,
    takeoffY: 0,
    jumps: 0,
  }
}

export function applyClimbAction(state: ClimbState, action: ClimbAction) {
  if (state.over) return
  if (action === 'end') state.over = true
  else if (action === 'leftOn') state.left = true
  else if (action === 'leftOff') state.left = false
  else if (action === 'rightOn') state.right = true
  else if (action === 'rightOff') state.right = false
  else if (action === 'jumpOn') state.jump = true
  else if (action === 'jumpOff') state.jump = false
}

function heldDir(state: ClimbState): number {
  return (state.right ? 1 : 0) - (state.left ? 1 : 0)
}

function overlaps(state: ClimbState, platform: ClimbPlatform): boolean {
  const half = (PLAYER_W / 2) * SUB
  return state.x + half > platform.x * SUB && state.x - half < (platform.x + platform.w) * SUB
}

function leaveGround(state: ClimbState) {
  state.ground = -1
  state.takeoffY = state.y
}

function land(state: ClimbState, map: ClimbMap, index: number) {
  const platform = map.platforms[index]
  state.y = -platform.h * SUB
  state.vy = 0
  state.ground = index
  state.charge = 0
  if (platform.type !== 'ice') state.vx = 0

  const fall = Math.floor((state.y - state.takeoffY) / SUB)
  if (fall > state.biggestFall) state.biggestFall = fall
  if (platform.h > state.maxHeight) state.maxHeight = platform.h
  const zone = zoneAt(map, platform.h)
  if (zone > state.maxZone) state.maxZone = zone
  if (platform.summit) {
    state.completedAt = state.frame
    state.over = true
  }
}

/** 한 틱(1/60초) 진행 */
export function stepClimb(state: ClimbState, map: ClimbMap) {
  if (state.over) return
  state.frame++
  const dir = heldDir(state)
  if (dir) state.facing = dir

  if (state.ground >= 0) {
    const platform = map.platforms[state.ground]
    const icy = platform.type === 'ice'
    let jumpNow = false
    if (state.jump) {
      state.charge++
      if (state.charge >= MAX_CHARGE) jumpNow = true
    } else if (state.charge > 0) {
      jumpNow = true
    }

    if (jumpNow) {
      const power = Math.min(state.charge, MAX_CHARGE)
      state.vy = -(JUMP_VY_MIN + Math.floor(((JUMP_VY_MAX - JUMP_VY_MIN) * power) / MAX_CHARGE))
      state.vx = dir * JUMP_VX
      state.charge = 0
      // 다 모여서 저절로 뛴 경우, 키를 뗐다 다시 눌러야 다음 힘이 모인다
      state.jump = false
      state.jumps++
      leaveGround(state)
    } else {
      // 힘을 모으는 동안에는 걷지 않는다. 얼음에서는 미끄러지며 천천히 멈춘다.
      const target = state.charge > 0 ? 0 : dir * WALK
      if (icy) {
        if (state.vx < target) state.vx = Math.min(target, state.vx + ICE_ACCEL)
        else if (state.vx > target) state.vx = Math.max(target, state.vx - ICE_ACCEL)
      } else {
        state.vx = target
      }
    }
  }

  // 가로 이동 + 양쪽 벽
  state.x += state.vx
  const half = (PLAYER_W / 2) * SUB
  const maxX = WORLD_WIDTH * SUB - half
  if (state.x < half) {
    state.x = half
    state.vx = state.ground >= 0 ? 0 : -Math.trunc(state.vx / 2)
  } else if (state.x > maxX) {
    state.x = maxX
    state.vx = state.ground >= 0 ? 0 : -Math.trunc(state.vx / 2)
  }

  if (state.ground >= 0) {
    // 발판 끝을 넘어가면 떨어진다
    if (!overlaps(state, map.platforms[state.ground])) leaveGround(state)
    return
  }

  // 공중: 바람, 중력
  const wind = map.zones[zoneAt(map, Math.floor(-state.y / SUB)) - 1]?.wind ?? 0
  state.vx += wind
  state.vy = Math.min(MAX_FALL, state.vy + GRAVITY)
  const prevY = state.y
  state.y += state.vy

  if (state.vy > 0) {
    // 내려오는 중에만 발판 윗면에 내려앉는다 (아래에서 위로는 통과). 가장 먼저 닿는 윗면을 고른다.
    let best = -1
    let bestTop = Infinity
    for (let i = 0; i < map.platforms.length; i++) {
      const platform = map.platforms[i]
      if (platform.type === 'fake') continue
      const top = -platform.h * SUB
      if (top >= prevY && top <= state.y && top < bestTop && overlaps(state, platform)) {
        best = i
        bestTop = top
      }
    }
    if (best >= 0) land(state, map, best)
  }
}

export function climbResultOf(state: ClimbState): ClimbResult {
  return {
    maxHeight: state.maxHeight,
    biggestFall: state.biggestFall,
    completedAt: state.completedAt,
    maxZone: state.maxZone,
    frames: state.frame,
    jumps: state.jumps,
  }
}

export function isValidClimbInputs(inputs: unknown): inputs is ClimbInput[] {
  if (!Array.isArray(inputs) || inputs.length > CLIMB_MAX_INPUTS) return false
  let last = 0
  for (const input of inputs) {
    if (!input || typeof input !== 'object') return false
    const { frame, action } = input as ClimbInput
    if (!Number.isSafeInteger(frame) || frame < last || frame > CLIMB_MAX_FRAMES) return false
    if (!CLIMB_ACTIONS.includes(action)) return false
    last = frame
  }
  return true
}

/**
 * 입력 기록을 처음부터 다시 실행한다. 프레임 f 의 입력은 f 번째 틱을 진행하기 전에 적용된다.
 * 판은 정상에 닿거나 'end' 입력에서 끝난다. 'end' 없이 입력이 끝나면 마지막 입력 프레임에서 끝난 것으로 본다.
 */
export function replayClimb(map: ClimbMap, inputs: ClimbInput[]): ClimbResult {
  const state = createClimb(map)
  const lastFrame = inputs.length ? inputs[inputs.length - 1].frame : 0
  let index = 0
  while (!state.over && state.frame < CLIMB_MAX_FRAMES) {
    while (index < inputs.length && inputs[index].frame <= state.frame) {
      applyClimbAction(state, inputs[index].action)
      index++
    }
    if (state.over || (index >= inputs.length && state.frame >= lastFrame)) break
    stepClimb(state, map)
  }
  return climbResultOf(state)
}
