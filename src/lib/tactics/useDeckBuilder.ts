'use client'

import { create } from 'zustand'
import type { TacticsCardMeta } from './types'
import { DECK_SIZE, MAX_COPIES, MAX_CHAMPION_COPIES, type DeckCard } from './deckRules'

export interface DeckFilters {
  cost: number | null // 정확 코스트(7=7+ 취급은 페이지에서)
  rarity: string | null
  type: string | null // 'unit' | 'spell' | 'champion' | 'landmark'
  ownedOnly: boolean
}

interface DeckBuilderState {
  loading: boolean
  error?: string
  catalog: TacticsCardMeta[] // 전투 카탈로그(/export)
  owned: Record<string, number> // cardId → 보유 수량
  deck: DeckCard[] // 현재 편성 (합계 ≤ 16)
  deckId?: string
  name: string
  filters: DeckFilters

  load: (userId: string) => Promise<void>
  add: (cardId: string) => void
  remove: (cardId: string) => void
  setFilter: (f: Partial<DeckFilters>) => void
  setName: (name: string) => void
  save: (setActive: boolean) => Promise<{ ok: boolean; message?: string }>
  reset: () => void
}

const DEFAULT_FILTERS: DeckFilters = { cost: null, rarity: null, type: null, ownedOnly: true }

/** 카드 사본 한도(챔피언 1, 그 외 3) — 비파괴: 1장 보유면 최대치까지 "가상" 편성 가능. */
function copyCap(meta: TacticsCardMeta | undefined): number {
  return meta?.type === 'champion' ? MAX_CHAMPION_COPIES : MAX_COPIES
}

export const deckCount = (deck: DeckCard[]): number => deck.reduce((s, d) => s + d.count, 0)
export const isDeckValid = (deck: DeckCard[]): boolean => deckCount(deck) === DECK_SIZE

export const useDeckBuilder = create<DeckBuilderState>((set, get) => ({
  loading: false,
  catalog: [],
  owned: {},
  deck: [],
  name: '내 덱',
  filters: DEFAULT_FILTERS,

  load: async (userId) => {
    set({ loading: true, error: undefined })
    try {
      const [catRes, invRes, mineRes] = await Promise.all([
        fetch('/api/game/metadata/export').then((r) => r.json()).catch(() => null),
        fetch(`/api/cards/inventory?userId=${userId}&limit=500`).then((r) => r.json()).catch(() => null),
        fetch('/api/game/tactics-deck').then((r) => r.json()).catch(() => null),
      ])
      const catalog: TacticsCardMeta[] = catRes?.cards ?? []
      const owned: Record<string, number> = {}
      for (const it of invRes?.inventory ?? []) owned[it.cardId] = it.quantity
      const active = mineRes?.active
      set({
        catalog,
        owned,
        deck: Array.isArray(active?.cards) ? active.cards : [],
        deckId: active?.id,
        name: active?.name ?? '내 덱',
        loading: false,
      })
    } catch (e) {
      set({ loading: false, error: e instanceof Error ? e.message : '불러오기 실패' })
    }
  },

  add: (cardId) => {
    const { deck, owned, catalog } = get()
    if (!owned[cardId] || deckCount(deck) >= DECK_SIZE) return // 미보유/풀 → 무시
    const cap = copyCap(catalog.find((c) => c.cardId === cardId))
    const cur = deck.find((d) => d.cardId === cardId)
    if (cur) {
      if (cur.count >= cap) return
      set({ deck: deck.map((d) => (d.cardId === cardId ? { ...d, count: d.count + 1 } : d)) })
    } else {
      set({ deck: [...deck, { cardId, count: 1 }] })
    }
  },

  remove: (cardId) => {
    const { deck } = get()
    const cur = deck.find((d) => d.cardId === cardId)
    if (!cur) return
    set({
      deck: cur.count <= 1 ? deck.filter((d) => d.cardId !== cardId) : deck.map((d) => (d.cardId === cardId ? { ...d, count: d.count - 1 } : d)),
    })
  },

  setFilter: (f) => set({ filters: { ...get().filters, ...f } }),
  setName: (name) => set({ name }),

  save: async (setActive) => {
    const { deck, deckId, name } = get()
    if (!isDeckValid(deck)) return { ok: false, message: `덱은 정확히 ${DECK_SIZE}장이어야 합니다.` }
    try {
      const res = await fetch('/api/game/tactics-deck', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: deckId, name, cards: deck, setActive }),
      })
      const data = await res.json().catch(() => null)
      if (res.ok && data?.success) {
        set({ deckId: data.deckId })
        return { ok: true }
      }
      return { ok: false, message: data?.message ?? '저장 실패' }
    } catch (e) {
      return { ok: false, message: e instanceof Error ? e.message : '저장 실패' }
    }
  },

  reset: () => set({ deck: [], deckId: undefined, name: '내 덱', filters: DEFAULT_FILTERS }),
}))
