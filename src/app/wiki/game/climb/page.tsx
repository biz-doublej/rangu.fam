'use client'

import React from 'react'
import { GamecenterFrame } from '@/components/gamecenter/GamecenterFrame'
import { useGamecenterMe } from '@/components/gamecenter/useGamecenterMe'
import { ClimbGame } from '@/games/climb/ClimbGame'

export default function GamecenterClimbPage() {
  const { me, error, loading, reload } = useGamecenterMe()
  return (
    <GamecenterFrame
      active="lobby"
      subtitle="랑구 등반 — 힘을 모아 뛰어 정상까지. 떨어지면 떨어진 곳에서 다시 올라갑니다."
      me={me}
      loading={loading}
      error={error}
    >
      {me && <ClimbGame onWalletChange={reload} />}
    </GamecenterFrame>
  )
}
