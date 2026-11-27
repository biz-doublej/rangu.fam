'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { io, type Socket } from 'socket.io-client'
import type { RoomSnapshot } from '@/games/rooms/base'
import { gcPost } from './useGamecenterMe'

export type RoomStatus = 'connecting' | 'connected' | 'reconnecting' | 'replaced' | 'unavailable'

interface RtAccess {
  token: string
  url: string
  userId: string
}

export interface RoomAck {
  ok: boolean
  error?: string
  code?: string
}

/**
 * 실시간 서버 연결.
 * 접속할 때마다(재접속 포함) /api/gamecenter/rt-token 에서 5분짜리 토큰을 새로 받는다.
 * 연결이 끊기면 자동으로 다시 붙고, 서버가 2분간 자리를 지켜 주므로 같은 판으로 돌아온다.
 */
export function useRoom(opts: { onConnect?: (send: (event: string, payload?: unknown) => Promise<RoomAck>) => void } = {}) {
  const socketRef = useRef<Socket | null>(null)
  const onConnectRef = useRef(opts.onConnect)
  onConnectRef.current = opts.onConnect

  const [status, setStatus] = useState<RoomStatus>('connecting')
  const [room, setRoom] = useState<RoomSnapshot | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  /** 서버 시계 - 내 시계 (턴 타이머 표시용) */
  const [clockOffset, setClockOffset] = useState(0)

  const send = useCallback((event: string, payload: unknown = {}): Promise<RoomAck> => {
    const socket = socketRef.current
    if (!socket?.connected) return Promise.resolve({ ok: false, error: '실시간 서버에 연결되어 있지 않습니다.' })
    return new Promise((resolve) => {
      socket.timeout(8000).emit(event, payload, (timeoutError: Error | null, response: RoomAck) => {
        resolve(timeoutError ? { ok: false, error: '서버가 응답하지 않습니다.' } : response)
      })
    })
  }, [])

  useEffect(() => {
    let cancelled = false
    let socket: Socket | null = null

    ;(async () => {
      let access: RtAccess
      try {
        access = await gcPost<RtAccess>('/api/gamecenter/rt-token')
      } catch (err) {
        if (cancelled) return
        if ((err as { status?: number }).status === 401) return // 로그인 화면으로 보내는 일은 useGamecenterMe 가 한다
        setError((err as Error).message)
        setStatus('unavailable')
        return
      }
      if (cancelled) return
      setUserId(access.userId)

      let first = true
      socket = io(access.url, {
        transports: ['websocket'],
        // 재접속할 때는 토큰이 만료됐을 수 있어 매번 새로 받는다
        auth: (callback) => {
          if (first) {
            first = false
            callback({ token: access.token })
            return
          }
          gcPost<RtAccess>('/api/gamecenter/rt-token')
            .then((fresh) => callback({ token: fresh.token }))
            .catch(() => callback({ token: '' }))
        },
      })
      socketRef.current = socket

      socket.on('connect', () => {
        setStatus('connected')
        setError(null)
        onConnectRef.current?.(send)
      })
      socket.on('room:state', (snapshot: RoomSnapshot | null) => {
        setRoom(snapshot)
        if (snapshot) setClockOffset(snapshot.serverNow - Date.now())
      })
      socket.on('session:replaced', () => {
        setStatus('replaced')
        socket?.disconnect()
      })
      socket.on('disconnect', (reason) => {
        if (reason === 'io client disconnect') return
        setStatus((current) => (current === 'replaced' ? current : 'reconnecting'))
        // 서버가 끊은 경우에는 자동으로 다시 붙지 않으므로 직접 붙는다
        if (reason === 'io server disconnect') socket?.connect()
      })
      socket.on('connect_error', () => {
        setStatus((current) => (current === 'replaced' ? current : 'reconnecting'))
      })
    })()

    return () => {
      cancelled = true
      socket?.disconnect()
      socketRef.current = null
    }
  }, [send])

  return { status, room, userId, error, send, clockOffset }
}
