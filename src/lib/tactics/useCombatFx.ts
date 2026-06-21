'use client'

import { useEffect, useRef, useState } from 'react'
import { useBattle } from './battleClient'

/**
 * combatFx(ephemeral 전투 신호)를 드레인해 화면 좌표가 부여된 연출 뷰로 변환한다.
 * 스토어엔 좌표가 없으므로(정본 분리) 여기서 instanceId/nexusSeat → DOM 중심 좌표로 매핑.
 *
 * 반환:
 *  - floats   : 피해 수치(−N) 팝업
 *  - sprites  : 이펙트 이미지(슬래시/넥서스 임팩트/사망 먼지) — 좌표는 "중심"
 *  - hitIds   : 지금 흔들려야 하는 카드 instanceId (damage) — 카드별 히트스톱/쉐이크 트리거
 *  - shakeNonce: 증가 시 카메라 쉐이크(넥서스 피해/치명타)
 */
const SRC = {
  slash: '/assets/fx/fx_combat_fire_slash.png',
  nexus: '/assets/fx/fx_combat_water_strike.png',
  death: '/assets/fx/fx_combat_unit_death.png',
}
const FLOAT_MS = 950
const HIT_MS = 500 // 카드 쉐이크 지속(framer 키프레임과 정렬)
const SLASH_MS = 420
const NEXUS_MS = 480
const DEATH_MS = 320 // 사망 먼지(= 유닛 페이드아웃 0.3s 와 정렬)

export interface FxFloat {
  key: number
  value: number
  lethal: boolean
  left: number
  top: number
}
export interface FxSprite {
  key: number
  src: string
  left: number
  top: number
  size: number
  durMs: number
}
export interface CombatFxView {
  floats: FxFloat[]
  sprites: FxSprite[]
  hitIds: Set<string>
  shakeNonce: number
}

let uid = 0

/** instanceId(보드 유닛) 또는 nexusSeat 의 DOM 중심 좌표. (좌표는 뷰 책임.) */
function locate(instanceId?: string, nexusSeat?: number): { left: number; top: number } | null {
  if (typeof document === 'undefined') return null
  let el: Element | null = null
  if (instanceId) el = document.querySelector(`[data-instance-id="${instanceId}"]`)
  else if (nexusSeat !== undefined) el = document.querySelector(`[data-nexus-seat="${nexusSeat}"]`)
  if (!el) return null
  const r = el.getBoundingClientRect()
  return { left: r.left + r.width / 2, top: r.top + r.height / 2 }
}

export function useCombatFx(): CombatFxView {
  const combatFx = useBattle((s) => s.combatFx)
  const [floats, setFloats] = useState<FxFloat[]>([])
  const [sprites, setSprites] = useState<FxSprite[]>([])
  const [hitIds, setHitIds] = useState<Set<string>>(new Set())
  const [shakeNonce, setShakeNonce] = useState(0)
  const lastSeen = useRef(0)
  const timers = useRef<ReturnType<typeof setTimeout>[]>([])

  useEffect(() => {
    const fresh = combatFx.filter((f) => f.id > lastSeen.current)
    if (fresh.length === 0) return
    lastSeen.current = combatFx.reduce((m, f) => Math.max(m, f.id), lastSeen.current)

    const addFloats: FxFloat[] = []
    const addSprites: FxSprite[] = []
    const addHits: string[] = []
    let bump = false // 카메라 쉐이크 트리거

    for (const f of fresh) {
      if (f.kind === 'damage') {
        const pos = locate(f.targetInstanceId, f.nexusSeat)
        if (!pos) continue
        if (f.amount) addFloats.push({ key: ++uid, value: f.amount, lethal: !!f.lethal, left: pos.left, top: pos.top })
        if (f.targetInstanceId) {
          // 유닛 피격 → 슬래시 VFX + 카드 히트스톱/쉐이크 (치명타면 카메라도 흔듦)
          addSprites.push({ key: ++uid, src: SRC.slash, left: pos.left, top: pos.top, size: f.lethal ? 128 : 92, durMs: SLASH_MS })
          addHits.push(f.targetInstanceId)
          if (f.lethal) bump = true
        } else {
          bump = true // 넥서스에 직접 들어간 damage
        }
      } else if (f.kind === 'nexus') {
        const pos = locate(undefined, f.nexusSeat)
        if (pos) {
          if (f.amount) addFloats.push({ key: ++uid, value: f.amount, lethal: false, left: pos.left, top: pos.top })
          addSprites.push({ key: ++uid, src: SRC.nexus, left: pos.left, top: pos.top, size: 104, durMs: NEXUS_MS })
        }
        bump = true // 넥서스 피해 → 카메라 쉐이크
      } else if (f.kind === 'death') {
        // 사망: 스냅샷이 DOM 을 제거하기 직전(이벤트 선행 프레임)에 위치를 잡아 먼지 VFX 점화
        for (const id of f.instanceIds ?? []) {
          const pos = locate(id)
          if (pos) addSprites.push({ key: ++uid, src: SRC.death, left: pos.left, top: pos.top, size: 120, durMs: DEATH_MS })
        }
      }
    }

    if (addFloats.length) {
      setFloats((cur) => [...cur, ...addFloats])
      const ids = new Set(addFloats.map((x) => x.key))
      timers.current.push(setTimeout(() => setFloats((cur) => cur.filter((c) => !ids.has(c.key))), FLOAT_MS))
    }
    if (addSprites.length) {
      setSprites((cur) => [...cur, ...addSprites])
      for (const s of addSprites) {
        timers.current.push(setTimeout(() => setSprites((cur) => cur.filter((c) => c.key !== s.key)), s.durMs + 80))
      }
    }
    if (addHits.length) {
      setHitIds((cur) => {
        const n = new Set(cur)
        addHits.forEach((id) => n.add(id))
        return n
      })
      timers.current.push(
        setTimeout(() => {
          setHitIds((cur) => {
            const n = new Set(cur)
            addHits.forEach((id) => n.delete(id))
            return n
          })
        }, HIT_MS),
      )
    }
    if (bump) setShakeNonce((n) => n + 1)
  }, [combatFx])

  // 언마운트 시 잔여 타이머 정리
  useEffect(() => {
    const list = timers.current
    return () => {
      list.forEach(clearTimeout)
    }
  }, [])

  return { floats, sprites, hitIds, shakeNonce }
}
