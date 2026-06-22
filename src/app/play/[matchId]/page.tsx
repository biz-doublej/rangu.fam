'use client'

import { Suspense, useEffect, useState, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react'
import { useSearchParams } from 'next/navigation'
import { AnimatePresence, motion, useAnimation } from 'framer-motion'
import { ConnectMode, GamePhase } from '@rangu/proto-ts'
import { selectBattle, type CardVM, type CastTarget, type StackVM } from '@rangu/battle-core'
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
import { useAutoPilot } from '@/lib/tactics/useAutoPilot'
import { useCombatFx } from '@/lib/tactics/useCombatFx'
import { CombatFxOverlay } from '@/lib/tactics/CombatFxOverlay'
import { useCombatSound } from '@/lib/tactics/useCombatSound'
import { soundManager } from '@/lib/tactics/soundManager'
import { useDragTargeting, type DropTarget } from '@/lib/tactics/useDragTargeting'
import { TargetingArrow } from '@/lib/tactics/TargetingArrow'
import { CardMetadataProvider, useCardMeta, spellNeedsTarget } from '@/lib/tactics/CardMetadataProvider'

function Row({ children, drop }: { children: ReactNode; drop?: string }) {
  return <div data-drop={drop} className="flex min-h-[7rem] flex-wrap items-center gap-2">{children}</div>
}
function Center({ children }: { children: ReactNode }) {
  return <div className="flex h-screen items-center justify-center text-slate-300">{children}</div>
}

/** 사운드 on/off 토글 — 첫 클릭이 유저 제스처가 되어 오디오/BGM 활성(자동재생 정책). */
function SoundToggle() {
  const [on, setOn] = useState(false)
  return (
    <button
      type="button"
      onClick={() => {
        const next = !on
        soundManager.setEnabled(next)
        setOn(next)
      }}
      title={on ? '사운드 끄기' : '사운드 켜기'}
      className="rounded bg-slate-700 px-2 py-1 text-xs text-slate-200 hover:bg-slate-600"
    >
      {on ? '🔊' : '🔇'}
    </button>
  )
}

/**
 * 보드 한 칸을 framer-motion 으로 감싸 두 가지 타격감을 부여:
 *  - hit=true  → 히트스톱(0.1s 홀드)+쉐이크 (피격)
 *  - exit      → 사망 시 스냅샷이 DOM 을 제거하기 전 0.3s 페이드아웃 (AnimatePresence)
 */
function FxSlot({
  card,
  hit,
  selected,
  attacking,
  onClick,
  onPointerDown,
}: {
  card: CardVM
  hit: boolean
  selected?: boolean
  attacking?: boolean
  onClick?: () => void
  onPointerDown?: (e: ReactPointerEvent<HTMLDivElement>) => void
}) {
  return (
    <motion.div
      className="touch-none"
      onPointerDown={onPointerDown}
      animate={hit ? { x: [0, 0, -6, 6, -4, 3, 0], scale: [1, 1.18, 1.18, 1.1, 1.04, 1, 1] } : { x: 0, scale: 1 }}
      // 히트스톱: 0~0.05s 펀치 → 0.05s 홀드(정지) → 흔들림이 스케일 복귀와 겹치며 0.35s 로 타이트하게
      transition={hit ? { duration: 0.35, times: [0, 0.14, 0.28, 0.45, 0.62, 0.82, 1], ease: 'easeOut' } : { duration: 0.15 }}
      // exit: 자체 transition 0.3s 고정 + scale/rotate 로 "힘없이 쓰러지는" 잔상
      exit={{ opacity: 0, scale: 0.8, rotate: 5, filter: 'blur(2px)', transition: { duration: 0.3 } }}
    >
      <CardSlot card={card} selected={selected} attacking={attacking} onClick={onClick} />
    </motion.div>
  )
}

/**
 * 손패 카드 드래그 분기 (메타로 판별):
 *  - 단일 타겟 주문 → 포인터 타겟팅(보라 화살표) — 유닛/넥서스에 드롭 시 시전(카드 자체는 안 움직임)
 *  - 유닛 / 비타겟(AoE·자가) 주문 → framer drag → 보드 드롭 시 소환/시전(타겟 없음). 탭 폴백.
 */
function HandCard({
  card,
  playable,
  pending,
  startSpellTarget,
}: {
  card: CardVM
  playable: boolean
  pending: boolean
  startSpellTarget: (cardInstanceId: string, originEl: HTMLElement) => void
}) {
  const meta = useCardMeta(card.definitionId)
  const cast = (targets: CastTarget[] = []) => doPlayCard(card.instanceId, targets)

  // 단일 타겟 주문 → 보라 화살표 타겟팅(드롭 = 시전)
  if (playable && spellNeedsTarget(meta)) {
    return (
      <div className="cursor-crosshair touch-none" onPointerDown={(e) => startSpellTarget(card.instanceId, e.currentTarget)}>
        <CardTile card={card} name={meta?.name} pending={pending} />
      </div>
    )
  }

  // 유닛 / 비타겟 주문 → framer 카드 드래그(보드 드롭 = 소환/시전)
  return (
    <motion.div
      drag={playable}
      dragSnapToOrigin
      whileDrag={{ scale: 1.1, zIndex: 50 }}
      className={playable ? 'cursor-grab touch-none active:cursor-grabbing' : undefined}
      onDragEnd={(e, info) => {
        // 뷰포트 좌표(getBoundingClientRect 와 동일계) — info.point 는 스크롤/버전에 모호하므로 네이티브 우선
        const p =
          'clientX' in e
            ? { x: e.clientX, y: e.clientY }
            : e.changedTouches?.[0]
              ? { x: e.changedTouches[0].clientX, y: e.changedTouches[0].clientY }
              : info.point
        const zone = document.querySelector('[data-drop="my-board"]')?.getBoundingClientRect()
        if (zone && p.x >= zone.left && p.x <= zone.right && p.y >= zone.top && p.y <= zone.bottom) cast()
      }}
    >
      <CardTile card={card} name={meta?.name} pending={pending} onClick={playable ? () => cast() : undefined} />
    </motion.div>
  )
}

/** 중앙 "주문 체인"(스택) — 스냅샷 구동. 상단(마지막)이 먼저 해결(LIFO). */
function StackChip({ item }: { item: StackVM }) {
  const meta = useCardMeta(item.definitionId)
  return (
    <div className="rounded bg-violet-800/60 px-2 py-1 text-[11px] text-violet-100">
      ✨ {meta?.name ?? item.definitionId ?? '주문'}
      {item.targetInstanceIds.length ? ` → ${item.targetInstanceIds.join(', ')}` : ''}
    </div>
  )
}
function StackChain({ stack }: { stack: StackVM[] }) {
  return (
    <div className="rounded-lg border border-violet-500/40 bg-violet-950/30 p-2">
      <div className="text-[10px] font-bold uppercase tracking-wide text-violet-300">주문 체인 · 스택 LIFO ({stack.length})</div>
      <div className="mt-1 flex flex-wrap gap-2">
        {stack.map((s) => (
          <StackChip key={s.stackId} item={s} />
        ))}
      </div>
    </div>
  )
}

/**
 * 게임 종료 결과 오버레이 — gameOver 슬라이스 감지 시 암전 + 승/패 텍스트.
 * 진입 delay(~0.45s)로 치명타 히트스톱/쉐이크/피격 수치가 먼저 재생된 뒤 떠오른다.
 */
function GameOverOverlay() {
  const gameOver = useBattle((s) => s.gameOver)
  const text = gameOver?.result === 'win' ? '승 리' : gameOver?.result === 'loss' ? '패 배' : '무승부'
  const color =
    gameOver?.result === 'win' ? 'text-amber-300' : gameOver?.result === 'loss' ? 'text-rose-400' : 'text-slate-300'
  return (
    <AnimatePresence>
      {gameOver ? (
        <motion.div
          key="gameover"
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/75 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4, delay: 0.45 }}
        >
          <motion.div
            className="text-center"
            initial={{ scale: 0.5, y: 28, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 240, damping: 16, delay: 0.6 }}
          >
            <div className={`text-7xl font-black tracking-widest drop-shadow-[0_2px_14px_rgba(0,0,0,0.7)] ${color}`}>{text}</div>
            <div className="mt-3 text-xs uppercase tracking-[0.3em] text-slate-400">
              {gameOver?.reason === 'nexus_destroyed' ? '넥서스 파괴' : (gameOver?.reason ?? '게임 종료')}
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}

// 전장(Board) — 연결/로비는 PlayRoot 가 관리. 스냅샷 존재 시에만 렌더된다(snapshot 보장).
function Board({ auto }: { auto: boolean }) {
  useAutoPilot(auto)

  const snapshot = useBattle((s) => s.snapshot)
  const pendingIntents = useBattle((s) => s.pendingIntents)
  const gameOver = useBattle((s) => s.gameOver)

  // 전투 선택(로컬 UI 상태 — 서버 정본과 분리)
  const [attackSel, setAttackSel] = useState<Set<string>>(new Set())
  const [blocks, setBlocks] = useState<Record<string, string>>({}) // attacker → blocker
  const targeting = useDragTargeting() // 내 유닛→적 드래그(화살표): 공격/블록 타겟팅

  // 전투 사운드: combatFx → SFX(damage/death/nexus). BGM 은 SoundToggle 로 활성.
  useCombatSound()
  useEffect(() => () => soundManager.stopBgm(), []) // 페이지 이탈 시 BGM 정지

  // 전투 VFX: combatFx 드레인(피해수치/스프라이트/카드히트/카메라쉐이크 신호)
  const fx = useCombatFx()
  const camera = useAnimation()
  useEffect(() => {
    if (fx.shakeNonce > 0) {
      camera.start({ x: [0, -8, 8, -5, 5, -2, 0], transition: { duration: 0.34, ease: 'easeOut' } })
    }
  }, [fx.shakeNonce, camera])

  const mySeat = snapshot?.viewer?.seat ?? 0
  const vm = selectBattle(snapshot, mySeat)

  if (!vm) return <Center>상태 수신 대기…</Center>

  const pendingCardIds = new Set(
    Object.values(pendingIntents)
      .filter((p) => p.status === 'pending' && p.cardInstanceId)
      .map((p) => p.cardInstanceId as string),
  )
  const busy = Object.values(pendingIntents).some((p) => p.status === 'pending')

  const attackerIds = new Set(vm.combat.pairs.map((p) => p.attackerInstanceId))
  const oppSeat = mySeat === 0 ? 1 : 0
  const iAmAttacker = vm.combat.attackerSeat === mySeat
  // 게임 종료 시 모든 입력 차단(이벤트가 스냅샷보다 먼저 올 수 있어 phase + 슬라이스 둘 다 체크)
  const over = vm.phase === GamePhase.PHASE_GAME_OVER || !!gameOver
  const isAction = !over && vm.phase === GamePhase.PHASE_ACTION && vm.priorityIsMine
  const canAttack = isAction && vm.me.hasAttackToken && !busy
  const isBlock = !over && vm.phase === GamePhase.PHASE_COMBAT_DECLARE_BLOCK && !iAmAttacker && vm.priorityIsMine && !busy
  const isMulligan = vm.phase === GamePhase.PHASE_MULLIGAN
  const blockedUnitIds = new Set(Object.values(blocks))

  // 탭(클릭) = 공격자 토글(드래그는 화살표). 블록은 드래그 전용.
  const toggleAttacker = (c: CardVM) => {
    if (!(canAttack && !c.exhausted)) return
    setAttackSel((prev) => {
      const n = new Set(prev)
      n.has(c.instanceId) ? n.delete(c.instanceId) : n.add(c.instanceId)
      return n
    })
  }
  const submitAttack = () => {
    doDeclareAttack([...attackSel])
    setAttackSel(new Set())
  }
  const submitBlock = () => {
    doDeclareBlock(Object.entries(blocks).map(([a, b]) => ({ attackerInstanceId: a, blockerInstanceId: b })))
    setBlocks({})
  }

  // 내 유닛을 적에게 드래그 → 페이즈가 해소를 결정(공격: attackSel 누적 / 블록: blocks 배정)
  const onDropTarget = (sourceId: string, t: DropTarget | null) => {
    if (!t || t.instanceId === sourceId) return
    if (canAttack) {
      const enemyHit =
        (t.kind === 'nexus' && t.seat === oppSeat) ||
        (t.kind === 'unit' && vm.opponent.board.some((u) => u.instanceId === t.instanceId))
      if (enemyHit) setAttackSel((prev) => new Set(prev).add(sourceId))
    } else if (isBlock && t.kind === 'unit' && attackerIds.has(t.instanceId as string)) {
      setBlocks((prev) => ({ ...prev, [t.instanceId as string]: sourceId }))
    }
  }
  const canDragUnit = (c: CardVM) => (canAttack && !c.exhausted) || isBlock
  const startTarget = (c: CardVM) => (e: ReactPointerEvent<HTMLDivElement>) =>
    targeting.start(e.currentTarget, (t) => onDropTarget(c.instanceId, t))

  // 단일 타겟 주문: 손패 카드에서 시작 → 유닛/넥서스에 드롭 시 타겟과 함께 시전(보라 화살표)
  const startSpellTarget = (cardInstanceId: string, originEl: HTMLElement) =>
    targeting.start(
      originEl,
      (t) => {
        if (t) doPlayCard(cardInstanceId, [t.kind === 'unit' ? { cardInstanceId: t.instanceId as string } : { nexusSeat: t.seat }])
      },
      'spell',
    )

  return (
    <>
      <CombatFxOverlay floats={fx.floats} sprites={fx.sprites} />
      <TargetingArrow arrow={targeting.arrow} variant={targeting.variant} />
      <GameOverOverlay />
      <div className="mx-auto flex max-w-3xl flex-col gap-4 bg-slate-900 p-6">
        <div className="text-xs text-slate-400">상대 손패 ({vm.opponent.handCount}) — 🔒 마스킹(뒷면)</div>
        <Row>
          {vm.opponentHand.map((c) => <CardSlot key={c.instanceId} card={c} />)}
          {vm.opponentHand.length === 0 ? <span className="text-xs text-slate-600">— 상대 손패 없음 —</span> : null}
        </Row>

        {/* 카메라 쉐이크는 전투 보드(넥서스+보드)에만 — 컨트롤/손패/텍스트는 흔들지 않음 */}
        <motion.div animate={camera} className="flex flex-col gap-4">
          <NexusBar side={vm.opponent} label="상대" />
          <Row>
            <AnimatePresence>
              {vm.opponent.board.map((c) => (
                <FxSlot
                  key={c.instanceId}
                  card={c}
                  hit={fx.hitIds.has(c.instanceId)}
                  attacking={attackerIds.has(c.instanceId)}
                />
              ))}
            </AnimatePresence>
            {vm.opponent.board.length === 0 ? <span className="text-xs text-slate-600">— 상대 보드 비어있음 —</span> : null}
          </Row>

          <div className="h-px bg-slate-700" />
          {vm.stack.length > 0 ? <StackChain stack={vm.stack} /> : null}

          <Row drop="my-board">
            <AnimatePresence>
              {vm.me.board.map((c) => (
                <FxSlot
                  key={c.instanceId}
                  card={c}
                  hit={fx.hitIds.has(c.instanceId)}
                  attacking={attackerIds.has(c.instanceId)}
                  selected={attackSel.has(c.instanceId) || blockedUnitIds.has(c.instanceId)}
                  onClick={canAttack && !c.exhausted ? () => toggleAttacker(c) : undefined}
                  onPointerDown={canDragUnit(c) ? startTarget(c) : undefined}
                />
              ))}
            </AnimatePresence>
            {vm.me.board.length === 0 ? <span className="text-xs text-slate-600">— 내 보드 비어있음 —</span> : null}
          </Row>
          <NexusBar side={vm.me} label="나" />
        </motion.div>

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
          <button onClick={submitBlock} disabled={Object.keys(blocks).length === 0} className="rounded bg-sky-500 px-3 py-1 text-xs font-bold text-white disabled:opacity-40">
            블록 선언 ({Object.keys(blocks).length})
          </button>
        ) : null}
        {isAction || isBlock ? (
          <button onClick={() => doPass()} disabled={busy} className="rounded bg-slate-700 px-3 py-1 text-xs text-slate-200 disabled:opacity-50">
            패스{isBlock ? ' (블록 안 함/진행)' : ''}
          </button>
        ) : null}
        {auto ? (
          <span className="animate-pulse rounded bg-emerald-600 px-2 py-1 text-xs font-bold text-white">🤖 AUTO</span>
        ) : null}
        <SoundToggle />
        <span className="text-xs text-slate-500">
          라운드 {vm.round} · {phaseLabel(vm.phase, isMulligan, vm.priorityIsMine)} · 스택 {vm.stackCount}
          {busy ? ' · ⏳ 전송 중…' : ''}
        </span>
      </div>

      {isBlock ? (
        <div className="text-xs text-sky-300">블록: 내 유닛을 끌어 상대 공격 유닛(빨강)에 놓아 배정하세요.</div>
      ) : null}

      <div className="text-xs text-slate-400">
        내 손패 ({vm.myHand.length}){canAttack ? ' · 내 유닛을 적에게 드래그=공격(또는 탭)' : isAction ? ' — 유닛: 보드로 드래그 소환 · 주문: 대상(보라 화살표) 또는 보드로 드래그 시전' : ''}
      </div>
      <Row>
        {vm.myHand.map((c) => (
          <HandCard
            key={c.instanceId}
            card={c}
            playable={isAction && !busy && (c.cost ?? 0) <= vm.me.mana}
            pending={pendingCardIds.has(c.instanceId)}
            startSpellTarget={startSpellTarget}
          />
        ))}
      </Row>
      </div>
    </>
  )
}

