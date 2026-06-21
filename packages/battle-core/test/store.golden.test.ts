import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import { ServerMessage, GamePhase, Zone } from '@rangu/proto-ts'
import { createBattleStore } from '../src/battleStore'
import { attachMessageMapper, type SocketLike } from '../src/messageMapper'

const here = dirname(fileURLToPath(import.meta.url))
// 실제 서버가 라이브 E2E 에서 쏜 ServerMessage 바이너리 (golden fixture).
const bin = new Uint8Array(readFileSync(resolve(here, 'fixtures/server-snapshot.bin')))

describe('battleStore: golden 스냅샷 적용', () => {
  it('apply(snapshot) → store.snapshot 이 의도한 UI 투영(마스킹 유지 + 내 유닛 배치)', () => {
    const store = createBattleStore()
    store.getState().apply(ServerMessage.decode(bin))

    const snap = store.getState().snapshot
    expect(snap).toBeDefined()
    expect(snap!.phase).toBe(GamePhase.PHASE_ACTION)
    expect(snap!.roundNumber).toBe(1)

    // 🔒 상대(seat1) 손패는 hidden, 내(seat0) 손패는 revealed
    const oppHand = snap!.cards.filter((c) => c.controller?.seat === 1 && c.zone === Zone.ZONE_HAND)
    expect(oppHand.length).toBeGreaterThan(0)
    expect(oppHand.every((c) => c.hidden !== undefined && c.revealed === undefined)).toBe(true)
    expect(snap!.cards.some((c) => c.controller?.seat === 0 && c.zone === Zone.ZONE_HAND && c.revealed)).toBe(true)

    // 내 유닛이 보드에 배치됨
    expect(snap!.cards.some((c) => c.controller?.seat === 0 && c.zone === Zone.ZONE_BATTLEFIELD && c.revealed)).toBe(true)
  })
})

describe('battleStore: 낙관적 pendingIntents', () => {
  it('track → IntentAck → acked', () => {
    const store = createBattleStore()
    store.getState().trackIntent('p1', 'playCard')
    expect(store.getState().pendingIntents['p1'].status).toBe('pending')

    store.getState().apply(ServerMessage.fromPartial({ event: { intentAck: { clientIntentId: 'p1' } } }))
    expect(store.getState().pendingIntents['p1'].status).toBe('acked')
  })

  it('track → IntentRejected → rejected(+detail)', () => {
    const store = createBattleStore()
    store.getState().trackIntent('p2', 'playCard')
    store.getState().apply(
      ServerMessage.fromPartial({ event: { intentRejected: { clientIntentId: 'p2', detail: 'insufficient_mana' } } }),
    )
    const pi = store.getState().pendingIntents['p2']
    expect(pi.status).toBe('rejected')
    expect(pi.detail).toBe('insufficient_mana')
  })
})

describe('MessageMapper: WS 바이너리 → 스토어', () => {
  it('모의 소켓의 message 이벤트가 디코드되어 apply 됨', () => {
    const store = createBattleStore()
    let listener: ((ev: { data: unknown }) => void) | undefined
    const socket: SocketLike = {
      binaryType: '',
      addEventListener: (_t, cb) => { listener = cb },
    }
    attachMessageMapper(socket, store)
    expect(socket.binaryType).toBe('arraybuffer')

    // 서버가 ArrayBuffer 로 바이너리 프레임을 보냈다고 가정
    listener!({ data: bin.buffer.slice(bin.byteOffset, bin.byteOffset + bin.byteLength) })

    expect(store.getState().snapshot?.phase).toBe(GamePhase.PHASE_ACTION)
    expect(store.getState().connected).toBe(false) // snapshot 메시지(connectAccepted 아님)
  })
})
