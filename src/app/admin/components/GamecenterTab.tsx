'use client'

import React, { useCallback, useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import {
  BUTTON_CLASS,
  Badge,
  DANGER_BUTTON_CLASS,
  EmptyState,
  INPUT_CLASS,
  PRIMARY_BUTTON_CLASS,
  Panel,
  formatDateTime,
  jsonInit,
  requestJson,
} from './adminUi'

type Kind = 'inventory' | 'title' | 'wiki_color' | 'coupon'
type Period = 'day' | 'week' | 'month' | 'once'

interface ShopItem {
  id: string
  name: string
  description: string
  kind: Kind
  price: number
  payload: Record<string, unknown>
  stock: number | null
  limitPerPeriod: number | null
  limitPeriod: Period | null
  active: boolean
  sortOrder: number
}

interface Order {
  id: string
  username: string
  displayName: string | null
  itemName: string
  price: number
  status: string
  createdAt: string
}

interface Draft {
  id: string
  name: string
  description: string
  kind: Kind
  price: string
  itemKey: string
  amount: string
  stock: string
  limitPerPeriod: string
  limitPeriod: Period
  sortOrder: string
  active: boolean
}

const KINDS: Array<{ key: Kind; label: string }> = [
  { key: 'inventory', label: '아이템 (즉시 지급)' },
  { key: 'title', label: '칭호 (즉시 지급)' },
  { key: 'wiki_color', label: '위키 닉네임 색 (즉시 지급)' },
  { key: 'coupon', label: '쿠폰 (관리자가 처리)' },
]
const PERIODS: Array<{ key: Period; label: string }> = [
  { key: 'day', label: '하루' },
  { key: 'week', label: '주' },
  { key: 'month', label: '월' },
  { key: 'once', label: '계정당' },
]

const EMPTY: Draft = {
  id: '',
  name: '',
  description: '',
  kind: 'inventory',
  price: '',
  itemKey: '',
  amount: '1',
  stock: '',
  limitPerPeriod: '',
  limitPeriod: 'once',
  sortOrder: '100',
  active: true,
}

function toDraft(item: ShopItem): Draft {
  return {
    id: item.id,
    name: item.name,
    description: item.description,
    kind: item.kind,
    price: String(item.price),
    itemKey: typeof item.payload?.itemKey === 'string' ? item.payload.itemKey : '',
    amount: String(item.payload?.amount ?? 1),
    stock: item.stock === null ? '' : String(item.stock),
    limitPerPeriod: item.limitPerPeriod === null ? '' : String(item.limitPerPeriod),
    limitPeriod: item.limitPeriod ?? 'once',
    sortOrder: String(item.sortOrder),
    active: item.active,
  }
}

function toPayload(draft: Draft, original?: ShopItem) {
  const payload: Record<string, unknown> = { ...(original?.payload ?? {}) }
  if (draft.kind === 'coupon') {
    delete payload.itemKey
    delete payload.amount
  } else {
    if (draft.itemKey.trim()) payload.itemKey = draft.itemKey.trim()
    payload.amount = Number(draft.amount) || 1
  }
  return {
    id: draft.id.trim(),
    name: draft.name,
    description: draft.description,
    kind: draft.kind,
    price: Number(draft.price),
    payload,
    stock: draft.stock === '' ? null : Number(draft.stock),
    limitPerPeriod: draft.limitPerPeriod === '' ? null : Number(draft.limitPerPeriod),
    limitPeriod: draft.limitPerPeriod === '' ? null : draft.limitPeriod,
    sortOrder: Number(draft.sortOrder) || 0,
    active: draft.active,
  }
}

function newRequestId() {
  return typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `r-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`
}

function limitLabel(item: ShopItem) {
  if (!item.limitPerPeriod || !item.limitPeriod) return '제한 없음'
  return `${PERIODS.find((period) => period.key === item.limitPeriod)?.label} ${item.limitPerPeriod}개`
}

export function GamecenterTab() {
  const [items, setItems] = useState<ShopItem[]>([])
  const [orders, setOrders] = useState<Order[]>([])
  const [draft, setDraft] = useState<Draft | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [adjust, setAdjust] = useState({ username: '', delta: '', note: '' })
  const [adjusting, setAdjusting] = useState(false)

  const load = useCallback(async () => {
    try {
      const [itemData, orderData] = await Promise.all([
        requestJson<{ items: ShopItem[] }>('/api/gamecenter/admin/items'),
        requestJson<{ orders: Order[] }>('/api/gamecenter/admin/orders?status=pending'),
      ])
      setItems(itemData.items)
      setOrders(orderData.orders)
    } catch (error) {
      toast.error((error as Error).message)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const saveItem = async () => {
    if (!draft) return
    setSaving(true)
    try {
      const original = items.find((item) => item.id === editingId)
      await requestJson('/api/gamecenter/admin/items', jsonInit('POST', toPayload(draft, original)))
      toast.success(editingId ? '상품을 고쳤습니다.' : '상품을 추가했습니다.')
      setDraft(null)
      setEditingId(null)
      await load()
    } catch (error) {
      toast.error((error as Error).message)
    } finally {
      setSaving(false)
    }
  }

  const toggleActive = async (item: ShopItem) => {
    try {
      await requestJson('/api/gamecenter/admin/items', jsonInit('PATCH', { id: item.id, active: !item.active }))
      toast.success(item.active ? '판매를 중지했습니다.' : '판매를 다시 시작했습니다.')
      await load()
    } catch (error) {
      toast.error((error as Error).message)
    }
  }

  const resolveOrder = async (order: Order, action: 'used' | 'cancelled') => {
    if (action === 'cancelled' && !window.confirm(`${order.username} 님의 ‘${order.itemName}’ 주문을 취소하고 ${order.price}P 를 돌려줄까요?`)) return
    try {
      await requestJson('/api/gamecenter/admin/orders', jsonInit('POST', { orderId: order.id, action }))
      toast.success(action === 'used' ? '사용 완료로 처리했습니다.' : '취소하고 포인트를 돌려줬습니다.')
      await load()
    } catch (error) {
      toast.error((error as Error).message)
    }
  }

  const submitAdjust = async () => {
    const delta = Number(adjust.delta)
    if (!adjust.username.trim() || !Number.isInteger(delta) || delta === 0) {
      toast.error('사용자명과 0 이 아닌 정수 포인트를 넣어 주세요.')
      return
    }
    if (adjust.note.trim().length < 2) {
      toast.error('조정 사유를 적어 주세요.')
      return
    }
    setAdjusting(true)
    try {
      const result = await requestJson<{ balance: number }>(
        '/api/gamecenter/admin/adjust',
        jsonInit('POST', { username: adjust.username.trim(), delta, note: adjust.note.trim(), requestId: newRequestId() })
      )
      toast.success(`조정했습니다. 현재 잔액 ${result.balance}P`)
      setAdjust({ username: '', delta: '', note: '' })
    } catch (error) {
      toast.error((error as Error).message)
    } finally {
      setAdjusting(false)
    }
  }

  const field = (label: string, node: React.ReactNode) => (
    <label className="block text-xs text-adm-muted">
      {label}
      <span className="mt-1 block">{node}</span>
    </label>
  )

  return (
    <>
      <Panel
        title="처리할 주문"
        description="관리자가 직접 처리하는 상품(쿠폰)의 대기 주문입니다. 취소하면 포인트를 돌려주고 재고를 되돌립니다."
        actions={<button type="button" className={BUTTON_CLASS} onClick={load}>새로 고침</button>}
      >
        {orders.length === 0 ? (
          <EmptyState>처리할 주문이 없습니다.</EmptyState>
        ) : (
          <ul className="divide-y divide-adm-rule">
            {orders.map((order) => (
              <li key={order.id} className="flex flex-wrap items-center justify-between gap-3 py-2.5">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-adm-ink">{order.itemName}</p>
                  <p className="text-xs text-adm-muted">
                    {order.displayName || order.username} ({order.username}) · {order.price}P · {formatDateTime(order.createdAt)}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button type="button" className={PRIMARY_BUTTON_CLASS} onClick={() => resolveOrder(order, 'used')}>사용 완료</button>
                  <button type="button" className={DANGER_BUTTON_CLASS} onClick={() => resolveOrder(order, 'cancelled')}>취소·환불</button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <Panel
        title="상점 상품"
        description="현금성 상품(기프티콘·상품권·현금)은 등록할 수 없습니다. 판매를 중지해도 이미 교환한 보유품은 그대로입니다."
        actions={
          !draft && (
            <button type="button" className={PRIMARY_BUTTON_CLASS} onClick={() => { setDraft(EMPTY); setEditingId(null) }}>
              상품 추가
            </button>
          )
        }
      >
        {draft && (
          <div className="mb-5 rounded border border-adm-rule bg-adm-well/40 p-4">
            <div className="grid gap-3 sm:grid-cols-2">
              {field('상품 id (영문 소문자·숫자·하이픈, 나중에 바꿀 수 없음)',
                <input className={INPUT_CLASS} value={draft.id} disabled={Boolean(editingId)} placeholder="drink-coupon" onChange={(e) => setDraft({ ...draft, id: e.target.value })} />)}
              {field('이름', <input className={INPUT_CLASS} value={draft.name} maxLength={60} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />)}
              <div className="sm:col-span-2">
                {field('설명', <input className={INPUT_CLASS} value={draft.description} maxLength={300} onChange={(e) => setDraft({ ...draft, description: e.target.value })} />)}
              </div>
              {field('분류',
                <select className={INPUT_CLASS} value={draft.kind} onChange={(e) => setDraft({ ...draft, kind: e.target.value as Kind })}>
                  {KINDS.map((kind) => <option key={kind.key} value={kind.key}>{kind.label}</option>)}
                </select>)}
              {field('가격 (P)', <input className={INPUT_CLASS} type="number" min={1} value={draft.price} onChange={(e) => setDraft({ ...draft, price: e.target.value })} />)}
              {draft.kind !== 'coupon' && (
                <>
                  {field('지급할 보유품 키 (비우면 상품 id)', <input className={INPUT_CLASS} value={draft.itemKey} placeholder="skin:tetris:neon" onChange={(e) => setDraft({ ...draft, itemKey: e.target.value })} />)}
                  {field('지급 수량', <input className={INPUT_CLASS} type="number" min={1} value={draft.amount} onChange={(e) => setDraft({ ...draft, amount: e.target.value })} />)}
                </>
              )}
              {field('재고 (비우면 무제한)', <input className={INPUT_CLASS} type="number" min={0} value={draft.stock} onChange={(e) => setDraft({ ...draft, stock: e.target.value })} />)}
              {field('정렬 순서 (작을수록 앞)', <input className={INPUT_CLASS} type="number" value={draft.sortOrder} onChange={(e) => setDraft({ ...draft, sortOrder: e.target.value })} />)}
              {field('교환 제한 횟수 (비우면 제한 없음)', <input className={INPUT_CLASS} type="number" min={1} value={draft.limitPerPeriod} onChange={(e) => setDraft({ ...draft, limitPerPeriod: e.target.value })} />)}
              {field('제한 기간',
                <select className={INPUT_CLASS} value={draft.limitPeriod} disabled={draft.limitPerPeriod === ''} onChange={(e) => setDraft({ ...draft, limitPeriod: e.target.value as Period })}>
                  {PERIODS.map((period) => <option key={period.key} value={period.key}>{period.label}</option>)}
                </select>)}
            </div>
            <label className="mt-3 flex items-center gap-2 text-[13px] text-adm-soft">
              <input type="checkbox" checked={draft.active} onChange={(e) => setDraft({ ...draft, active: e.target.checked })} />
              판매 중
            </label>
            <div className="mt-4 flex gap-2">
              <button type="button" className={PRIMARY_BUTTON_CLASS} disabled={saving} onClick={saveItem}>{saving ? '저장하는 중' : '저장'}</button>
              <button type="button" className={BUTTON_CLASS} onClick={() => { setDraft(null); setEditingId(null) }}>닫기</button>
            </div>
          </div>
        )}

        {items.length === 0 ? (
          <EmptyState>상품이 없습니다. 서버와 DB 준비가 끝났는지 확인해 주세요 (/api/admin/maintenance/gamecenter).</EmptyState>
        ) : (
          <ul className="divide-y divide-adm-rule">
            {items.map((item) => (
              <li key={item.id} className="flex flex-wrap items-center justify-between gap-3 py-2.5">
                <div className="min-w-0">
                  <p className="flex flex-wrap items-center gap-2 text-sm font-medium text-adm-ink">
                    {item.name}
                    <Badge tone={item.kind === 'coupon' ? 'amber' : 'cyan'}>{KINDS.find((kind) => kind.key === item.kind)?.label.split(' (')[0]}</Badge>
                    {!item.active && <Badge tone="rose">판매 중지</Badge>}
                  </p>
                  <p className="text-xs text-adm-muted">
                    {item.id} · {item.price}P · {limitLabel(item)} · 재고 {item.stock === null ? '무제한' : `${item.stock}개`}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button type="button" className={BUTTON_CLASS} onClick={() => { setDraft(toDraft(item)); setEditingId(item.id) }}>수정</button>
                  <button type="button" className={item.active ? DANGER_BUTTON_CLASS : BUTTON_CLASS} onClick={() => toggleActive(item)}>
                    {item.active ? '판매 중지' : '판매 재개'}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <Panel
        title="포인트 수동 조정"
        description="오류 보상이나 부정 획득 회수에만 씁니다. 사유는 원장에 남고, 회수는 잔액보다 많이 할 수 없습니다."
      >
        <div className="grid gap-3 sm:grid-cols-[1fr_140px]">
          {field('위키 사용자명', <input className={INPUT_CLASS} value={adjust.username} onChange={(e) => setAdjust({ ...adjust, username: e.target.value })} />)}
          {field('포인트 (+지급 / −회수)', <input className={INPUT_CLASS} type="number" value={adjust.delta} placeholder="-30" onChange={(e) => setAdjust({ ...adjust, delta: e.target.value })} />)}
          <div className="sm:col-span-2">
            {field('사유 (필수)', <input className={INPUT_CLASS} value={adjust.note} maxLength={150} onChange={(e) => setAdjust({ ...adjust, note: e.target.value })} />)}
          </div>
        </div>
        <button type="button" className={`${PRIMARY_BUTTON_CLASS} mt-4`} disabled={adjusting} onClick={submitAdjust}>
          {adjusting ? '조정하는 중' : '조정하기'}
        </button>
      </Panel>
    </>
  )
}
