'use client'

import { useCallback, useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'

export interface GamecenterMe {
  user: { id: string; username: string; displayName: string; isAdmin: boolean }
  wallet: {
    balance: number
    lifetimeEarned: number
    streakDays: number
    lastCheckIn: string | null
    checkedInToday: boolean
  }
  daily: { day: string; cap: number; earned: number; remaining: number }
  inventory: Array<{ itemKey: string; quantity: number; equipped: boolean; label: string }>
  history?: Array<{ id: number; amount: number; reason: string; game: string | null; createdAt: string }>
}

/** JSON 요청. 실패하면 서버의 오류 문구로 예외를 던진다. */
export async function gcFetch<T = any>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, { credentials: 'include', ...init })
  const data = await response.json().catch(() => null)
  if (!response.ok || data?.success === false) {
    const error = new Error(data?.error || `요청을 처리하지 못했습니다. (${response.status})`) as Error & { status?: number }
    error.status = response.status
    throw error
  }
  return data as T
}

export function gcPost<T = any>(url: string, body?: unknown): Promise<T> {
  return gcFetch<T>(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body ?? {}),
  })
}

/** 같은 요청의 중복 처리를 막는 요청 id */
export function newRequestId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID()
  return `r-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`
}

/**
 * 게임센터 내 정보. 로그인하지 않았으면 이랑위키 로그인으로 보냈다가 지금 화면으로 돌아오게 한다.
 */
export function useGamecenterMe(opts: { history?: boolean } = {}) {
  const router = useRouter()
  const pathname = usePathname()
  const [me, setMe] = useState<GamecenterMe | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const withHistory = Boolean(opts.history)

  const reload = useCallback(async () => {
    try {
      const data = await gcFetch<GamecenterMe>(`/api/gamecenter/me${withHistory ? '?history=1' : ''}`)
      setMe(data)
      setError(null)
    } catch (err) {
      if ((err as { status?: number }).status === 401) {
        // irang.wiki/game 으로 들어와도 실제 경로는 /wiki/game — 로그인 화면은 /wiki 로 시작하는 주소만 받는다.
        const here = pathname?.startsWith('/wiki') ? pathname : `/wiki${pathname || '/game'}`
        router.replace(`/wiki/login?callbackUrl=${encodeURIComponent(here)}`)
        return
      }
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }, [pathname, router, withHistory])

  useEffect(() => {
    reload()
  }, [reload])

  return { me, error, loading, reload }
}
