'use client'

import React from 'react'
import { GamecenterFrame } from '@/components/gamecenter/GamecenterFrame'
import { useGamecenterMe } from '@/components/gamecenter/useGamecenterMe'
import { TetrisGame } from '@/games/tetris/TetrisGame'

export default function GamecenterTetrisPage() {
  const { me, error, loading, reload } = useGamecenterMe()
  return (
    <GamecenterFrame
      active="lobby"
      subtitle="테트리스 — 혼자 하는 랭킹전. 기록은 서버가 다시 실행해 확인합니다."
      me={me}
      loading={loading}
      error={error}
    >
      {me && <TetrisGame onWalletChange={reload} />}
    </GamecenterFrame>
  )
}
