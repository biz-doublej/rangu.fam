'use client'

import { useEffect, useRef, useState } from 'react'

/**
 * LoR식 타겟팅 드래그 — 유닛은 고정, 화살표가 커서를 따라간다(raw pointer + SVG 오버레이).
 * framer `drag`는 요소를 움직여 "연결선" UX 에 부적합하므로 pointer 이벤트로 직접 처리.
 *
 * 관심사 분리: 훅은 우선권/페이즈를 모른다 — `start(원점, onDrop)` 시점에 호출측이
 * onDrop 콜백(그 시점의 canAttack/isBlock 클로저)을 주입한다. 훅은 좌표·히트테스트만 담당.
 *
 * 탭/드래그 구분: 6px 이동 전엔 armed=false → 단순 탭은 화살표를 안 띄우고 onDrop 도 안 부른다
 * (기존 클릭-셀렉트가 그대로 동작). 6px 넘으면 armed → 화살표 표시 + 드롭 시 onDrop.
 */
export interface DropTarget {
  kind: 'unit' | 'nexus'
  instanceId?: string
  seat?: number
}
export type ArrowVariant = 'attack' | 'block' | 'spell'
export interface Arrow {
  x1: number
  y1: number
  x2: number
  y2: number
}

const THRESHOLD = 6

function hitTest(x: number, y: number): DropTarget | null {
  if (typeof document === 'undefined') return null
  const el = document.elementFromPoint(x, y)
  if (!el) return null
  const unit = el.closest('[data-instance-id]')
  const id = unit?.getAttribute('data-instance-id')
  if (id) return { kind: 'unit', instanceId: id }
  const nexus = el.closest('[data-nexus-seat]')
  if (nexus) return { kind: 'nexus', seat: Number(nexus.getAttribute('data-nexus-seat')) }
  return null
}

export function useDragTargeting() {
  const [state, setState] = useState<{ arrow: Arrow; variant: ArrowVariant } | null>(null)
  const drag = useRef<{
    x1: number
    y1: number
    armed: boolean
    variant: ArrowVariant
    onDrop: (t: DropTarget | null) => void
  } | null>(null)

  useEffect(() => {
    const move = (e: PointerEvent) => {
      const d = drag.current
      if (!d) return
      if (!d.armed && Math.hypot(e.clientX - d.x1, e.clientY - d.y1) < THRESHOLD) return // 탭 임계 미만
      d.armed = true
      setState({ arrow: { x1: d.x1, y1: d.y1, x2: e.clientX, y2: e.clientY }, variant: d.variant })
    }
    const up = (e: PointerEvent) => {
      const d = drag.current
      if (!d) return
      drag.current = null
      setState(null)
      if (d.armed) d.onDrop(hitTest(e.clientX, e.clientY)) // 실제 드래그였을 때만 해소(탭은 클릭에 맡김)
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
    return () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
    }
  }, [])

  /** 드래그 시작 — 원점 요소 중심을 화살표 기점으로, onDrop·variant 는 호출 시점 클로저를 캡처. */
  const start = (originEl: HTMLElement, onDrop: (t: DropTarget | null) => void, variant: ArrowVariant = 'attack') => {
    const r = originEl.getBoundingClientRect()
    drag.current = { x1: r.left + r.width / 2, y1: r.top + r.height / 2, armed: false, variant, onDrop }
  }

  return { arrow: state?.arrow ?? null, variant: state?.variant ?? 'attack', start }
}
