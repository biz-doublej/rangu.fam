'use client'

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import clsx from 'clsx'
import toast from 'react-hot-toast'
import { BookOpen, Crown, Lock, ScrollText, Sparkles } from 'lucide-react'
import { CardArtwork } from '@/components/cards/CardArtwork'
import type { DogamResult, DogamTier } from '@/lib/dogam'

const ING_IMG = '/images/dogam/dogam_ing.png'
const CLEAR_IMG = '/images/dogam/dogam_clear.png'

interface DogamGalleryProps {
  userId?: string
  className?: string
}

const TIER_META: { id: DogamTier; label: string; en: string }[] = [
  { id: 'basic', label: '기본 도감', en: 'basic codex' },
  { id: 'series', label: '카드 시리즈 도감', en: 'series codex' },
  { id: 'special', label: '특별한 도감', en: 'special codex' },
]

export function DogamGallery({ userId, className = '' }: DogamGalleryProps) {
  const [dogam, setDogam] = useState<DogamResult[]>([])
  const [summary, setSummary] = useState<{ total: number; unlocked: number } | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [justUnlocked, setJustUnlocked] = useState<Set<string>>(new Set())
  const detailRef = useRef<HTMLDivElement>(null)

  const fetchDogam = useCallback(async () => {
    setIsLoading(true)
    try {
      let data: any = null
      // 로그인 상태면 POST 동기화 — 새 해금 기록 + 프레스티지 보상 지급까지 처리
      if (userId) {
        const res = await fetch('/api/cards/dogam', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: '{}',
        })
        if (res.ok) data = await res.json()
      }
      // 비로그인 또는 동기화 실패 시 읽기 전용 폴백
      if (!data?.success) {
        const params = new URLSearchParams()
        if (userId) params.set('userId', userId)
        const res = await fetch(`/api/cards/dogam?${params}`)
        data = await res.json()
      }
      if (!data?.success) return

      setDogam(data.dogam)
      setSummary({ total: data.summary.total, unlocked: data.summary.unlocked })

      // 새로 해금된 도감 알림 + 뱃지
      if (Array.isArray(data.newlyUnlocked) && data.newlyUnlocked.length) {
        setJustUnlocked((prev) => {
          const next = new Set(prev)
          for (const u of data.newlyUnlocked) next.add(u.id)
          return next
        })
        for (const u of data.newlyUnlocked) {
          toast.success(`도감 해금 — ${u.title}`, { icon: '🎉', duration: 5000 })
        }
      }
      // 프레스티지 만렙 보상 지급 알림 → 인벤토리 갱신
      if (Array.isArray(data.grantedCards) && data.grantedCards.length) {
        for (const c of data.grantedCards) {
          toast(`프레스티지 카드 획득! · ${c.name}`, { icon: '👑', duration: 7000 })
        }
        window.dispatchEvent(new Event('card-inventory-updated'))
      }
    } catch (err) {
      console.error('dogam fetch failed', err)
    } finally {
      setIsLoading(false)
    }
  }, [userId])

  useEffect(() => {
    fetchDogam()
  }, [fetchDogam])

  // 드랍/조합 후 인벤토리가 갱신되면 도감도 다시 계산
  useEffect(() => {
    const refresh = () => fetchDogam()
    window.addEventListener('card-inventory-updated', refresh)
    return () => window.removeEventListener('card-inventory-updated', refresh)
  }, [fetchDogam])

  const byTier = useMemo(() => {
    const map: Record<DogamTier, DogamResult[]> = { basic: [], series: [], special: [] }
    for (const d of dogam) map[d.tier]?.push(d)
    return map
  }, [dogam])

  const selected = useMemo(
    () => dogam.find((d) => d.id === selectedId) ?? null,
    [dogam, selectedId]
  )

  const selectDogam = (id: string) => {
    setSelectedId(id)
    // 모바일: 오른쪽 페이지가 아래로 쌓이므로 상세로 스크롤
    if (typeof window !== 'undefined' && window.matchMedia('(max-width: 1023px)').matches) {
      window.requestAnimationFrame(() => {
        detailRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      })
    }
  }

  return (
    <div
      className={clsx(
        'relative overflow-hidden rounded-[1.5rem] border-[3px] border-mustard-500/45 bg-paper-200 shadow-[0_24px_60px_-24px_rgba(43,33,24,0.55)]',
        className
      )}
    >
      {/* 낡은 양피지 비네팅 */}
      <div
        className="pointer-events-none absolute inset-0 z-0"
        style={{
          background:
            'radial-gradient(130% 80% at 50% -10%, rgba(255,252,244,0.55), transparent 55%), radial-gradient(100% 100% at 50% 120%, rgba(43,33,24,0.12), transparent 60%)',
        }}
      />
      {/* 금장 코너 장식 */}
      {[
        'left-2 top-2 border-l-2 border-t-2',
        'right-2 top-2 border-r-2 border-t-2',
        'left-2 bottom-2 border-l-2 border-b-2',
        'right-2 bottom-2 border-r-2 border-b-2',
      ].map((pos) => (
        <span
          key={pos}
          className={clsx('pointer-events-none absolute z-10 h-5 w-5 rounded-sm border-mustard-500/60', pos)}
        />
      ))}

      {/* 책 헤더 (책등) */}
      <div className="relative z-10 border-b-2 border-mustard-500/30 bg-gradient-to-b from-paper-100 to-paper-200 px-6 py-4 text-center">
        <p className="caveat text-sm text-mustard-600">codex of rangu</p>
        <h2 className="display-han -mt-0.5 text-3xl tracking-wide text-ink-500">
          <BookOpen className="mr-2 inline h-6 w-6 text-mustard-600" />
          도감
        </h2>
        {summary && (
          <p className="mt-0.5 text-xs text-ink-300">
            해금{' '}
            <span className="font-mono text-sm font-bold text-mustard-600">{summary.unlocked}</span> /{' '}
            {summary.total}
          </p>
        )}
      </div>

      {isLoading ? (
        <div className="relative z-10 flex flex-col items-center justify-center gap-3 py-24">
          <span className="h-8 w-8 animate-spin rounded-full border-2 border-mustard-500/30 border-t-mustard-500" />
          <p className="caveat text-base text-ink-300">고대 도감을 펼치는 중…</p>
        </div>
      ) : (
        <div className="relative z-10 grid lg:grid-cols-2">
          {/* ── 왼쪽 페이지: 도감 색인 ── */}
          <div className="px-5 py-6 sm:px-7 lg:pr-9">
            <div className="space-y-7">
              {TIER_META.map((tier) => {
                const items = byTier[tier.id]
                if (!items?.length) return null
                const unlocked = items.filter((d) => d.unlocked).length
                return (
                  <section key={tier.id}>
                    <div className="mb-3 flex items-baseline justify-between border-b border-dashed border-ink-500/20 pb-1.5">
                      <h3 className="display-han text-lg text-ink-500">{tier.label}</h3>
                      <span className="caveat text-xs text-mustard-600">
                        {unlocked}/{items.length}
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-3 xl:grid-cols-4">
                      {items.map((d) => (
                        <DogamBadge
                          key={d.id}
                          dogam={d}
                          selected={d.id === selectedId}
                          isNew={justUnlocked.has(d.id)}
                          onClick={() => selectDogam(d.id)}
                        />
                      ))}
                    </div>
                  </section>
                )
              })}
            </div>
          </div>

          {/* ── 책등(가운데 접힘) ── */}
          <div
            className="pointer-events-none absolute inset-y-4 left-1/2 hidden w-6 -translate-x-1/2 lg:block"
            style={{
              background:
                'linear-gradient(90deg, transparent, rgba(43,33,24,0.10) 35%, rgba(43,33,24,0.16) 50%, rgba(43,33,24,0.10) 65%, transparent)',
            }}
          />

          {/* ── 오른쪽 페이지: 상세 (스크롤) ── */}
          <div
            ref={detailRef}
            className="border-t-2 border-dashed border-ink-500/15 px-5 py-6 sm:px-7 lg:border-l lg:border-t-0 lg:border-solid lg:border-ink-500/15 lg:pl-9"
          >
            <div className="lg:sticky lg:top-6">
              <DetailPanel dogam={selected} summary={summary} />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── 도감 배지 (ing / clear 이미지) ──────────────────────────────
function DogamBadge({
  dogam,
  selected,
  isNew,
  onClick,
}: {
  dogam: DogamResult
  selected: boolean
  isNew: boolean
  onClick: () => void
}) {
  const pct = dogam.total ? Math.round((dogam.owned / dogam.total) * 100) : 0
  const img = dogam.unlocked ? CLEAR_IMG : ING_IMG

  return (
    <button
      type="button"
      onClick={onClick}
      title={dogam.title}
      className={clsx(
        'group relative flex flex-col items-center rounded-xl px-1.5 pb-2 pt-2.5 transition',
        selected
          ? 'bg-mustard-500/15 ring-2 ring-mustard-500/55'
          : 'hover:bg-paper-300/60'
      )}
    >
      <div className="relative">
        {/* 해금 시 금빛 후광 */}
        {dogam.unlocked && (
          <span
            className="pointer-events-none absolute inset-0 -m-1 rounded-full"
            style={{ boxShadow: '0 0 18px 2px rgba(226,176,71,0.55)' }}
          />
        )}
        <img
          src={img}
          alt={dogam.unlocked ? '해금됨' : '진행 중'}
          className={clsx(
            'relative h-16 w-16 object-contain transition-transform duration-300 group-hover:scale-105 sm:h-[72px] sm:w-[72px]',
            !dogam.unlocked && 'opacity-90 saturate-[0.85]'
          )}
        />
        {/* 상태 칩 */}
        <span
          className={clsx(
            'absolute -bottom-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full border shadow-sm',
            dogam.unlocked
              ? 'border-mustard-500/50 bg-paper-50 text-mustard-600'
              : 'border-ink-500/20 bg-paper-50 text-ink-300'
          )}
        >
          {dogam.unlocked ? <Crown className="h-3 w-3" /> : <Lock className="h-2.5 w-2.5" />}
        </span>
        {/* NEW 뱃지 */}
        {isNew && (
          <span className="absolute -left-1 -top-1 inline-flex animate-pulse items-center rounded-full bg-coral-500 px-1 py-0.5 text-[8px] font-bold uppercase text-white shadow">
            new
          </span>
        )}
      </div>

      <p className="mt-1.5 line-clamp-2 text-center text-[11px] font-bold leading-tight text-ink-500">
        {dogam.title}
      </p>
      <p className="font-mono text-[10px] text-ink-300">
        {dogam.owned}/{dogam.total}
        {!dogam.unlocked && dogam.total > 0 && <span className="ml-1 text-ink-300/70">· {pct}%</span>}
      </p>
    </button>
  )
}

// ── 오른쪽 페이지: 도감 상세 ────────────────────────────────────
function DetailPanel({
  dogam,
  summary,
}: {
  dogam: DogamResult | null
  summary: { total: number; unlocked: number } | null
}) {
  // 아무것도 선택 안 함 → 안내
  if (!dogam) {
    return (
      <div className="flex min-h-[280px] flex-col items-center justify-center text-center">
        <ScrollText className="h-10 w-10 text-mustard-500/60" />
        <p className="caveat mt-3 text-lg text-mustard-600">collection info</p>
        <p className="mt-1 max-w-[16rem] text-sm leading-relaxed text-ink-300">
          왼쪽에서 도감을 선택하면 필요한 카드와 수록 카드를 볼 수 있어요.
        </p>
        {summary && (
          <p className="mt-4 rounded-full border border-mustard-500/30 bg-mustard-500/10 px-3 py-1 text-xs font-bold text-mustard-600">
            전체 해금 {summary.unlocked} / {summary.total}
          </p>
        )}
      </div>
    )
  }

  const pct = dogam.total ? Math.round((dogam.owned / dogam.total) * 100) : 0
  const missing = dogam.cards.filter((c) => !c.owned)

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={dogam.id}
        initial={{ opacity: 0, x: 10 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -10 }}
        transition={{ duration: 0.22 }}
      >
        {/* 헤더 */}
        <div className="text-center">
          <p className="caveat text-sm text-mustard-600">
            {dogam.unlocked ? 'collection cards' : 'collection info'}
          </p>
          <h3 className="display-han text-2xl text-ink-500">{dogam.title}</h3>
          <div className="mt-1 flex justify-center">
            {dogam.unlocked ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-mustard-500/15 px-2.5 py-0.5 text-[11px] font-bold text-mustard-600">
                <Crown className="h-3 w-3" /> 해금 완료
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full bg-ink-500/8 px-2.5 py-0.5 text-[11px] font-bold text-ink-300">
                <Lock className="h-3 w-3" /> 진행 중
              </span>
            )}
          </div>
        </div>

        {/* 진행 바 */}
        <div className="mx-auto mt-4 max-w-sm">
          <div className="h-2 w-full overflow-hidden rounded-full bg-ink-500/10">
            <div
              className="h-full rounded-full bg-gradient-to-r from-mustard-400 to-mustard-600 transition-all duration-500"
              style={{ width: `${pct}%` }}
            />
          </div>
          <p className="mt-1.5 text-center text-xs text-ink-300">
            <span className="font-mono font-bold text-ink-500">
              {dogam.owned}/{dogam.total}
            </span>{' '}
            장 보유
          </p>
        </div>

        {/* 해금 조건 (스크롤 박스) */}
        <div className="mx-auto mt-4 max-w-sm rounded-xl border border-mustard-500/25 bg-paper-100/70 px-4 py-3">
          <p className="text-[11px] font-bold uppercase tracking-wider text-mustard-600">
            required for unlock
          </p>
          <p className="mt-1 text-sm leading-relaxed text-ink-500">{dogam.requirement}</p>
        </div>

        {/* 카드 목록 */}
        <div className="mt-5">
          <div className="mb-2.5 flex items-center justify-between">
            <h4 className="text-sm font-bold text-ink-500">
              {dogam.unlocked ? '수록 카드' : '필요한 카드'}
              <span className="ml-1.5 font-mono text-xs text-ink-300">
                {dogam.unlocked ? dogam.total : `${missing.length}장 남음`}
              </span>
            </h4>
          </div>

          <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-4">
            {dogam.cards.map((card, i) => {
              const rotation = ((i * 37) % 5) - 2
              if (card.owned) {
                return (
                  <CardArtwork
                    key={card.cardId}
                    imageUrl={card.imageUrl}
                    name={card.name}
                    rarity={card.rarity}
                    type={card.type}
                    member={card.member ?? undefined}
                    year={card.year ?? undefined}
                    period={card.period ?? undefined}
                    rotate={rotation}
                    size="xs"
                  />
                )
              }
              return (
                <div
                  key={card.cardId}
                  className="relative"
                  style={{ transform: `rotate(${rotation}deg)` }}
                  title={card.name}
                >
                  <div className="pointer-events-none opacity-35 grayscale">
                    <CardArtwork
                      imageUrl={card.imageUrl}
                      name={card.name}
                      rarity={card.rarity}
                      type={card.type}
                      member={card.member ?? undefined}
                      size="xs"
                      showRarityChip={false}
                      hideCaption
                    />
                  </div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="rounded-full bg-paper-50/85 p-1.5 text-ink-300 shadow-sm">
                      <Lock className="h-3.5 w-3.5" />
                    </span>
                  </div>
                </div>
              )
            })}
            {dogam.cards.length === 0 && (
              <p className="col-span-full py-6 text-center text-sm text-ink-300">
                아직 등록된 구성 카드가 없어요.
              </p>
            )}
          </div>
        </div>

        {/* 보상 푸터 */}
        {dogam.unlocked && (
          <div className="mt-5 flex items-center gap-2 rounded-xl border border-mustard-500/40 bg-mustard-500/10 px-4 py-2.5">
            <Sparkles className="h-4 w-4 shrink-0 text-mustard-600" />
            <p className="text-xs font-bold text-mustard-600">
              {dogam.tier === 'basic'
                ? '보상: 프레스티지 카드 해금 ✓'
                : '도감 완성 보상 획득 ✓'}
            </p>
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  )
}
