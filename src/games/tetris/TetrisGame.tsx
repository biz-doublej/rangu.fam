'use client'

import React, { useCallback, useEffect, useRef, useState } from 'react'
import { ArrowDown, ArrowLeft, ArrowRight, ChevronsDown, RotateCcw, RotateCw } from 'lucide-react'
import { RunAwards, type RunFinish } from '@/components/gamecenter/RunResult'
import { gcPost } from '@/components/gamecenter/useGamecenterMe'
import {
  COLS,
  FPS,
  HIDDEN_ROWS,
  PIECES,
  PREVIEW_COUNT,
  SHAPES,
  VISIBLE_ROWS,
  applyAction,
  createTetris,
  ghostY,
  pieceCells,
  stepFrame,
  type PieceType,
  type TetrisAction,
  type TetrisInput,
  type TetrisState,
} from './engine'

const CELL = 28
const BOARD_W = COLS * CELL
const BOARD_H = VISIBLE_ROWS * CELL
const TICK_MS = 1000 / FPS
/** 좌우 키를 누르고 있을 때: 이만큼 기다렸다가(DAS) 이 간격으로 반복(ARR) — 프레임 */
const DAS = 10
const ARR = 2
const COLORS: Record<PieceType, string> = {
  I: '#22b8cf',
  J: '#3b6fd4',
  L: '#e8842b',
  O: '#e5b81f',
  S: '#3fa652',
  T: '#9a4fc7',
  Z: '#d64545',
}
const BUTTON =
  'inline-flex items-center justify-center gap-1.5 rounded-md border border-[color:var(--wiki-rule-strong)] bg-[color:var(--wiki-panel)] px-3 py-1.5 text-sm text-[color:var(--wiki-ink-soft)] hover:bg-[color:var(--wiki-bg-2)] disabled:cursor-not-allowed disabled:opacity-50'
const PRIMARY =
  'inline-flex items-center justify-center gap-1.5 rounded-md bg-[color:var(--wiki-accent)] px-4 py-2 text-sm font-medium text-[#fff] hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50'
const PAD =
  'grid h-14 select-none place-items-center rounded-lg border border-[color:var(--wiki-rule-strong)] bg-[color:var(--wiki-panel)] text-[color:var(--wiki-ink)] active:bg-[color:var(--wiki-bg-2)] disabled:opacity-40'

type Phase = 'idle' | 'starting' | 'playing' | 'saving' | 'done' | 'failed'

interface Hud {
  score: number
  lines: number
  level: number
  hold: PieceType | null
  next: PieceType[]
}

function drawCell(c: CanvasRenderingContext2D, x: number, y: number, color: string, size = CELL) {
  c.fillStyle = color
  c.fillRect(x + 1, y + 1, size - 2, size - 2)
  c.fillStyle = 'rgba(255,255,255,.28)'
  c.fillRect(x + 1, y + 1, size - 2, 3)
  c.fillStyle = 'rgba(0,0,0,.18)'
  c.fillRect(x + 1, y + size - 4, size - 2, 3)
}

function drawBoard(canvas: HTMLCanvasElement, state: TetrisState | null) {
  const c = canvas.getContext('2d')
  if (!c) return
  const dpr = Math.min(window.devicePixelRatio || 1, 2)
  if (canvas.width !== BOARD_W * dpr) {
    canvas.width = BOARD_W * dpr
    canvas.height = BOARD_H * dpr
  }
  c.setTransform(dpr, 0, 0, dpr, 0, 0)
  c.fillStyle = '#12151c'
  c.fillRect(0, 0, BOARD_W, BOARD_H)
  c.strokeStyle = 'rgba(255,255,255,.06)'
  c.lineWidth = 1
  for (let x = 1; x < COLS; x++) {
    c.beginPath()
    c.moveTo(x * CELL + 0.5, 0)
    c.lineTo(x * CELL + 0.5, BOARD_H)
    c.stroke()
  }
  for (let y = 1; y < VISIBLE_ROWS; y++) {
    c.beginPath()
    c.moveTo(0, y * CELL + 0.5)
    c.lineTo(BOARD_W, y * CELL + 0.5)
    c.stroke()
  }
  if (!state) return

  for (let y = HIDDEN_ROWS; y < state.board.length; y++) {
    for (let x = 0; x < COLS; x++) {
      const cell = state.board[y][x]
      if (cell) drawCell(c, x * CELL, (y - HIDDEN_ROWS) * CELL, COLORS[PIECES[cell - 1]])
    }
  }
  if (state.piece) {
    const color = COLORS[state.piece.type]
    const gy = ghostY(state)
    if (gy !== null && gy !== state.piece.y) {
      c.strokeStyle = color
      c.lineWidth = 2
      for (const [x, y] of pieceCells({ ...state.piece, y: gy })) {
        if (y >= HIDDEN_ROWS) c.strokeRect(x * CELL + 3, (y - HIDDEN_ROWS) * CELL + 3, CELL - 6, CELL - 6)
      }
    }
    for (const [x, y] of pieceCells(state.piece)) {
      if (y >= HIDDEN_ROWS) drawCell(c, x * CELL, (y - HIDDEN_ROWS) * CELL, color)
    }
  }
}

