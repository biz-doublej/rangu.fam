'use client'

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronLeft, FileText, ArrowLeftRight, Sparkles, RefreshCw, Activity } from 'lucide-react'
import { PaperCard, CaveatText, InkUnderline } from '@/components/scrapbook'
import { getRarityToken, handleCardImageError } from '@/lib/cardTheme'

interface FeedItem {
  id: string
  type: 'wiki_edit' | 'card_drop' | 'card_trade'
  ts: string
  // 타입별 추가 필드 (느슨하게)
  actor?: string
  title?: string
  slug?: string
  editType?: string
  sizeChange?: number
  memberId?: string | null
  cardName?: string
  cardImage?: string
  rarity?: string
  from?: string
  to?: string
  offerCardName?: string
  requestCardName?: string
}

const EDIT_TYPE_LABEL: Record<string, string> = {
  create: '문서 생성',
  edit: '편집',
  revert: '되돌림',
  redirect: '넘겨주기',
  protect: '보호',
  move: '이동',
}

function relTime(iso: string): string {
  const t = new Date(iso).getTime()
  if (Number.isNaN(t)) return ''
  const diff = Date.now() - t
  const sec = Math.floor(diff / 1000)
  if (sec < 60) return `${Math.max(0, sec)}초 전`
  const min = Math.floor(sec / 60)
  if (min < 60) return `${min}분 전`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr}시간 전`
  const day = Math.floor(hr / 24)
  if (day < 7) return `${day}일 전`
  return new Date(iso).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })
}

export default function FeedPage() {
  const router = useRouter()
  const [items, setItems] = useState<FeedItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      const r = await fetch('/api/feed')
      const d = await r.json()
      if (r.ok && d?.success) setItems(d.items || [])
      else setError(d?.error || '피드를 불러오지 못했습니다.')
    } catch {
      setError('피드를 불러오지 못했습니다.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  return (
    <div className="min-h-screen pb-20">
      {/* Top bar */}
      <div className="border-b border-dashed border-ink-500/15 bg-paper-50/70 backdrop-blur-sm">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-5 py-4 sm:px-8">
          <button
            onClick={() => router.push('/')}
            className="inline-flex items-center gap-1 text-sm text-ink-300 hover:text-ink-500"
          >
            <ChevronLeft className="h-4 w-4" />
            홈으로
          </button>
          <CaveatText className="text-lg text-coral-500">activity feed</CaveatText>
          <button
            onClick={load}
            disabled={loading}
            className="inline-flex items-center gap-1 text-xs text-ink-300 hover:text-ink-500 disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            새로고침
          </button>
        </div>
      </div>

      <main className="mx-auto max-w-3xl px-5 sm:px-8">
        {/* Hero */}
        <section className="py-10">
          <CaveatText className="text-xl text-coral-500">what&apos;s happening</CaveatText>
          <h1 className="scrap-h1 mt-2">
            우리의 <InkUnderline variant="mustard">활동 기록</InkUnderline>.
          </h1>
          <p className="mt-3 max-w-md text-sm leading-relaxed text-ink-300">
            위키 편집, 카드 획득, 카드 교환이 시간순으로 모입니다.
          </p>
        </section>

        {error && (
          <div className="rounded-xl border border-coral-500/30 bg-coral-500/10 px-4 py-3 text-sm text-coral-500">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-16 text-ink-300">
            <Activity className="h-5 w-5 animate-pulse" />
            <span className="ml-2 text-sm">불러오는 중…</span>
          </div>
        ) : items.length === 0 && !error ? (
          <p className="rounded-xl border border-dashed border-ink-500/15 px-4 py-12 text-center text-sm text-ink-300">
            아직 활동 기록이 없습니다.
          </p>
        ) : (
          <PaperCard className="!p-0">
            <ol className="divide-y divide-ink-500/10">
              {items.map((it) => (
                <li key={it.id} className="px-4 py-3.5 sm:px-5">
                  <FeedRow item={it} onOpen={(slug) => router.push(`/wiki/${encodeURIComponent(slug)}`)} />
                </li>
              ))}
            </ol>
          </PaperCard>
        )}
      </main>
    </div>
  )
}

function FeedRow({ item, onOpen }: { item: FeedItem; onOpen: (slug: string) => void }) {
  const time = relTime(item.ts)

  if (item.type === 'wiki_edit') {
    const sc = item.sizeChange ?? 0
    return (
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-sage-500/15 text-sage-500">
          <FileText className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm text-ink-500">
            <span className="font-semibold">{item.actor}</span>
            <span className="text-ink-300">
              {' '}
              님이{' '}
            </span>
            <button onClick={() => onOpen(item.slug || item.title || '')} className="font-medium text-coral-500 hover:underline">
              {item.title}
            </button>
            <span className="text-ink-300"> 문서를 {EDIT_TYPE_LABEL[item.editType || 'edit'] || '편집'}</span>
          </p>
          <p className="mt-0.5 flex items-center gap-2 text-xs text-ink-300">
            <span>{time}</span>
            {sc !== 0 && (
              <span className={`font-mono tabular-nums ${sc > 0 ? 'text-sage-500' : 'text-coral-500'}`}>
                {sc > 0 ? '+' : ''}
                {sc.toLocaleString()}
              </span>
            )}
          </p>
        </div>
      </div>
    )
  }

  if (item.type === 'card_drop') {
    const token = getRarityToken(item.rarity)
    return (
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-coral-500/15 text-coral-500">
          <Sparkles className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm text-ink-500">
            <span className="font-semibold">{item.actor}</span>
            <span className="text-ink-300"> 님이 </span>
            <span className="font-medium" style={{ color: token.ink }}>
              {item.cardName}
            </span>
            <span className="text-ink-300"> 카드를 획득</span>
          </p>
          <p className="mt-0.5 flex items-center gap-2 text-xs text-ink-300">
            <span>{time}</span>
            <span className="rounded-sm px-1.5 py-0.5 text-[10px] font-medium" style={{ color: token.ink, backgroundColor: token.wash }}>
              {token.label}
            </span>
          </p>
        </div>
        {item.cardImage && (
          <div className="h-10 w-8 flex-shrink-0 overflow-hidden rounded border" style={{ borderColor: token.edge }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={item.cardImage} alt={item.cardName || ''} className="h-full w-full object-cover" onError={handleCardImageError} />
          </div>
        )}
      </div>
    )
  }

  // card_trade
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-mustard-500/15 text-mustard-600">
        <ArrowLeftRight className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm text-ink-500">
          <span className="font-semibold">{item.from}</span>
          <span className="text-ink-300"> ↔ </span>
          <span className="font-semibold">{item.to}</span>
          <span className="text-ink-300"> 카드 교환 성사</span>
        </p>
        <p className="mt-0.5 text-xs text-ink-300">
          <span className="text-sage-500">{item.offerCardName}</span>
          <span> ↔ </span>
          <span className="text-coral-500">{item.requestCardName}</span>
          <span className="ml-2">{time}</span>
        </p>
      </div>
    </div>
  )
}
