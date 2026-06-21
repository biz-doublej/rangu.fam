import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import { ServerMessage, GamePhase } from '@rangu/proto-ts'
import { selectBattle } from '../src/selectors'

const here = dirname(fileURLToPath(import.meta.url))
const bin = new Uint8Array(readFileSync(resolve(here, 'fixtures/server-snapshot.bin')))
const snap = ServerMessage.decode(bin).snapshot

describe('selectBattle: 스냅샷 → UI 뷰모델 (실제 fixture)', () => {
  it('내(seat0) 관점 투영', () => {
    const vm = selectBattle(snap, 0)!
    expect(vm).not.toBeNull()
    expect(vm.phase).toBe(GamePhase.PHASE_ACTION)
    expect(vm.round).toBe(1)
    expect(vm.priorityIsMine).toBe(true)
    expect(vm.me.seat).toBe(0)
    expect(vm.me.mana).toBe(0) // 유닛 소환 후
    expect(vm.opponent.seat).toBe(1)

    // 내 손패는 공개(faceDown=false), 상대 손패 개수만(handCount), 보드엔 내 유닛
    expect(vm.myHand.length).toBeGreaterThan(0)
    expect(vm.myHand.every((c) => !c.faceDown && c.definitionId)).toBe(true)
    expect(vm.me.board.length).toBeGreaterThan(0)
    expect(vm.me.board[0].definitionId).toBeTruthy()
    expect(vm.opponent.handCount).toBeGreaterThan(0)

    // 🔒 상대 손패는 faceDown 카드백으로만 — 정의(definitionId) 누출 없음, 장수는 handCount 와 일치
    expect(vm.opponentHand.length).toBe(vm.opponent.handCount)
    expect(vm.opponentHand.every((c) => c.faceDown && !c.definitionId)).toBe(true)
  })

  it('상대(seat1) 관점에선 내 손패가 faceDown 으로만 보임(대칭 마스킹은 서버가, 셀렉터는 hidden→faceDown)', () => {
    // 같은 스냅샷은 seat0 관점이라 seat1 손패가 hidden. seat1 을 viewer 로 셀렉트하면
    // "그 스냅샷 기준" seat1(=opponent of snapshot viewer)의 손패는 카드뷰에 hidden 으로 들어있음.
    const vm = selectBattle(snap, 1)!
    // 이 스냅샷에서 seat1 손패 카드뷰는 hidden → myHand(=seat1) 는 faceDown
    expect(vm.myHand.every((c) => c.faceDown)).toBe(true)
  })
})
