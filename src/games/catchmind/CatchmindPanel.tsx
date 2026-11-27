'use client'

import React, { useCallback, useEffect, useRef, useState } from 'react'
import { Eraser } from 'lucide-react'
import { useCountdown } from '@/components/gamecenter/useCountdown'
import type { RoomAck } from '@/components/gamecenter/useRoom'
import {
  CATCHMIND_COLORS,
  CATCHMIND_GUESS_MAX,
  CATCHMIND_SIZE,
  CATCHMIND_WIDTHS,
  type CatchmindStroke,
  type CatchmindView,
} from './rules'

const BUTTON =
  'inline-flex items-center justify-center gap-1.5 rounded-md border border-[color:var(--wiki-rule-strong)] bg-[color:var(--wiki-panel)] px-3 py-1.5 text-sm text-[color:var(--wiki-ink-soft)] hover:bg-[color:var(--wiki-bg-2)] disabled:cursor-not-allowed disabled:opacity-50'
const PRIMARY =
  'inline-flex items-center justify-center gap-1.5 rounded-md bg-[color:var(--wiki-accent)] px-4 py-2 text-sm font-medium text-[#fff] hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50'
/** 획을 묶어 보내는 간격 */
const FLUSH_MS = 50

type StreamPayload =
  | { t: 'stroke'; id: number; c: number; w: number; p: number[] }
  | { t: 'clear' }
  | { t: 'full'; round: number; strokes: CatchmindStroke[] }

function drawSegment(c: CanvasRenderingContext2D, color: number, width: number, points: number[], from?: [number, number]) {
  c.strokeStyle = CATCHMIND_COLORS[color] ?? CATCHMIND_COLORS[0]
  c.fillStyle = c.strokeStyle
  c.lineWidth = width
  c.lineCap = 'round'
  c.lineJoin = 'round'
  if (!from && points.length === 2) {
    // 점 하나만 찍은 경우
    c.beginPath()
    c.arc(points[0], points[1], width / 2, 0, Math.PI * 2)
    c.fill()
    return
  }
  c.beginPath()
  if (from) c.moveTo(from[0], from[1])
  else c.moveTo(points[0], points[1])
  for (let i = from ? 0 : 2; i < points.length; i += 2) c.lineTo(points[i], points[i + 1])
  c.stroke()
}

/**
 * 캐치마인드 화면. 출제자는 그리고(획을 50ms 단위로 묶어 보낸다), 나머지는 그림을 보며 답을 적는다.
 * 그림은 방 상태와 따로 흐른다 — subscribeStream 으로 받고 stream 으로 보낸다.
 */
