'use client'

import React, { useCallback, useEffect, useRef, useState } from 'react'
import { ArrowLeft, ArrowRight, ArrowUp } from 'lucide-react'
import { RunAwards, type RunFinish } from '@/components/gamecenter/RunResult'
import { gcFetch, gcPost } from '@/components/gamecenter/useGamecenterMe'
import {
  CLIMB_FPS,
  MAX_CHARGE,
  PLAYER_H,
  PLAYER_W,
  SUB,
  WORLD_WIDTH,
  applyClimbAction,
  createClimb,
  stepClimb,
  zoneAt,
  type ClimbAction,
  type ClimbInput,
  type ClimbState,
} from './engine'
import { CLIMB_MAP, CLIMB_SUMMIT_HEIGHT } from './map'

const VIEW_W = WORLD_WIDTH
const VIEW_H = 640
const TICK_MS = 1000 / CLIMB_FPS
const ZONE_SKY = ['#dff1ff', '#d9ecf7', '#e3f6fb', '#e6eefc', '#f3ecfb', '#e0f3f7', '#f9ecec', '#fff3d6']
const BUTTON =
  'inline-flex items-center justify-center gap-1.5 rounded-md border border-[color:var(--wiki-rule-strong)] bg-[color:var(--wiki-panel)] px-3 py-1.5 text-sm text-[color:var(--wiki-ink-soft)] hover:bg-[color:var(--wiki-bg-2)] disabled:cursor-not-allowed disabled:opacity-50'
const PRIMARY =
  'inline-flex items-center justify-center gap-1.5 rounded-md bg-[color:var(--wiki-accent)] px-4 py-2 text-sm font-medium text-[#fff] hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50'
const PAD =
  'grid h-16 select-none place-items-center rounded-lg border border-[color:var(--wiki-rule-strong)] bg-[color:var(--wiki-panel)] text-[color:var(--wiki-ink)] active:bg-[color:var(--wiki-bg-2)] disabled:opacity-40'
const INPUT =
  'w-full rounded-md border border-[color:var(--wiki-rule-strong)] bg-[color:var(--wiki-field)] px-2.5 py-1.5 text-sm text-[color:var(--wiki-ink)] focus:border-[color:var(--wiki-accent)] focus:outline-none'

type Phase = 'idle' | 'starting' | 'playing' | 'saving' | 'done' | 'failed'

interface Board {
  flags: Array<{ userId: string; name: string; height: number; mine: boolean }>
  signs: Array<{ zone: number; text: string; author: string; mine: boolean }>
  weeklyFall: { name: string; fall: number } | null
  me: { bestHeight: number; maxZone: number; bestTime: number | null }
}

