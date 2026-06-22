'use client'

import React, { useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { AnimatePresence, motion } from 'framer-motion'
import { ChevronLeft, Save, Sparkles, Swords, X } from 'lucide-react'
import clsx from 'clsx'
import toast from 'react-hot-toast'
import { useAuth } from '@/contexts/AuthContext'
import { CaveatText } from '@/components/scrapbook'
import { getRarityToken } from '@/lib/cardTheme'
import { DECK_SIZE, MAX_CHAMPION_COPIES, MAX_COPIES } from '@/lib/tactics/deckRules'
import { deckCount, isDeckValid, useDeckBuilder } from '@/lib/tactics/useDeckBuilder'
import type { TacticsCardMeta } from '@/lib/tactics/types'

const TYPE_FILTERS: { v: string | null; label: string }[] = [
  { v: null, label: '전체' },
  { v: 'unit', label: '유닛' },
  { v: 'spell', label: '주문' },
  { v: 'champion', label: '챔피언' },
]
const COST_FILTERS: (number | null)[] = [null, 0, 1, 2, 3, 4, 5, 6, 7] // 7 = 7+

function copyCap(meta?: TacticsCardMeta): number {
  return meta?.type === 'champion' ? MAX_CHAMPION_COPIES : MAX_COPIES
}

/** 카탈로그 타일 — 코스트/공·체/등급테두리. 미보유=흑백, 보유=수량 배지. 클릭=덱 추가. */
function CatalogTile({
  meta,
  ownedQty,
  inDeck,
  canAdd,
  onAdd,
}: {
  meta: TacticsCardMeta
  ownedQty: number
  inDeck: number
  canAdd: boolean
  onAdd: () => void
}) {
  const t = getRarityToken(meta.rarity)
  const owned = ownedQty > 0
  const isUnit = meta.type === 'unit' || meta.type === 'champion'
  return (
    <button
      type="button"
      onClick={onAdd}
      disabled={!canAdd}
      title={!owned ? '미보유' : !canAdd ? '추가 불가(한도/16장)' : meta.name}
      className={clsx(
        'group relative flex flex-col overflow-hidden rounded-lg border-2 bg-white text-left shadow-paper transition',
        owned ? 'hover:-translate-y-0.5 hover:shadow-polaroid' : 'cursor-not-allowed grayscale opacity-45',
        !owned && 'pointer-events-none',
      )}
      style={{ borderColor: t.edge }}
    >
      {/* Cost badge */}
      <span
        className="absolute left-1 top-1 z-10 flex h-6 w-6 items-center justify-center rounded-full text-xs font-black text-white shadow"
        style={{ background: t.ink }}
      >
        {meta.cost}
      </span>
      {/* In-deck count */}
      {inDeck > 0 && (
        <span className="absolute right-1 top-1 z-10 rounded-full bg-ink-500 px-1.5 py-0.5 text-[10px] font-bold text-paper-50">
          덱 {inDeck}
        </span>
      )}

      {/* Art / placeholder */}
      <div className="relative h-20 w-full" style={{ background: t.wash }}>
        {meta.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={meta.imageUrl} alt={meta.name} className="h-full w-full object-cover" />
        ) : (
          <span className="flex h-full w-full items-center justify-center text-2xl opacity-30">✦</span>
        )}
      </div>

      {/* Footer: name + stats */}
      <div className="flex items-center justify-between gap-1 px-1.5 py-1">
        <span className="truncate text-[11px] font-bold text-ink-500">{meta.name}</span>
        {isUnit ? (
          <span className="shrink-0 font-mono text-[11px] font-bold" style={{ color: t.ink }}>
            {meta.attack ?? 0}/{meta.health ?? 0}
          </span>
        ) : (
          <span className="shrink-0 text-[10px] text-ink-300">{meta.spellSpeed ?? '주문'}</span>
        )}
      </div>

      {/* Owned qty badge */}
      {owned && (
        <span className="absolute bottom-1 left-1 rounded bg-paper-50/90 px-1 text-[10px] font-bold text-ink-400">
          ×{ownedQty}
        </span>
      )}
    </button>
  )
}

function Gate({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-[60vh] items-center justify-center px-6 text-center">
      <div className="paper-card max-w-sm !p-8">{children}</div>
    </div>
  )
}

