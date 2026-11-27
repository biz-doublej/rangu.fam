'use client'

import React, { useEffect, useState } from 'react'
import { GamecenterFrame } from '@/components/gamecenter/GamecenterFrame'
import { gcFetch, useGamecenterMe } from '@/components/gamecenter/useGamecenterMe'
import { CLIMB_COMPLETED_BASE } from '@/lib/gamecenter/rewards'

type Game = 'tetris' | 'climb'
type Period = 'week' | 'all'

interface Entry {
  rank: number
  userId: string
  name: string
  score: number
  result: Record<string, any> | null
  finishedAt: string
}
interface Ranking {
  weekStart: string
  entries: Entry[]
  me: Entry | null
}

const GAMES: Array<{ key: Game; label: string }> = [
  { key: 'tetris', label: '테트리스' },
  { key: 'climb', label: '랑구 등반' },
]
const PERIODS: Array<{ key: Period; label: string }> = [
  { key: 'week', label: '이번 주' },
  { key: 'all', label: '역대' },
]

const clock = (frames: number) => {
  const seconds = Math.floor(frames / 60)
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`
}

function recordText(game: Game, entry: Entry): { main: string; detail: string } {
  if (game === 'tetris') {
    return {
      main: `${entry.score.toLocaleString('ko-KR')}점`,
      detail: entry.result ? `${entry.result.lines ?? 0}줄 · 4줄 ${entry.result.tetrises ?? 0}회` : '',
    }
  }
  const completed = entry.score >= CLIMB_COMPLETED_BASE / 2
  return completed
    ? { main: `완주 ${clock(CLIMB_COMPLETED_BASE - entry.score)}`, detail: '정상 도달' }
    : { main: `${Math.round(entry.score / 10)}m`, detail: entry.result ? `${entry.result.maxZone ?? 1}구역` : '' }
}

const toggle = (active: boolean) =>
  `rounded-md px-3 py-1.5 text-sm ${
    active
      ? 'bg-[color:var(--wiki-accent)] font-medium text-[#fff]'
      : 'border border-[color:var(--wiki-rule-strong)] text-[color:var(--wiki-ink-soft)] hover:bg-[color:var(--wiki-bg-2)]'
  }`

export default function GamecenterRankingPage() {
  const { me, error, loading } = useGamecenterMe()
  const [game, setGame] = useState<Game>('tetris')
  const [period, setPeriod] = useState<Period>('week')
  const [data, setData] = useState<Ranking | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setData(null)
    setLoadError(null)
    gcFetch<Ranking>(`/api/gamecenter/ranking?game=${game}&period=${period}`)
      .then((result) => !cancelled && setData(result))
      .catch((err) => !cancelled && (err as { status?: number }).status !== 401 && setLoadError((err as Error).message))
    return () => {
      cancelled = true
    }
  }, [game, period])

  return (
    <GamecenterFrame
      active="ranking"
      subtitle="사람마다 가장 좋은 판 하나로 순위를 매깁니다. 주간 랭킹은 월요일 0시에 새로 시작합니다."
      me={me}
      loading={loading}
      error={error}
    >
      {me && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
            <div className="flex gap-1.5" role="group" aria-label="게임">
              {GAMES.map((item) => (
                <button key={item.key} type="button" className={toggle(game === item.key)} aria-pressed={game === item.key} onClick={() => setGame(item.key)}>
                  {item.label}
                </button>
              ))}
            </div>
            <div className="flex gap-1.5" role="group" aria-label="기간">
              {PERIODS.map((item) => (
                <button key={item.key} type="button" className={toggle(period === item.key)} aria-pressed={period === item.key} onClick={() => setPeriod(item.key)}>
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {period === 'week' && (
            <p className="text-sm text-[color:var(--wiki-ink-muted)]">
              주간 1위 +200P, 2위 +100P, 3위 +50P — 다음 월요일 0시에 지급됩니다.
              {game === 'climb' && ' 그 주에 가장 크게 떨어진 사람은 위로금 +50P.'}
            </p>
          )}

          {loadError ? (
            <p role="alert" className="wiki-mbox wiki-mbox--danger">
              {loadError}
            </p>
          ) : !data ? (
            <p className="py-10 text-center text-sm text-[color:var(--wiki-ink-muted)]">랭킹을 불러오는 중입니다.</p>
          ) : data.entries.length === 0 ? (
            <p className="wiki-panel text-sm text-[color:var(--wiki-ink-muted)]">아직 기록이 없습니다. 첫 기록의 주인이 되어 보세요.</p>
          ) : (
            <div className="wiki-panel overflow-x-auto p-0">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[color:var(--wiki-rule)] text-left text-xs text-[color:var(--wiki-ink-muted)]">
                    <th scope="col" className="w-14 px-4 py-2 font-medium">순위</th>
                    <th scope="col" className="px-4 py-2 font-medium">이름</th>
                    <th scope="col" className="px-4 py-2 text-right font-medium">기록</th>
                  </tr>
                </thead>
                <tbody>
                  {data.entries.map((entry) => {
                    const record = recordText(game, entry)
                    const mine = entry.userId === me.user.id
                    return (
                      <tr key={entry.userId} className={`border-b border-[color:var(--wiki-rule)] last:border-b-0 ${mine ? 'bg-[color:var(--wiki-accent-soft)]' : ''}`}>
                        <td className="px-4 py-2 font-semibold tabular-nums text-[color:var(--wiki-ink)]">{entry.rank}</td>
                        <td className="px-4 py-2 text-[color:var(--wiki-ink)]">
                          {entry.name}
                          {mine && <span className="ml-1.5 text-xs text-[color:var(--wiki-accent)]">나</span>}
                        </td>
                        <td className="px-4 py-2 text-right">
                          <span className="font-semibold tabular-nums text-[color:var(--wiki-ink)]">{record.main}</span>
                          {record.detail && <span className="block text-xs text-[color:var(--wiki-ink-muted)]">{record.detail}</span>}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}

          {data?.me && !data.entries.some((entry) => entry.userId === me.user.id) && (
            <p className="text-sm text-[color:var(--wiki-ink-soft)]">
              내 순위: {data.me.rank}위 — {recordText(game, data.me).main}
            </p>
          )}
        </div>
      )}
    </GamecenterFrame>
  )
}
