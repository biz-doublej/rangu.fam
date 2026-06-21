import { ClientMessage } from '@rangu/proto-ts'
import type { BattleStore } from './battleStore'
import type { SocketLike } from './messageMapper'

// 클라 생성 intent id (ACK/거부 상관 + 멱등). 탭당 단일 스토어라 모듈 카운터로 충분.
let seq = 0
const nextId = (prefix: string): string => `${prefix}-${(++seq).toString(36)}`

function send(socket: SocketLike, clientIntentId: string, action: Record<string, unknown>): void {
  socket.send(ClientMessage.encode(ClientMessage.fromPartial({ intent: { clientIntentId, ...action } })).finish())
}

/** 유닛/주문 소환 요청 + 낙관적 pending(카드 상관) 등록. clientIntentId 반환. */
export function playCard(socket: SocketLike, store: BattleStore, cardInstanceId: string): string {
  const id = nextId('pc')
  store.getState().trackIntent(id, 'playCard', cardInstanceId)
  send(socket, id, { playCard: { cardInstanceId } })
  return id
}

/** 멀리건 — replaceCardInstanceIds(교체할 카드; 빈 배열=전부 킵). */
export function mulligan(socket: SocketLike, store: BattleStore, replaceCardInstanceIds: string[] = []): string {
  const id = nextId('mull')
  store.getState().trackIntent(id, 'mulligan')
  send(socket, id, { mulligan: { replaceCardInstanceIds } })
  return id
}

/** 우선권 패스. */
export function pass(socket: SocketLike, store: BattleStore): string {
  const id = nextId('pass')
  store.getState().trackIntent(id, 'pass')
  send(socket, id, { pass: {} })
  return id
}

/** 공격 선언 — 공격자 instanceId 배열. */
export function declareAttack(socket: SocketLike, store: BattleStore, attackerInstanceIds: string[]): string {
  const id = nextId('atk')
  store.getState().trackIntent(id, 'declareAttack')
  send(socket, id, { declareAttack: { attackerInstanceIds } })
  return id
}

/** 블록 선언 — {공격자, 방어자} 배정 배열. */
export function declareBlock(
  socket: SocketLike,
  store: BattleStore,
  blocks: { attackerInstanceId: string; blockerInstanceId: string }[],
): string {
  const id = nextId('blk')
  store.getState().trackIntent(id, 'declareBlock')
  send(socket, id, { declareBlock: { blocks } })
  return id
}

/** 스택 비대응 → 해결 진행. */
export function resolveStack(socket: SocketLike, store: BattleStore): string {
  const id = nextId('rs')
  store.getState().trackIntent(id, 'resolveStack')
  send(socket, id, { resolveStack: {} })
  return id
}
