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
  aura: '/assets/fx/fx_ui_rare_aura.png', // 각성 — 가챠 레어 오라 재사용
}
const FLOAT_MS = 950
const HIT_MS = 500 // 카드 쉐이크 지속(framer 키프레임과 정렬)
const SLASH_MS = 420
const NEXUS_MS = 480
const DEATH_MS = 320 // 사망 먼지(= 유닛 페이드아웃 0.3s 와 정렬)
const AURA_MS = 900 // 각성 황금 오라 펄스
const AWAKEN_MS = 900 // 카드 스케일 펌핑 지속(framer 키프레임과 정렬)
const BURST_MS = 1100 // "각성!" 텍스트 버스트 수명

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
export interface FxBurst {
  key: number
  left: number
  top: number
}
export interface CombatFxView {
  floats: FxFloat[]
  sprites: FxSprite[]
  hitIds: Set<string>
  shakeNonce: number
  /** 각성 중인 유닛 instanceId — 카드가 스케일 펌핑 트리거. */
  awakenIds: Set<string>
  /** "각성!" 텍스트 버스트(좌표 부여). */
  awakenBursts: FxBurst[]
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
  const [awakenIds, setAwakenIds] = useState<Set<string>>(new Set())
  const [awakenBursts, setAwakenBursts] = useState<FxBurst[]>([])
  const lastSeen = useRef(0)
  const timers = useRef<ReturnType<typeof setTimeout>[]>([])

  useEffect(() => {
    const fresh = combatFx.filter((f) => f.id > lastSeen.current)
    if (fresh.length === 0) return
    lastSeen.current = combatFx.reduce((m, f) => Math.max(m, f.id), lastSeen.current)

    const addFloats: { float: FxFloat; delayMs: number }[] = []
    const addSprites: FxSprite[] = []
    const addHits: string[] = []
    const addAwaken: string[] = []
    const addAwakenBursts: FxBurst[] = []
    let bump = false // 카메라 쉐이크 트리거

    for (const f of fresh) {
      if (f.kind === 'damage') {
        const pos = locate(f.targetInstanceId, f.nexusSeat)
        if (!pos) continue
        if (f.targetInstanceId) {
          // 유닛 피격: 슬래시 먼저 번쩍(시선 유도) → ~50ms 뒤 숫자가 위쪽(-35px)에서 팝업(가림 방지)
          addSprites.push({ key: ++uid, src: SRC.slash, left: pos.left, top: pos.top, size: f.lethal ? 128 : 92, durMs: SLASH_MS })
          addHits.push(f.targetInstanceId)
          if (f.amount) addFloats.push({ float: { key: ++uid, value: f.amount, lethal: !!f.lethal, left: pos.left, top: pos.top - 35 }, delayMs: 50 })
          if (f.lethal) bump = true // 치명타 → 카메라도 흔듦
        } else {
          if (f.amount) addFloats.push({ float: { key: ++uid, value: f.amount, lethal: !!f.lethal, left: pos.left, top: pos.top - 8 }, delayMs: 0 })
          bump = true // 넥서스에 직접 들어간 damage
        }
      } else if (f.kind === 'nexus') {
        const pos = locate(undefined, f.nexusSeat)
        if (pos) {
          addSprites.push({ key: ++uid, src: SRC.nexus, left: pos.left, top: pos.top, size: 104, durMs: NEXUS_MS })
          if (f.amount) addFloats.push({ float: { key: ++uid, value: f.amount, lethal: false, left: pos.left, top: pos.top - 8 }, delayMs: 0 })
        }
        bump = true // 넥서스 피해 → 카메라 쉐이크
      } else if (f.kind === 'death') {
        // 사망: 스냅샷이 DOM 을 제거하기 직전(이벤트 선행 프레임)에 위치를 잡아 먼지 VFX 점화
        for (const id of f.instanceIds ?? []) {
          const pos = locate(id)
          if (pos) addSprites.push({ key: ++uid, src: SRC.death, left: pos.left, top: pos.top, size: 120, durMs: DEATH_MS })
        }
      } else if (f.kind === 'awaken') {
        // 각성: 챔피언 위에 황금 오라 펄스 + "각성!" 버스트 + 카드 펌핑(awakenIds) + 화면 쉐이크
        const pos = locate(f.targetInstanceId)
        if (pos) {
          addSprites.push({ key: ++uid, src: SRC.aura, left: pos.left, top: pos.top, size: 220, durMs: AURA_MS })
          addAwakenBursts.push({ key: ++uid, left: pos.left, top: pos.top })
        }
        if (f.targetInstanceId) addAwaken.push(f.targetInstanceId)
        bump = true
      }
    }

    // floats: 각자 delayMs 후 추가(슬래시가 먼저 터지도록 리드), delayMs+FLOAT_MS 후 제거
    for (const { float, delayMs } of addFloats) {
      if (delayMs > 0) timers.current.push(setTimeout(() => setFloats((cur) => [...cur, float]), delayMs))
      else setFloats((cur) => [...cur, float])
      timers.current.push(setTimeout(() => setFloats((cur) => cur.filter((c) => c.key !== float.key)), delayMs + FLOAT_MS))
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
    if (addAwaken.length) {
      setAwakenIds((cur) => {
        const n = new Set(cur)
        addAwaken.forEach((id) => n.add(id))
        return n
      })
      timers.current.push(
        setTimeout(() => {
          setAwakenIds((cur) => {
            const n = new Set(cur)
            addAwaken.forEach((id) => n.delete(id))
            return n
          })
        }, AWAKEN_MS),
      )
    }
    if (addAwakenBursts.length) {
      setAwakenBursts((cur) => [...cur, ...addAwakenBursts])
      for (const b of addAwakenBursts) {
        timers.current.push(setTimeout(() => setAwakenBursts((cur) => cur.filter((c) => c.key !== b.key)), BURST_MS))
      }
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

  return { floats, sprites, hitIds, shakeNonce, awakenIds, awakenBursts }
}
