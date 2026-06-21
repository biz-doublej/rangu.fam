import { describe, it, expect } from 'vitest'
import { ClientMessage, ServerMessage } from '@rangu/proto-ts'
import { createBattleStore } from '../src/battleStore'
import { declareAttack, declareBlock, resolveStack } from '../src/actions'

function mockSocket() {
  const sent: Uint8Array[] = []
  return { sent, binaryType: '', addEventListener() {}, send(d: Uint8Array) { sent.push(d) } }
}

describe('combat actions: 공격/블록 선언 전송', () => {
  it('declareAttack → DeclareAttackIntent(attackerInstanceIds)', () => {
    const store = createBattleStore()
    const sock = mockSocket()
    const id = declareAttack(sock, store, ['P1-0', 'P1-2'])
    const cm = ClientMessage.decode(sock.sent[0])
    expect(cm.intent?.clientIntentId).toBe(id)
    expect(cm.intent?.declareAttack?.attackerInstanceIds).toEqual(['P1-0', 'P1-2'])
    expect(store.getState().pendingIntents[id].type).toBe('declareAttack')
  })

  it('declareBlock → DeclareBlockIntent(blocks: {attacker, blocker})', () => {
    const store = createBattleStore()
    const sock = mockSocket()
    declareBlock(sock, store, [{ attackerInstanceId: 'P2-1', blockerInstanceId: 'P1-0' }])
    const cm = ClientMessage.decode(sock.sent[0])
    expect(cm.intent?.declareBlock?.blocks?.[0]?.attackerInstanceId).toBe('P2-1')
    expect(cm.intent?.declareBlock?.blocks?.[0]?.blockerInstanceId).toBe('P1-0')
  })

  it('resolveStack → ResolveStackIntent', () => {
    const store = createBattleStore()
    const sock = mockSocket()
    resolveStack(sock, store)
    const cm = ClientMessage.decode(sock.sent[0])
    expect(cm.intent?.resolveStack).toBeDefined()
  })
})

describe('combatFx: 전투 이벤트 → ephemeral 연출 큐 (스냅샷 불변)', () => {
  it('DamageDealt → damage fx(타깃/수치/치명), 스냅샷은 그대로', () => {
    const store = createBattleStore()
    const before = store.getState().snapshot
    store.getState().apply(
      ServerMessage.fromPartial({
        event: {
          damageDealt: {
            instances: [
              { target: { cardInstanceId: 'P2-1' }, sourceInstanceId: 'P1-0', amount: 3, isLethal: true },
              { target: { nexus: { seat: 1 } }, sourceInstanceId: 'P1-2', amount: 2, isLethal: false },
            ],
          },
        },
      }),
    )
    const fx = store.getState().combatFx
    expect(fx.length).toBe(2)
    expect(fx[0]).toMatchObject({ kind: 'damage', targetInstanceId: 'P2-1', amount: 3, lethal: true })
    expect(fx[1]).toMatchObject({ kind: 'damage', nexusSeat: 1, amount: 2 })
    expect(fx[0].id).not.toBe(fx[1].id) // 고유 id(React key)
    expect(store.getState().snapshot).toBe(before) // 정본 불변
  })

  it('UnitDied → death fx(instanceIds)', () => {
    const store = createBattleStore()
    store.getState().apply(ServerMessage.fromPartial({ event: { unitDied: { instanceIds: ['P2-1', 'P1-0'] } } }))
    const fx = store.getState().combatFx
    expect(fx[0]).toMatchObject({ kind: 'death', instanceIds: ['P2-1', 'P1-0'] })
  })

  it('intentAck 등 비전투 이벤트는 combatFx 에 안 쌓임', () => {
    const store = createBattleStore()
    store.getState().trackIntent('x', 'pass')
    store.getState().apply(ServerMessage.fromPartial({ event: { intentAck: { clientIntentId: 'x' } } }))
    expect(store.getState().combatFx.length).toBe(0)
    expect(store.getState().pendingIntents['x'].status).toBe('acked')
  })

  it('reset 은 combatFx 를 비운다', () => {
    const store = createBattleStore()
    store.getState().apply(ServerMessage.fromPartial({ event: { unitDied: { instanceIds: ['P2-1'] } } }))
    expect(store.getState().combatFx.length).toBeGreaterThan(0)
    store.getState().reset()
    expect(store.getState().combatFx.length).toBe(0)
  })
})
