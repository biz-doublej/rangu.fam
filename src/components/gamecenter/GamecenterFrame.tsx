'use client'

import React from 'react'
import { useRouter } from 'next/navigation'
import { Coins, Gamepad2, ShoppingBag, Trophy, UserRound } from 'lucide-react'
import { WikiShell, WikiPageHeader } from '@/components/wiki'
import type { GamecenterMe } from './useGamecenterMe'

const TABS = [
  { key: 'lobby', label: '로비', icon: Gamepad2, href: '/wiki/game' },
  { key: 'ranking', label: '랭킹', icon: Trophy, href: '/wiki/game/ranking' },
  { key: 'shop', label: '상점', icon: ShoppingBag, href: '/wiki/game/shop' },
  { key: 'me', label: '내 정보', icon: UserRound, href: '/wiki/game/me' },
]

export function formatPoints(value: number): string {
  return `${value.toLocaleString('ko-KR')}P`
}

/** 게임센터 화면 공통 틀: 제목, 탭(로비·랭킹·상점·내 정보), 내 포인트 */
export function GamecenterFrame({
  active,
  subtitle,
  me,
  loading,
  error,
  children,
}: {
  active: 'lobby' | 'ranking' | 'shop' | 'me'
  subtitle: string
  me: GamecenterMe | null
  loading: boolean
  error: string | null
  children: React.ReactNode
}) {
  const router = useRouter()

  return (
    <WikiShell
      pageHeader={
        <WikiPageHeader
          title="이랑게임센터"
          subtitle={subtitle}
          tabs={TABS.map(({ key, label, icon }) => ({ key, label, icon }))}
          activeTab={active}
          onTabChange={(key) => {
            const tab = TABS.find((item) => item.key === key)
            if (tab && tab.key !== active) router.push(tab.href)
          }}
          actions={
            me && (
              <span
                className="inline-flex items-center gap-1.5 rounded-md border border-[color:var(--wiki-rule)] bg-[color:var(--wiki-panel)] px-3 py-1.5 text-sm font-semibold text-[color:var(--wiki-ink)]"
                aria-label={`내 포인트 ${formatPoints(me.wallet.balance)}`}
              >
                <Coins className="h-4 w-4 text-[color:var(--wiki-warning)]" aria-hidden />
                <span className="tabular-nums">{formatPoints(me.wallet.balance)}</span>
              </span>
            )
          }
        />
      }
    >
      {error ? (
        <p role="alert" className="wiki-mbox wiki-mbox--danger">
          {error}
        </p>
      ) : loading || !me ? (
        <p className="py-10 text-center text-sm text-[color:var(--wiki-ink-muted)]">불러오는 중입니다.</p>
      ) : (
        children
      )}
    </WikiShell>
  )
}
