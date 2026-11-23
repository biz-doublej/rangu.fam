'use client'

import { useEffect, useState } from 'react'
import type { ConvertWarning } from '@/lib/wiki/convert/namuToIrang'
import { templateNamesIn } from '@/lib/wiki/templates'

export interface NamuConversion {
  loading: boolean
  text: string
  warnings: ConvertWarning[]
}

/**
 * 나무위키 원문을 이랑위키 문법으로 바꾼다. 변환기는 필요할 때만 불러온다(편집기 첫 화면을 무겁게 하지 않게).
 * 한 번 바꾼 뒤 결과가 부르는 틀이 이랑위키에 있는지 물어보고, 그 목록으로 다시 바꿔 "없는 틀" 경고를 붙인다.
 */
export function useNamuConversion(source: string | null): NamuConversion {
  const [state, setState] = useState<NamuConversion>({ loading: true, text: '', warnings: [] })

  useEffect(() => {
    if (source === null) return
    let cancelled = false
    setState({ loading: true, text: '', warnings: [] })
    ;(async () => {
      const { namuToIrang } = await import('@/lib/wiki/convert/namuToIrang')
      const first = namuToIrang(source)
      if (cancelled) return
      setState({ loading: true, ...first })

      const names = templateNamesIn(first.text)
      if (names.length === 0) {
        setState({ loading: false, ...first })
        return
      }
      try {
        const response = await fetch(`/api/wiki/templates?names=${encodeURIComponent(names.join(','))}`)
        const data = await response.json()
        const known = Object.entries((data?.templates || {}) as Record<string, string | null>)
          .filter(([, body]) => typeof body === 'string')
          .map(([name]) => name)
        if (!cancelled) setState({ loading: false, ...namuToIrang(source, { knownTemplates: known }) })
      } catch {
        if (!cancelled) setState({ loading: false, ...first })
      }
    })()
    return () => {
      cancelled = true
    }
  }, [source])

  return state
}
