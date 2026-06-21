'use client'

import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { ArrowLeftRight, Check, Inbox, Loader2, Plus, Send, X } from 'lucide-react'
import { PaperCard, CaveatText } from '@/components/scrapbook'
import { getRarityToken, handleCardImageError, FALLBACK_CARD_IMAGE } from '@/lib/cardTheme'

interface CatalogCard {
  cardId: string
  name: string
  imageUrl: string
  rarity: string
  type: string
  member?: string | null
}
interface MyCard {
  cardId: string
  quantity: number
  isLocked: boolean
}
interface Partner {
  id: string
  username: string
  displayName: string
  avatar: string | null
  memberId?: string
}
interface BriefUser {
  id: string
  username: string
  displayName: string
  avatar: string | null
}
interface Trade {
  id: string
  fromUser: BriefUser
  toUser: BriefUser
  offerCardId: string
  offerQuantity: number
  requestCardId: string
  requestQuantity: number
  status: 'pending' | 'accepted' | 'rejected' | 'cancelled'
  message: string
  createdAt: string
  respondedAt: string | null
}

const STATUS_LABEL: Record<Trade['status'], string> = {
  pending: '대기 중',
  accepted: '수락됨',
  rejected: '거절됨',
  cancelled: '취소됨',
}

export function TradeCenter({ userId }: { userId?: string }) {
  const [loading, setLoading] = useState(true)
  const [needsMigration, setNeedsMigration] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [incoming, setIncoming] = useState<Trade[]>([])
  const [outgoing, setOutgoing] = useState<Trade[]>([])
  const [partners, setPartners] = useState<Partner[]>([])
  const [catalog, setCatalog] = useState<CatalogCard[]>([])
  const [myCards, setMyCards] = useState<MyCard[]>([])
  const [busyId, setBusyId] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  // 제안 폼 상태
  const [showForm, setShowForm] = useState(false)
  const [toUserId, setToUserId] = useState('')
  const [offerCardId, setOfferCardId] = useState('')
  const [offerQuantity, setOfferQuantity] = useState(1)
  const [requestCardId, setRequestCardId] = useState('')
  const [requestQuantity, setRequestQuantity] = useState(1)
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const catalogMap = useMemo(() => new Map(catalog.map((c) => [c.cardId, c])), [catalog])
  const offerable = useMemo(() => myCards.filter((c) => !c.isLocked && c.quantity > 0), [myCards])
  const sortedCatalog = useMemo(
    () => [...catalog].sort((a, b) => a.name.localeCompare(b.name, 'ko-KR')),
    [catalog]
  )
  const selectedOwned = offerable.find((c) => c.cardId === offerCardId)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const r = await fetch('/api/cards/trades', { credentials: 'include' })
      const d = await r.json().catch(() => ({}))
      if (r.status === 503 && d?.needsMigration) {
        setNeedsMigration(true)
        return
      }
      if (r.status === 401) {
        setError('카드 교환은 로그인 후 이용할 수 있습니다.')
        return
      }
      if (!r.ok || !d?.success) {
        setError(d?.message || '교환 정보를 불러오지 못했습니다.')
        return
      }
      setIncoming(d.incoming || [])
      setOutgoing(d.outgoing || [])
      setPartners(d.partners || [])
      setCatalog(d.catalog || [])
      setMyCards(d.myCards || [])
    } catch {
      setError('네트워크 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (userId) load()
    else setLoading(false)
  }, [userId, load])

  useEffect(() => {
    if (!toast) return
    const id = setTimeout(() => setToast(null), 2600)
    return () => clearTimeout(id)
  }, [toast])

  const respond = async (id: string, action: 'accept' | 'reject' | 'cancel') => {
    setBusyId(id)
    try {
      const r = await fetch(`/api/cards/trades/${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ action }),
      })
      const d = await r.json().catch(() => ({}))
      setToast(d?.message || (d?.success ? '처리되었습니다.' : '처리에 실패했습니다.'))
      if (d?.success) await load()
    } catch {
      setToast('오류가 발생했습니다.')
    } finally {
      setBusyId(null)
    }
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!toUserId || !offerCardId || !requestCardId) {
      setToast('받는 사람과 교환할 카드를 모두 선택하세요.')
      return
    }
    setSubmitting(true)
    try {
      const r = await fetch('/api/cards/trades', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ toUserId, offerCardId, offerQuantity, requestCardId, requestQuantity, message }),
      })
      const d = await r.json().catch(() => ({}))
      setToast(d?.message || (d?.success ? '제안을 보냈습니다.' : '제안에 실패했습니다.'))
      if (d?.success) {
        setShowForm(false)
        setOfferCardId('')
        setRequestCardId('')
        setMessage('')
        setOfferQuantity(1)
        setRequestQuantity(1)
        await load()
      }
    } catch {
      setToast('오류가 발생했습니다.')
    } finally {
      setSubmitting(false)
    }
  }

  if (!userId) {
    return (
      <PaperCard className="text-center">
        <p className="text-sm text-ink-300">카드 교환은 로그인 후 이용할 수 있습니다.</p>
      </PaperCard>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-ink-300">
        <Loader2 className="h-5 w-5 animate-spin" />
        <span className="ml-2 text-sm">교환함을 불러오는 중…</span>
      </div>
    )
  }

  if (needsMigration) {
    return (
      <PaperCard className="text-center">
        <ArrowLeftRight className="mx-auto h-7 w-7 text-coral-500" />
        <h3 className="display-han mt-3 text-xl text-ink-500">교환 기능 준비 중</h3>
        <p className="mx-auto mt-2 max-w-md text-sm text-ink-300">
          카드 교환 테이블이 아직 생성되지 않았습니다. 관리자가{' '}
          <code className="rounded bg-ink-500/10 px-1 py-0.5 text-xs">
            /api/admin/maintenance/cards-trades?confirm=1
          </code>{' '}
          을 1회 실행하면 활성화됩니다.
        </p>
      </PaperCard>
    )
  }

  return (
    <div className="space-y-6">
      {/* 새 제안 버튼 / 폼 */}
      <div>
        {!showForm ? (
          <button
            onClick={() => setShowForm(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-ink-500 px-4 py-2.5 text-sm font-bold text-paper-50 shadow-paper transition hover:bg-ink-500/90"
          >
            <Plus className="h-4 w-4" />새 교환 제안
          </button>
        ) : (
          <PaperCard>
            <div className="mb-4 flex items-center justify-between">
              <div>
                <CaveatText className="text-lg text-coral-500">new offer</CaveatText>
                <h3 className="display-han mt-0.5 text-xl text-ink-500">새 교환 제안</h3>
              </div>
              <button onClick={() => setShowForm(false)} className="text-ink-300 hover:text-ink-500">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={submit} className="space-y-4">
              <label className="block">
                <span className="text-xs font-medium text-ink-300">받는 사람</span>
                <select
                  value={toUserId}
                  onChange={(e) => setToUserId(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-ink-500/15 bg-paper-50 px-3 py-2 text-sm text-ink-500"
                >
                  <option value="">멤버 선택…</option>
                  {partners.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.displayName}
                      {p.memberId ? ` (${p.memberId})` : ''}
                    </option>
                  ))}
                </select>
              </label>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-xl border border-dashed border-sage-500/30 bg-sage-500/[0.05] p-3">
                  <p className="mb-1.5 text-xs font-bold text-sage-500">내가 줄 카드</p>
                  <select
                    value={offerCardId}
                    onChange={(e) => {
                      setOfferCardId(e.target.value)
                      setOfferQuantity(1)
                    }}
                    className="w-full rounded-lg border border-ink-500/15 bg-paper-50 px-3 py-2 text-sm text-ink-500"
                  >
                    <option value="">보유 카드 선택…</option>
                    {offerable.map((c) => {
                      const def = catalogMap.get(c.cardId)
                      return (
                        <option key={c.cardId} value={c.cardId}>
                          {(def?.name || c.cardId) + ` (보유 ${c.quantity})`}
                        </option>
                      )
                    })}
                  </select>
                  <label className="mt-2 flex items-center gap-2 text-xs text-ink-300">
                    수량
                    <input
                      type="number"
                      min={1}
                      max={selectedOwned?.quantity || 1}
                      value={offerQuantity}
                      onChange={(e) => setOfferQuantity(Math.max(1, Number(e.target.value) || 1))}
                      className="w-16 rounded border border-ink-500/15 bg-paper-50 px-2 py-1 text-ink-500"
                    />
                  </label>
                </div>

                <div className="rounded-xl border border-dashed border-coral-500/30 bg-coral-500/[0.05] p-3">
                  <p className="mb-1.5 text-xs font-bold text-coral-500">내가 받을 카드</p>
                  <select
                    value={requestCardId}
                    onChange={(e) => setRequestCardId(e.target.value)}
                    className="w-full rounded-lg border border-ink-500/15 bg-paper-50 px-3 py-2 text-sm text-ink-500"
                  >
                    <option value="">원하는 카드 선택…</option>
                    {sortedCatalog.map((c) => (
                      <option key={c.cardId} value={c.cardId}>
                        {c.name} · {getRarityToken(c.rarity).label}
                      </option>
                    ))}
                  </select>
                  <label className="mt-2 flex items-center gap-2 text-xs text-ink-300">
                    수량
                    <input
                      type="number"
                      min={1}
                      max={99}
                      value={requestQuantity}
                      onChange={(e) => setRequestQuantity(Math.max(1, Number(e.target.value) || 1))}
                      className="w-16 rounded border border-ink-500/15 bg-paper-50 px-2 py-1 text-ink-500"
                    />
                  </label>
                </div>
              </div>

              <label className="block">
                <span className="text-xs font-medium text-ink-300">메시지 (선택)</span>
                <input
                  type="text"
                  value={message}
                  maxLength={300}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="교환 사유를 적어보세요"
                  className="mt-1 w-full rounded-lg border border-ink-500/15 bg-paper-50 px-3 py-2 text-sm text-ink-500"
                />
              </label>

              <button
                type="submit"
                disabled={submitting}
                className="inline-flex items-center gap-2 rounded-xl bg-coral-500 px-4 py-2.5 text-sm font-bold text-white shadow-paper transition hover:bg-coral-500/90 disabled:opacity-50"
              >
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                제안 보내기
              </button>
            </form>
          </PaperCard>
        )}
      </div>

      {error && (
        <div className="rounded-xl border border-coral-500/30 bg-coral-500/10 px-4 py-3 text-sm text-coral-500">
          {error}
        </div>
      )}

      {/* 받은 제안 */}
      <section>
        <div className="mb-3 flex items-center gap-2">
          <Inbox className="h-4 w-4 text-coral-500" />
          <h3 className="display-han text-lg text-ink-500">받은 제안</h3>
          <span className="pill-tag">{incoming.filter((t) => t.status === 'pending').length}</span>
        </div>
        {incoming.length === 0 ? (
          <p className="rounded-xl border border-dashed border-ink-500/15 px-4 py-8 text-center text-sm text-ink-300">
            받은 교환 제안이 없습니다.
          </p>
        ) : (
          <div className="space-y-3">
            {incoming.map((t) => (
              <TradeRow
                key={t.id}
                trade={t}
                mode="incoming"
                catalogMap={catalogMap}
                busy={busyId === t.id}
                onRespond={respond}
              />
            ))}
          </div>
        )}
      </section>

      {/* 보낸 제안 */}
      <section>
        <div className="mb-3 flex items-center gap-2">
          <Send className="h-4 w-4 text-sage-500" />
          <h3 className="display-han text-lg text-ink-500">보낸 제안</h3>
          <span className="pill-tag">{outgoing.filter((t) => t.status === 'pending').length}</span>
        </div>
        {outgoing.length === 0 ? (
          <p className="rounded-xl border border-dashed border-ink-500/15 px-4 py-8 text-center text-sm text-ink-300">
            보낸 교환 제안이 없습니다.
          </p>
        ) : (
          <div className="space-y-3">
            {outgoing.map((t) => (
              <TradeRow
                key={t.id}
                trade={t}
                mode="outgoing"
                catalogMap={catalogMap}
                busy={busyId === t.id}
                onRespond={respond}
              />
            ))}
          </div>
        )}
      </section>

      {toast && (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full bg-ink-500 px-5 py-2.5 text-sm font-medium text-paper-50 shadow-lg">
          {toast}
        </div>
      )}
    </div>
  )
}

function CardChip({ card, cardId, qty }: { card?: CatalogCard; cardId: string; qty: number }) {
  const token = getRarityToken(card?.rarity)
  return (
    <div className="flex items-center gap-2">
      <div
        className="h-12 w-9 flex-shrink-0 overflow-hidden rounded border bg-paper-200"
        style={{ borderColor: token.edge }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={card?.imageUrl || FALLBACK_CARD_IMAGE}
          alt={card?.name || cardId}
          className="h-full w-full object-cover"
          onError={handleCardImageError}
        />
      </div>
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-ink-500">{card?.name || cardId}</p>
        <p className="text-[11px]" style={{ color: token.ink }}>
          {token.label}
          {qty > 1 ? ` ×${qty}` : ''}
        </p>
      </div>
    </div>
  )
}

function TradeRow({
  trade,
  mode,
  catalogMap,
  busy,
  onRespond,
}: {
  trade: Trade
  mode: 'incoming' | 'outgoing'
  catalogMap: Map<string, CatalogCard>
  busy: boolean
  onRespond: (id: string, action: 'accept' | 'reject' | 'cancel') => void
}) {
  const counterpart = mode === 'incoming' ? trade.fromUser : trade.toUser
  const offerCard = catalogMap.get(trade.offerCardId)
  const requestCard = catalogMap.get(trade.requestCardId)
  const isPending = trade.status === 'pending'

  // incoming: 상대의 offer = 내가 받을 카드 / 상대의 request = 내가 줄 카드
  // outgoing: 내 offer = 내가 줄 카드 / 내 request = 내가 받을 카드
  const receiveCard = mode === 'incoming' ? offerCard : requestCard
  const receiveQty = mode === 'incoming' ? trade.offerQuantity : trade.requestQuantity
  const receiveId = mode === 'incoming' ? trade.offerCardId : trade.requestCardId
  const giveCard = mode === 'incoming' ? requestCard : offerCard
  const giveQty = mode === 'incoming' ? trade.requestQuantity : trade.offerQuantity
  const giveId = mode === 'incoming' ? trade.requestCardId : trade.offerCardId

  return (
    <div
      className={`rounded-xl border p-4 ${
        isPending ? 'border-ink-500/15 bg-paper-50' : 'border-ink-500/10 bg-paper-50/50 opacity-75'
      }`}
    >
      <div className="mb-3 flex items-center justify-between gap-2">
        <p className="text-xs text-ink-300">
          {mode === 'incoming' ? '받음' : '보냄'} ·{' '}
          <span className="font-semibold text-ink-500">{counterpart.displayName}</span>
        </p>
        <span
          className={`pill-tag ${
            trade.status === 'accepted'
              ? 'pill-tag--sage'
              : trade.status === 'pending'
                ? 'pill-tag--coral'
                : ''
          }`}
        >
          {STATUS_LABEL[trade.status]}
        </span>
      </div>

      <div className="flex items-center gap-3">
        <div className="min-w-0 flex-1">
          <p className="mb-1 text-[10px] font-bold uppercase tracking-wide text-sage-500">받을 카드</p>
          <CardChip card={receiveCard} cardId={receiveId} qty={receiveQty} />
        </div>
        <ArrowLeftRight className="h-5 w-5 flex-shrink-0 text-ink-300" />
        <div className="min-w-0 flex-1">
          <p className="mb-1 text-[10px] font-bold uppercase tracking-wide text-coral-500">줄 카드</p>
          <CardChip card={giveCard} cardId={giveId} qty={giveQty} />
        </div>
      </div>

      {trade.message && (
        <p className="mt-3 rounded-lg bg-ink-500/[0.04] px-3 py-2 text-xs italic text-ink-300">
          “{trade.message}”
        </p>
      )}

      {isPending && (
        <div className="mt-3 flex gap-2">
          {mode === 'incoming' ? (
            <>
              <button
                onClick={() => onRespond(trade.id, 'accept')}
                disabled={busy}
                className="inline-flex items-center gap-1.5 rounded-lg bg-sage-500 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-sage-500/90 disabled:opacity-50"
              >
                {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                수락
              </button>
              <button
                onClick={() => onRespond(trade.id, 'reject')}
                disabled={busy}
                className="inline-flex items-center gap-1.5 rounded-lg border border-ink-500/20 px-3 py-1.5 text-xs font-bold text-ink-500 transition hover:bg-ink-500/5 disabled:opacity-50"
              >
                <X className="h-3.5 w-3.5" />
                거절
              </button>
            </>
          ) : (
            <button
              onClick={() => onRespond(trade.id, 'cancel')}
              disabled={busy}
              className="inline-flex items-center gap-1.5 rounded-lg border border-ink-500/20 px-3 py-1.5 text-xs font-bold text-ink-500 transition hover:bg-ink-500/5 disabled:opacity-50"
            >
              {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <X className="h-3.5 w-3.5" />}
              제안 취소
            </button>
          )}
        </div>
      )}
    </div>
  )
}

export default TradeCenter
