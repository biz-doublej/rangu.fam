'use client'

import React, { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Swords, ShieldHalf, Hand, SkipForward, Sparkles, RotateCcw, X } from 'lucide-react'
import { CardTile } from './CardTile'
import { HUMAN, AI } from './useBattle'
import { canBlockLocal } from '@/lib/battle/bot'
import type { BattleAction, BattleUnit, GameState } from '@/lib/battle/types'

interface Props {
  state: GameState
  error: string | null
  act: (a: BattleAction) => void
  onExit: () => void
}

function ManaPips({ mana, max, spell }: { mana: number; max: number; spell: number }) {
  return (
    <div className="flex items-center gap-1.5">
      <div className="flex gap-0.5">
        {Array.from({ length: Math.max(max, 0) }).map((_, i) => (
          <span key={i} className={`h-2.5 w-2.5 rounded-full ${i < mana ? 'bg-sky-400' : 'bg-sky-900/60'}`} />
        ))}
      </div>
      {spell > 0 && (
        <span className="flex items-center gap-0.5 text-[11px] font-bold text-fuchsia-300" title="스펠 마나">
          {Array.from({ length: spell }).map((_, i) => (
            <span key={i} className="h-2 w-2 rounded-full bg-fuchsia-400" />
          ))}
        </span>
      )}
    </div>
  )
}

function NexusBar({ name, hp, token }: { name: string; hp: number; token: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-sm font-bold text-white/90">{name}</span>
      {token && <span title="공격 토큰" className="text-sm">🗡️</span>}
      <span className="flex items-center gap-1 rounded-full bg-rose-500/20 px-2 py-0.5 text-sm font-extrabold text-rose-200">
        ❤ {Math.max(0, hp)}
      </span>
    </div>
  )
}

function eventText(type: string, actor: string, detail?: Record<string, unknown>): string | null {
  const who = actor === 'p1' ? '나' : actor === 'p2' ? '상대' : ''
  switch (type) {
    case 'roundStart': return `── 라운드 ${detail?.round} ──`
    case 'playUnit': return `${who}: 유닛 소환`
    case 'playSpell': return `${who}: 주문 시전`
    case 'declareAttack': return `${who}: 공격 선언!`
    case 'declareBlock': return `${who}: 블록`
    case 'combatResolved': return `전투 해결`
    case 'spellResolved': return `주문 발동`
    case 'gameOver': return `게임 종료`
    default: return null
  }
}

