import Matter from 'matter-js'
import { isClawWin, type ClawOutcome } from './draw'
import { drawPlush } from './drawPlush'
import { PLUSHES, findPlush, type PlushType } from './plushes'

/**
 * 인형뽑기 기계 (matter.js 연출). docs/gamecenter/claw-demo.html 을 옮긴 것.
 *
 * 데모와 다른 점: 잡히는지·놓치는지·어떤 인형인지는 서버가 /claw/play 에서 이미 정했고,
 * 기계는 그 결과(ClawOutcome)대로 움직이기만 한다. 물리 때문에 결과가 달라지지 않게
 * - 성공한 판의 인형만 출구로 나갈 수 있고(다른 인형이 굴러 들어가면 더미로 되돌린다),
 * - 성공한 인형이 어딘가에 걸려도 잠시 뒤 출구로 나간 것으로 처리한다.
 * 화면을 떠날 때는 destroy() 로 엔진·애니메이션·소리를 정리한다.
 */

const { Engine, Bodies, Body, Composite, Constraint } = Matter

const W = 400
const H = 520
const CHUTE_W = 96
const FLOOR_Y = H - 20
const PART_H = 150
const TOP_Y = 58
const HOME_X = CHUTE_W / 2
const MAX_X = W - 34
const ARM_L = 46
const OPEN = 0.68
const CLOSED = 0.14
const PLAY_SECONDS = 15
const TICK_MS = 1000 / 60
const CAT_WORLD = 0x0001
const CAT_ARM = 0x0002
const CAT_PLUSH = 0x0004

export const CLAW_CANVAS = { width: W, height: H }

export type ClawMachineState = 'idle' | 'ready' | 'descend' | 'close' | 'lift' | 'carry' | 'release'

export interface ClawMachineCallbacks {
  onState?: (state: ClawMachineState) => void
  onStatus?: (message: string) => void
  /** 남은 조작 시간(초). 조작 중이 아니면 null */
  onTimer?: (secondsLeft: number | null) => void
  /** 한 판의 연출이 끝났을 때 */
  onFinish?: (outcome: ClawOutcome) => void
}

export interface ClawMachine {
  /** 서버가 정한 결과로 한 판을 시작한다 (집게가 출발 위치로 가고 조작 시간이 흐른다). */
  begin: (outcome: ClawOutcome) => void
  /** -1 왼쪽, 1 오른쪽, 0 멈춤 */
  setDir: (dir: -1 | 0 | 1) => void
  drop: () => void
  setMuted: (muted: boolean) => void
  getState: () => ClawMachineState
  destroy: () => void
}

type PlushBody = Matter.Body & { plush: { type: PlushType; r: number } }

