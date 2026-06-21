'use client'

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'

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
  type?: string
  rarity?: string
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
