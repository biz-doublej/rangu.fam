'use client'

import { useEffect } from 'react'
import { ClientMessage } from '@rangu/proto-ts'
import { attachMessageMapper, type SocketLike } from '@rangu/battle-core'
import { battleStore, bindSocket } from './battleClient'

export interface ConnectOptions {
  matchId: string
  ticket: string
  wsUrl?: string
  /** 메타데이터 contentVersion (서버 버전 일치 확인용; 비우면 서버가 검사 생략) */
  metadataVersion?: string
}

/**
 * 매치 WebSocket 연결 + MessageMapper 부착 + ConnectRequest 전송 + 아웃바운드 소켓 바인딩.
 * 수신 스트림은 attachMessageMapper 가 battleStore.apply 로, 송신은 bindSocket→do* 액션으로.
 */
export function useGameConnection({
  matchId,
  ticket,
  wsUrl = 'ws://localhost:5080/ws/tactics',
  metadataVersion = '',
}: ConnectOptions): void {
  useEffect(() => {
    if (!ticket) return
    const ws = new WebSocket(wsUrl)
    ws.binaryType = 'arraybuffer'
    attachMessageMapper(ws as unknown as SocketLike, battleStore)
    ws.addEventListener('open', () => {
      const frame = ClientMessage.encode(
        ClientMessage.fromPartial({ connect: { gameTicket: ticket, matchId, clientVersion: metadataVersion } }),
      ).finish()
      ws.send(frame)
      bindSocket(ws as unknown as SocketLike)
    })
    return () => {
      bindSocket(null)
      battleStore.getState().reset()
      ws.close()
    }
  }, [matchId, ticket, wsUrl, metadataVersion])
}
