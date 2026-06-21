import { ServerMessage } from '@rangu/proto-ts'
import type { BattleStore } from './battleStore'

/**
 * 최소 WS 인터페이스 — 브라우저 WebSocket 및 테스트 모의 호환.
 * (battle-core 는 프레임워크/DOM 비의존 → 브라우저 WebSocket 을 직접 타입 참조하지 않음.)
 */
export interface SocketLike {
  binaryType?: string
  addEventListener(type: 'message', listener: (ev: { data: unknown }) => void): void
  /** 아웃바운드 intent 전송(브라우저 WebSocket.send 호환). */
  send(data: Uint8Array): void
}

/**
 * WS 의 바이너리 메시지를 ServerMessage 로 디코드해 battleStore.apply 로 흘리는 연결 모듈.
 * (서버는 단일 순서 WS 스트림으로 ack/event/snapshot 을 보내므로 클라 reorder 불필요.)
 */
export function attachMessageMapper(socket: SocketLike, store: BattleStore): void {
  if ('binaryType' in socket) socket.binaryType = 'arraybuffer'
  socket.addEventListener('message', (ev) => {
    const bytes = toBytes(ev.data)
    if (!bytes) return
    store.getState().apply(ServerMessage.decode(bytes))
  })
}

/** WS data(ArrayBuffer/Blob 제외 — 이진 프레임만) → Uint8Array. */
export function toBytes(data: unknown): Uint8Array | null {
  if (data instanceof Uint8Array) return data
  if (data instanceof ArrayBuffer) return new Uint8Array(data)
  if (ArrayBuffer.isView(data)) {
    const view = data as ArrayBufferView
    return new Uint8Array(view.buffer, view.byteOffset, view.byteLength)
  }
  return null
}