function phaseLabel(phase: number, isMulligan: boolean, mine: boolean): string {
  if (isMulligan) return '멀리건'
  if (phase === GamePhase.PHASE_COMBAT_DECLARE_BLOCK) return '블록 선언'
  if (phase === GamePhase.PHASE_COMBAT_DECLARE_ATTACK) return '공격 선언'
  if (phase === GamePhase.PHASE_GAME_OVER) return '게임 종료'
  return mine ? '내 차례' : '상대 차례'
}

/** 로비 — PvP/PvE 모드 선택(진입 첫 화면). */
function LobbyView({ onSelect }: { onSelect: (mode: ConnectMode) => void }) {
  return (
    <div className="flex h-screen flex-col items-center justify-center gap-7 bg-slate-900 text-slate-200">
      <div className="text-center">
        <p className="text-xs uppercase tracking-[0.4em] text-slate-500">rangu tactics</p>
        <h1 className="mt-1 text-4xl font-black tracking-tight">랑구 택틱스</h1>
      </div>
      <div className="flex flex-col gap-3">
        <button
          onClick={() => onSelect(ConnectMode.CONNECT_MODE_PVP)}
          className="rounded-2xl bg-rose-500 px-10 py-4 text-lg font-bold text-white shadow-lg transition hover:-translate-y-0.5 hover:shadow-rose-500/30"
        >
          ⚔️ PvP 매치 찾기
        </button>
        <button
          onClick={() => onSelect(ConnectMode.CONNECT_MODE_PVE)}
          className="rounded-2xl bg-slate-700 px-10 py-3 text-base font-bold text-slate-200 transition hover:bg-slate-600"
        >
          🤖 PvE 연습 (고스트)
        </button>
      </div>
    </div>
  )
}

