'use client'

import React from 'react'
import { GamecenterFrame } from '@/components/gamecenter/GamecenterFrame'
import { useGamecenterMe } from '@/components/gamecenter/useGamecenterMe'
import { ClawGame } from '@/games/claw/ClawGame'

export default function GamecenterClawPage() {
  const { me, error, loading, reload } = useGamecenterMe()

  return (
    <GamecenterFrame
      active="lobby"
      subtitle="인형뽑기 — 포인트나 무료권을 넣고 랑구 인형을 뽑아 도감을 채워 보세요."
      me={me}
      loading={loading}
      error={error}
    >
      {me && <ClawGame onWalletChange={reload} />}
    </GamecenterFrame>
  )
}
