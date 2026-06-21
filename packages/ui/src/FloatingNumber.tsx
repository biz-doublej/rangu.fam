'use client'

import { useEffect, useState, type CSSProperties } from 'react'
import { cn } from './cn'

export interface FloatingNumberProps {
  value: number
  lethal?: boolean
  className?: string
  /** 위치(fixed): { left, top } 픽셀. */
  style?: CSSProperties
}

/**
 * 피해 수치 — mount 시 위로 떠오르며 페이드(CSS transition, 전역 키프레임 불필요).
 * 좌표는 부모(CombatFxOverlay)가 instanceId 로 찾아 style 로 주입.
 */
export function FloatingNumber({ value, lethal, className, style }: FloatingNumberProps) {
  const [up, setUp] = useState(false)
  useEffect(() => {
    const r = requestAnimationFrame(() => setUp(true))
    return () => cancelAnimationFrame(r)
  }, [])
  return (
    <span
      style={{
        transition: 'transform 0.9s ease-out, opacity 0.9s ease-out',
        transform: up ? 'translate(-50%, -42px)' : 'translate(-50%, 0)',
        opacity: up ? 0 : 1,
        ...style,
      }}
      className={cn(
        'pointer-events-none fixed z-[60] select-none font-extrabold tabular-nums drop-shadow-lg',
        lethal ? 'text-3xl text-rose-500' : 'text-2xl text-amber-300',
        className,
      )}
    >
      −{value}
    </span>
  )
}
