'use client'

import React, { useEffect, useState } from 'react'
import { useCountdown } from '@/components/gamecenter/useCountdown'
import type { RoomAck } from '@/components/gamecenter/useRoom'
import { BIG_STATIONS, DONE, STATION_XY, WAITING } from './board'
import { YUT_NAMES, YUT_PIECES, type YutView } from './rules'

const PRIMARY =
  'inline-flex items-center justify-center gap-1.5 rounded-md bg-[color:var(--wiki-accent)] px-5 py-2.5 text-base font-semibold text-[#fff] hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50'
const SIDE_COLORS = ['#d63a2f', '#2f6fd6', '#3fa652', '#9a4fc7']
const OUTER = [20, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20]
const DIAGONALS = [
  [5, 21, 22, 23, 24, 25, 15],
  [10, 26, 27, 23, 28, 29, 20],
]
const line = (stations: number[]) => stations.map((station) => STATION_XY[station].join(',')).join(' ')

/** 윷놀이 화면. 윷은 서버가 던지고, 화면은 결과와 둘 수 있는 수(moves)를 받아 보여 준다. */
export function YutPanel({
  state,
  userId,
  clockOffset,
  act,
}: {
  state: YutView
  userId: string | null
  clockOffset: number
  act: (event: string, payload?: unknown) => Promise<RoomAck>
}) {
  const seconds = useCountdown(state.deadline, clockOffset, state.phase !== 'done')
  const [selected, setSelected] = useState(0)
  const myTurn = state.thrower === userId && state.phase !== 'done'
  const nameOf = (id: string) => state.players.find((player) => player.userId === id)?.name ?? '나간 사람'

  // 쓸 결과가 바뀌면 첫 번째 것을 고른다
  const pendingKey = state.pending.join(',')
  useEffect(() => {
    setSelected(0)
  }, [pendingKey])

  const usable = state.moves.filter((move) => move.pending === selected)
  /** 출발 자리 → 그 수 */
  const byOrigin = new Map(usable.map((move) => [state.sides[state.mySide].pieces[move.piece].pos, move]))
  const play = (origin: number) => {
    const move = byOrigin.get(origin)
    if (move) act('room:action', { type: 'move', pending: move.pending, piece: move.piece })
  }

  // 자리별로 어느 편 말이 몇 개 있는지
  const stacks = new Map<number, { side: number; count: number }>()
  state.sides.forEach((side, index) => {
    for (const piece of side.pieces) {
      if (piece.pos === WAITING || piece.pos === DONE) continue
      const stack = stacks.get(piece.pos)
      stacks.set(piece.pos, { side: index, count: (stack?.count ?? 0) + 1 })
    }
  })
  const destinations = new Set(usable.map((move) => move.to.pos).filter((pos) => pos !== DONE))

  return (
    <div className="wiki-panel space-y-4">
      <p role="status" className="text-center text-base font-semibold text-[color:var(--wiki-ink)]">
        {state.phase === 'done' ? (
          state.winner === null ? (
            '승부 없이 끝났습니다.'
          ) : (
            `${state.sides[state.winner].name} 승리!${state.endReason === 'abandon' ? ' (상대가 자리를 떠남)' : ''}`
          )
        ) : (
          <>
            {myTurn ? (state.phase === 'throw' ? '내 차례 — 윷을 던지세요' : '내 차례 — 옮길 말을 고르세요') : `${nameOf(state.thrower)} 님 차례`}{' '}
            <span className={`tabular-nums ${seconds <= 5 ? 'text-[color:var(--wiki-danger)]' : 'text-[color:var(--wiki-ink-muted)]'}`}>{seconds}초</span>
          </>
        )}
      </p>

      <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_14rem]">
        <svg viewBox="0 0 100 100" className="mx-auto block h-auto w-full max-w-[460px] select-none" role="group" aria-label="윷판">
          <rect x={2} y={2} width={96} height={96} rx={4} fill="#f3e3bd" stroke="#b08a4a" strokeWidth={0.6} />
          <polyline points={line(OUTER)} fill="none" stroke="#b08a4a" strokeWidth={0.5} />
          {DIAGONALS.map((stations, index) => (
            <polyline key={index} points={line(stations)} fill="none" stroke="#b08a4a" strokeWidth={0.5} />
          ))}
          {Object.entries(STATION_XY).map(([station, [x, y]]) => {
            const id = Number(station)
            const big = BIG_STATIONS.includes(id)
            return (
              <g key={station}>
                <circle cx={x} cy={y} r={big ? 4.6 : 3.1} fill="#fffaf0" stroke="#8a6a35" strokeWidth={0.5} />
                {destinations.has(id) && <circle cx={x} cy={y} r={big ? 6 : 4.6} fill="none" stroke="#2f5d8c" strokeWidth={0.8} strokeDasharray="1.5 1" />}
              </g>
            )
          })}
          <text x={90} y={98} textAnchor="middle" fontSize={3} fill="#7a5a25">
            참먹이
          </text>

          {[...stacks.entries()].map(([station, stack]) => {
            const [x, y] = STATION_XY[station]
            const movable = myTurn && state.phase === 'move' && stack.side === state.mySide && byOrigin.has(station)
            return (
              <g
                key={station}
                role={movable ? 'button' : undefined}
                tabIndex={movable ? 0 : undefined}
                aria-label={`${state.sides[stack.side].name} 말 ${stack.count}개${movable ? ' — 옮기기' : ''}`}
                style={{ cursor: movable ? 'pointer' : 'default' }}
                onClick={movable ? () => play(station) : undefined}
                onKeyDown={movable ? (event) => (event.key === 'Enter' || event.key === ' ') && play(station) : undefined}
              >
                {movable && <circle cx={x} cy={y} r={5.4} fill="none" stroke="#111" strokeWidth={0.7} />}
                <circle cx={x} cy={y} r={3.8} fill={SIDE_COLORS[stack.side]} stroke="#fff" strokeWidth={0.6} />
                <text x={x} y={y + 1.3} textAnchor="middle" fontSize={3.6} fontWeight={700} fill="#fff">
                  {stack.count}
                </text>
              </g>
            )
          })}
        </svg>

        <div className="space-y-3">
          <div className="rounded-md border border-[color:var(--wiki-rule)] bg-[color:var(--wiki-bg)] px-3 py-2 text-center">
            {state.lastThrow ? (
              <>
                <div className="flex justify-center gap-1.5" aria-hidden>
                  {state.lastThrow.sticks.map((stick, index) => (
                    <span
                      key={index}
                      className="h-10 w-3 rounded-full border border-[#8a6a35]"
                      style={{ background: stick ? '#fffaf0' : '#8a6a35' }}
                      title={stick ? '배' : '등'}
                    />
                  ))}
                </div>
                <p className="mt-1 text-lg font-bold text-[color:var(--wiki-ink)]">{YUT_NAMES[state.lastThrow.result]}</p>
                <p className="text-xs text-[color:var(--wiki-ink-muted)]">{nameOf(state.lastThrow.by)} 님이 던짐</p>
              </>
            ) : (
              <p className="py-3 text-sm text-[color:var(--wiki-ink-muted)]">아직 던지지 않았습니다.</p>
            )}
          </div>

          {state.phase !== 'done' && (
            <button type="button" className={`${PRIMARY} w-full`} disabled={!myTurn || state.phase !== 'throw'} onClick={() => act('room:action', { type: 'throw' })}>
              윷 던지기{state.throwsLeft > 1 ? ` (${state.throwsLeft}번 남음)` : ''}
            </button>
          )}

          {state.pending.length > 0 && (
            <div>
              <p className="mb-1 text-xs text-[color:var(--wiki-ink-muted)]">쓸 수 있는 결과</p>
              <div className="flex flex-wrap gap-1.5">
                {state.pending.map((result, index) => (
                  <button
                    key={index}
                    type="button"
                    disabled={!myTurn || state.phase !== 'move'}
                    aria-pressed={selected === index}
                    onClick={() => setSelected(index)}
                    className={`rounded-md border px-3 py-1.5 text-sm font-semibold ${
                      selected === index && myTurn && state.phase === 'move'
                        ? 'border-[color:var(--wiki-accent)] bg-[color:var(--wiki-accent)] text-[#fff]'
                        : 'border-[color:var(--wiki-rule-strong)] text-[color:var(--wiki-ink)]'
                    }`}
                  >
                    {YUT_NAMES[result]}
                  </button>
                ))}
              </div>
            </div>
          )}

          {myTurn && state.phase === 'move' && byOrigin.has(WAITING) && (
            <button
              type="button"
              className="w-full rounded-md border border-[color:var(--wiki-rule-strong)] bg-[color:var(--wiki-panel)] px-3 py-2 text-sm font-medium text-[color:var(--wiki-ink)] hover:bg-[color:var(--wiki-bg-2)]"
              onClick={() => play(WAITING)}
            >
              새 말 올리기 ({YUT_NAMES[state.pending[selected]]})
            </button>
          )}
          {myTurn && state.phase === 'move' && <p className="text-xs text-[color:var(--wiki-ink-muted)]">판 위에서 테두리가 있는 내 말을 누르면 점선 자리로 갑니다.</p>}
          {state.lastEvent && <p className="text-sm font-medium text-[color:var(--wiki-ink-soft)]">{state.lastEvent}</p>}

          <ul className="space-y-1.5 text-sm">
            {state.sides.map((side, index) => {
              const waiting = side.pieces.filter((piece) => piece.pos === WAITING).length
              const done = side.pieces.filter((piece) => piece.pos === DONE).length
              return (
                <li key={index} className={`flex items-center gap-2 ${side.out ? 'opacity-50' : ''}`}>
                  <span className="h-3 w-3 shrink-0 rounded-full" style={{ background: SIDE_COLORS[index] }} aria-hidden />
                  <span className={`min-w-0 flex-1 truncate ${index === state.mySide ? 'font-semibold text-[color:var(--wiki-ink)]' : 'text-[color:var(--wiki-ink-soft)]'}`}>
                    {side.name}
                    {state.team && <span className="text-xs text-[color:var(--wiki-ink-muted)]"> ({side.members.map(nameOf).join(', ')})</span>}
                  </span>
                  <span className="shrink-0 text-xs tabular-nums text-[color:var(--wiki-ink-muted)]">
                    대기 {waiting} · 남 {done}/{YUT_PIECES}
                  </span>
                </li>
              )
            })}
          </ul>
        </div>
      </div>
    </div>
  )
}
