'use client'

import { useEffect, useState } from 'react'

export interface MyRank {
  lp: number
  tier: string
  tierName: string
  wins: number
  losses: number
  winStreak: number
  placed: boolean
}
export interface LeaderRow {
  rank: number
  userId: string
  name: string
  lp: number
  tier: string
  tierName: string
  wins: number
  losses: number
}

// 매치 전 LP 스냅샷 — 로비에서 캡처, 매치종료 오버레이가 델타 계산에 사용(모듈 캐시).
let preMatchLp: number | null = null
export function setPreMatchLp(lp: number | null): void {
  preMatchLp = lp
}
export function getPreMatchLp(): number | null {
  return preMatchLp
}

export async function fetchMyRank(): Promise<MyRank | null> {
  try {
    const r = await fetch('/api/game/my-rank')
    if (!r.ok) return null
    const j = await r.json()
    return j?.success ? (j.rank as MyRank) : null
  } catch {
    return null
  }
}

export async function fetchLeaderboard(): Promise<LeaderRow[]> {
  try {
    const r = await fetch('/api/game/leaderboard')
    const j = await r.json()
    return Array.isArray(j?.board) ? (j.board as LeaderRow[]) : []
  } catch {
    return []
  }
}

/** 로비 진입 시 내 랭크 로드 + 매치 전 LP 캐시(매치종료 델타용). */
export function useMyRank(): MyRank | null {
  const [rank, setRank] = useState<MyRank | null>(null)
  useEffect(() => {
    let alive = true
    fetchMyRank().then((r) => {
      if (alive && r) {
        setRank(r)
        setPreMatchLp(r.lp)
      }
    })
    return () => {
      alive = false
    }
  }, [])
  return rank
}

/** 티어별 표시 색(tailwind text 클래스). */
const TIER_COLOR: Record<string, string> = {
  bronze: 'text-amber-600',
  silver: 'text-slate-300',
  gold: 'text-amber-400',
  platinum: 'text-cyan-300',
  diamond: 'text-sky-300',
  master: 'text-fuchsia-400',
}
export function tierColor(key: string): string {
  return TIER_COLOR[key] ?? 'text-slate-300'
}
