'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { CalendarCheck, Flame } from 'lucide-react'
import { GamecenterFrame, formatPoints } from '@/components/gamecenter/GamecenterFrame'
import { gcPost, useGamecenterMe } from '@/components/gamecenter/useGamecenterMe'
import { GAMES } from '@/lib/gamecenter/games'

const CATEGORIES = ['아케이드', '파티', '보드'] as const

export default function GamecenterLobbyPage() {
  const { me, error, loading, reload } = useGamecenterMe()
  const [checkingIn, setCheckingIn] = useState(false)
  const [notice, setNotice] = useState<{ tone: 'success' | 'danger'; text: string } | null>(null)

  const handleCheckIn = async () => {
    setCheckingIn(true)
    try {
      const result = await gcPost<{ alreadyCheckedIn: boolean; awarded: number; streakBonus: boolean; streakDays: number }>(
        '/api/gamecenter/checkin'
      )
      setNotice({
        tone: 'success',
        text: result.alreadyCheckedIn
          ? '오늘은 이미 출석했습니다.'
          : result.streakBonus
            ? `출석 완료! ${result.streakDays}일 연속 보너스까지 +${result.awarded}P`
            : `출석 완료! +${result.awarded}P`,
      })
      await reload()
    } catch (err) {
      setNotice({ tone: 'danger', text: (err as Error).message })
    } finally {
      setCheckingIn(false)
    }
  }

  return (
    <GamecenterFrame
      active="lobby"
      subtitle="게임을 하고 이랑 포인트(P)를 모아 상점에서 교환하세요."
      me={me}
      loading={loading}
      error={error}
    >
      {me && (
        <div className="space-y-6">
          {notice && (
            <p role="status" className={`wiki-mbox wiki-mbox--${notice.tone}`}>
              {notice.text}
            </p>
          )}

          <section className="grid gap-3 sm:grid-cols-3" aria-label="내 지갑">
            <div className="wiki-panel">
              <p className="text-xs text-[color:var(--wiki-ink-muted)]">내 포인트</p>
              <p className="mt-1 text-2xl font-bold tabular-nums text-[color:var(--wiki-ink)]">{formatPoints(me.wallet.balance)}</p>
              <p className="mt-1 text-xs text-[color:var(--wiki-ink-muted)]">
                지금까지 모은 포인트 {formatPoints(me.wallet.lifetimeEarned)}
              </p>
            </div>

            <div className="wiki-panel">
              <p className="text-xs text-[color:var(--wiki-ink-muted)]">오늘 게임 보상</p>
              <p className="mt-1 text-2xl font-bold tabular-nums text-[color:var(--wiki-ink)]">
                {me.daily.earned}
                <span className="text-sm font-medium text-[color:var(--wiki-ink-muted)]"> / {formatPoints(me.daily.cap)}</span>
              </p>
              <div
                className="mt-2 h-1.5 overflow-hidden rounded-full bg-[color:var(--wiki-bg-2)]"
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={me.daily.cap}
                aria-valuenow={me.daily.earned}
                aria-label="오늘 받은 게임 보상"
              >
                <div
                  className="h-full rounded-full bg-[color:var(--wiki-accent)]"
                  style={{ width: `${Math.min(100, (me.daily.earned / me.daily.cap) * 100)}%` }}
                />
              </div>
              <p className="mt-1.5 text-xs text-[color:var(--wiki-ink-muted)]">출석과 주간 랭킹 보상은 상한에 포함되지 않습니다.</p>
            </div>

            <div className="wiki-panel flex flex-col">
              <p className="text-xs text-[color:var(--wiki-ink-muted)]">출석</p>
              <p className="mt-1 flex items-center gap-1.5 text-2xl font-bold tabular-nums text-[color:var(--wiki-ink)]">
                <Flame className="h-5 w-5 text-[color:var(--wiki-danger)]" aria-hidden />
                {me.wallet.streakDays}일 연속
              </p>
              <button
                type="button"
                onClick={handleCheckIn}
                disabled={checkingIn || me.wallet.checkedInToday}
                className="mt-auto inline-flex items-center justify-center gap-1.5 rounded-md bg-[color:var(--wiki-accent)] px-3 py-2 text-sm font-medium text-[#fff] hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <CalendarCheck className="h-4 w-4" aria-hidden />
                {me.wallet.checkedInToday ? '오늘 출석 완료' : checkingIn ? '출석하는 중' : '출석하고 +10P 받기'}
              </button>
            </div>
          </section>

          {CATEGORIES.map((category) => (
            <section key={category} aria-labelledby={`gc-${category}`}>
              <h2 id={`gc-${category}`} className="mb-2 text-sm font-semibold text-[color:var(--wiki-ink-soft)]">
                {category}
              </h2>
              <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {GAMES.filter((game) => game.category === category).map((game) => {
                  const body = (
                    <>
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="text-base font-semibold text-[color:var(--wiki-ink)]">{game.name}</h3>
                        {!game.href && (
                          <span className="shrink-0 rounded-sm bg-[color:var(--wiki-bg-2)] px-1.5 py-0.5 text-[11px] font-medium text-[color:var(--wiki-ink-muted)]">
                            준비 중
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-sm leading-relaxed text-[color:var(--wiki-ink-soft)]">{game.description}</p>
                      <p className="mt-2 text-xs text-[color:var(--wiki-ink-muted)]">{game.players}</p>
                    </>
                  )
                  return (
                    <li key={game.id}>
                      {game.href ? (
                        <Link href={game.href} className="wiki-panel block h-full hover:border-[color:var(--wiki-accent-line)]">
                          {body}
                        </Link>
                      ) : (
                        <div className="wiki-panel h-full opacity-70" aria-disabled="true">
                          {body}
                        </div>
                      )}
                    </li>
                  )
                })}
              </ul>
            </section>
          ))}
        </div>
      )}
    </GamecenterFrame>
  )
}
