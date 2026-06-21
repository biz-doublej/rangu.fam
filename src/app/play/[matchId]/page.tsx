'use client'

import { Suspense, type ReactNode } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import { GamePhase } from '@rangu/proto-ts'
import { selectBattle, type CardVM } from '@rangu/battle-core'
import { NexusBar, CardSlot, CardTile } from '@rangu/ui'
import { useBattle, doPlayCard, doMulligan, doPass } from '@/lib/tactics/battleClient'
import { useGameConnection } from '@/lib/tactics/useGameConnection'
import { CardMetadataProvider, useCardMeta } from '@/lib/tactics/CardMetadataProvider'

function Row({ children }: { children: ReactNode }) {
  return <div className="flex min-h-[7rem] flex-wrap items-center gap-2">{children}</div>
}
function Center({ children }: { children: ReactNode }) {
  return <div className="flex h-screen items-center justify-center text-slate-300">{children}</div>
}

/** 손패 카드 — 메타데이터 이름 조회 + 클릭 시 낙관적 소환. */
function HandCard({ card, playable, pending }: { card: CardVM; playable: boolean; pending: boolean }) {
  const meta = useCardMeta(card.definitionId)
  return (
    <CardTile
      card={card}
      name={meta?.name}
      pending={pending}
      onClick={playable ? () => doPlayCard(card.instanceId) : undefined}
    />
  )
}

function Board() {
  const params = useParams<{ matchId: string }>()
  const search = useSearchParams()
  const matchId = params?.matchId ?? 'e2e-1'
  const ticket = search.get('ticket') ?? ''

  useGameConnection({ matchId, ticket })

  const snapshot = useBattle((s) => s.snapshot)
  const connected = useBattle((s) => s.connected)
  const pendingIntents = useBattle((s) => s.pendingIntents)
  const mySeat = snapshot?.viewer?.seat ?? 0
  const vm = selectBattle(snapshot, mySeat)

  if (!ticket) return <Center>티켓이 필요합니다 — <code className="ml-1">?ticket=…</code></Center>
  if (!vm) return <Center>{connected ? '상태 수신 대기…' : '서버 연결 중…'}</Center>

  // 낙관적 UI: pending intent 의 대상 카드 = 전송 중 표시, 미해결 intent 있으면 입력 잠금
  const pendingCardIds = new Set(
    Object.values(pendingIntents)
      .filter((p) => p.status === 'pending' && p.cardInstanceId)
      .map((p) => p.cardInstanceId as string),
  )
  const busy = Object.values(pendingIntents).some((p) => p.status === 'pending')
  const isMulligan = vm.phase === GamePhase.PHASE_MULLIGAN
  const myAction = vm.phase === GamePhase.PHASE_ACTION && vm.priorityIsMine
  const canPlay = myAction && !busy

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4 bg-slate-900 p-6">
      <div className="text-xs text-slate-400">상대 손패 ({vm.opponent.handCount}) — 🔒 마스킹(뒷면)</div>
      <Row>
        {vm.opponentHand.map((c) => <CardSlot key={c.instanceId} card={c} />)}
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

      <div className="flex flex-wrap items-center gap-2">
        {isMulligan ? (
          <button
            onClick={() => doMulligan([])}
            disabled={busy}
            className="rounded bg-amber-500 px-3 py-1 text-xs font-bold text-slate-900 disabled:opacity-50"
          >
            멀리건: 전부 킵
          </button>
        ) : null}
        {myAction ? (
          <button
            onClick={() => doPass()}
            disabled={busy}
            className="rounded bg-slate-700 px-3 py-1 text-xs text-slate-200 disabled:opacity-50"
          >
            패스
          </button>
        ) : null}
        <span className="text-xs text-slate-500">
          라운드 {vm.round} · {isMulligan ? '멀리건' : vm.priorityIsMine ? '내 차례' : '상대 차례'} · 스택 {vm.stackCount}
          {busy ? ' · ⏳ 전송 중…' : ''}
        </span>
      </div>

      <div className="text-xs text-slate-400">
        내 손패 ({vm.myHand.length}){canPlay ? ' — 카드 클릭 = 소환(마나 충분 시)' : ''}
      </div>
      <Row>
        {vm.myHand.map((c) => (
          <HandCard
            key={c.instanceId}
            card={c}
            playable={canPlay && (c.cost ?? 0) <= vm.me.mana}
            pending={pendingCardIds.has(c.instanceId)}
          />
        ))}
      </Row>
    </div>
  )
}

export default function PlayPage() {
  // useSearchParams 는 Suspense 경계 필요(Next App Router). 메타데이터는 Context 로 공유.
  return (
    <CardMetadataProvider>
      <Suspense fallback={<Center>로딩…</Center>}>
        <Board />
      </Suspense>
    </CardMetadataProvider>
  )
}