/** 높이(px)를 화면에 보일 미터로 */
export const meters = (px: number) => `${Math.round(px / 10)}m`
export const clock = (frames: number) => {
  const seconds = Math.floor(frames / CLIMB_FPS)
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`
}

function draw(canvas: HTMLCanvasElement, state: ClimbState, camera: { y: number }, board: Board | null, now: number) {
  const c = canvas.getContext('2d')
  if (!c) return
  const dpr = Math.min(window.devicePixelRatio || 1, 2)
  if (canvas.width !== VIEW_W * dpr) {
    canvas.width = VIEW_W * dpr
    canvas.height = VIEW_H * dpr
  }
  c.setTransform(dpr, 0, 0, dpr, 0, 0)

  const px = state.x / SUB
  const feet = state.y / SUB
  // 카메라는 그림에만 쓴다 (엔진 상태와 무관). 플레이어를 화면 아래 40% 지점에 둔다.
  const target = Math.min(feet - VIEW_H * 0.6, -VIEW_H + 40)
  camera.y += (target - camera.y) * 0.12
  if (Math.abs(target - camera.y) > VIEW_H) camera.y = target
  const sy = (worldY: number) => worldY - camera.y
  const topH = -camera.y
  const bottomH = -(camera.y + VIEW_H)

  // 배경: 구역마다 하늘색이 다르다
  for (let i = 0; i < CLIMB_MAP.zones.length; i++) {
    const from = CLIMB_MAP.zones[i].fromH
    const to = CLIMB_MAP.zones[i + 1]?.fromH ?? CLIMB_SUMMIT_HEIGHT + 2000
    if (to < bottomH || from > topH) continue
    c.fillStyle = ZONE_SKY[i % ZONE_SKY.length]
    c.fillRect(0, sy(-to), VIEW_W, to - from)
  }
  c.fillStyle = '#6b4f3a'
  c.fillRect(0, sy(0), VIEW_W, VIEW_H)

  // 구역 경계와 이름, 바람 표시
  c.textAlign = 'left'
  CLIMB_MAP.zones.forEach((zone, index) => {
    const y = sy(-zone.fromH)
    if (index > 0 && y > -20 && y < VIEW_H + 20) {
      c.strokeStyle = 'rgba(40,60,90,.25)'
      c.setLineDash([6, 6])
      c.beginPath()
      c.moveTo(0, y)
      c.lineTo(VIEW_W, y)
      c.stroke()
      c.setLineDash([])
      c.fillStyle = 'rgba(40,60,90,.6)'
      c.font = '600 12px system-ui, sans-serif'
      c.fillText(`${index + 1}구역 · ${zone.name}`, 8, y - 6)
    }
  })
  const wind = CLIMB_MAP.zones[zoneAt(CLIMB_MAP, Math.floor(-feet)) - 1]?.wind ?? 0
  if (wind) {
    c.strokeStyle = 'rgba(70,110,160,.35)'
    c.lineWidth = 2
    for (let i = 0; i < 9; i++) {
      const drift = ((now / 6) * Math.sign(wind) + i * 97) % (VIEW_W + 60)
      const x = (drift < 0 ? drift + VIEW_W + 60 : drift) - 30
      const y = (i * 71 + 40) % VIEW_H
      c.beginPath()
      c.moveTo(x, y)
      c.lineTo(x + 26 * Math.sign(wind), y)
      c.stroke()
    }
  }

  // 발판
  for (const platform of CLIMB_MAP.platforms) {
    const y = sy(-platform.h)
    if (y < -20 || y > VIEW_H + 20 || platform.h === 0) continue
    if (platform.type === 'ice') {
      c.fillStyle = '#9fd8ef'
      c.fillRect(platform.x, y, platform.w, 12)
      c.fillStyle = '#e9f8ff'
      c.fillRect(platform.x, y, platform.w, 3)
    } else {
      // 가짜 발판은 색이 아주 조금 옅다 (자세히 보면 구별된다)
      c.fillStyle = platform.summit ? '#d9a520' : platform.type === 'fake' ? '#8a6f58' : '#7a5c44'
      c.fillRect(platform.x, y, platform.w, 12)
      c.fillStyle = platform.summit ? '#ffe08a' : platform.type === 'fake' ? '#7fb26a' : '#6aa84f'
      c.fillRect(platform.x, y, platform.w, 4)
    }
    if (platform.summit) {
      c.fillStyle = '#7a4b00'
      c.font = '700 13px system-ui, sans-serif'
      c.textAlign = 'center'
      c.fillText('정상', platform.x + platform.w / 2, y - 8)
      c.textAlign = 'left'
    }
  }

  // 표지판 (구역 시작 높이의 벽 쪽) — 발판 위에 겹쳐 그려 글이 가려지지 않게 한다
  if (board) {
    for (const sign of board.signs) {
      const zone = CLIMB_MAP.zones[sign.zone - 1]
      if (!zone) continue
      const y = sy(-(zone.fromH + 46))
      if (y < -40 || y > VIEW_H + 40) continue
      c.font = '600 12px system-ui, sans-serif'
      const width = Math.min(230, c.measureText(sign.text).width + 16)
      const x = VIEW_W - width - 8
      c.fillStyle = '#8a5a2b'
      c.fillRect(x + width / 2 - 2, y, 4, 26)
      c.fillStyle = '#f4dfb3'
      c.strokeStyle = '#8a5a2b'
      c.lineWidth = 2
      c.fillRect(x, y - 24, width, 24)
      c.strokeRect(x, y - 24, width, 24)
      c.fillStyle = '#4a2f12'
      c.textAlign = 'center'
      c.fillText(sign.text, x + width / 2, y - 8, width - 10)
      c.textAlign = 'left'
    }
  }

  // 친구 최고 높이 깃발 (왼쪽 벽)
  if (board) {
    c.font = '600 11px system-ui, sans-serif'
    for (const flag of board.flags) {
      const y = sy(-flag.height)
      if (y < -10 || y > VIEW_H + 10) continue
      c.fillStyle = '#555'
      c.fillRect(4, y - 22, 2, 22)
      c.fillStyle = flag.mine ? '#2f5d8c' : '#c2410c'
      c.beginPath()
      c.moveTo(6, y - 22)
      c.lineTo(22, y - 17)
      c.lineTo(6, y - 12)
      c.fill()
      c.fillStyle = 'rgba(30,30,40,.8)'
      c.fillText(flag.name, 26, y - 13, 110)
    }
  }

  // 캐릭터: 힘을 모으면 납작해진다
  const squash = state.ground >= 0 ? Math.min(state.charge, MAX_CHARGE) / MAX_CHARGE : 0
  const h = PLAYER_H * (1 - squash * 0.35)
  const w = PLAYER_W * (1 + squash * 0.25)
  const bx = px - w / 2
  const by = sy(feet) - h
  c.fillStyle = '#e86a5c'
  c.beginPath()
  if (typeof c.roundRect === 'function') c.roundRect(bx, by, w, h, 6)
  else c.rect(bx, by, w, h)
  c.fill()
  c.fillStyle = '#fff'
  const eye = state.facing * 3
  c.fillRect(px - 5 + eye, by + h * 0.28, 4, 5)
  c.fillRect(px + 2 + eye, by + h * 0.28, 4, 5)
  c.fillStyle = '#2a1a22'
  c.fillRect(px - 4 + eye + state.facing, by + h * 0.28 + 2, 2, 3)
  c.fillRect(px + 3 + eye + state.facing, by + h * 0.28 + 2, 2, 3)

  // 힘 게이지
  if (state.charge > 0 && state.ground >= 0) {
    c.fillStyle = 'rgba(0,0,0,.35)'
    c.fillRect(px - 20, by - 12, 40, 6)
    c.fillStyle = squash > 0.85 ? '#d64545' : '#f2b01e'
    c.fillRect(px - 20, by - 12, 40 * squash, 6)
  }
}

/**
 * 랑구 등반 화면. 엔진(engine.ts)을 1/60초 단위로 돌리며 누르고 뗀 순간을 프레임 번호와 함께 기록하고,
 * 그만두거나 정상에 닿으면 기록을 서버에 보내 같은 엔진으로 검증받는다.
 */
export function ClimbGame({ onWalletChange }: { onWalletChange?: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const stateRef = useRef<ClimbState>(createClimb(CLIMB_MAP))
  const inputsRef = useRef<ClimbInput[]>([])
  const pendingRef = useRef<ClimbAction[]>([])
  const runIdRef = useRef<string | null>(null)
  const phaseRef = useRef<Phase>('idle')
  const cameraRef = useRef({ y: -VIEW_H + 40 })
  const boardRef = useRef<Board | null>(null)
  const keysRef = useRef({ left: false, right: false, jump: false })

  const [phase, setPhaseState] = useState<Phase>('idle')
  const [hud, setHud] = useState({ height: 0, best: 0, zone: 1, frames: 0 })
  const [board, setBoard] = useState<Board | null>(null)
  const [finish, setFinish] = useState<RunFinish | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [signZone, setSignZone] = useState(1)
  const [signText, setSignText] = useState('')
  const [signNote, setSignNote] = useState<string | null>(null)

  const setPhase = (next: Phase) => {
    phaseRef.current = next
    setPhaseState(next)
  }

  const loadBoard = useCallback(async () => {
    try {
      const data = await gcFetch<Board>('/api/gamecenter/climb')
      boardRef.current = data
      setBoard(data)
    } catch (err) {
      if ((err as { status?: number }).status !== 401) setError((err as Error).message)
    }
  }, [])

  useEffect(() => {
    loadBoard()
  }, [loadBoard])

  const submit = useCallback(async () => {
    const runId = runIdRef.current
    if (!runId) return
    setPhase('saving')
    setError(null)
    try {
      const result = await gcPost<RunFinish>(`/api/gamecenter/runs/${runId}/finish`, {
        inputs: inputsRef.current,
        clientScore: stateRef.current.maxHeight,
      })
      setFinish(result)
      setPhase('done')
      onWalletChange?.()
      loadBoard()
    } catch (err) {
      setError((err as Error).message)
      setPhase('failed')
    }
  }, [loadBoard, onWalletChange])

  /** 키 상태가 바뀔 때만 입력으로 기록한다 */
  const setKey = useCallback((key: 'left' | 'right' | 'jump', on: boolean) => {
    if (phaseRef.current !== 'playing' || keysRef.current[key] === on) return
    keysRef.current[key] = on
    pendingRef.current.push(`${key}${on ? 'On' : 'Off'}` as ClimbAction)
  }, [])

  const quit = useCallback(() => {
    if (phaseRef.current === 'playing') pendingRef.current.push('end')
  }, [])

  // 게임 루프
  useEffect(() => {
    let raf = 0
    let last = performance.now()
    let acc = 0
    let hudKey = ''
    const loop = (now: number) => {
      const state = stateRef.current
      if (phaseRef.current === 'playing') {
        acc = Math.min(acc + (now - last), TICK_MS * 5)
        while (acc >= TICK_MS && !state.over) {
          for (const action of pendingRef.current) {
            inputsRef.current.push({ frame: state.frame, action })
            applyClimbAction(state, action)
          }
          pendingRef.current = []
          // 다 모여서 저절로 뛰면 엔진이 점프 키를 뗀 것으로 본다 — 화면 쪽 키 상태도 맞춘다
          const wasCharging = state.jump
          stepClimb(state, CLIMB_MAP)
          if (wasCharging && !state.jump) keysRef.current.jump = false
          acc -= TICK_MS
        }
        if (state.over) {
          // 기록은 끝난 프레임의 'end' 로 닫는다 (정상에 닿아 끝난 경우 포함)
          const lastInput = inputsRef.current[inputsRef.current.length - 1]
          if (!lastInput || lastInput.action !== 'end') inputsRef.current.push({ frame: state.frame, action: 'end' })
          submit()
        }
        const height = Math.max(0, Math.floor(-state.y / SUB))
        const key = `${Math.floor(height / 10)}|${state.maxHeight}|${state.maxZone}|${Math.floor(state.frame / 60)}`
        if (key !== hudKey) {
          hudKey = key
          setHud({ height, best: state.maxHeight, zone: zoneAt(CLIMB_MAP, height), frames: state.frame })
        }
      }
      last = now
      if (canvasRef.current) draw(canvasRef.current, state, cameraRef.current, boardRef.current, now)
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [submit])

  const start = useCallback(async () => {
    if (['starting', 'playing', 'saving'].includes(phaseRef.current)) return
    setPhase('starting')
    setError(null)
    setFinish(null)
    try {
      const run = await gcPost<{ runId: string }>('/api/gamecenter/runs', { game: 'climb' })
      runIdRef.current = run.runId
      inputsRef.current = []
      pendingRef.current = []
      keysRef.current = { left: false, right: false, jump: false }
      stateRef.current = createClimb(CLIMB_MAP)
      setHud({ height: 0, best: 0, zone: 1, frames: 0 })
      setPhase('playing')
    } catch (err) {
      setError((err as Error).message)
      setPhase('idle')
    }
  }, [])

  // 키보드: ← → (A D) 방향, 스페이스 점프
  useEffect(() => {
    const typing = (target: EventTarget | null) =>
      target instanceof HTMLElement && (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName))
    const keyOf = (event: KeyboardEvent) => {
      const key = event.key.length === 1 ? event.key.toLowerCase() : event.key
      if (key === 'ArrowLeft' || key === 'a') return 'left' as const
      if (key === 'ArrowRight' || key === 'd') return 'right' as const
      if (key === ' ' || key === 'ArrowUp' || key === 'w') return 'jump' as const
      return null
    }
    const down = (event: KeyboardEvent) => {
      const key = keyOf(event)
      if (!key || typing(event.target) || phaseRef.current !== 'playing') return
      event.preventDefault()
      if (!event.repeat) setKey(key, true)
    }
    const up = (event: KeyboardEvent) => {
      const key = keyOf(event)
      if (key) setKey(key, false)
    }
    // 창을 벗어나면 누르던 키를 모두 뗀 것으로 본다
    const blur = () => (['left', 'right', 'jump'] as const).forEach((key) => setKey(key, false))
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    window.addEventListener('blur', blur)
    return () => {
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
      window.removeEventListener('blur', blur)
    }
  }, [setKey])

  // 진행 중에 나가면 기록이 사라진다고 알린다
  useEffect(() => {
    if (phase !== 'playing') return
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault()
      event.returnValue = ''
    }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [phase])

  const saveSign = async (event: React.FormEvent) => {
    event.preventDefault()
    setSignNote(null)
    try {
      await gcFetch('/api/gamecenter/climb/signs', {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ zone: signZone, text: signText }),
      })
      setSignText('')
      setSignNote('표지판을 세웠습니다.')
      loadBoard()
    } catch (err) {
      setSignNote((err as Error).message)
    }
  }

  const playing = phase === 'playing'
  const pad = (label: string, icon: React.ReactNode, key: 'left' | 'right' | 'jump', extra = '') => (
    <button
      type="button"
      className={`${PAD} ${extra}`}
      aria-label={label}
      disabled={!playing}
      onPointerDown={(event) => {
        event.preventDefault()
        setKey(key, true)
      }}
      onPointerUp={() => setKey(key, false)}
      onPointerLeave={() => setKey(key, false)}
      onPointerCancel={() => setKey(key, false)}
      onContextMenu={(event) => event.preventDefault()}
    >
      {icon}
    </button>
  )
  const result = finish?.result as { maxHeight: number; biggestFall: number; completedAt: number | null; frames: number } | null | undefined
  const reachedZones = Math.max(board?.me.maxZone ?? 1, 1)

  return (
    <div className="mx-auto flex max-w-4xl flex-wrap items-start justify-center gap-4">
      <div className="w-full max-w-[480px]">
        <div className="mb-2 grid grid-cols-4 gap-2 text-center">
          {[
            ['높이', meters(hud.height)],
            ['이번 판 최고', meters(hud.best)],
            ['구역', `${hud.zone} · ${CLIMB_MAP.zones[hud.zone - 1]?.name ?? ''}`],
            ['시간', clock(hud.frames)],
          ].map(([label, value]) => (
            <div key={label} className="rounded-md border border-[color:var(--wiki-rule)] bg-[color:var(--wiki-panel)] px-1 py-1.5">
              <div className="text-[11px] text-[color:var(--wiki-ink-muted)]">{label}</div>
              <div className="truncate text-sm font-bold tabular-nums text-[color:var(--wiki-ink)]">{value}</div>
            </div>
          ))}
        </div>

        <div className="relative overflow-hidden rounded-lg border border-[color:var(--wiki-rule-strong)]">
          <canvas
            ref={canvasRef}
            className="block h-auto w-full touch-none"
            style={{ aspectRatio: `${VIEW_W} / ${VIEW_H}` }}
            role="img"
            aria-label="랑구 등반 화면"
          />
          {!playing && (
            <div className="absolute inset-0 grid place-items-center bg-[rgba(10,12,18,.72)] p-4 text-center text-[#fff]">
              <div>
                {phase === 'idle' && (
                  <p className="mb-3 text-sm leading-relaxed">
                    점프를 누르고 있으면 힘이 모이고, 떼면 그때 누르고 있던 방향으로 뜁니다.
                    <br />
                    공중에서는 방향을 바꿀 수 없고, 체크포인트는 없습니다.
                  </p>
                )}
                {phase === 'saving' && <p className="text-sm">서버에서 기록을 확인하는 중입니다.</p>}
                {phase === 'done' && finish && (
                  <p className="text-lg font-bold">
                    {finish.status !== 'verified'
                      ? '기록 인정 안 됨'
                      : result?.completedAt != null
                        ? `완주! ${clock(result.completedAt)}`
                        : `최고 ${meters(result?.maxHeight ?? 0)}`}
                    {finish.status === 'verified' && finish.personalBest && <span className="block text-sm font-medium text-[#ffd76a]">개인 최고 기록!</span>}
                  </p>
                )}
                {phase === 'failed' && <p className="text-sm">기록을 보내지 못했습니다.</p>}
                {phase === 'failed' ? (
                  <button type="button" className={`${PRIMARY} mt-3`} onClick={submit}>
                    기록 다시 보내기
                  </button>
                ) : (
                  phase !== 'saving' && (
                    <button type="button" className={`${PRIMARY} mt-3`} onClick={start} disabled={phase === 'starting'}>
                      {phase === 'starting' ? '준비하는 중' : phase === 'done' ? '다시 오르기' : '오르기 시작'}
                    </button>
                  )
                )}
              </div>
            </div>
          )}
        </div>

        <div className="mt-3 grid grid-cols-4 gap-2" aria-label="터치 조작">
          {pad('왼쪽', <ArrowLeft className="h-6 w-6" aria-hidden />, 'left')}
          {pad('오른쪽', <ArrowRight className="h-6 w-6" aria-hidden />, 'right')}
          {pad(
            '점프 (누르고 있으면 힘이 모임)',
            <span className="flex items-center gap-1 text-sm font-semibold">
              <ArrowUp className="h-5 w-5" aria-hidden />
              점프
            </span>,
            'jump',
            'col-span-2'
          )}
        </div>
        <div className="mt-2 flex items-center justify-between gap-2">
          <p className="text-xs text-[color:var(--wiki-ink-muted)]">키보드: ← → 방향, 스페이스 점프(길게 누를수록 높이)</p>
          {playing && (
            <button type="button" className={BUTTON} onClick={quit}>
              그만하고 기록 저장
            </button>
          )}
        </div>
      </div>

      <aside className="w-full max-w-[480px] space-y-3 md:w-64">
        {error && (
          <p role="alert" className="wiki-mbox wiki-mbox--danger">
            {error}
          </p>
        )}
        {phase === 'done' && finish && (
          <div className="wiki-panel">
            <h2 className="mb-2 text-sm font-semibold text-[color:var(--wiki-ink)]">이번 판</h2>
            {finish.status === 'verified' && result && (
              <p className="mb-2 text-sm text-[color:var(--wiki-ink-soft)]">
                최고 {meters(result.maxHeight)} · 가장 크게 떨어진 높이 {meters(result.biggestFall)} · {clock(result.frames)}
              </p>
            )}
            <RunAwards finish={finish} />
          </div>
        )}

        <div className="wiki-panel">
          <h2 className="text-sm font-semibold text-[color:var(--wiki-ink)]">내 기록</h2>
          <p className="mt-1 text-sm text-[color:var(--wiki-ink-soft)]">
            최고 {meters(board?.me.bestHeight ?? 0)} / {meters(CLIMB_SUMMIT_HEIGHT)}
            {board?.me.bestTime != null && ` · 완주 ${clock(board.me.bestTime)}`}
          </p>
          <h2 className="mt-3 text-sm font-semibold text-[color:var(--wiki-ink)]">이번 주 가장 크게 떨어진 사람</h2>
          <p className="mt-1 text-sm text-[color:var(--wiki-ink-soft)]">
            {board?.weeklyFall ? `${board.weeklyFall.name} — ${meters(board.weeklyFall.fall)}` : '아직 아무도 떨어지지 않았습니다.'}
          </p>
        </div>

        <div className="wiki-panel">
          <h2 className="text-sm font-semibold text-[color:var(--wiki-ink)]">최고 높이 깃발</h2>
          {!board || board.flags.length === 0 ? (
            <p className="mt-1 text-sm text-[color:var(--wiki-ink-muted)]">아직 깃발이 없습니다. 첫 깃발을 꽂아 보세요.</p>
          ) : (
            <ol className="mt-2 space-y-1 text-sm">
              {board.flags.slice(0, 10).map((flag, index) => (
                <li key={flag.userId} className="flex justify-between gap-2">
                  <span className={`truncate ${flag.mine ? 'font-semibold text-[color:var(--wiki-accent)]' : 'text-[color:var(--wiki-ink)]'}`}>
                    {index + 1}. {flag.name}
                  </span>
                  <span className="shrink-0 tabular-nums text-[color:var(--wiki-ink-soft)]">{meters(flag.height)}</span>
                </li>
              ))}
            </ol>
          )}
        </div>

        <form className="wiki-panel" onSubmit={saveSign}>
          <h2 className="text-sm font-semibold text-[color:var(--wiki-ink)]">표지판 남기기</h2>
          <p className="mt-1 text-xs leading-relaxed text-[color:var(--wiki-ink-muted)]">
            구역마다 표지판은 하나뿐이라, 새로 쓰면 이전 글을 덮습니다. 올라가 본 구역에만 쓸 수 있습니다.
          </p>
          <div className="mt-2 grid grid-cols-[auto_1fr] gap-2">
            <select className={INPUT} value={signZone} aria-label="구역" onChange={(event) => setSignZone(Number(event.target.value))}>
              {CLIMB_MAP.zones.slice(0, reachedZones).map((zone, index) => (
                <option key={index} value={index + 1}>
                  {index + 1}구역
                </option>
              ))}
            </select>
            <input
              className={INPUT}
              value={signText}
              maxLength={20}
              placeholder="한마디 (20자)"
              aria-label="표지판에 남길 말"
              onChange={(event) => setSignText(event.target.value)}
            />
          </div>
          {board?.signs.find((sign) => sign.zone === signZone) && (
            <p className="mt-2 text-xs text-[color:var(--wiki-ink-muted)]">
              지금 글: “{board.signs.find((sign) => sign.zone === signZone)!.text}” — {board.signs.find((sign) => sign.zone === signZone)!.author}
            </p>
          )}
          <div className="mt-2 flex items-center justify-between gap-2">
            <span role="status" className="text-xs text-[color:var(--wiki-ink-muted)]">
              {signNote}
            </span>
            <button type="submit" className={BUTTON} disabled={!signText.trim()}>
              세우기
            </button>
          </div>
        </form>
      </aside>
    </div>
  )
}
