'use client'

import { useEffect, useState } from 'react'

/** 서버 시계 기준 마감까지 남은 초 (running 이 false 면 멈춘다) */
export function useCountdown(deadline: number, clockOffset: number, running = true): number {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (!running) return
    setNow(Date.now())
    const timer = window.setInterval(() => setNow(Date.now()), 250)
    return () => window.clearInterval(timer)
  }, [deadline, running])
  return Math.max(0, Math.ceil((deadline - (now + clockOffset)) / 1000))
}
