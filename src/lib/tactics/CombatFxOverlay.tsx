'use client'

import { motion } from 'framer-motion'
import { FloatingNumber } from '@rangu/ui'
import type { FxFloat, FxSprite } from './useCombatFx'

/**
 * 전투 VFX 오버레이 — 화면 고정 레이어(pointer-events-none)에 이펙트 스프라이트 + 피해 수치를 띄운다.
 * 좌표는 useCombatFx 가 부여(중심 기준). 스프라이트는 mount→재생/페이드 후 훅 타이머가 제거.
 */
export function CombatFxOverlay({ floats, sprites }: { floats: FxFloat[]; sprites: FxSprite[] }) {
  return (
    <div className="pointer-events-none fixed inset-0 z-[55] overflow-hidden">
      {sprites.map((s) => (
        <motion.img
          key={s.key}
          src={s.src}
          alt=""
          // 중심 정렬(framer 가 transform 을 점유하므로 translate 대신 좌표 오프셋)
          style={{ position: 'fixed', left: s.left - s.size / 2, top: s.top - s.size / 2, width: s.size, height: s.size }}
          initial={{ opacity: 0, scale: 0.45, rotate: -6 }}
          animate={{ opacity: [0, 1, 1, 0], scale: [0.45, 1.15, 1, 1.25], rotate: [-6, 0, 2, 5] }}
          transition={{ duration: s.durMs / 1000, times: [0, 0.25, 0.6, 1], ease: 'easeOut' }}
        />
      ))}
      {floats.map((f) => (
        <FloatingNumber key={f.key} value={f.value} lethal={f.lethal} style={{ left: f.left, top: f.top }} />
      ))}
    </div>
  )
}