export default function DeckBuilderPage() {
  const router = useRouter()
  const { user } = useAuth()
  const { loading, catalog, owned, deck, name, filters, load, add, remove, setFilter, setName, save } = useDeckBuilder()

  useEffect(() => {
    if (user?.id) load(user.id)
  }, [user?.id, load])

  const byId = useMemo(() => new Map(catalog.map((c) => [c.cardId, c])), [catalog])
  const total = deckCount(deck)
  const valid = isDeckValid(deck)

  const filtered = useMemo(() => {
    return catalog
      .filter((c) => {
        if (filters.ownedOnly && !owned[c.cardId]) return false
        if (filters.type && c.type !== filters.type) return false
        if (filters.cost != null) return filters.cost === 7 ? c.cost >= 7 : c.cost === filters.cost
        return true
      })
      .sort((a, b) => a.cost - b.cost || a.name.localeCompare(b.name))
  }, [catalog, owned, filters])

  const handleSave = async (setActive: boolean) => {
    const r = await save(setActive)
    if (r.ok) toast.success(setActive ? '덱을 저장하고 활성화했어요!' : '덱을 저장했어요!', { icon: '🃏' })
    else toast.error(r.message ?? '저장에 실패했어요.')
  }

  if (!user?.id) {
    return (
      <Gate>
        <Swords className="mx-auto h-7 w-7 text-coral-500" />
        <p className="mt-2 font-display text-lg text-ink-500">덱 빌더는 로그인 후 이용할 수 있어요</p>
      </Gate>
    )
  }
  if (!user.memberId) {
    return (
      <Gate>
        <p className="font-display text-lg text-ink-500">랑구팸 5인 멤버 전용</p>
        <p className="mt-1 text-xs text-ink-300">택틱스 덱 편성은 멤버만 가능해요.</p>
      </Gate>
    )
  }

  return (
    <div data-section="rangu" className="min-h-screen pb-20">
      {/* Top bar */}
      <div className="border-b border-dashed border-ink-500/15 bg-paper-50/70 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4 sm:px-8">
          <button onClick={() => router.push('/cards')} className="flex items-center gap-1 text-sm text-ink-300 hover:text-ink-500">
            <ChevronLeft className="h-4 w-4" /> 카드
          </button>
          <div className="text-center">
            <CaveatText className="text-lg text-coral-500">deck builder</CaveatText>
            <h1 className="display-han text-xl text-ink-500">택틱스 덱 편성</h1>
          </div>
          <span className="w-10" />
        </div>
      </div>

      <div className="mx-auto mt-5 flex max-w-6xl flex-col gap-5 px-5 sm:px-8 lg:flex-row">
        {/* ── Left: catalog ── */}
        <section className="flex-1">
          {/* Filters */}
          <div className="paper-card mb-4 space-y-3 !p-4">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="mr-1 text-[11px] uppercase tracking-wide text-ink-300">코스트</span>
              {COST_FILTERS.map((c) => (
                <button
                  key={String(c)}
                  onClick={() => setFilter({ cost: c })}
                  className={clsx(
                    'h-6 min-w-6 rounded-full px-2 text-xs font-bold transition',
                    filters.cost === c ? 'bg-ink-500 text-paper-50' : 'bg-ink-500/8 text-ink-400 hover:bg-ink-500/15',
                  )}
                >
                  {c === null ? '전체' : c === 7 ? '7+' : c}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="mr-1 text-[11px] uppercase tracking-wide text-ink-300">타입</span>
              {TYPE_FILTERS.map((f) => (
                <button
                  key={f.label}
                  onClick={() => setFilter({ type: f.v })}
                  className={clsx(
                    'rounded-full px-2.5 py-0.5 text-xs font-bold transition',
                    filters.type === f.v ? 'bg-coral-500 text-white' : 'bg-ink-500/8 text-ink-400 hover:bg-ink-500/15',
                  )}
                >
                  {f.label}
                </button>
              ))}
              <label className="ml-auto flex cursor-pointer items-center gap-1.5 text-xs text-ink-400">
                <input
                  type="checkbox"
                  checked={filters.ownedOnly}
                  onChange={(e) => setFilter({ ownedOnly: e.target.checked })}
                  className="accent-coral-500"
                />
                보유만
              </label>
            </div>
          </div>

          {/* Grid */}
          {loading ? (
            <div className="flex h-40 items-center justify-center gap-2 text-sm text-ink-300">
              <span className="h-5 w-5 animate-spin rounded-full border-2 border-coral-500/30 border-t-coral-500" />
              카탈로그 불러오는 중…
            </div>
          ) : filtered.length === 0 ? (
            <div className="paper-card !p-8 text-center text-sm text-ink-300">조건에 맞는 카드가 없어요.</div>
          ) : (
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-5">
              {filtered.map((c) => {
                const inDeck = deck.find((d) => d.cardId === c.cardId)?.count ?? 0
                const canAdd = !!owned[c.cardId] && total < DECK_SIZE && inDeck < copyCap(c)
                return (
                  <CatalogTile
                    key={c.cardId}
                    meta={c}
                    ownedQty={owned[c.cardId] ?? 0}
                    inDeck={inDeck}
                    canAdd={canAdd}
                    onAdd={() => add(c.cardId)}
                  />
                )
              })}
            </div>
          )}
        </section>

        {/* ── Right: deck ── */}
        <aside className="lg:w-80 lg:shrink-0">
          <div className="paper-card sticky top-5 space-y-4 !p-4">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="덱 이름"
              className="w-full rounded-lg border border-ink-500/15 bg-paper-50 px-3 py-1.5 font-display text-base text-ink-500 outline-none focus:border-coral-500/50"
            />

            {/* Progress */}
            <div>
              <div className="mb-1 flex items-center justify-between text-xs">
                <span className="text-ink-300">덱 구성</span>
                <span className={clsx('font-mono font-bold', valid ? 'text-sage-600' : 'text-ink-400')}>
                  {total} / {DECK_SIZE}
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-ink-500/8">
                <div
                  className={clsx('h-full rounded-full transition-all', valid ? 'bg-sage-500' : 'bg-coral-500')}
                  style={{ width: `${Math.min(100, (total / DECK_SIZE) * 100)}%` }}
                />
              </div>
            </div>

            {/* Deck list */}
            <div className="max-h-[46vh] space-y-1 overflow-y-auto">
              {deck.length === 0 ? (
                <p className="rounded-lg border border-dashed border-ink-500/15 bg-paper-100/40 p-4 text-center text-xs text-ink-300">
                  좌측 카드를 눌러 16장을 채워보세요.
                </p>
              ) : (
                <AnimatePresence initial={false}>
                  {deck.map((d) => {
                    const meta = byId.get(d.cardId)
                    const t = getRarityToken(meta?.rarity ?? 'basic')
                    return (
                      <motion.button
                        key={d.cardId}
                        type="button"
                        layout
                        initial={{ opacity: 0, x: 10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 10 }}
                        onClick={() => remove(d.cardId)}
                        className="flex w-full items-center gap-2 rounded-lg border border-ink-500/10 bg-paper-50 px-2 py-1.5 text-left hover:border-coral-500/40 hover:bg-coral-500/5"
                      >
                        <span
                          className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-black text-white"
                          style={{ background: t.ink }}
                        >
                          {meta?.cost ?? '?'}
                        </span>
                        <span className="flex-1 truncate text-xs font-bold text-ink-500">{meta?.name ?? d.cardId}</span>
                        <span className="font-mono text-xs font-bold text-ink-400">×{d.count}</span>
                        <X className="h-3.5 w-3.5 text-ink-300" />
                      </motion.button>
                    )
                  })}
                </AnimatePresence>
              )}
            </div>

            {/* Save actions */}
            <div className="flex flex-col gap-2 border-t border-dashed border-ink-500/15 pt-3">
              <button
                onClick={() => handleSave(true)}
                disabled={!valid}
                className={clsx(
                  'flex items-center justify-center gap-2 rounded-2xl px-4 py-2.5 font-display text-sm transition',
                  valid
                    ? 'bg-ink-500 text-paper-50 shadow-paper hover:-translate-y-0.5 hover:shadow-polaroid'
                    : 'cursor-not-allowed bg-ink-500/15 text-ink-300',
                )}
              >
                <Sparkles className="h-4 w-4" /> 저장하고 활성화
              </button>
              <button
                onClick={() => handleSave(false)}
                disabled={!valid}
                className={clsx(
                  'flex items-center justify-center gap-2 rounded-2xl border-2 border-dashed px-4 py-2 text-sm font-bold transition',
                  valid ? 'border-coral-500/50 text-coral-600 hover:bg-coral-500/5' : 'cursor-not-allowed border-ink-500/15 text-ink-300',
                )}
              >
                <Save className="h-4 w-4" /> 저장만
              </button>
              {!valid && <p className="text-center text-[11px] text-ink-300">정확히 {DECK_SIZE}장이어야 저장할 수 있어요.</p>}
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}