export function createClawMachine(canvas: HTMLCanvasElement, callbacks: ClawMachineCallbacks = {}): ClawMachine {
  const ctx = canvas.getContext('2d')!
  const dpr = Math.min(window.devicePixelRatio || 1, 2)
  canvas.width = W * dpr
  canvas.height = H * dpr
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

  // ── 소리 ────────────────────────────────────
  let actx: AudioContext | null = null
  let muted = false
  function beep(freq: number, dur = 0.08, type: OscillatorType = 'square', vol = 0.05, when = 0) {
    if (muted) return
    try {
      const AudioCtor = window.AudioContext || (window as any).webkitAudioContext
      actx = actx || new AudioCtor()
      const o = actx.createOscillator()
      const g = actx.createGain()
      o.type = type
      o.frequency.value = freq
      const t = actx.currentTime + when
      g.gain.setValueAtTime(vol, t)
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
      o.connect(g).connect(actx.destination)
      o.start(t)
      o.stop(t + dur + 0.02)
    } catch {
      // 소리를 낼 수 없는 환경이면 조용히 넘어간다
    }
  }
  const jingle = () => [523, 659, 784, 1046].forEach((f, i) => beep(f, 0.16, 'triangle', 0.07, i * 0.1))

  // ── 물리 세계 ────────────────────────────────
  const engine = Engine.create({ gravity: { x: 0, y: 1 } })
  engine.positionIterations = 10
  engine.velocityIterations = 8
  const world = engine.world
  const wallOpts = { isStatic: true, friction: 0.6, collisionFilter: { category: CAT_WORLD } }
  Composite.add(world, [
    Bodies.rectangle((CHUTE_W + W) / 2, FLOOR_Y + 10, W - CHUTE_W, 20, wallOpts), // 바닥 (출구 위는 비어 있음)
    Bodies.rectangle(CHUTE_W, FLOOR_Y - PART_H / 2, 8, PART_H, wallOpts), // 아크릴 칸막이
    Bodies.rectangle(-10, H / 2, 20, H * 2, wallOpts),
    Bodies.rectangle(W + 10, H / 2, 20, H * 2, wallOpts),
  ])

  // 집게 팔 (정적 물체를 매 틱 손으로 옮긴다)
  const armOpts = { isStatic: true, friction: 0.9, collisionFilter: { category: CAT_ARM, mask: CAT_PLUSH } }
  const armL = Bodies.rectangle(0, 0, 7, ARM_L, armOpts)
  const armR = Bodies.rectangle(0, 0, 7, ARM_L, armOpts)
  Composite.add(world, [armL, armR])

  // 더미 속 인형의 생김새는 연출용이라 Math.random 을 써도 결과에 영향이 없다.
  const plushes: PlushBody[] = []
  function randomType(): PlushType {
    // 황금은 드물게만 보이게
    return Math.random() < 0.04 ? PLUSHES[PLUSHES.length - 1] : PLUSHES[Math.floor(Math.random() * (PLUSHES.length - 1))]
  }
  function spawnPlush(x: number, y: number) {
    const type = randomType()
    const r = 22 + Math.random() * 4
    const b = Bodies.circle(x, y, r, {
      friction: 0.9,
      frictionStatic: 1.2,
      restitution: 0.05,
      density: 0.0016,
      collisionFilter: { category: CAT_PLUSH, mask: CAT_WORLD | CAT_PLUSH | CAT_ARM },
    }) as PlushBody
    b.plush = { type, r }
    Body.setAngle(b, (Math.random() - 0.5) * 0.8)
    plushes.push(b)
    Composite.add(world, b)
    return b
  }
  function backToPile(b: PlushBody) {
    Body.setPosition(b, { x: W - 60 - Math.random() * 120, y: 110 })
    Body.setVelocity(b, { x: 0, y: 0 })
  }
  {
    const cols = 5
    const x0 = CHUTE_W + 40
    const gap = (W - 30 - x0) / (cols - 1)
    for (let i = 0; i < 24; i++) {
      spawnPlush(x0 + (i % cols) * gap + (Math.random() - 0.5) * 8, FLOOR_Y - 30 - Math.floor(i / cols) * 52)
    }
    // 첫 화면 전에 더미를 가라앉힌다. 출구 쪽으로 굴러간 것은 더미 위로 되돌린다.
    for (let i = 0; i < 300; i++) {
      Engine.update(engine, TICK_MS)
      for (const b of plushes) if (b.position.x < CHUTE_W + 6) backToPile(b)
    }
  }

  // ── 상태 ────────────────────────────────────
  const claw = { x: HOME_X, y: TOP_Y, theta: OPEN }
  let state: ClawMachineState = 'idle'
  let stateT = performance.now()
  let outcome: ClawOutcome | null = null
  let playEnds = 0
  let lastTimer: number | null = null
  let held: PlushBody | null = null
  let grip: Matter.Constraint | null = null
  /** 이번 판에 출구로 나가야 하는 인형 (성공한 판에서만) */
  let winner: PlushBody | null = null
  let delivered = false
  let carryDropAt: number | null = null
  let moveDir = 0
  let respawnAt = 0
  let destroyed = false

  function setState(next: ClawMachineState) {
    state = next
    stateT = performance.now()
    if (next !== 'ready') emitTimer(null)
    callbacks.onState?.(next)
  }
  const say = (message: string) => callbacks.onStatus?.(message)
  function emitTimer(value: number | null) {
    if (value === lastTimer) return
    lastTimer = value
    callbacks.onTimer?.(value)
  }

  function begin(next: ClawOutcome) {
    if (destroyed || state !== 'idle') return
    outcome = next
    winner = null
    delivered = false
    carryDropAt = null
    moveDir = 0
    claw.x = HOME_X
    claw.y = TOP_Y
    claw.theta = OPEN
    playEnds = performance.now() + PLAY_SECONDS * 1000
    beep(988, 0.07)
    beep(1318, 0.12, 'square', 0.05, 0.07)
    say('◀ ▶로 위치를 잡고 뽑기를 누르세요.')
    setState('ready')
  }

  function drop() {
    if (state !== 'ready') return
    moveDir = 0
    beep(330, 0.1, 'sawtooth', 0.04)
    say('집게가 내려가요…')
    setState('descend')
  }

  function attach(b: PlushBody) {
    held = b
    b.collisionFilter.mask = CAT_WORLD | CAT_PLUSH // 잡힌 동안에는 팔과 부딪히지 않는다
    grip = Constraint.create({
      pointA: { x: claw.x, y: claw.y + 38 },
      bodyB: b,
      pointB: { x: 0, y: 0 },
      stiffness: 0.06,
      damping: 0.12,
      length: 0,
    })
    Composite.add(world, grip)
  }
  function letGo() {
    if (grip) {
      Composite.remove(world, grip)
      grip = null
    }
    if (held) {
      held.collisionFilter.mask = CAT_WORLD | CAT_PLUSH | CAT_ARM
      held = null
    }
  }

  /** 집게 사이에 있는 인형 중 가장 가운데 것. 없으면 가장 가까운 인형. */
  function pickTarget(preferKey: string | null): PlushBody | null {
    let best: PlushBody | null = null
    let bestD = Infinity
    for (const b of plushes) {
      const dx = b.position.x - claw.x
      const dy = b.position.y - claw.y
      if (Math.abs(dx) < 34 && dy > 4 && dy < 80) {
        // 이번 판의 인형과 같은 종류가 집게 안에 있으면 그것을 먼저 잡는다
        const d = Math.abs(dx) + Math.abs(dy - 40) * 0.5 - (preferKey && b.plush.type.key === preferKey ? 30 : 0)
        if (d < bestD) {
          bestD = d
          best = b
        }
      }
    }
    if (best) return best
    for (const b of plushes) {
      const d = Math.hypot(b.position.x - claw.x, b.position.y - (claw.y + 40))
      if (d < bestD) {
        bestD = d
        best = b
      }
    }
    return best
  }

  function deliver(b: PlushBody) {
    if (b === held) letGo()
    Composite.remove(world, b)
    const index = plushes.indexOf(b)
    if (index >= 0) plushes.splice(index, 1)
    delivered = true
    jingle()
    say(`${b.plush.type.name} 획득! 출구로 떨어졌어요.`)
    respawnAt = performance.now() + 900
  }

  // ── 한 틱(1/60초) ───────────────────────────
  function tick(now: number) {
    const dt = now - stateT

    if (state === 'ready') {
      emitTimer(Math.max(0, Math.ceil((playEnds - now) / 1000)))
      if (moveDir) claw.x = Math.min(MAX_X, Math.max(HOME_X, claw.x + moveDir * 2.4))
      if (now >= playEnds) {
        say('시간 끝! 집게가 자동으로 내려가요.')
        drop()
      }
    }

    if (state === 'descend') {
      claw.y += 2.3
      const tipY = claw.y + 10 + ARM_L * Math.cos(claw.theta)
      const under = Matter.Query.region(plushes, {
        min: { x: claw.x - 13, y: claw.y + 12 },
        max: { x: claw.x + 13, y: claw.y + 26 },
      })
      if (under.length || tipY >= FLOOR_Y - 4) setState('close')
    }

    if (state === 'close') {
      claw.theta = OPEN - (OPEN - CLOSED) * Math.min(1, dt / 450)
      if (dt > 520) {
        if (outcome?.grabbed) {
          const type = findPlush(outcome.plush)
          const target = pickTarget(outcome.plush)
          if (target) {
            // 잡힌 인형은 서버가 정한 인형이다 (팔에 가려진 순간에 바꾼다)
            if (type) target.plush.type = type
            attach(target)
            if (isClawWin(outcome)) winner = target
          }
        }
        beep(220, 0.12, 'square', 0.04)
        setState('lift')
      }
    }

    if (state === 'lift') {
      claw.y = Math.max(TOP_Y, claw.y - 1.8)
      if (claw.y <= TOP_Y + 0.5) {
        if (!held) {
          say('아무것도 못 잡았어요.')
        } else if (outcome?.slipAt === 'top') {
          letGo()
          claw.theta = 0.32
          say('아깝다! 위에서 미끄러졌어요.')
          beep(196, 0.25, 'sawtooth', 0.05)
        }
        // 옮기다 놓치는 판은 출구에서 떨어진 곳에서 놓는다 (출구로 굴러 들어가지 않게)
        const safeX = CHUTE_W + 70
        carryDropAt =
          held && outcome?.slipAt === 'carry'
            ? claw.x <= safeX
              ? claw.x
              : safeX + Math.random() * (claw.x - safeX) * 0.7
            : null
        setState('carry')
      }
    }

    if (state === 'carry') {
      if (held && carryDropAt !== null && claw.x <= carryDropAt) {
        letGo()
        claw.theta = 0.32
        carryDropAt = null
        say('으악, 옮기다가 떨어졌어요!')
        beep(196, 0.25, 'sawtooth', 0.05)
      }
      claw.x = Math.max(HOME_X, claw.x - 2.2)
      if (claw.x <= HOME_X + 0.5) setState('release')
    }

    if (state === 'release') {
      claw.theta = Math.min(OPEN, claw.theta + 0.03)
      if (dt > 150 && held) letGo()
      // 성공한 인형이 어딘가에 걸렸으면 출구로 나간 것으로 처리한다
      if (winner && !delivered && dt > 3000) deliver(winner)
      if (dt > 1100 && (!winner || delivered)) {
        const finished = outcome
        outcome = null
        winner = null
        setState('idle')
        if (finished) callbacks.onFinish?.(finished)
      }
    }

    // 팔을 집게 위치로 옮긴다
    const pivotY = claw.y + 10
    const half = ARM_L / 2
    Body.setPosition(armL, { x: claw.x - 12 - Math.sin(claw.theta) * half, y: pivotY + Math.cos(claw.theta) * half })
    Body.setAngle(armL, claw.theta)
    Body.setPosition(armR, { x: claw.x + 12 + Math.sin(claw.theta) * half, y: pivotY + Math.cos(claw.theta) * half })
    Body.setAngle(armR, -claw.theta)
    if (grip) grip.pointA = { x: claw.x, y: claw.y + 38 }

    Engine.update(engine, TICK_MS)

    for (let i = plushes.length - 1; i >= 0; i--) {
      const b = plushes[i]
      if (b === winner) {
        if (b.position.y > H + 40) deliver(b)
      } else if (b !== held && (b.position.x < CHUTE_W - 2 || b.position.y > H + 40)) {
        // 이번 판의 인형이 아닌 것이 출구로 가면 더미로 되돌린다
        backToPile(b)
      }
    }

    if (respawnAt && now >= respawnAt) {
      respawnAt = 0
      spawnPlush(CHUTE_W + 40 + Math.random() * (W - CHUTE_W - 80), -30)
    }
  }

  // ── 그리기 ──────────────────────────────────
  function roundRect(x: number, y: number, w: number, h: number, r: number) {
    ctx.beginPath()
    if (typeof ctx.roundRect === 'function') ctx.roundRect(x, y, w, h, r)
    else ctx.rect(x, y, w, h)
  }

  function draw(now: number) {
    const TAU = Math.PI * 2
    const g = ctx.createLinearGradient(0, 0, 0, H)
    g.addColorStop(0, '#ffd6ea')
    g.addColorStop(1, '#ffeef6')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, W, H)
    // 별 무늬 벽지
    ctx.fillStyle = 'rgba(255,79,154,.14)'
    for (let y = 30; y < H; y += 46) {
      for (let x = (Math.round(y / 46) % 2) * 23 + 12; x < W; x += 46) {
        ctx.beginPath()
        for (let k = 0; k < 10; k++) {
          const a = (k * Math.PI) / 5 - Math.PI / 2
          const rr = k % 2 ? 3 : 7
          ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr)
        }
        ctx.fill()
      }
    }
    // LED 줄
    for (let x = 10; x < W; x += 20) {
      const on = Math.floor(now / 250 + x / 20) % 3 === 0
      ctx.fillStyle = on ? '#fff3a6' : '#ffc0dc'
      ctx.beginPath()
      ctx.arc(x, 8, 3, 0, TAU)
      ctx.fill()
    }
    // 출구
    ctx.fillStyle = '#3a1d4f'
    ctx.fillRect(0, FLOOR_Y - 4, CHUTE_W, H)
    ctx.fillStyle = 'rgba(58,29,79,.18)'
    ctx.fillRect(0, FLOOR_Y - PART_H, CHUTE_W, PART_H)
    ctx.fillStyle = '#ffd23f'
    ctx.font = '800 18px system-ui, sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText('출구', CHUTE_W / 2, FLOOR_Y + 14)
    // 바닥
    ctx.fillStyle = '#ff9fc8'
    ctx.fillRect(CHUTE_W, FLOOR_Y, W - CHUTE_W, 20)

    for (const b of plushes) {
      ctx.save()
      ctx.translate(b.position.x, b.position.y)
      ctx.rotate(b.angle)
      drawPlush(ctx, b.plush.type, b.plush.r)
      ctx.restore()
    }

    // 아크릴 칸막이
    ctx.fillStyle = 'rgba(255,255,255,.55)'
    ctx.fillRect(CHUTE_W - 4, FLOOR_Y - PART_H, 8, PART_H)
    ctx.strokeStyle = 'rgba(255,255,255,.9)'
    ctx.lineWidth = 1.5
    ctx.strokeRect(CHUTE_W - 4, FLOOR_Y - PART_H, 8, PART_H)

    // 레일과 줄
    ctx.fillStyle = '#5a3a73'
    roundRect(6, 18, W - 12, 10, 5)
    ctx.fill()
    ctx.strokeStyle = '#6c6c7a'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(claw.x, 26)
    ctx.lineTo(claw.x, claw.y - 10)
    ctx.stroke()
    ctx.fillStyle = '#9aa0b4'
    roundRect(claw.x - 14, 14, 28, 16, 4)
    ctx.fill()

    // 팔
    for (const [arm, side] of [
      [armL, -1],
      [armR, 1],
    ] as Array<[Matter.Body, number]>) {
      ctx.save()
      ctx.translate(arm.position.x, arm.position.y)
      ctx.rotate(arm.angle)
      const metal = ctx.createLinearGradient(-4, 0, 4, 0)
      metal.addColorStop(0, '#8d93a8')
      metal.addColorStop(0.5, '#e8ebf5')
      metal.addColorStop(1, '#8d93a8')
      ctx.fillStyle = metal
      roundRect(-3.5, -ARM_L / 2, 7, ARM_L, 3)
      ctx.fill()
      ctx.beginPath()
      ctx.moveTo(-3.5, ARM_L / 2 - 4)
      ctx.lineTo(-side * 9, ARM_L / 2 + 4)
      ctx.lineTo(3.5, ARM_L / 2)
      ctx.closePath()
      ctx.fill()
      ctx.restore()
    }
    // 집게 머리
    const hg = ctx.createLinearGradient(0, claw.y - 10, 0, claw.y + 14)
    hg.addColorStop(0, '#c8ccdb')
    hg.addColorStop(1, '#7d8399')
    ctx.fillStyle = hg
    roundRect(claw.x - 19, claw.y - 10, 38, 24, 8)
    ctx.fill()
    ctx.fillStyle = state === 'ready' ? '#7dff9a' : '#ff5f8f'
    ctx.beginPath()
    ctx.arc(claw.x, claw.y + 2, 4, 0, TAU)
    ctx.fill()

    // 유리 반사
    ctx.fillStyle = 'rgba(255,255,255,.16)'
    ctx.beginPath()
    ctx.moveTo(W * 0.55, 0)
    ctx.lineTo(W * 0.7, 0)
    ctx.lineTo(W * 0.35, H)
    ctx.lineTo(W * 0.2, H)
    ctx.fill()
    ctx.fillStyle = 'rgba(255,255,255,.09)'
    ctx.beginPath()
    ctx.moveTo(W * 0.78, 0)
    ctx.lineTo(W * 0.83, 0)
    ctx.lineTo(W * 0.48, H)
    ctx.lineTo(W * 0.43, H)
    ctx.fill()
  }

  // ── 루프: 화면 주사율과 상관없이 1/60초 단위로 진행 ──
  let raf = 0
  let last = performance.now()
  let acc = 0
  function loop(now: number) {
    if (destroyed) return
    acc = Math.min(acc + (now - last), TICK_MS * 5)
    last = now
    while (acc >= TICK_MS) {
      tick(now)
      acc -= TICK_MS
    }
    draw(now)
    raf = requestAnimationFrame(loop)
  }
  raf = requestAnimationFrame(loop)

  return {
    begin,
    drop,
    setDir(dir) {
      moveDir = state === 'ready' ? dir : 0
      if (dir && state === 'ready') beep(dir < 0 ? 440 : 494, 0.04, 'square', 0.03)
    },
    setMuted(value) {
      muted = value
    },
    getState: () => state,
    destroy() {
      if (destroyed) return
      destroyed = true
      cancelAnimationFrame(raf)
      letGo()
      Composite.clear(world, false, true)
      Engine.clear(engine)
      plushes.length = 0
      if (actx) {
        actx.close().catch(() => {})
        actx = null
      }
    },
  }
}
