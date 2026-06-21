import type { SideVM } from '@rangu/battle-core'
import { cn } from './cn'

const STARTING_NEXUS = 20

export interface NexusBarProps {
  side: SideVM
  label?: string
  className?: string
}

/** 넥서스 체력 바 + 마나/공격권. */
export function NexusBar({ side, label, className }: NexusBarProps) {
  const pct = Math.max(0, Math.min(100, (side.nexusHealth / STARTING_NEXUS) * 100))
  return (
    <div className={cn('flex items-center gap-2', className)}>
      {label ? <span className="w-12 text-xs text-slate-400">{label}</span> : null}
      <div className="relative h-4 w-40 overflow-hidden rounded-full bg-slate-700">
        <div className="h-full bg-gradient-to-r from-rose-500 to-amber-400 transition-all duration-500" style={{ width: `${pct}%` }} />
        <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-white">
          {side.nexusHealth}
        </span>
      </div>
      <span className="text-xs text-sky-300">
        {side.mana}/{side.manaMax}
        {side.spellMana > 0 ? ` (+${side.spellMana})` : ''}
      </span>
      {side.hasAttackToken ? <span title="공격권" className="text-amber-400">⚔</span> : null}
    </div>
  )
}
