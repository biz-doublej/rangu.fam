'use client'

import { useEffect, useRef, useState } from 'react'
import { FloatingNumber } from '@rangu/ui'
import { useBattle } from './battleClient'

interface Float {
  key: number
  value: number
  lethal: boolean
  left: number
  top: number
}

/** instanceId(보드 유닛) 또는 nexusSeat 의 DOM 중심 좌표를 찾는다. (좌표는 뷰 책임.) */
function locate(instanceId?: string, nexusSeat?: number): { left: number; top: number } | null {
  if (typeof document === 'undefined') return null
  let el: Element | null = null
  if (instanceId) el = document.querySelector(`[data-instance-id="${instanceId}"]`)
  else if (nexusSeat !== undefined) el = document.querySelector(`[data-nexus-seat="${nexusSeat}"]`)
  if (!el) return null
  const r = el.getBoundingClientRect()
  return { left: r.left + r.width / 2, top: r.top + r.height / 2 }
}

/**
 * battleStore.combatFx(ephemeral 도메인 신호)를 드레인해 피해 수치를 띄운다.
 * 스토어엔 좌표가 없고(정본 분리), 여기서 instanceId→DOM 위치로 변환 후 자가 소멸.
 */
export function FloatingNumbersLayer() {
  const combatFx = useBattle((s) => s.combatFx)
  const [floats, setFloats] = useState<Float[]>([])
  const lastSeen = useRef(0)

  useEffect(() => {
    const fresh = combatFx.filter((f) => f.id > lastSeen.current)
    if (fresh.length === 0) return
    lastSeen.current = combatFx.reduce((m, f) => Math.max(m, f.id), lastSeen.current)

    const next: Float[] = []
    for (const f of fresh) {
      if (f.kind === 'damage' && f.amount) {
        const pos = locate(f.targetInstanceId, f.nexusSeat)
        if (pos) next.push({ key: f.id, value: f.amount, lethal: !!f.lethal, left: pos.left, top: pos.top })
      }
    }
    if (next.length === 0) return
    setFloats((cur) => [...cur, ...next])
    const ids = new Set(next.map((n) => n.key))
    const t = setTimeout(() => setFloats((cur) => cur.filter((c) => !ids.has(c.key))), 1000)
    return () => clearTimeout(t)
  }, [combatFx])

  return (
    <>
      {floats.map((f) => (
        <FloatingNumber key={f.key} value={f.value} lethal={f.lethal} style={{ left: f.left, top: f.top }} />
      ))}
    </>
  )
}
