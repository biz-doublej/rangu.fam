'use client'

import { useEffect, useRef } from 'react'
import { useBattle } from './battleClient'
import { soundManager } from './soundManager'

/**
 * combatFx(전투 신호)를 드레인해 SFX 재생 — useCombatFx(시각)와 분리된 청각 레이어.
 * 한 배치에 같은 종류가 여러 개여도 종류당 1회만(중첩 소음 방지).
 */
export function useCombatSound(): void {
  const combatFx = useBattle((s) => s.combatFx)
  const lastSeen = useRef(0)

  useEffect(() => {
    const fresh = combatFx.filter((f) => f.id > lastSeen.current)
    if (fresh.length === 0) return
    lastSeen.current = combatFx.reduce((m, f) => Math.max(m, f.id), lastSeen.current)

    const kinds = new Set(fresh.map((f) => f.kind))
    if (kinds.has('damage')) soundManager.play('hit')
    if (kinds.has('death')) soundManager.play('death')
    if (kinds.has('nexus')) soundManager.play('nexus')
    if (kinds.has('awaken')) soundManager.play('rareAura') // 각성 — 가챠 오라 사운드 재사용(웅장한 공명)
  }, [combatFx])
}
