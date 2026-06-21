'use client'

import { useEffect, useRef } from 'react'
import { GamePhase } from '@rangu/proto-ts'
import { selectBattle } from '@rangu/battle-core'
import { battleStore, doMulligan, doPlayCard, doPass, doDeclareAttack } from './battleClient'

/**
 * 데모 오토파일럿(개발 전용) — 인간 좌석을 자동 운전해 멀티라운드 전투를 반복 발생시킨다.
 * VFX(피격 수치/사망/타격감) 튜닝용: 페이지를 ?auto=1 로 열면 멀리건 → 소환 → (R3+) 공격을 반복 수행.
 *
 * 정책(우선순위): 멀리건(0장) → 공격(공격토큰 보유 + 소환멀미 아닌 유닛) → 소환(여유 마나) → 패스.
 * 소환멀미는 VM에 없으므로 "보드에 처음 보인 라운드"를 기록해 firstSeen < round 로 판정.
 * 재공격 루프 방지: 라운드당 1회만 공격(lastAttack). 진행 중 낙관 전송은 ack 까지 대기.
 *
 * 인간이 공격하면 서버의 스파링 고스트가 블록 → 전투 해결 → DamageDealt/UnitDied 이벤트가
 * combatFx 로 흘러 FloatingNumbers 가 점화된다. (게임오버 시 자동 정지.)
 */
export function useAutoPilot(enabled: boolean, stepMs = 1100): void {
  const seenRef = useRef<Map<string, number>>(new Map())
  const lastAttackRef = useRef(0)

  useEffect(() => {
    if (!enabled) return

    const tick = () => {
      const st = battleStore.getState()
      const snap = st.snapshot
      if (!snap) return
      const mySeat = snap.viewer?.seat ?? 0
      const vm = selectBattle(snap, mySeat)
      if (!vm) return

      // 소환멀미 추적 — 내 보드 유닛이 처음 관측된 라운드 기록(= 사실상 소환 라운드)
      for (const u of vm.me.board) {
        if (!seenRef.current.has(u.instanceId)) seenRef.current.set(u.instanceId, vm.round)
      }

      // 낙관적 전송이 ack 될 때까지 대기(중복 전송 방지)
      if (Object.values(st.pendingIntents).some((p) => p.status === 'pending')) return

      if (vm.phase === GamePhase.PHASE_MULLIGAN) {
        doMulligan([])
        return
      }
      if (!vm.priorityIsMine) return

      if (vm.phase === GamePhase.PHASE_ACTION) {
        // 1) 공격 — 공격토큰 보유 + 이번 라운드 미선언 + 소환멀미 아닌 유닛
        if (vm.me.hasAttackToken && vm.round > lastAttackRef.current && vm.combat.pairs.length === 0) {
          const ready = vm.me.board.filter(
            (u) => !u.exhausted && (seenRef.current.get(u.instanceId) ?? vm.round) < vm.round,
          )
          if (ready.length > 0) {
            doDeclareAttack(ready.map((u) => u.instanceId))
            lastAttackRef.current = vm.round
            return
          }
        }
        // 2) 소환 — 여유 마나로 가장 싼 유닛(보드 여유 시)
        const playable = vm.myHand
          .filter((c) => (c.cost ?? 99) <= vm.me.mana)
          .sort((a, b) => (a.cost ?? 0) - (b.cost ?? 0))[0]
        if (playable && vm.me.board.length < 6) {
          doPlayCard(playable.instanceId)
          return
        }
        // 3) 패스 → 다음 라운드/전투 진행
        doPass()
        return
      }

      // 전투 반응 윈도우(공격자 측) — 추가 대응 없이 패스하면 양측 패스 → 전투 해결
      if (vm.phase === GamePhase.PHASE_COMBAT_DECLARE_BLOCK) {
        doPass()
        return
      }
    }

    const timer = setInterval(tick, stepMs)
    return () => clearInterval(timer)
  }, [enabled, stepMs])
}
