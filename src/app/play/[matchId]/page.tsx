'use client'

import { Suspense, type ReactNode } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import { selectBattle } from '@rangu/battle-core'
import { NexusBar, CardSlot, CardTile } from '@rangu/ui'
import { useBattle } from '@/lib/tactics/battleClient'
import { useGameConnection } from '@/lib/tactics/useGameConnection'

function Row({ children }: { children: ReactNode }) {
  return <div className="flex min-h-[7rem] flex-wrap items-center gap-2">{children}</div>
}
function Center({ children }: { children: ReactNode }) {
  return <div className="flex h-screen items-center justify-center text-slate-300">{children}</div>
}

function Board() {
  const params = useParams<{ matchId: string }>()
  const search = useSearchParams()
  const matchId = params?.matchId ?? 'e2e-1'
  const ticket = search.get('ticket') ?? ''

  useGameConnection({ matchId, ticket })

  const snapshot = useBattle((s) => s.snapshot)
  const connected = useBattle((s) => s.connected)
  const mySeat = snapshot?.viewer?.seat ?? 0
  const vm = selectBattle(snapshot, mySeat)

  if (!ticket) return <Center>티켓이 필요합니다 — <code className="ml-1">?ticket=…</code></Center>
  if (!vm) return <Center>{connected ? '상태 수신 대기…' : '서버 연결 중…'}</Center>

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4 bg-slate-900 p-6">
      <div className="text-xs text-slate-400">상대 손패 ({vm.opponent.handCount}) — 🔒 마스킹(뒷면)</div>
      <Row>
        {vm.opponentHand.map((c) => <CardTile key={c.instanceId} card={c} />)}
        {vm.opponentHand.length === 0 ? <span className="text-xs text-slate-600">— 상대 손패 없음 —</span> : null}
      </Row>

      <NexusBar side={vm.opponent} label="상대" />
      <Row>
        {vm.opponent.board.map((c) => <CardSlot key={c.instanceId} card={c} />)}
        {vm.opponent.board.length === 0 ? <span className="text-xs text-slate-600">— 상대 보드 비어있음 —</span> : null}
      </Row>

      <div className="h-px bg-slate-700" />

      <Row>
        {vm.me.board.map((c) => <CardSlot key={c.instanceId} card={c} />)}
        {vm.me.board.length === 0 ? <span className="text-xs text-slate-600">— 내 보드 비어있음 —</span> : null}
      </Row>
      <NexusBar side={vm.me} label="나" />

      <div className="text-xs text-slate-400">내 손패 ({vm.myHand.length})</div>
      <Row>
        {vm.myHand.map((c) => <CardTile key={c.instanceId} card={c} />)}
      </Row>

      <div className="text-center text-xs text-slate-500">
        라운드 {vm.round} · {vm.priorityIsMine ? '내 차례' : '상대 차례'} · 스택 {vm.stackCount}
      </div>
    </div>
  )
}

export default function PlayPage() {
  // useSearchParams 는 Suspense 경계 필요(Next App Router)
  return (
    <Suspense fallback={<Center>로딩…</Center>}>
      <Board />
    </Suspense>
  )
}