export function BattleBoard({ state, error, act, onExit }: Props) {
  const me = state.players[HUMAN]
  const opp = state.players[AI]
  const { phase, round, priority, activePlayer, combat, stack } = state

  const [mode, setMode] = useState<'idle' | 'attack' | 'target'>('idle')
  const [attackers, setAttackers] = useState<string[]>([])
  const [pendingSpell, setPendingSpell] = useState<string | null>(null)
  const [blockPairs, setBlockPairs] = useState<Record<string, string>>({})
  const [blockSel, setBlockSel] = useState<string | null>(null)
  const [mulligan, setMulligan] = useState<string[]>([])

  // 상황이 바뀌면 모든 임시 선택 초기화
  useEffect(() => {
    setMode('idle'); setAttackers([]); setPendingSpell(null)
    setBlockPairs({}); setBlockSel(null); setMulligan([])
  }, [phase, round, combat?.blocksDeclared])

  const finished = phase === 'finished'
  const myActionTurn = phase === 'action' && priority === HUMAN
  const iDefendPreBlock = phase === 'declareBlock' && !!combat && !combat.blocksDeclared && activePlayer === AI
  const responseWindow = phase === 'declareBlock' && !!combat?.blocksDeclared && priority === HUMAN
  const mulliganPhase = phase === 'mulligan' && !me.mulliganDone

  const canAttack = myActionTurn && me.hasAttackToken && !state.attackDeclaredThisRound && stack.length === 0
  const eligible = canAttack
    ? me.board.filter((u) => !u.hasAttacked && !u.isStunned && u.summonedRound < round && u.power > 0).map((u) => u.instanceId)
    : []

  const affordable = (c: { kind: string; cost: number }) =>
    c.kind === 'spell' ? c.cost <= me.mana + me.spellMana : c.cost <= me.mana

  // ── 핸드 카드 클릭 ──
  function clickHand(instanceId: string) {
    const card = me.hand.find((c) => c.instanceId === instanceId)
    if (!card) return
    if (mulliganPhase) {
      setMulligan((s) => (s.includes(instanceId) ? s.filter((x) => x !== instanceId) : [...s, instanceId]))
      return
    }
    if (!affordable(card)) return
    if (card.kind === 'unit') {
      if (!myActionTurn || stack.length > 0 || me.board.length >= 6) return
      act({ type: 'playUnit', instanceId })
    } else if (card.spell) {
      const canCast = (myActionTurn && stack.length === 0) || (responseWindow && card.spell.speed !== 'slow')
      if (!canCast) return
      if (card.spell.needsTarget) {
        setPendingSpell(instanceId)
        setMode('target')
      } else {
        act({ type: 'playSpell', instanceId })
      }
    }
  }

  // ── 보드 유닛 클릭 ──
  function clickMyUnit(u: BattleUnit) {
    if (mode === 'attack') {
      if (!eligible.includes(u.instanceId)) return
      setAttackers((s) => (s.includes(u.instanceId) ? s.filter((x) => x !== u.instanceId) : [...s, u.instanceId]))
    } else if (mode === 'target' && pendingSpell) {
      castAtTarget(u.instanceId)
    } else if (iDefendPreBlock && blockSel) {
      const atk = opp.board.find((a) => a.instanceId === blockSel)
      if (atk && canBlockLocal(atk, u) && !Object.values(blockPairs).includes(u.instanceId)) {
        setBlockPairs((p) => ({ ...p, [blockSel]: u.instanceId }))
        setBlockSel(null)
      }
    }
  }

  function clickOppUnit(u: BattleUnit) {
    if (mode === 'target' && pendingSpell) {
      castAtTarget(u.instanceId)
    } else if (iDefendPreBlock) {
      // 공격자 선택 토글 (이미 배정돼 있으면 해제)
      if (blockPairs[u.instanceId]) {
        setBlockPairs((p) => {
          const n = { ...p }
          delete n[u.instanceId]
          return n
        })
        return
      }
      setBlockSel((s) => (s === u.instanceId ? null : u.instanceId))
    }
  }

  function castAtTarget(targetId: string) {
    if (!pendingSpell) return
    act({ type: 'playSpell', instanceId: pendingSpell, targets: [{ type: 'unit', instanceId: targetId }] })
    setPendingSpell(null)
    setMode('idle')
  }

  const result =
    finished && (state.winner === HUMAN ? '승리' : state.winner === null ? '무승부' : '패배')

  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-b from-[#16172e] to-[#0c0d1c] p-3 text-white shadow-2xl sm:p-4">
      {/* 상단 상태바 */}
      <div className="mb-2 flex items-center justify-between gap-2 text-xs text-white/70">
        <span className="rounded-full bg-white/10 px-2 py-0.5 font-bold">라운드 {round || '-'}</span>
        <span className="rounded-full bg-white/10 px-2 py-0.5">
          {finished ? '종료' : phase === 'mulligan' ? '멀리건' : phase === 'declareBlock' ? '전투' : '액션'}
          {!finished && (priority === HUMAN ? ' · 내 차례' : ' · 상대 차례')}
        </span>
        <button onClick={onExit} className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2 py-0.5 hover:bg-white/20">
          <X className="h-3 w-3" /> 나가기
        </button>
      </div>

      {/* 상대 */}
      <div className="rounded-xl bg-black/20 p-2">
        <div className="mb-1.5 flex items-center justify-between">
          <NexusBar name="상대 (AI)" hp={opp.nexusHealth} token={opp.hasAttackToken} />
          <div className="flex items-center gap-2 text-[11px] text-white/50">
            <span>🂠 {state.players[AI].hand.length}</span>
            <ManaPips mana={opp.mana} max={opp.maxMana} spell={opp.spellMana} />
          </div>
        </div>
        <BoardRow
          units={opp.board}
          empty="상대 유닛 없음"
          onUnit={clickOppUnit}
          highlight={(u) =>
            (mode === 'target' && !!pendingSpell) ||
            (iDefendPreBlock && (combat?.attackers.includes(u.instanceId) ?? false))
          }
          selectedId={blockSel}
          attackingIds={combat?.attackers ?? []}
        />
      </div>

      {/* 중앙 — 전투/안내 */}
      <div className="my-2 flex min-h-[28px] items-center justify-center text-center text-xs font-semibold text-amber-200/90">
        {iDefendPreBlock && '🛡️ 상대가 공격했습니다 — 막을 유닛을 배정하세요'}
        {responseWindow && '⚔️ 전투 직전 — 순간 주문을 쓰거나 「전투 진행」'}
        {mode === 'target' && '🎯 주문 대상을 선택하세요'}
        {mode === 'attack' && '🗡️ 공격할 유닛을 선택하세요'}
        {!iDefendPreBlock && !responseWindow && mode === 'idle' && stack.length > 0 && '✨ 주문 스택 대기 중'}
      </div>

      {/* 나 */}
      <div className="rounded-xl bg-black/20 p-2">
        <BoardRow
          units={me.board}
          empty="내 유닛 없음 — 손패에서 소환하세요"
          onUnit={clickMyUnit}
          highlight={(u) =>
            (mode === 'attack' && eligible.includes(u.instanceId)) ||
            (mode === 'target' && !!pendingSpell) ||
            (iDefendPreBlock && !!blockSel && (() => {
              const atk = opp.board.find((a) => a.instanceId === blockSel)
              return !!atk && canBlockLocal(atk, u) && !Object.values(blockPairs).includes(u.instanceId)
            })())
          }
          selectedIds={mode === 'attack' ? attackers : Object.values(blockPairs)}
        />
        <div className="mt-1.5 flex items-center justify-between">
          <NexusBar name="나" hp={me.nexusHealth} token={me.hasAttackToken} />
          <ManaPips mana={me.mana} max={me.maxMana} spell={me.spellMana} />
        </div>
      </div>

      {/* 블록 배정 요약 */}
      {iDefendPreBlock && Object.keys(blockPairs).length > 0 && (
        <div className="mt-2 rounded-lg bg-white/5 p-2 text-[11px] text-white/70">
          {Object.entries(blockPairs).map(([aId, bId]) => {
            const a = opp.board.find((u) => u.instanceId === aId)
            const b = me.board.find((u) => u.instanceId === bId)
            return <div key={aId}>🛡️ {b?.name} 가 {a?.name} 막기</div>
          })}
        </div>
      )}

      {/* 손패 */}
      <div className="mt-3">
        <div className="mb-1 flex items-center gap-1 text-[11px] text-white/50">
          <Hand className="h-3 w-3" /> 내 손패 ({me.hand.length})
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {me.hand.length === 0 && <span className="py-6 text-xs text-white/40">손패 없음</span>}
          {me.hand.map((c) => {
            const playableNow =
              mulliganPhase ||
              (affordable(c) &&
                (c.kind === 'unit'
                  ? myActionTurn && stack.length === 0 && me.board.length < 6
                  : (myActionTurn && stack.length === 0) || (responseWindow && c.spell?.speed !== 'slow')))
            return (
              <CardTile
                key={c.instanceId}
                size="hand"
                name={c.name}
                member={c.member}
                kind={c.kind}
                cost={c.cost}
                power={c.unit?.power}
                health={c.unit?.health}
                maxHealth={c.unit?.health}
                keywords={c.unit?.keywords}
                isChampion={c.unit?.isChampion}
                spellSpeed={c.spell?.speed}
                selected={pendingSpell === c.instanceId || mulligan.includes(c.instanceId)}
                dimmed={!playableNow}
                onClick={() => clickHand(c.instanceId)}
              />
            )
          })}
        </div>
      </div>

      {/* 액션 바 */}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {error && <span className="rounded bg-rose-500/20 px-2 py-1 text-[11px] text-rose-200">{error}</span>}

        {mulliganPhase && (
          <ActionBtn onClick={() => act({ type: 'mulligan', replace: mulligan })} primary>
            <RotateCcw className="h-4 w-4" /> 멀리건 확정 ({mulligan.length}장 교체)
          </ActionBtn>
        )}

        {myActionTurn && mode === 'idle' && (
          <>
            {canAttack && eligible.length > 0 && (
              <ActionBtn onClick={() => setMode('attack')} primary>
                <Swords className="h-4 w-4" /> 공격
              </ActionBtn>
            )}
            <ActionBtn onClick={() => act({ type: 'pass' })}>
              <SkipForward className="h-4 w-4" /> 패스
            </ActionBtn>
          </>
        )}

        {mode === 'attack' && (
          <>
            <ActionBtn onClick={() => act({ type: 'declareAttack', attackers })} primary disabled={attackers.length === 0}>
              <Swords className="h-4 w-4" /> 공격 확정 ({attackers.length})
            </ActionBtn>
            <ActionBtn onClick={() => { setMode('idle'); setAttackers([]) }}>취소</ActionBtn>
          </>
        )}

        {mode === 'target' && (
          <ActionBtn onClick={() => { setMode('idle'); setPendingSpell(null) }}>주문 취소</ActionBtn>
        )}

        {iDefendPreBlock && (
          <>
            <ActionBtn onClick={() => act({ type: 'declareBlock', blocks: blockPairs })} primary>
              <ShieldHalf className="h-4 w-4" /> 블록 확정 ({Object.keys(blockPairs).length})
            </ActionBtn>
            <ActionBtn onClick={() => act({ type: 'declareBlock', blocks: {} })}>막지 않기</ActionBtn>
          </>
        )}

        {responseWindow && (
          <ActionBtn onClick={() => act({ type: 'pass' })} primary>
            <Swords className="h-4 w-4" /> 전투 진행
          </ActionBtn>
        )}
      </div>

      {/* 로그 */}
      <div className="mt-3 max-h-20 overflow-y-auto rounded-lg bg-black/30 p-2 text-[10px] leading-relaxed text-white/45">
        {state.log
          .slice(-8)
          .map((e, i) => {
            const t = eventText(e.type, e.actor, e.detail)
            return t ? <div key={i}>{t}</div> : null
          })
          .filter(Boolean)}
      </div>

      {/* 승패 오버레이 */}
      <AnimatePresence>
        {finished && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-4 bg-black/80 backdrop-blur-sm"
          >
            <Sparkles className="h-10 w-10 text-amber-300" />
            <p className="text-4xl font-black text-white">{result}</p>
            <p className="text-sm text-white/60">
              본진 {me.nexusHealth} : {opp.nexusHealth} · {round}라운드
            </p>
            <button
              onClick={onExit}
              className="rounded-full bg-amber-400 px-6 py-2 font-bold text-black hover:bg-amber-300"
            >
              다시 하기
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function BoardRow({
  units, empty, onUnit, highlight, selectedId, selectedIds, attackingIds,
}: {
  units: BattleUnit[]
  empty: string
  onUnit: (u: BattleUnit) => void
  highlight: (u: BattleUnit) => boolean
  selectedId?: string | null
  selectedIds?: string[]
  attackingIds?: string[]
}) {
  return (
    <div className="flex min-h-[100px] items-center gap-2 overflow-x-auto">
      {units.length === 0 && <span className="px-2 text-xs text-white/30">{empty}</span>}
      {units.map((u) => (
        <CardTile
          key={u.instanceId}
          size="board"
          name={u.name}
          member={u.member}
          kind="unit"
          power={u.power}
          health={u.health}
          maxHealth={u.maxHealth}
          keywords={u.keywords}
          isChampion={u.isChampion}
          championLevel={u.championLevel}
          stunned={u.isStunned}
          attacking={attackingIds?.includes(u.instanceId)}
          selected={selectedId === u.instanceId || (selectedIds?.includes(u.instanceId) ?? false) || highlight(u)}
          onClick={() => onUnit(u)}
        />
      ))}
    </div>
  )
}

function ActionBtn({
  children, onClick, primary, disabled,
}: {
  children: React.ReactNode
  onClick: () => void
  primary?: boolean
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={[
        'inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-bold transition',
        disabled ? 'cursor-not-allowed opacity-40' : '',
        primary ? 'bg-amber-400 text-black hover:bg-amber-300' : 'bg-white/10 text-white hover:bg-white/20',
      ].join(' ')}
    >
      {children}
    </button>
  )
}
