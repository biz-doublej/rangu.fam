'use client'

import React from 'react'
import clsx from 'clsx'
import { getRarityToken } from '@/lib/cardTheme'

export interface RarityChipProps {
  rarity?: string
  size?: 'sm' | 'md' | 'lg'
  showIcon?: boolean
  className?: string
}

const sizeCls = {
  sm: 'text-[10px] px-2 py-0.5 gap-1',
  md: 'text-xs px-2.5 py-1 gap-1.5',
  lg: 'text-sm px-3 py-1.5 gap-2',
}

const iconSize = { sm: 10, md: 12, lg: 14 }

export function RarityChip({ rarity, size = 'md', showIcon = true, className }: RarityChipProps) {
  const t = getRarityToken(rarity)
  const Icon = t.icon
  return (
    <span
      className={clsx(
        'inline-flex items-center rounded-full border font-bold uppercase tracking-wider',
        sizeCls[size],
        className
      )}
      style={{ color: t.ink, background: t.wash, borderColor: t.edge }}
    >
      {showIcon && <Icon size={iconSize[size]} />}
      {t.label}
    </span>
  )
}
