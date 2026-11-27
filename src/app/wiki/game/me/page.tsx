'use client'

import React from 'react'
import Link from 'next/link'
import { GamecenterFrame, formatPoints } from '@/components/gamecenter/GamecenterFrame'
import { useGamecenterMe } from '@/components/gamecenter/useGamecenterMe'
import { GAMES, reasonLabel } from '@/lib/gamecenter/games'

function formatWhen(value: string): string {
  return new Date(value).toLocaleString('ko-KR', {
    timeZone: 'Asia/Seoul',
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const GAME_NAMES: Record<string, string> = Object.fromEntries(GAMES.map((game) => [game.id, game.name]))

export default function GamecenterMePage() {
  const { me, error, loading } = useGamecenterMe({ history: true })

  return (
    <GamecenterFrame active="me" subtitle="내 포인트 내역과 보유품입니다." me={me} loading={loading} error={error}>
      {me && (
        <div className="space-y-6">
          <section className="wiki-panel" aria-labelledby="gc-me-wallet">
            <h2 id="gc-me-wallet" className="text-sm font-semibold text-[color:var(--wiki-ink-soft)]">
              {me.user.displayName} 님의 지갑
            </h2>
            <dl className="mt-3 grid grid-cols-2 gap-4 sm:grid-cols-4">
              {[
                ['잔액', formatPoints(me.wallet.balance)],
                ['지금까지 모은 포인트', formatPoints(me.wallet.lifetimeEarned)],
                ['오늘 남은 게임 보상', formatPoints(me.daily.remaining)],
                ['연속 출석', `${me.wallet.streakDays}일`],
              ].map(([label, value]) => (
                <div key={label}>
                  <dt className="text-xs text-[color:var(--wiki-ink-muted)]">{label}</dt>
                  <dd className="mt-0.5 text-lg font-bold tabular-nums text-[color:var(--wiki-ink)]">{value}</dd>
                </div>
              ))}
            </dl>
          </section>

          <section aria-labelledby="gc-me-inventory">
            <h2 id="gc-me-inventory" className="mb-2 text-sm font-semibold text-[color:var(--wiki-ink-soft)]">
              보유품
            </h2>
            {me.inventory.length === 0 ? (
              <p className="wiki-panel text-sm text-[color:var(--wiki-ink-muted)]">
                아직 보유품이 없습니다.{' '}
                <Link href="/wiki/game/shop" className="text-[color:var(--wiki-link)] hover:underline">
                  상점에서 교환해 보세요.
                </Link>
              </p>
            ) : (
              <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {me.inventory.map((row) => (
                  <li key={row.itemKey} className="wiki-panel flex items-center justify-between gap-3">
                    <span className="min-w-0 truncate text-sm font-medium text-[color:var(--wiki-ink)]">{row.label}</span>
                    <span className="shrink-0 text-sm tabular-nums text-[color:var(--wiki-ink-soft)]">{row.quantity}개</span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section aria-labelledby="gc-me-history">
            <h2 id="gc-me-history" className="mb-2 text-sm font-semibold text-[color:var(--wiki-ink-soft)]">
              포인트 내역 <span className="font-normal text-[color:var(--wiki-ink-muted)]">(최근 50건)</span>
            </h2>
            {!me.history || me.history.length === 0 ? (
              <p className="wiki-panel text-sm text-[color:var(--wiki-ink-muted)]">아직 내역이 없습니다. 로비에서 출석부터 해 보세요.</p>
            ) : (
              <div className="wiki-panel overflow-x-auto p-0">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[color:var(--wiki-rule)] text-left text-xs text-[color:var(--wiki-ink-muted)]">
                      <th scope="col" className="px-4 py-2 font-medium">언제</th>
                      <th scope="col" className="px-4 py-2 font-medium">내용</th>
                      <th scope="col" className="px-4 py-2 text-right font-medium">포인트</th>
                    </tr>
                  </thead>
                  <tbody>
                    {me.history.map((row) => (
                      <tr key={row.id} className="border-b border-[color:var(--wiki-rule)] last:border-b-0">
                        <td className="whitespace-nowrap px-4 py-2 text-[color:var(--wiki-ink-muted)]">{formatWhen(row.createdAt)}</td>
                        <td className="px-4 py-2 text-[color:var(--wiki-ink)]">
                          {row.game && GAME_NAMES[row.game] ? `${GAME_NAMES[row.game]} · ` : ''}
                          {reasonLabel(row.reason)}
                          {row.amount === 0 && <span className="text-[color:var(--wiki-ink-muted)]"> (하루 상한 도달)</span>}
                        </td>
                        <td
                          className={`whitespace-nowrap px-4 py-2 text-right font-semibold tabular-nums ${
                            row.amount < 0 ? 'text-[color:var(--wiki-danger)]' : 'text-[color:var(--wiki-success)]'
                          }`}
                        >
                          {row.amount > 0 ? '+' : ''}
                          {row.amount.toLocaleString('ko-KR')}P
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      )}
    </GamecenterFrame>
  )
}
