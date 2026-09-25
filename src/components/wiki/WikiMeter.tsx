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

// 단일 액센트 원칙 — cyan/violet/magenta 는 모두 액센트로, 상태 톤만 별도 색
const TONE_COLOR: Record<NonNullable<WikiMeterProps['tone']>, string> = {
  cyan:    'var(--wiki-accent)',
  violet:  'var(--wiki-accent)',
  magenta: 'var(--wiki-accent)',
  warning: 'var(--wiki-warning)',
  danger:  'var(--wiki-danger)',
  success: 'var(--wiki-success)'
}

/**
 * Tiny progress meter. Use inside `wiki-infobox` cells or panels
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
              className="text-[10px] text-[color:var(--wiki-ink-faint)]"
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
          background: 'var(--wiki-bg-2)',
          border: '1px solid var(--wiki-rule)'
        }}
      >
        <div
          className="absolute inset-y-0 left-0 transition-[width] duration-500 ease-out"
          style={{
            width: `${pct}%`,
            background: TONE_COLOR[tone]
          }}
        />
      </div>
    </div>
  )
}
