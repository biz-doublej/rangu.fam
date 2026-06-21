import type { CardVM } from '@rangu/battle-core'
import { cn } from './cn'
import { CardTile } from './CardTile'

export interface CardSlotProps {
  card?: CardVM
  /** 보드 유닛 선택(공격/블록) 클릭. */
  onClick?: () => void
  /** 공격자로 선택됨(내가 고른) — amber ring. */
  selected?: boolean
  /** 현재 공격 중(스냅샷 combat) — rose ring. */
  attacking?: boolean
  className?: string
}

/**
 * 보드/라인의 한 칸 — 카드가 있으면 CardTile, 없으면 빈 슬롯.
 * data-instance-id 로 FloatingNumbers 가 피해 수치 위치를 찾는다.
 */
export function CardSlot({ card, onClick, selected, attacking, className }: CardSlotProps) {
  const interactive = !!onClick && !!card
  return (
    <div
      data-instance-id={card?.instanceId}
      onClick={interactive ? onClick : undefined}
      role={interactive ? 'button' : undefined}
      className={cn(
        'flex h-28 w-20 items-center justify-center rounded-lg border border-dashed border-slate-700/60 transition',
        interactive && 'cursor-pointer hover:border-amber-400/60',
        selected && 'ring-2 ring-amber-400',
        attacking && 'ring-2 ring-rose-500',
        className,
      )}
    >
      {card ? <CardTile card={card} /> : null}
    </div>
  )
}
