'use client'

import React from 'react'
import { MEMBER_COLOR, MEMBER_EMOJI } from '@/lib/battle/presets'
import { KEYWORD_INFO } from '@/lib/battle/keywords'
import type { Keyword, SpellSpeed } from '@/lib/battle/types'

const SPEED_LABEL: Record<SpellSpeed, string> = { burst: '즉발', fast: '순간', slow: '지연' }

export interface CardTileProps {
  name: string
  member?: string | null
  kind: 'unit' | 'spell'
  cost?: number
  power?: number
  health?: number
  maxHealth?: number
  keywords?: Keyword[]
  isChampion?: boolean
  championLevel?: 1 | 2
  spellSpeed?: SpellSpeed
  size?: 'board' | 'hand'
  selected?: boolean
  attacking?: boolean
  stunned?: boolean
  dimmed?: boolean
  disabled?: boolean
  onClick?: () => void
}

export function CardTile(props: CardTileProps) {
  const {
    name, member, kind, cost, power, health, maxHealth, keywords = [],
    isChampion, championLevel = 1, spellSpeed, size = 'board',
    selected, attacking, stunned, dimmed, disabled, onClick,
  } = props

  const accent = (member && MEMBER_COLOR[member]) || '#6b7280'
  const emoji = (member && MEMBER_EMOJI[member]) || ''
  const leveled = isChampion && championLevel >= 2
  const damaged = typeof health === 'number' && typeof maxHealth === 'number' && health < maxHealth
  const isHand = size === 'hand'
  const clickable = !!onClick && !disabled

  return (
    <button
      type="button"
      onClick={clickable ? onClick : undefined}
      disabled={!clickable}
      className={[
        'relative shrink-0 rounded-lg border text-left transition-all',
        isHand ? 'w-[92px] h-[124px] p-2' : 'w-[74px] h-[96px] p-1.5',
        clickable ? 'cursor-pointer hover:-translate-y-1' : 'cursor-default',
        selected ? 'ring-2 ring-amber-300 -translate-y-1' : '',
        attacking ? 'ring-2 ring-rose-400' : '',
        dimmed ? 'opacity-40 saturate-50' : '',
      ].join(' ')}
      style={{
        background: `linear-gradient(160deg, ${accent}26, #0f1024 70%)`,
        borderColor: leveled ? '#fbbf24' : `${accent}aa`,
        boxShadow: leveled ? '0 0 14px rgba(251,191,36,0.5)' : undefined,
      }}
    >
      {/* cost (hand) */}
      {isHand && typeof cost === 'number' && (
        <span className="absolute -left-1.5 -top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-sky-500 text-xs font-extrabold text-white shadow">
          {cost}
        </span>
      )}
      {/* champion star */}
      {isChampion && (
        <span className="absolute -right-1.5 -top-1.5 text-sm" title={`챔피언 Lv${championLevel}`}>
          {leveled ? '🌟' : '⭐'}
        </span>
      )}

      <div className="flex h-full flex-col">
        <div className={`flex items-start gap-1 ${isHand ? 'text-[11px]' : 'text-[9px]'} font-semibold leading-tight text-white/90`}>
          <span>{emoji}</span>
          <span className="line-clamp-2">{name}</span>
        </div>

        {kind === 'spell' ? (
          <div className="mt-auto flex items-center justify-between">
            <span className="rounded bg-fuchsia-500/30 px-1.5 py-0.5 text-[9px] font-bold text-fuchsia-100">
              주문 · {spellSpeed ? SPEED_LABEL[spellSpeed] : ''}
            </span>
            <span className="text-base">🪄</span>
          </div>
        ) : (
          <>
            {keywords.length > 0 && (
              <div className="mt-1 flex flex-wrap gap-0.5">
                {keywords.map((k) => (
                  <span key={k} title={KEYWORD_INFO[k]?.desc} className="text-[10px] leading-none">
                    {KEYWORD_INFO[k]?.emoji}
                  </span>
                ))}
              </div>
            )}
            <div className="mt-auto flex items-end justify-between">
              <span className="flex h-5 min-w-[18px] items-center justify-center rounded bg-orange-500 px-1 text-xs font-extrabold text-white">
                {power ?? 0}
              </span>
              {stunned && <span className="text-xs" title="기절">💫</span>}
              <span
                className={`flex h-5 min-w-[18px] items-center justify-center rounded px-1 text-xs font-extrabold text-white ${
                  damaged ? 'bg-rose-600' : 'bg-emerald-600'
                }`}
              >
                {health ?? 0}
              </span>
            </div>
          </>
        )}
      </div>
    </button>
  )
}
