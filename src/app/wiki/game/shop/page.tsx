'use client'

import React, { useCallback, useEffect, useRef, useState } from 'react'
import { GamecenterFrame, formatPoints } from '@/components/gamecenter/GamecenterFrame'
import { gcFetch, gcPost, newRequestId, useGamecenterMe } from '@/components/gamecenter/useGamecenterMe'

interface ShopItem {
  id: string
  name: string
  description: string
  kind: 'inventory' | 'title' | 'wiki_color' | 'coupon'
  price: number
  stock: number | null
  limitPerPeriod: number | null
  limitPeriod: 'day' | 'week' | 'month' | 'once' | null
  limitReached: boolean
}

const KIND_LABELS: Record<ShopItem['kind'], string> = {
  inventory: '아이템',
  title: '칭호',
  wiki_color: '위키 연동',
  coupon: '쿠폰',
}

const PERIOD_LABELS = { day: '하루', week: '주', month: '월', once: '계정당' } as const

function limitText(item: ShopItem): string | null {
  if (!item.limitPerPeriod || !item.limitPeriod) return null
  return `${PERIOD_LABELS[item.limitPeriod]} ${item.limitPerPeriod}개`
}

export default function GamecenterShopPage() {
  const { me, error, loading, reload } = useGamecenterMe()
  const [items, setItems] = useState<ShopItem[] | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [confirmId, setConfirmId] = useState<string | null>(null)
  const [notice, setNotice] = useState<{ tone: 'success' | 'danger'; text: string } | null>(null)
  // 교환 한 번에 요청 id 하나 — 응답을 못 받아 다시 눌러도 두 번 차감되지 않는다.
  const requestIds = useRef<Record<string, string>>({})

  const loadItems = useCallback(async () => {
    try {
      const data = await gcFetch<{ items: ShopItem[] }>('/api/gamecenter/shop')
      setItems(data.items)
    } catch (err) {
      if ((err as { status?: number }).status !== 401) setNotice({ tone: 'danger', text: (err as Error).message })
    }
  }, [])

  useEffect(() => {
    loadItems()
  }, [loadItems])

  const handlePurchase = async (item: ShopItem) => {
    setBusyId(item.id)
    setNotice(null)
    const requestId = (requestIds.current[item.id] ||= newRequestId())
    try {
      const result = await gcPost<{ order: { status: string } | null }>('/api/gamecenter/shop/purchase', {
        itemId: item.id,
        requestId,
      })
      delete requestIds.current[item.id]
      setNotice({
        tone: 'success',
        text:
          result.order?.status === 'pending'
            ? `‘${item.name}’ 교환을 접수했습니다. 관리자가 확인한 뒤 처리합니다.`
            : `‘${item.name}’ 교환 완료! 내 정보에서 확인할 수 있습니다.`,
      })
    } catch (err) {
      // 서버가 거절한 요청은 처리되지 않았으므로 다음에는 새 요청 id 를 쓴다.
      if ((err as { status?: number }).status) delete requestIds.current[item.id]
      setNotice({ tone: 'danger', text: (err as Error).message })
    } finally {
      setBusyId(null)
      setConfirmId(null)
      await Promise.all([reload(), loadItems()])
    }
  }

  return (
    <GamecenterFrame
      active="shop"
      subtitle="모은 포인트로 상품을 교환합니다. 포인트는 현금으로 사거나 바꿀 수 없습니다."
      me={me}
      loading={loading}
      error={error}
    >
      {me && (
        <div className="space-y-4">
          {notice && (
            <p role="status" className={`wiki-mbox wiki-mbox--${notice.tone}`}>
              {notice.text}
            </p>
          )}

          {!items ? (
            <p className="py-10 text-center text-sm text-[color:var(--wiki-ink-muted)]">상품을 불러오는 중입니다.</p>
          ) : items.length === 0 ? (
            <p className="py-10 text-center text-sm text-[color:var(--wiki-ink-muted)]">지금 교환할 수 있는 상품이 없습니다.</p>
          ) : (
            <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {items.map((item) => {
                const soldOut = item.stock !== null && item.stock <= 0
                const short = me.wallet.balance < item.price
                const blocked = soldOut || item.limitReached || short
                const reason = soldOut
                  ? '품절'
                  : item.limitReached
                    ? '교환 한도 도달'
                    : short
                      ? `${formatPoints(item.price - me.wallet.balance)} 부족`
                      : null
                const limit = limitText(item)
                return (
                  <li key={item.id} className="wiki-panel flex flex-col">
                    <div className="flex items-start justify-between gap-2">
                      <h2 className="text-base font-semibold text-[color:var(--wiki-ink)]">{item.name}</h2>
                      <span className="shrink-0 rounded-sm bg-[color:var(--wiki-accent-soft)] px-1.5 py-0.5 text-[11px] font-medium text-[color:var(--wiki-accent)]">
                        {KIND_LABELS[item.kind]}
                      </span>
                    </div>
                    {item.description && (
                      <p className="mt-1 text-sm leading-relaxed text-[color:var(--wiki-ink-soft)]">{item.description}</p>
                    )}
                    <p className="mt-2 text-xs text-[color:var(--wiki-ink-muted)]">
                      {[limit, item.stock !== null ? `남은 수량 ${item.stock}개` : null].filter(Boolean).join(' · ') || '제한 없음'}
                    </p>
                    <div className="mt-auto flex items-center justify-between gap-2 pt-4">
                      <span className="text-lg font-bold tabular-nums text-[color:var(--wiki-ink)]">{formatPoints(item.price)}</span>
                      {confirmId === item.id ? (
                        <span className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => setConfirmId(null)}
                            disabled={busyId === item.id}
                            className="rounded-md border border-[color:var(--wiki-rule-strong)] px-2.5 py-1.5 text-sm text-[color:var(--wiki-ink-soft)] hover:bg-[color:var(--wiki-bg-2)]"
                          >
                            취소
                          </button>
                          <button
                            type="button"
                            onClick={() => handlePurchase(item)}
                            disabled={busyId === item.id}
                            className="rounded-md bg-[color:var(--wiki-accent)] px-2.5 py-1.5 text-sm font-medium text-[#fff] hover:opacity-90 disabled:opacity-50"
                          >
                            {busyId === item.id ? '교환하는 중' : `${formatPoints(item.price)} 쓰기`}
                          </button>
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setConfirmId(item.id)}
                          disabled={blocked || busyId !== null}
                          className="rounded-md bg-[color:var(--wiki-accent)] px-3 py-1.5 text-sm font-medium text-[#fff] hover:opacity-90 disabled:cursor-not-allowed disabled:bg-[color:var(--wiki-bg-2)] disabled:text-[color:var(--wiki-ink-muted)]"
                        >
                          {reason || '교환'}
                        </button>
                      )}
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      )}
    </GamecenterFrame>
  )
}