/** 매칭 대기 — PvP=상대 검색(스피너+타이머), PvE=즉시 준비. 취소 시 로비 복귀(소켓 종료). */
function MatchingView({ mode, onCancel }: { mode: ConnectMode; onCancel: () => void }) {
  const [secs, setSecs] = useState(0)
  useEffect(() => {
    const t = setInterval(() => setSecs((s) => s + 1), 1000)
    return () => clearInterval(t)
  }, [])
  const pvp = mode === ConnectMode.CONNECT_MODE_PVP
  return (
    <div className="flex h-screen flex-col items-center justify-center gap-5 bg-slate-900 text-slate-200">
      <span className="h-12 w-12 animate-spin rounded-full border-4 border-rose-500/30 border-t-rose-500" />
      <div className="text-center">
        <p className="text-lg font-bold">{pvp ? '상대방을 찾는 중…' : '연습 매치 준비 중…'}</p>
        {pvp ? <p className="mt-1 font-mono text-sm text-slate-400">{secs}s</p> : null}
      </div>
      <button onClick={onCancel} className="rounded-lg bg-slate-700 px-5 py-2 text-sm text-slate-200 hover:bg-slate-600">
        취소
      </button>
    </div>
  )
}

/**
 * /play 루트 — 로비 ↔ 매칭 ↔ 전장 상태 머신.
 * 연결(useGameConnection)은 모드 선택 시에만. ConnectAccepted(스냅샷) 도착 = 전장 자동 전환.
 * 취소(mode→undefined)면 effect cleanup 이 소켓 종료 + store 리셋 → 로비.
 */