export function CatchmindPanel({
  state,
  userId,
  clockOffset,
  act,
  stream,
  subscribeStream,
}: {
  state: CatchmindView
  userId: string | null
  clockOffset: number
  act: (event: string, payload?: unknown) => Promise<RoomAck>
  stream: (payload: unknown) => void
  subscribeStream: (listener: (payload: unknown) => void) => () => void
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  /** 획 id → 마지막 점 (나눠서 온 획을 이어 그리려고) */
  const lastPointRef = useRef(new Map<number, [number, number]>())
  const drawingRef = useRef<{ id: number; buffer: number[]; last: [number, number] } | null>(null)
  const strokeSeqRef = useRef(1)
  const roundRef = useRef(state.round)
  roundRef.current = state.round
  const [color, setColor] = useState(0)
  const [width, setWidth] = useState(CATCHMIND_WIDTHS[1])
  const [guess, setGuess] = useState('')
  const [notice, setNotice] = useState<string | null>(null)

  const seconds = useCountdown(state.deadline, clockOffset, state.phase === 'draw')
  const isDrawer = state.drawer === userId
  const canDraw = isDrawer && state.phase === 'draw'
  const iKnow = state.word !== null
  const inGame = Boolean(userId && state.active.includes(userId))
  const nameOf = (id: string) => state.players.find((player) => player.userId === id)?.name ?? '나간 사람'

  const context = () => canvasRef.current?.getContext('2d') ?? null
  const clearCanvas = useCallback(() => {
    const c = context()
    if (!c) return
    c.fillStyle = '#ffffff'
    c.fillRect(0, 0, CATCHMIND_SIZE.width, CATCHMIND_SIZE.height)
    lastPointRef.current.clear()
  }, [])

  // 다른 사람이 그린 획을 받아 그린다
  useEffect(() => {
    clearCanvas()
    return subscribeStream((raw) => {
      const payload = raw as StreamPayload
      const c = context()
      if (!c || !payload) return
      if (payload.t === 'clear') {
        clearCanvas()
      } else if (payload.t === 'full') {
        // 지난 라운드의 그림이 늦게 온 것이면 버린다
        if (payload.round !== roundRef.current) return
        clearCanvas()
        for (const stroke of payload.strokes) {
          drawSegment(c, stroke.c, stroke.w, stroke.p)
          lastPointRef.current.set(stroke.id, [stroke.p[stroke.p.length - 2], stroke.p[stroke.p.length - 1]])
        }
      } else if (payload.t === 'stroke') {
        drawSegment(c, payload.c, payload.w, payload.p, lastPointRef.current.get(payload.id))
        lastPointRef.current.set(payload.id, [payload.p[payload.p.length - 2], payload.p[payload.p.length - 1]])
      }
    })
  }, [clearCanvas, subscribeStream])

  // 라운드가 바뀌면 새 종이 (처음 뜰 때는 방금 받은 ‘지금까지의 그림’을 지우지 않는다)
  const shownRoundRef = useRef(state.round)
  useEffect(() => {
    if (shownRoundRef.current === state.round) return
    shownRoundRef.current = state.round
    clearCanvas()
    drawingRef.current = null
    setGuess('')
    setNotice(null)
  }, [state.round, clearCanvas])

  // 그리는 동안 50ms 마다 모아 둔 점을 보낸다
  useEffect(() => {
    if (!canDraw) return
    const timer = window.setInterval(() => {
      const current = drawingRef.current
      if (!current || current.buffer.length === 0) return
      stream({ t: 'stroke', id: current.id, c: color, w: width, p: current.buffer })
      current.buffer = []
    }, FLUSH_MS)
    return () => window.clearInterval(timer)
  }, [canDraw, color, width, stream])

  /** 화면 좌표 → 그림 좌표(정수) */
  const toPoint = (event: React.PointerEvent<HTMLCanvasElement>): [number, number] => {
    const rect = event.currentTarget.getBoundingClientRect()
    const x = Math.round(((event.clientX - rect.left) / rect.width) * CATCHMIND_SIZE.width)
    const y = Math.round(((event.clientY - rect.top) / rect.height) * CATCHMIND_SIZE.height)
    return [Math.max(0, Math.min(CATCHMIND_SIZE.width, x)), Math.max(0, Math.min(CATCHMIND_SIZE.height, y))]
  }

  const flushNow = () => {
    const current = drawingRef.current
    if (current && current.buffer.length > 0) {
      stream({ t: 'stroke', id: current.id, c: color, w: width, p: current.buffer })
      current.buffer = []
    }
  }

  const onPointerDown = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!canDraw) return
    event.preventDefault()
    event.currentTarget.setPointerCapture(event.pointerId)
    const point = toPoint(event)
    drawingRef.current = { id: strokeSeqRef.current++, buffer: [...point], last: point }
    const c = context()
    if (c) drawSegment(c, color, width, point)
  }
  const onPointerMove = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const current = drawingRef.current
    if (!canDraw || !current) return
    const point = toPoint(event)
    if (point[0] === current.last[0] && point[1] === current.last[1]) return
    const c = context()
    if (c) drawSegment(c, color, width, point, current.last)
    current.buffer.push(...point)
    current.last = point
  }
  const onPointerUp = () => {
    flushNow()
    drawingRef.current = null
  }

  const clearAll = () => {
    drawingRef.current = null
    clearCanvas()
    stream({ t: 'clear' })
  }

  const submitGuess = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!guess.trim()) return
    const result = await act('room:action', { type: 'guess', text: guess })
    setNotice(result.ok ? null : result.error || null)
    if (result.ok) setGuess('')
  }

  const board = [...state.players].sort((a, b) => (state.scores[b.userId] ?? 0) - (state.scores[a.userId] ?? 0))

  return (
    <div className="wiki-panel space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
        <span className="text-[color:var(--wiki-ink-muted)]">
          {state.round + 1}/{state.rounds} 라운드 · 출제자 {nameOf(state.drawer)}
        </span>
        {state.phase === 'draw' && (
          <span className={`font-semibold tabular-nums ${seconds <= 10 ? 'text-[color:var(--wiki-danger)]' : 'text-[color:var(--wiki-ink)]'}`}>{seconds}초</span>
        )}
      </div>

      <p role="status" className="text-center text-lg font-bold text-[color:var(--wiki-ink)]">
        {state.phase === 'done'
          ? state.completed
            ? '캐치마인드가 끝났습니다!'
            : '사람이 모자라 승부 없이 끝났습니다.'
          : state.phase === 'reveal'
            ? `정답은 “${state.word}”`
            : isDrawer
              ? `제시어 “${state.word}” — 글자나 숫자를 쓰지 말고 그림으로만!`
              : iKnow
                ? `맞혔습니다! “${state.word}”`
                : `${state.hint} (${Array.from(state.hint.replace(/\s/g, '')).length}글자)`}
      </p>

      <canvas
        ref={canvasRef}
        width={CATCHMIND_SIZE.width}
        height={CATCHMIND_SIZE.height}
        className={`block h-auto w-full touch-none rounded-md border border-[color:var(--wiki-rule-strong)] bg-[#fff] ${canDraw ? 'cursor-crosshair' : ''}`}
        style={{ aspectRatio: `${CATCHMIND_SIZE.width} / ${CATCHMIND_SIZE.height}` }}
        role="img"
        aria-label={canDraw ? '그림판 — 여기에 그리세요' : `${nameOf(state.drawer)} 님이 그리는 그림`}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      />

      {canDraw && (
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex flex-wrap gap-1.5" role="group" aria-label="색">
            {CATCHMIND_COLORS.map((value, index) => (
              <button
                key={value}
                type="button"
                aria-label={`색 ${index + 1}`}
                aria-pressed={color === index}
                onClick={() => setColor(index)}
                className={`h-8 w-8 rounded-full border-2 ${color === index ? 'border-[color:var(--wiki-accent)] ring-2 ring-[color:var(--wiki-accent-line)]' : 'border-[color:var(--wiki-rule-strong)]'}`}
                style={{ background: value }}
              />
            ))}
          </div>
          <div className="flex items-center gap-1.5" role="group" aria-label="굵기">
            {CATCHMIND_WIDTHS.map((value) => (
              <button
                key={value}
                type="button"
                aria-label={`굵기 ${value}`}
                aria-pressed={width === value}
                onClick={() => setWidth(value)}
                className={`grid h-8 w-8 place-items-center rounded-md border ${width === value ? 'border-[color:var(--wiki-accent)] bg-[color:var(--wiki-accent-soft)]' : 'border-[color:var(--wiki-rule-strong)]'}`}
              >
                <span className="rounded-full bg-[color:var(--wiki-ink)]" style={{ width: Math.min(22, value), height: Math.min(22, value) }} />
              </button>
            ))}
          </div>
          <button type="button" className={BUTTON} onClick={clearAll}>
            <Eraser className="h-4 w-4" aria-hidden />
            모두 지우기
          </button>
        </div>
      )}

      {state.phase === 'draw' && !isDrawer && inGame && !iKnow && (
        <form onSubmit={submitGuess} className="flex gap-2">
          <input
            value={guess}
            onChange={(event) => setGuess(event.target.value)}
            maxLength={CATCHMIND_GUESS_MAX}
            placeholder="정답을 적어 보세요"
            aria-label="정답 입력"
            autoComplete="off"
            className="min-w-0 flex-1 rounded-md border border-[color:var(--wiki-rule-strong)] bg-[color:var(--wiki-field)] px-2.5 py-2 text-sm text-[color:var(--wiki-ink)] focus:border-[color:var(--wiki-accent)] focus:outline-none"
          />
          <button type="submit" className={PRIMARY} disabled={!guess.trim()}>
            맞히기
          </button>
        </form>
      )}
      {notice && (
        <p role="alert" className="text-sm text-[color:var(--wiki-danger)]">
          {notice}
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <h3 className="mb-1 text-sm font-semibold text-[color:var(--wiki-ink)]">답</h3>
          <ul className="max-h-40 space-y-1 overflow-y-auto text-sm" aria-live="polite">
            {state.log.length === 0 && <li className="text-[color:var(--wiki-ink-muted)]">아직 아무도 답하지 않았습니다.</li>}
            {state.log.map((entry) => (
              <li key={entry.id} className="break-words">
                <span className="font-medium text-[color:var(--wiki-ink)]">{nameOf(entry.userId)}</span>{' '}
                {entry.correct ? (
                  <span className="font-semibold text-[color:var(--wiki-success)]">맞혔습니다!</span>
                ) : (
                  <span className="text-[color:var(--wiki-ink-soft)]">{entry.text}</span>
                )}
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h3 className="mb-1 text-sm font-semibold text-[color:var(--wiki-ink)]">점수</h3>
          <ol className="space-y-1 text-sm">
            {board.map((player, index) => (
              <li key={player.userId} className="flex justify-between gap-3">
                <span className={player.userId === userId ? 'font-semibold text-[color:var(--wiki-accent)]' : 'text-[color:var(--wiki-ink)]'}>
                  {index + 1}. {player.name}
                  {state.correct.includes(player.userId) && state.phase === 'draw' && <span className="ml-1 text-xs text-[color:var(--wiki-success)]">정답</span>}
                </span>
                <span className="shrink-0 tabular-nums text-[color:var(--wiki-ink-soft)]">{state.scores[player.userId] ?? 0}</span>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </div>
  )
}
