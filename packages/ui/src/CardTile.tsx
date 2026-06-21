import { cva, type VariantProps } from 'class-variance-authority'
import type { CardVM } from '@rangu/battle-core'
import { cn } from './cn'

const cardTile = cva(
  'relative flex h-28 w-20 select-none flex-col justify-between rounded-lg border p-1.5 text-xs transition',
  {
    variants: {
      faceDown: {
        true: 'bg-gradient-to-br from-indigo-800 to-slate-900 border-indigo-500/40',
        false: 'bg-slate-800 border-slate-600 text-slate-100',
      },
      exhausted: { true: 'opacity-60 grayscale', false: '' },
      clickable: { true: 'cursor-pointer hover:-translate-y-1 hover:border-amber-400', false: '' },
    },
    defaultVariants: { faceDown: false, exhausted: false, clickable: false },
  },
)

export interface CardTileProps extends VariantProps<typeof cardTile> {
  card: CardVM
  /** 표시 이름(카드 메타데이터). 없으면 definitionId. */
  name?: string
  /** 낙관적 전송 중 — 클릭 비활성 + pulse. */
  pending?: boolean
  onClick?: () => void
  className?: string
}

/** 카드 한 장. faceDown(상대 손패 등)이면 뒷면, 아니면 코스트/파워/체력/이름. */
export function CardTile({ card, name, pending, onClick, className }: CardTileProps) {
  if (card.faceDown) {
    return <div className={cn(cardTile({ faceDown: true }), className)} aria-label="hidden card" />
  }
  const interactive = !!onClick && !pending
  return (
    <div
      className={cn(
        cardTile({ faceDown: false, exhausted: card.exhausted, clickable: interactive }),
        pending && 'pointer-events-none animate-pulse opacity-70 ring-1 ring-amber-400',
        className,
      )}
      onClick={interactive ? onClick : undefined}
      role={interactive ? 'button' : undefined}
      aria-busy={pending || undefined}
    >
      <div className="flex justify-between">
        <span className="rounded bg-sky-500 px-1 font-bold text-white">{card.cost ?? 0}</span>
        {card.exhausted ? <span title="행동 완료">💤</span> : null}
      </div>
      <div className="truncate text-[10px] text-slate-300">{name ?? card.definitionId}</div>
      <div className="flex justify-between font-bold">
        <span className="text-amber-400">{card.power ?? 0}</span>
        <span className={cn('text-rose-400', (card.damage ?? 0) > 0 && 'text-rose-300')}>{card.health ?? 0}</span>
      </div>
    </div>
  )
}