function PlayRoot() {
  const search = useSearchParams()
  const ticket = search.get('ticket') ?? ''
  const auto = search.get('auto') === '1'
  const [mode, setMode] = useState<ConnectMode | undefined>(undefined)

  // matchId 는 서버가 배정(PvP=큐, PvE=pve-{userId}) → 빈 문자열 전송.
  useGameConnection({ matchId: '', ticket, mode })
  const snapshot = useBattle((s) => s.snapshot)

  if (!ticket) return <Center>티켓이 필요합니다 — <code className="ml-1">?ticket=…</code></Center>
  if (mode === undefined) return <LobbyView onSelect={setMode} />
  if (!snapshot) return <MatchingView mode={mode} onCancel={() => setMode(undefined)} />
  return <Board auto={auto && mode === ConnectMode.CONNECT_MODE_PVE} />
}

// 실 카탈로그(/export, 덱 빌더의 진짜 카드) 우선 + 데모/고스트 카드(/demo) 보충 병합.
// /export 는 DB 필요(없으면 무시) → 데모 단독 모드도 깨지지 않음.
const META_ENDPOINTS = ['/api/game/metadata/export', '/api/game/metadata/demo']

export default function PlayPage() {
  return (
    <CardMetadataProvider endpoints={META_ENDPOINTS}>
      <Suspense fallback={<Center>로딩…</Center>}>
        <PlayRoot />
      </Suspense>
    </CardMetadataProvider>
  )
}
