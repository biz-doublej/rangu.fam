'use client'

import { Suspense, useState, type ReactNode } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import { GamePhase } from '@rangu/proto-ts'
import { selectBattle, type CardVM } from '@rangu/battle-core'
import { NexusBar, CardSlot, CardTile } from '@rangu/ui'
import {
  useBattle,
  doPlayCard,
  doMulligan,
  doPass,
  doDeclareAttack,
  doDeclareBlock,
} from '@/lib/tactics/battleClient'
import { useGameConnection } from '@/lib/tactics/useGameConnection'
import { CardMetadataProvider, useCardMeta } from '@/lib/tactics/CardMetadataProvider'
import { FloatingNumbersLayer } from '@/lib/tactics/FloatingNumbersLayer'

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

  // 전투 선택(로컬 UI 상태 — 서버 정본과 분리)
  const [attackSel, setAttackSel] = useState<Set<string>>(new Set())
  const [armed, setArmed] = useState<string | null>(null) // 블록할 공격자
  const [blocks, setBlocks] = useState<Record<string, string>>({}) // attacker → blocker

  const mySeat = snapshot?.viewer?.seat ?? 0
  const vm = selectBattle(snapshot, mySeat)

  if (!ticket) return <Center>티켓이 필요합니다 — <code className="ml-1">?ticket=…</code></Center>
  if (!vm) return <Center>{connected ? '상태 수신 대기…' : '서버 연결 중…'}</Center>

  const pendingCardIds = new Set(
    Object.values(pendingIntents)
      .filter((p) => p.status === 'pending' && p.cardInstanceId)
      .map((p) => p.cardInstanceId as string),
  )
  const busy = Object.values(pendingIntents).some((p) => p.status === 'pending')

  const attackerIds = new Set(vm.combat.pairs.map((p) => p.attackerInstanceId))
  const iAmAttacker = vm.combat.attackerSeat === mySeat
  const isAction = vm.phase === GamePhase.PHASE_ACTION && vm.priorityIsMine
  const canAttack = isAction && vm.me.hasAttackToken && !busy
  const isBlock = vm.phase === GamePhase.PHASE_COMBAT_DECLARE_BLOCK && !iAmAttacker && vm.priorityIsMine && !busy
  const isMulligan = vm.phase === GamePhase.PHASE_MULLIGAN
  const blockedUnitIds = new Set(Object.values(blocks))

  const onMyUnit = (c: CardVM) => {
    if (canAttack && !c.exhausted) {
      setAttackSel((prev) => {
        const n = new Set(prev)
        n.has(c.instanceId) ? n.delete(c.instanceId) : n.add(c.instanceId)
        return n
      })
    } else if (isBlock && armed) {
      setBlocks((prev) => ({ ...prev, [armed]: c.instanceId }))
      setArmed(null)
    }
  }
  const submitAttack = () => {
    doDeclareAttack([...attackSel])
    setAttackSel(new Set())
  }
  const submitBlock = () => {
    doDeclareBlock(Object.entries(blocks).map(([a, b]) => ({ attackerInstanceId: a, blockerInstanceId: b })))
    setBlocks({})
    setArmed(null)
  }

  const myUnitInteractive = (c: CardVM) => (canAttack && !c.exhausted) || (isBlock && !!armed)

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4 bg-slate-900 p-6">
      <FloatingNumbersLayer />

      <div className="text-xs text-slate-400">상대 손패 ({vm.opponent.handCount}) — 🔒 마스킹(뒷면)</div>
      <Row>
        {vm.opponentHand.map((c) => <CardSlot key={c.instanceId} card={c} />)}
        {vm.opponentHand.length === 0 ? <span className="text-xs text-slate-600">— 상대 손패 없음 —</span> : null}
      </Row>

      <NexusBar side={vm.opponent} label="상대" />
      <Row>
        {vm.opponent.board.map((c) => (
          <CardSlot
            key={c.instanceId}
            card={c}
            attacking={attackerIds.has(c.instanceId)}
            selected={armed === c.instanceId}
            onClick={isBlock && attackerIds.has(c.instanceId) ? () => setArmed(c.instanceId) : undefined}
          />
        ))}
        {vm.opponent.board.length === 0 ? <span className="text-xs text-slate-600">— 상대 보드 비어있음 —</span> : null}
      </Row>

      <div className="h-px bg-slate-700" />

      <Row>
        {vm.me.board.map((c) => (
          <CardSlot
            key={c.instanceId}
            card={c}
            attacking={attackerIds.has(c.instanceId)}
            selected={attackSel.has(c.instanceId) || blockedUnitIds.has(c.instanceId)}
            onClick={myUnitInteractive(c) ? () => onMyUnit(c) : undefined}
          />
        ))}
        {vm.me.board.length === 0 ? <span className="text-xs text-slate-600">— 내 보드 비어있음 —</span> : null}
      </Row>
      <NexusBar side={vm.me} label="나" />

      <div className="flex flex-wrap items-center gap-2">
        {isMulligan ? (
          <button onClick={() => doMulligan([])} disabled={busy} className="rounded bg-amber-500 px-3 py-1 text-xs font-bold text-slate-900 disabled:opacity-50">
            멀리건: 전부 킵
          </button>
        ) : null}
        {canAttack ? (
          <button onClick={submitAttack} disabled={attackSel.size === 0} className="rounded bg-rose-500 px-3 py-1 text-xs font-bold text-white disabled:opacity-40">
            공격 선언 ({attackSel.size})
          </button>
        ) : null}
        {isBlock ? (
          <>
            <button onClick={submitBlock} className="rounded bg-sky-500 px-3 py-1 text-xs font-bold text-white">
              블록 선언 ({Object.keys(blocks).length})
            </button>
            <button onClick={() => doDeclareBlock([])} className="rounded bg-slate-700 px-3 py-1 text-xs text-slate-200">
              블록 없이 진행
            </button>
          </>
        ) : null}
        {isAction ? (
          <button onClick={() => doPass()} disabled={busy} className="rounded bg-slate-700 px-3 py-1 text-xs text-slate-200 disabled:opacity-50">
            패스
          </button>
        ) : null}
        <span className="text-xs text-slate-500">
          라운드 {vm.round} · {phaseLabel(vm.phase, isMulligan, vm.priorityIsMine)} · 스택 {vm.stackCount}
          {busy ? ' · ⏳ 전송 중…' : ''}
        </span>
      </div>

      {isBlock ? (
        <div className="text-xs text-amber-300">
          블록: 상대 공격 유닛(빨강) 클릭 → 내 유닛 클릭으로 배정. {armed ? '· 공격자 선택됨, 내 유닛을 고르세요' : ''}
        </div>
      ) : null}

      <div className="text-xs text-slate-400">
        내 손패 ({vm.myHand.length}){canAttack ? ' · 내 유닛 클릭=공격 선택' : isAction ? ' — 카드 클릭 = 소환' : ''}
      </div>
      <Row>
        {vm.myHand.map((c) => (
          <HandCard
            key={c.instanceId}
            card={c}
            playable={isAction && !busy && (c.cost ?? 0) <= vm.me.mana}
            pending={pendingCardIds.has(c.instanceId)}
          />
        ))}
      </Row>
    </div>
  )
}

function phaseLabel(phase: number, isMulligan: boolean, mine: boolean): string {
  if (isMulligan) return '멀리건'
  if (phase === GamePhase.PHASE_COMBAT_DECLARE_BLOCK) return '블록 선언'
  if (phase === GamePhase.PHASE_COMBAT_DECLARE_ATTACK) return '공격 선언'
  if (phase === GamePhase.PHASE_GAME_OVER) return '게임 종료'
  return mine ? '내 차례' : '상대 차례'
}

export default function PlayPage() {
  return (
    <CardMetadataProvider>
      <Suspense fallback={<Center>로딩…</Center>}>
        <Board />
      </Suspense>
    </CardMetadataProvider>
  )
}
