'use client'

import React, { useEffect, useState } from 'react'
import { OMOK_SIZE, OMOK_TURN_MS, type OmokState } from './rules'

const CELL = 32
const PAD = 20
const SIZE = PAD * 2 + CELL * (OMOK_SIZE - 1)
const STAR_POINTS = [3, 7, 11]
const at = (index: number) => PAD + index * CELL

/** 서버 시계 기준으로 이번 수의 남은 초 */
export function useTurnSeconds(state: OmokState, clockOffset: number): number {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (state.endReason) return
    const timer = window.setInterval(() => setNow(Date.now()), 250)
    return () => window.clearInterval(timer)
  }, [state.endReason, state.turnDeadline])
  return Math.max(0, Math.min(OMOK_TURN_MS / 1000, Math.ceil((state.turnDeadline - (now + clockOffset)) / 1000)))
}

/** 오목판. 내 차례일 때만 빈 자리를 눌러 둘 수 있다. */
export function OmokBoard({
  state,
  canPlace,
  onPlace,
}: {
  state: OmokState
  canPlace: boolean
  onPlace: (x: number, y: number) => void
}) {
  const [hover, setHover] = useState<{ x: number; y: number } | null>(null)
  const winning = new Set((state.winLine ?? []).map((point) => `${point.x},${point.y}`))
  const myStone = state.turn === 'black' ? '#1b1b1f' : '#f5f5f2'

  return (
    <svg
      viewBox={`0 0 ${SIZE} ${SIZE}`}
      className="block h-auto w-full max-w-[520px] touch-manipulation select-none rounded-lg"
      role="group"
      aria-label={`오목판 ${OMOK_SIZE}×${OMOK_SIZE}`}
      onMouseLeave={() => setHover(null)}
    >
      <rect width={SIZE} height={SIZE} rx={8} fill="#dcb46c" />
      <g stroke="#6b4a1b" strokeWidth={1}>
        {Array.from({ length: OMOK_SIZE }, (_, i) => (
          <React.Fragment key={i}>
            <line x1={at(0)} y1={at(i)} x2={at(OMOK_SIZE - 1)} y2={at(i)} />
            <line x1={at(i)} y1={at(0)} x2={at(i)} y2={at(OMOK_SIZE - 1)} />
          </React.Fragment>
        ))}
      </g>
      {STAR_POINTS.flatMap((x) => STAR_POINTS.map((y) => <circle key={`${x}-${y}`} cx={at(x)} cy={at(y)} r={3} fill="#6b4a1b" />))}

      {state.board.flatMap((row, y) =>
        row.map((stone, x) => {
          if (!stone) return null
          const last = state.lastMove?.x === x && state.lastMove?.y === y
          return (
            <g key={`${x}-${y}`}>
              <circle
                cx={at(x)}
                cy={at(y)}
                r={CELL * 0.44}
                fill={stone === 1 ? '#1b1b1f' : '#f5f5f2'}
                stroke={winning.has(`${x},${y}`) ? '#d63a2f' : stone === 1 ? '#000' : '#9a9a94'}
                strokeWidth={winning.has(`${x},${y}`) ? 3 : 1}
              />
              {last && <circle cx={at(x)} cy={at(y)} r={4} fill="#d63a2f" />}
            </g>
          )
        })
      )}

      {canPlace && hover && !state.board[hover.y][hover.x] && (
        <circle cx={at(hover.x)} cy={at(hover.y)} r={CELL * 0.44} fill={myStone} opacity={0.45} pointerEvents="none" />
      )}

      {/* 누를 수 있는 자리 — 내 차례의 빈칸만 */}
      {canPlace &&
        state.board.flatMap((row, y) =>
          row.map((stone, x) =>
            stone ? null : (
              <rect
                key={`hit-${x}-${y}`}
                x={at(x) - CELL / 2}
                y={at(y) - CELL / 2}
                width={CELL}
                height={CELL}
                fill="transparent"
                role="button"
                tabIndex={-1}
                aria-label={`${x + 1}열 ${y + 1}행에 두기`}
                style={{ cursor: 'pointer' }}
                onMouseEnter={() => setHover({ x, y })}
                onClick={() => onPlace(x, y)}
              />
            )
          )
        )}
    </svg>
  )
}
