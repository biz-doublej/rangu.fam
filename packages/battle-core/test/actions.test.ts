import { describe, it, expect } from 'vitest'
import { ClientMessage, ServerMessage } from '@rangu/proto-ts'
import { createBattleStore } from '../src/battleStore'
import { playCard, mulligan, pass } from '../src/actions'

function mockSocket() {
  const sent: Uint8Array[] = []
  return { sent, binaryType: '', addEventListener() {}, send(d: Uint8Array) { sent.push(d) } }
}

describe('actions: 낙관적 intent 전송 + reconciliation', () => {
  it('playCard → pending(카드 상관) 등록 + PlayCard ClientMessage 전송', () => {
    const store = createBattleStore()
    const sock = mockSocket()
    const id = playCard(sock, store, 'P1-3')

    const p = store.getState().pendingIntents[id]
    expect(p.status).toBe('pending')
    expect(p.type).toBe('playCard')
    expect(p.cardInstanceId).toBe('P1-3')

    expect(sock.sent.length).toBe(1)
    const cm = ClientMessage.decode(sock.sent[0])
    expect(cm.intent?.clientIntentId).toBe(id)
    expect(cm.intent?.playCard?.cardInstanceId).toBe('P1-3')
  })

  it('mulligan(전부 킵) → 빈 replaceCardInstanceIds', () => {
    const store = createBattleStore()
    const sock = mockSocket()
    const id = mulligan(sock, store)
    const cm = ClientMessage.decode(sock.sent[0])
    expect(cm.intent?.mulligan).toBeDefined()
    expect(cm.intent?.mulligan?.replaceCardInstanceIds ?? []).toEqual([])
    expect(store.getState().pendingIntents[id].type).toBe('mulligan')
  })

  it('pass → PassIntent', () => {
    const store = createBattleStore()
    const sock = mockSocket()
    const id = pass(sock, store)
    const cm = ClientMessage.decode(sock.sent[0])
    expect(cm.intent?.pass).toBeDefined()
    expect(store.getState().pendingIntents[id].type).toBe('pass')
  })

  it('IntentAck → pending=acked / IntentRejected → rejected(+detail) (낙관적 정합/롤백)', () => {
    const store = createBattleStore()
    const sock = mockSocket()
    const okId = playCard(sock, store, 'P1-3')
    store.getState().apply(ServerMessage.fromPartial({ event: { intentAck: { clientIntentId: okId } } }))
    expect(store.getState().pendingIntents[okId].status).toBe('acked')

    const badId = playCard(sock, store, 'P1-9')
    store.getState().apply(
      ServerMessage.fromPartial({ event: { intentRejected: { clientIntentId: badId, detail: 'not_enough_mana' } } }),
    )
    expect(store.getState().pendingIntents[badId].status).toBe('rejected')
    expect(store.getState().pendingIntents[badId].detail).toBe('not_enough_mana')
  })
})
