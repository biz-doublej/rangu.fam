'use client'

import { useEffect } from 'react'

/**
 * 다크 화면으로 보고 있어도 인쇄·PDF 저장은 라이트 색으로 한다.
 * 인쇄 직전에 위키 색 설정을 라이트로 바꿨다가, 인쇄가 끝나면 되돌린다.
 */
export function usePrintInLightTheme() {
  useEffect(() => {
    const root = document.documentElement
    let saved: string | null = null

    const toLight = () => {
      if (saved !== null) return
      saved = root.dataset.wikiColor ?? ''
      if (saved === 'dark') root.dataset.wikiColor = 'light'
    }
    const restore = () => {
      if (saved === null) return
      if (saved === 'dark') root.dataset.wikiColor = 'dark'
      saved = null
    }

    // beforeprint 를 안 보내는 브라우저를 위해 print 미디어 변화도 함께 본다
    const media = window.matchMedia('print')
    const onMedia = (event: MediaQueryListEvent) => (event.matches ? toLight() : restore())

    window.addEventListener('beforeprint', toLight)
    window.addEventListener('afterprint', restore)
    media.addEventListener?.('change', onMedia)
    return () => {
      window.removeEventListener('beforeprint', toLight)
      window.removeEventListener('afterprint', restore)
      media.removeEventListener?.('change', onMedia)
      restore()
    }
  }, [])
}
