'use client'

/**
 * 정민석 — 두 페르소나 wrapper.
 *
 * - default: Music (#music)
 * - hospitality 모드: #hospitality (호텔 인턴십 지원용 영문 포트폴리오)
 *
 * URL hash를 source of truth로 사용한다.
 * - `/m/minseok`           → Music
 * - `/m/minseok#hospitality` → Hospitality (deep link 가능)
 */

import { useEffect, useState } from 'react'
import MinseokMusicPage from './minseok-music'
import MinseokHospitalityPage from './minseok-hospitality'

type View = 'music' | 'hospitality'

function readHashView(): View {
  if (typeof window === 'undefined') return 'music'
  const h = window.location.hash.replace(/^#/, '').toLowerCase()
  return h === 'hospitality' || h === 'hotel' ? 'hospitality' : 'music'
}

export default function MinseokPage() {
  const [view, setView] = useState<View>('music')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    setView(readHashView())
    const onHash = () => setView(readHashView())
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  const goMusic = () => {
    if (typeof window === 'undefined') return
    history.replaceState(null, '', window.location.pathname + window.location.search)
    setView('music')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
  const goHospitality = () => {
    if (typeof window === 'undefined') return
    history.replaceState(null, '', window.location.pathname + window.location.search + '#hospitality')
    setView('hospitality')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // First paint: render the music side so SSR HTML matches the default,
  // then swap in the hash-selected view on the client. This avoids hydration
  // mismatches without requiring a full client-only render.
  if (!mounted || view === 'music') {
    return <MinseokMusicPage onSwitchToHospitality={goHospitality} />
  }
  return <MinseokHospitalityPage onSwitchToMusic={goMusic} />
}
