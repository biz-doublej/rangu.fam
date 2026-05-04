'use client'

import React from 'react'

interface WikiMeterProps {
  /** Current value (clamped between 0 and `max`). */
  value: number
  /** Max value, default 100. */
  max?: number
  /** Optional label rendered above the bar. */
  label?: string
  /** Optional value override (e.g. "12 / 30"). When omitted, shows `value/max`. */
  valueLabel?: React.ReactNode
  /** Tone for the gradient fill. */
  tone?: 'cyan' | 'violet' | 'magenta' | 'warning' | 'danger' | 'success'
  /** Show numeric value at the end of the bar. */
  showValue?: boolean
  /** Force size variant. */
  size?: 'sm' | 'md'
  className?: string
}

const TONE_GRADIENT: Record<NonNullable<WikiMeterProps['tone']>, string> = {
  cyan:    'linear-gradient(90deg, #22D3EE, #67E8F9)',
  violet:  'linear-gradient(90deg, #A78BFA, #C4B5FD)',
  magenta: 'linear-gradient(90deg, #F472B6, #F9A8D4)',
  warning: 'linear-gradient(90deg, #FBBF24, #FDE68A)',
  danger:  'linear-gradient(90deg, #FB7185, #FCA5A5)',
  success: 'linear-gradient(90deg, #34D399, #6EE7B7)'
}

const TONE_GLOW: Record<NonNullable<WikiMeterProps['tone']>, string> = {
  cyan:    'rgba(34, 211, 238, 0.45)',
  violet:  'rgba(167, 139, 250, 0.45)',
  magenta: 'rgba(244, 114, 182, 0.45)',
  warning: 'rgba(251, 191, 36, 0.45)',
  danger:  'rgba(251, 113, 133, 0.45)',
  success: 'rgba(52, 211, 153, 0.45)'
}

/**
 * Tiny HUD-style progress meter. Use inside `wiki-infobox` cells or panels
 * to surface things like 문서 완성도, 감시자 비율, 진행률 등.
 */
export function WikiMeter({
  value,
  max = 100,
  label,
  valueLabel,
  tone = 'cyan',
  showValue = true,
  size = 'md',
  className = ''
}: WikiMeterProps) {
  const clamped = Math.max(0, Math.min(max, value))
  const pct = max > 0 ? (clamped / max) * 100 : 0
  const barHeight = size === 'sm' ? 4 : 6

  return (
    <div className={`wiki-meter ${className}`} role="meter" aria-valuenow={clamped} aria-valuemin={0} aria-valuemax={max}>
      {(label || showValue) && (
        <div className="flex items-center justify-between gap-2 mb-1">
          {label && (
            <span
              className="text-[10px] uppercase tracking-[0.16em] text-[color:var(--wiki-ink-faint)]"
              style={{ fontFamily: "'JetBrains Mono', monospace" }}
            >
              {label}
            </span>
          )}
          {showValue && (
            <span
              className="text-[10px] tabular-nums text-[color:var(--wiki-ink-soft)]"
              style={{ fontFamily: "'JetBrains Mono', monospace" }}
            >
              {valueLabel ?? `${pct.toFixed(0)}%`}
            </span>
          )}
        </div>
      )}
      <div
        className="relative w-full overflow-hidden rounded-full"
        style={{
          height: barHeight,
          background: 'rgba(8, 13, 24, 0.85)',
          border: '1px solid var(--wiki-rule)'
        }}
      >
        <div
          className="absolute inset-y-0 left-0 transition-[width] duration-500 ease-out"
          style={{
            width: `${pct}%`,
            background: TONE_GRADIENT[tone],
            boxShadow: `0 0 12px ${TONE_GLOW[tone]}`
          }}
        />
        {/* Subtle scan-shimmer */}
        <div
          aria-hidden
          className="absolute inset-0 opacity-30 pointer-events-none"
          style={{
            backgroundImage: 'repeating-linear-gradient(90deg, transparent 0 4px, rgba(255,255,255,0.06) 4px 5px)'
          }}
        />
      </div>
    </div>
  )
}
