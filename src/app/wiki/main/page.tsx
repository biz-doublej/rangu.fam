'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { WikiShell } from '@/components/wiki'

export default function WikiMainAliasPage() {
  const router = useRouter()
  useEffect(() => {
    router.replace('/wiki')
  }, [router])
  return (
    <WikiShell>
      <p className="text-sm text-[color:var(--wiki-ink-muted)] py-12 text-center">
        이랑위키 대문으로 이동 중입니다…
      </p>
    </WikiShell>
  )
}