function MiniPiece({ type }: { type: PieceType | null }) {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const canvas = ref.current
    const c = canvas?.getContext('2d')
    if (!canvas || !c) return
    c.clearRect(0, 0, canvas.width, canvas.height)
    if (!type) return
    const size = 14
    const cells = SHAPES[type][0]
    const xs = cells.map(([x]) => x)
    const ys = cells.map(([, y]) => y)
    const w = Math.max(...xs) - Math.min(...xs) + 1
    const h = Math.max(...ys) - Math.min(...ys) + 1
    const ox = (canvas.width - w * size) / 2 - Math.min(...xs) * size
    const oy = (canvas.height - h * size) / 2 - Math.min(...ys) * size
    for (const [x, y] of cells) drawCell(c, ox + x * size, oy + y * size, COLORS[type], size)
  }, [type])
  return <canvas ref={ref} width={64} height={40} className="mx-auto block" aria-hidden />
}

/**
 * 테트리스 화면. 엔진(engine.ts)을 1/60초 단위로 돌리며 입력을 프레임 번호와 함께 기록하고,
 * 판이 끝나면 기록을 서버에 보내 같은 엔진으로 검증받는다.
 */
export function TetrisGame({ onWalletChange }: { onWalletChange?: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const stateRef = useRef<TetrisState | null>(null)
  const inputsRef = useRef<TetrisInput[]>([])
  const runIdRef = useRef<string | null>(null)
  const pendingRef = useRef<TetrisAction[]>([])
  /** 누르고 있는 좌우 방향과 그 뒤로 지난 프레임 */
  const heldRef = useRef<{ dir: -1 | 0 | 1; frames: number }>({ dir: 0, frames: 0 })
  const phaseRef = useRef<Phase>('idle')

  const [phase, setPhaseState] = useState<Phase>('idle')
  const [hud, setHud] = useState<Hud>({ score: 0, lines: 0, level: 1, hold: null, next: [] })
  const [finish, setFinish] = useState<RunFinish | null>(null)
  const [error, setError] = useState<string | null>(null)

  const setPhase = (next: Phase) => {
    phaseRef.current = next
    setPhaseState(next)
  }

  const submit = useCallback(async () => {
    const state = stateRef.current
    const runId = runIdRef.current
    if (!state || !runId) return
    setPhase('saving')
    setError(null)
    try {
      const result = await gcPost<RunFinish>(`/api/gamecenter/runs/${runId}/finish`, {
        inputs: inputsRef.current,
        clientScore: state.score,
      })
      setFinish(result)
      setPhase('done')
      onWalletChange?.()
    } catch (err) {
      // 기록은 남아 있다 — 다시 보내기를 누르면 같은 판을 다시 제출한다.
      setError((err as Error).message)
      setPhase('failed')
    }
  }, [onWalletChange])

  const push = useCallback((action: TetrisAction) => {
    if (phaseRef.current === 'playing') pendingRef.current.push(action)
  }, [])

  const setHeld = useCallback(
    (dir: -1 | 0 | 1) => {
      if (dir === 0) {
        heldRef.current = { dir: 0, frames: 0 }
        return
      }
      if (heldRef.current.dir === dir) return
      heldRef.current = { dir, frames: 0 }
      push(dir < 0 ? 'left' : 'right')
    },
    [push]
  )

  // 게임 루프: 화면 주사율과 상관없이 1/60초 단위로 진행한다.
  useEffect(() => {
    let raf = 0
    let last = performance.now()
    let acc = 0
    let hudKey = ''
    const loop = (now: number) => {
      const state = stateRef.current
      if (state && phaseRef.current === 'playing') {
        // 탭이 가려졌다 돌아오면 밀린 시간을 따라잡지 않는다 (그동안은 멈춘 것으로 본다)
        acc = Math.min(acc + (now - last), TICK_MS * 5)
        while (acc >= TICK_MS && !state.over) {
          const held = heldRef.current
          if (held.dir) {
            held.frames++
            if (held.frames > DAS && (held.frames - DAS) % ARR === 0) pendingRef.current.push(held.dir < 0 ? 'left' : 'right')
          }
          for (const action of pendingRef.current) {
            inputsRef.current.push({ frame: state.frame, action })
            applyAction(state, action)
          }
          pendingRef.current = []
          stepFrame(state)
          acc -= TICK_MS
        }
        const key = `${state.score}|${state.lines}|${state.hold}|${state.queue.slice(0, PREVIEW_COUNT).join('')}`
        if (key !== hudKey) {
          hudKey = key
          setHud({ score: state.score, lines: state.lines, level: state.level, hold: state.hold, next: state.queue.slice(0, PREVIEW_COUNT) })
        }
        if (state.over) submit()
      }
      last = now
      if (canvasRef.current) drawBoard(canvasRef.current, state)
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [submit])

  const start = useCallback(async () => {
    if (phaseRef.current === 'starting' || phaseRef.current === 'playing' || phaseRef.current === 'saving') return
    setPhase('starting')
    setError(null)
    setFinish(null)
    try {
      const run = await gcPost<{ runId: string; seed: number }>('/api/gamecenter/runs', { game: 'tetris' })
      runIdRef.current = run.runId
      inputsRef.current = []
      pendingRef.current = []
      heldRef.current = { dir: 0, frames: 0 }
      stateRef.current = createTetris(run.seed)
      setPhase('playing')
    } catch (err) {
      setError((err as Error).message)
      setPhase('idle')
    }
  }, [])

  // 키보드
  useEffect(() => {
    const typing = (target: EventTarget | null) =>
      target instanceof HTMLElement && (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName))
    const down = (event: KeyboardEvent) => {
      if (typing(event.target) || phaseRef.current !== 'playing') return
      const key = event.key.length === 1 ? event.key.toLowerCase() : event.key
      if (['ArrowLeft', 'ArrowRight', 'ArrowDown', 'ArrowUp', ' '].includes(key)) event.preventDefault()
      if (event.repeat) return
      if (key === 'ArrowLeft') setHeld(-1)
      else if (key === 'ArrowRight') setHeld(1)
      else if (key === 'ArrowDown') push('softOn')
      else if (key === 'ArrowUp' || key === 'x') push('rotateCW')
      else if (key === 'z') push('rotateCCW')
      else if (key === ' ') push('hardDrop')
      else if (key === 'c' || key === 'Shift') push('hold')
    }
    const up = (event: KeyboardEvent) => {
      if (event.key === 'ArrowLeft' && heldRef.current.dir === -1) setHeld(0)
      else if (event.key === 'ArrowRight' && heldRef.current.dir === 1) setHeld(0)
      else if (event.key === 'ArrowDown') push('softOff')
    }
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    return () => {
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
    }
  }, [push, setHeld])

  const playing = phase === 'playing'
  /** 누르고 있는 동안 동작하는 터치 버튼 */
  const holdPad = (label: string, icon: React.ReactNode, onDown: () => void, onUp: () => void) => (
    <button
      type="button"
      className={PAD}
      aria-label={label}
      disabled={!playing}
      onPointerDown={(event) => {
        event.preventDefault()
        onDown()
      }}
      onPointerUp={onUp}
      onPointerLeave={onUp}
      onPointerCancel={onUp}
      onContextMenu={(event) => event.preventDefault()}
    >
      {icon}
    </button>
  )
  const tapPad = (label: string, icon: React.ReactNode, action: TetrisAction) => (
    <button
      type="button"
      className={PAD}
      aria-label={label}
      disabled={!playing}
      onPointerDown={(event) => {
        event.preventDefault()
        push(action)
      }}
      onContextMenu={(event) => event.preventDefault()}
    >
      {icon}
    </button>
  )

  const stat = (label: string, value: React.ReactNode) => (
    <div>
      <dt className="text-xs text-[color:var(--wiki-ink-muted)]">{label}</dt>
      <dd className="text-lg font-bold tabular-nums text-[color:var(--wiki-ink)]">{value}</dd>
    </div>
  )

  return (
    <div className="mx-auto flex max-w-3xl flex-wrap items-start justify-center gap-4">
      <div className="w-full max-w-[280px]">
        <div className="relative overflow-hidden rounded-lg border border-[color:var(--wiki-rule-strong)]">
          <canvas
            ref={canvasRef}
            className="block h-auto w-full touch-none"
            style={{ aspectRatio: `${BOARD_W} / ${BOARD_H}` }}
            role="img"
            aria-label="테트리스 판"
          />
          {!playing && (
            <div className="absolute inset-0 grid place-items-center bg-[rgba(10,12,18,.78)] p-4 text-center text-[#fff]">
              <div>
                {phase === 'saving' && <p className="text-sm">서버에서 기록을 확인하는 중입니다.</p>}
                {phase === 'done' && finish && (
                  <p className="text-lg font-bold">
                    {finish.status === 'verified' ? `${(finish.score ?? 0).toLocaleString('ko-KR')}점` : '기록 인정 안 됨'}
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
                      {phase === 'starting' ? '준비하는 중' : phase === 'done' ? '한 판 더' : '시작'}
                    </button>
                  )
                )}
              </div>
            </div>
          )}
        </div>

        {/* 모바일 터치 조작 */}
        <div className="mt-3 grid grid-cols-4 gap-2" aria-label="터치 조작">
          {holdPad('왼쪽', <ArrowLeft className="h-6 w-6" aria-hidden />, () => setHeld(-1), () => heldRef.current.dir === -1 && setHeld(0))}
          {holdPad('오른쪽', <ArrowRight className="h-6 w-6" aria-hidden />, () => setHeld(1), () => heldRef.current.dir === 1 && setHeld(0))}
          {tapPad('왼쪽으로 돌리기', <RotateCcw className="h-6 w-6" aria-hidden />, 'rotateCCW')}
          {tapPad('오른쪽으로 돌리기', <RotateCw className="h-6 w-6" aria-hidden />, 'rotateCW')}
          {holdPad('천천히 내리기', <ArrowDown className="h-6 w-6" aria-hidden />, () => push('softOn'), () => push('softOff'))}
          {tapPad('바로 떨어뜨리기', <ChevronsDown className="h-6 w-6" aria-hidden />, 'hardDrop')}
          <button
            type="button"
            className={`${PAD} col-span-2 text-sm font-semibold`}
            disabled={!playing}
            onPointerDown={(event) => {
              event.preventDefault()
              push('hold')
            }}
          >
            홀드
          </button>
        </div>
      </div>

      <aside className="w-full max-w-[280px] space-y-3 sm:w-56">
        <div className="wiki-panel">
          <dl className="grid grid-cols-3 gap-2 sm:grid-cols-1">
            {stat('점수', hud.score.toLocaleString('ko-KR'))}
            {stat('줄', hud.lines)}
            {stat('레벨', hud.level)}
          </dl>
        </div>
        <div className="wiki-panel grid grid-cols-[auto_1fr] gap-3 sm:block">
          <div>
            <h2 className="text-xs text-[color:var(--wiki-ink-muted)]">홀드</h2>
            <div className="mt-1 rounded bg-[#12151c] py-1">
              <MiniPiece type={hud.hold} />
            </div>
          </div>
          <div className="min-w-0 sm:mt-3">
            <h2 className="text-xs text-[color:var(--wiki-ink-muted)]">다음</h2>
            <div className="mt-1 flex gap-1 overflow-hidden rounded bg-[#12151c] py-1 sm:block">
              {(hud.next.length ? hud.next : Array<PieceType | null>(PREVIEW_COUNT).fill(null)).map((type, index) => (
                <MiniPiece key={index} type={type} />
              ))}
            </div>
          </div>
        </div>

        {playing && (
          <button type="button" className={`${BUTTON} w-full`} onClick={() => push('end')}>
            그만하고 기록 저장
          </button>
        )}
        {error && (
          <p role="alert" className="wiki-mbox wiki-mbox--danger">
            {error}
          </p>
        )}
        {phase === 'done' && finish && (
          <div className="wiki-panel">
            <h2 className="mb-2 text-sm font-semibold text-[color:var(--wiki-ink)]">이번 판 보상</h2>
            <RunAwards finish={finish} />
          </div>
        )}
        <p className="text-xs leading-relaxed text-[color:var(--wiki-ink-muted)]">
          키보드: ← → 이동, ↓ 천천히, ↑·X 오른쪽 회전, Z 왼쪽 회전, 스페이스 바로 떨어뜨리기, C·Shift 홀드
        </p>
      </aside>
    </div>
  )
}
