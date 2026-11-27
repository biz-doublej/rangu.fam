'use client'

import React, { useEffect, useRef } from 'react'
import { drawPlush } from './drawPlush'
import type { PlushType } from './plushes'

/** 인형 한 개를 그리는 작은 캔버스 (도감 칸, 획득 알림) */
export function PlushIcon({ type, size }: { type: PlushType; size: number }) {
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = ref.current
    const c = canvas?.getContext('2d')
    if (!canvas || !c) return
    c.setTransform(1, 0, 0, 1, 0, 0)
    c.clearRect(0, 0, canvas.width, canvas.height)
    // 귀가 위로 나오므로 몸을 조금 아래에 둔다
    c.translate(size, size * 1.1)
    drawPlush(c, type, size * 0.6)
  }, [type, size])

  return <canvas ref={ref} width={size * 2} height={size * 2} aria-hidden />
}
