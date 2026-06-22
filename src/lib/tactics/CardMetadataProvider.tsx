'use client'

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'

/** 카드 효과 1건(메타) — 주문 타겟 필요 여부 판별에 사용. */
export interface CardEffectMeta {
  trigger?: string
  kind?: string
  amount?: number
  target?: { select?: string } | null
}

/** export(JSON) 의 카드 1건 (CardMeta). 상점/덱빌더/배틀 공통 표시 데이터. */
export interface CardMeta {
  cardId: string
  name: string
  cost?: number
  attack?: number | null
  health?: number | null
  keywords?: string[]
  imageUrl?: string | null
  faction?: string
  type?: string // 'unit' | 'spell' | 'champion' | 'landmark'
  rarity?: string
  spellSpeed?: string | null // 'burst' | 'fast' | 'slow' (주문)
  effects?: CardEffectMeta[]
}

/** 주문인가. */
export function isSpell(meta?: CardMeta): boolean {
  return meta?.type === 'spell'
}
/** 단일 타겟 주문인가 — 효과 중 'choose…' 대상이 있으면 수동 타겟 필요(드래그 타겟팅). */
export function spellNeedsTarget(meta?: CardMeta): boolean {
  return isSpell(meta) && (meta?.effects ?? []).some((e) => e.target?.select?.startsWith('choose'))
}
/** 스택에 쌓이는가(=즉발 burst 아님) — 쌓이면 중앙 체인 UI 가 뜬다. */
export function spellStacks(meta?: CardMeta): boolean {
  return isSpell(meta) && !!meta?.spellSpeed && meta.spellSpeed !== 'burst'
}

type CardMetaIndex = Record<string, CardMeta>

const Ctx = createContext<CardMetaIndex>({})

/**
 * 카드 메타데이터(이름/이미지/스탯) 공급자 — 상점·덱빌더·배틀이 **동일 카드 데이터**를 공유.
 * 부팅 시 export JSON 1회 로드 → cardId 인덱스. (배틀 스냅샷의 definitionId 로 조회.)
 * 실패 시 빈 인덱스 → 소비 컴포넌트는 definitionId 폴백(데모: DB 없으면 자연 폴백).
 */
export function CardMetadataProvider({
  children,
  endpoint = '/api/game/metadata/export',
}: {
  children: ReactNode
  endpoint?: string
}) {
  const [index, setIndex] = useState<CardMetaIndex>({})

  useEffect(() => {
    let alive = true
    fetch(endpoint)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`metadata ${r.status}`))))
      .then((doc: { cards?: CardMeta[] }) => {
        if (!alive) return
        const byId: CardMetaIndex = {}
        for (const c of doc.cards ?? []) byId[c.cardId] = c
        setIndex(byId)
      })
      .catch(() => {
        /* 메타 없으면 definitionId 폴백 */
      })
    return () => {
      alive = false
    }
  }, [endpoint])

  return <Ctx.Provider value={index}>{children}</Ctx.Provider>
}

/** cardId(=배틀의 definitionId) → 메타데이터. 없으면 undefined. */
export function useCardMeta(cardId?: string): CardMeta | undefined {
  const index = useContext(Ctx)
  return cardId ? index[cardId] : undefined
}
