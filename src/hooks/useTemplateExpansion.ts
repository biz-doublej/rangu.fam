'use client'

import { useEffect, useMemo, useState } from 'react'
import { expandTemplates, templateNamesIn } from '@/lib/wiki/templates'

/** 한 화면에서 불러온 틀을 잠깐 기억한다 — 편집 미리보기에서 글자를 칠 때마다 다시 묻지 않게 */
const cache = new Map<string, { content: string | null; at: number }>()
const CACHE_MS = 60_000

function cached(name: string): string | null | undefined {
  const hit = cache.get(name)
  return hit && Date.now() - hit.at < CACHE_MS ? hit.content : undefined
}

/**
 * 본문의 틀({{이름|키=값}})을 펼친 글을 돌려준다.
 * - preloaded: 문서 조회 응답에 실려 온 틀 (문서 화면은 이것만으로 바로 펼친다)
 * - 그 밖의 틀은 /api/wiki/templates 로 불러온다 (편집 미리보기). 불러오는 동안 그 자리는 비워 둔다.
 */
export function useTemplateExpansion(content: string, preloaded?: Record<string, string | null> | null): string {
  const names = useMemo(() => templateNamesIn(content || ''), [content])
  const [version, setVersion] = useState(0)

  const missing = names.filter((name) => !(preloaded && name in preloaded) && cached(name) === undefined)
  const missingKey = missing.join(',')

  useEffect(() => {
    if (!missingKey) return
    let cancelled = false
    // 편집 중에는 타자를 멈춘 뒤에 묻는다
    const timer = window.setTimeout(async () => {
      try {
        const response = await fetch(`/api/wiki/templates?names=${encodeURIComponent(missingKey)}`)
        const data = await response.json()
        if (data?.success && data.templates) {
          for (const [name, body] of Object.entries(data.templates)) {
            cache.set(name, { content: typeof body === 'string' ? body : null, at: Date.now() })
          }
        }
      } catch {
        // 못 불러오면 그 자리는 비워 둔 채로 둔다 (없는 틀로 잘못 알리지 않게)
      }
      if (!cancelled) setVersion((value) => value + 1)
    }, 300)
    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [missingKey])

  return useMemo(() => {
    if (names.length === 0) return content
    const lookup: Record<string, string | null | undefined> = {}
    for (const name of names) lookup[name] = preloaded && name in preloaded ? preloaded[name] : cached(name)
    return expandTemplates(content, lookup)
    // version: 불러온 틀이 캐시에 들어오면 다시 펼친다
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [content, names, preloaded, version])
}
