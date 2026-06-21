import type { CardVM } from '@rangu/battle-core'
import { cn } from './cn'
import { CardTile } from './CardTile'

export interface CardSlotProps {
  card?: CardVM
  onClick?: () => void
  className?: string
}

/** 보드/라인의 한 칸 — 카드가 있으면 CardTile, 없으면 빈 슬롯. */
export function CardSlot({ card, onClick, className }: CardSlotProps) {
  return (
    <div
      className={cn(
        'flex h-28 w-20 items-center justify-center rounded-lg border border-dashed border-slate-700/60',
        className,
      )}
    >
      {card ? <CardTile card={card} onClick={onClick} /> : null}
    </div>
  )
}
