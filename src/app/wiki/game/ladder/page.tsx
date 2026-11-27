'use client'

import React, { Suspense } from 'react'
import Link from 'next/link'
import { WikiShell, WikiPageHeader } from '@/components/wiki'
import { LadderGame } from '@/games/ladder/LadderGame'

/** 사다리 타기 — 보상이 없는 도구라 로그인 없이도 쓸 수 있다 (공유 링크를 받은 사람도 바로 본다). */
export default function GamecenterLadderPage() {
  return (
    <WikiShell
      pageHeader={
        <WikiPageHeader
          title="사다리 타기"
          subtitle="계산이나 벌칙을 정할 때 쓰는 사다리입니다. 포인트 보상은 없습니다."
          hatnote={
            <Link href="/wiki/game" className="text-[color:var(--wiki-link)] hover:underline">
              ← 이랑게임센터 로비
            </Link>
          }
        />
      }
    >
      <Suspense fallback={null}>
        <LadderGame />
      </Suspense>
    </WikiShell>
  )
}
