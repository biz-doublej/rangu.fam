'use client'

import type { Arrow } from './useDragTargeting'

/**
 * LoR식 타겟팅 연결선 — 기점(유닛 중심)에서 커서까지 살짝 휜 곡선 + 화살촉.
 * 화면 고정·pointer-events-none(드롭 히트테스트의 elementFromPoint 를 방해하지 않음).
 */
export function TargetingArrow({ arrow, variant }: { arrow: Arrow | null; variant: 'attack' | 'block' }) {
  if (!arrow) return null
  const { x1, y1, x2, y2 } = arrow
  const color = variant === 'attack' ? '#fb7185' : '#38bdf8' // rose / sky

  const dx = x2 - x1
  const dy = y2 - y1
  const len = Math.hypot(dx, dy) || 1
  const ang = Math.atan2(dy, dx)

  // 수직 방향으로 살짝 휜 베지어(곡선감)
  const nx = -dy / len
  const ny = dx / len
  const bow = Math.min(70, len * 0.18)
  const cx = (x1 + x2) / 2 + nx * bow
  const cy = (y1 + y2) / 2 + ny * bow

  // 끝점 화살촉
  const head = 17
  const left = ang + Math.PI - 0.5
  const right = ang + Math.PI + 0.5

  return (
    <svg className="pointer-events-none fixed inset-0 z-[58] h-full w-full">
      <path
        d={`M ${x1} ${y1} Q ${cx} ${cy} ${x2} ${y2}`}
        fill="none"
        stroke={color}
        strokeWidth={4}
        strokeLinecap="round"
        opacity={0.92}
        style={{ filter: `drop-shadow(0 0 4px ${color})` }}
      />
      <polygon
        points={`${x2},${y2} ${x2 + Math.cos(left) * head},${y2 + Math.sin(left) * head} ${x2 + Math.cos(right) * head},${y2 + Math.sin(right) * head}`}
        fill={color}
      />
      <circle cx={x1} cy={y1} r={6} fill={color} opacity={0.85} />
    </svg>
  )
}
