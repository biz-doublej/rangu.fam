import { randomInt, randomUUID } from 'crypto'
import { createServer, type Server as HttpServer } from 'http'
import jwt from 'jsonwebtoken'
import { Server, type Socket } from 'socket.io'
import { Room, generateRoomCode, normalizeRoomCode, type RoomUser } from '../../../src/games/rooms/base'
import { findRoomGame } from '../../../src/games/rooms/registry'
import type { Reporter } from './report'

/**
 * 실시간 서버 본체.
 *
 * - 접속: 브라우저가 rangu-fam 의 /api/gamecenter/rt-token 에서 받은 5분짜리 JWT 를 socket auth 로 보낸다.
 * - 방 상태는 이 프로세스의 메모리에만 있다 (Cloud Run 최대 인스턴스 1). 재시작하면 진행 중인 방은 사라지지만,
 *   끝난 판의 결과는 이미 본 서버에 보고됐으므로 포인트는 안전하다.
 * - 규칙은 src/games/* 의 순수 로직을 그대로 쓴다 (화면과 같은 코드).
 */

const MAX_ROOMS = 200
const TICK_MS = 1000
type Ack = (response: { ok: boolean; error?: string; code?: string }) => void
const noop: Ack = () => {}

export interface RtServerOptions {
  jwtSecret: string
  allowedOrigins: string[]
  report: Reporter
  /** 테스트에서 시간을 바꿔 끼울 때 */
  now?: () => number
}

export interface RtServer {
  http: HttpServer
  io: Server
  rooms: Map<string, Room>
  /** 시간 경과 처리를 한 번 돌린다 (평소에는 1초마다 저절로 돈다) */
  tick: () => void
  close: () => Promise<void>
}

export function createRtServer(opts: RtServerOptions): RtServer {
  const now = opts.now ?? Date.now
  const rooms = new Map<string, Room>()
  /** userId → 지금 들어가 있는 방 코드 */
  const roomOf = new Map<string, string>()
  /** userId → 현재 소켓 (같은 사용자의 새 접속이 오면 이전 소켓을 끊는다) */
  const sockets = new Map<string, Socket>()

  const http = createServer((request, response) => {
    if (request.url === '/' || request.url === '/healthz') {
      response.writeHead(200, { 'content-type': 'application/json' })
      response.end(JSON.stringify({ ok: true, rooms: rooms.size, sockets: sockets.size }))
      return
    }
    response.writeHead(404)
    response.end()
  })

  const io = new Server(http, {
    cors: { origin: opts.allowedOrigins, methods: ['GET', 'POST'] },
    // 한 줄 채팅과 좌표만 오간다 — 큰 메시지는 받지 않는다
    maxHttpBufferSize: 16 * 1024,
  })

  io.use((socket, next) => {
    try {
      const token = String(socket.handshake.auth?.token || '')
      const payload = jwt.verify(token, opts.jwtSecret, { audience: 'game-rt' }) as { userId?: string; name?: string }
      if (!payload.userId) throw new Error('userId 없음')
      socket.data.user = { userId: payload.userId, name: String(payload.name || '이름 없음').slice(0, 30) } satisfies RoomUser
      next()
    } catch {
      next(new Error('unauthorized'))
    }
  })

  /** 방의 모든 참가자에게 각자의 시점으로 상태를 보낸다. */
  function broadcast(room: Room) {
    const at = now()
    for (const player of room.players) {
      sockets.get(player.userId)?.emit('room:state', room.snapshot(player.userId, at))
    }
  }

  /** 끝난 판이 있으면 본 서버에 보고하고, 받은 보상을 방에 알려 준다. */
  function flushResults(room: Room) {
    for (const match of room.takeResults()) {
      opts.report(match).then((response) => {
        if (!response || room.lastResult?.matchId !== match.matchId) return
        room.lastRewards = response.rewards
        broadcast(room)
      })
    }
  }

  function afterChange(room: Room) {
    flushResults(room)
    // 방에서 빠진 사람은 기록에서도 지운다
    for (const [userId, code] of roomOf) {
      if (code === room.code && !room.has(userId)) {
        roomOf.delete(userId)
        sockets.get(userId)?.emit('room:state', null)
      }
    }
    if (room.isAbandoned(now())) rooms.delete(room.code)
    else broadcast(room)
  }

  /** 다른 방에 들어가 있으면 먼저 나온다. 그 방이 진행 중이면 옮길 수 없다. */
  function leaveOtherRoom(userId: string, keep?: string): string | null {
    const code = roomOf.get(userId)
    if (!code || code === keep) return null
    const room = rooms.get(code)
    if (!room) {
      roomOf.delete(userId)
      return null
    }
    if (room.phase === 'playing') return `진행 중인 판이 있습니다 (방 ${code}). 그 판을 먼저 끝내 주세요.`
    room.leave(userId, now())
    roomOf.delete(userId)
    afterChange(room)
    return null
  }

  io.on('connection', (socket) => {
    const user = socket.data.user as RoomUser

    // 같은 사용자의 중복 탭: 이전 소켓을 끊는다
    const previous = sockets.get(user.userId)
    if (previous && previous.id !== socket.id) {
      previous.emit('session:replaced')
      previous.disconnect(true)
    }
    sockets.set(user.userId, socket)

    // 재접속 복구: 들어가 있던 방이 있으면 자리를 되찾는다
    const existing = rooms.get(roomOf.get(user.userId) ?? '')
    if (existing?.has(user.userId)) {
      existing.join(user, now())
      broadcast(existing)
    }

    const current = () => rooms.get(roomOf.get(user.userId) ?? '')

    socket.on('room:create', (payload: { game?: unknown }, ack: Ack = noop) => {
      const game = findRoomGame(payload?.game)
      if (!game) return ack({ ok: false, error: '아직 방을 만들 수 없는 게임입니다.' })
      const blocked = leaveOtherRoom(user.userId)
      if (blocked) return ack({ ok: false, error: blocked })
      if (rooms.size >= MAX_ROOMS) return ack({ ok: false, error: '지금은 방이 너무 많습니다. 잠시 뒤에 다시 시도해 주세요.' })
      let code = generateRoomCode()
      while (rooms.has(code)) code = generateRoomCode()
      const room = new Room(code, game, user, now())
      rooms.set(code, room)
      roomOf.set(user.userId, code)
      ack({ ok: true, code })
      broadcast(room)
    })

    socket.on('room:join', (payload: { code?: unknown }, ack: Ack = noop) => {
      const code = normalizeRoomCode(payload?.code)
      const room = code ? rooms.get(code) : undefined
      if (!code || !room) return ack({ ok: false, error: '그 코드의 방이 없습니다.' })
      const blocked = leaveOtherRoom(user.userId, code)
      if (blocked) return ack({ ok: false, error: blocked })
      const outcome = room.join(user, now())
      if (!outcome.ok) return ack(outcome)
      roomOf.set(user.userId, code)
      ack({ ok: true, code })
      broadcast(room)
    })

    socket.on('room:leave', (_payload: unknown, ack: Ack = noop) => {
      const room = current()
      if (room) {
        room.leave(user.userId, now())
        roomOf.delete(user.userId)
        afterChange(room)
      }
      socket.emit('room:state', null)
      ack({ ok: true })
    })

    socket.on('room:start', (_payload: unknown, ack: Ack = noop) => {
      const room = current()
      if (!room) return ack({ ok: false, error: '방에 들어가 있지 않습니다.' })
      const outcome = room.start(user.userId, now(), { seed: randomInt(0, 2 ** 32), matchId: randomUUID() })
      ack(outcome)
      if (outcome.ok) afterChange(room)
    })

    socket.on('room:action', (action: unknown, ack: Ack = noop) => {
      const room = current()
      if (!room) return ack({ ok: false, error: '방에 들어가 있지 않습니다.' })
      const outcome = room.action(user.userId, action, now())
      ack(outcome)
      if (outcome.ok) afterChange(room)
    })

    socket.on('room:chat', (payload: { text?: unknown }, ack: Ack = noop) => {
      const room = current()
      if (!room) return ack({ ok: false, error: '방에 들어가 있지 않습니다.' })
      const outcome = room.say(user.userId, payload?.text, now())
      ack(outcome)
      if (outcome.ok) broadcast(room)
    })

    socket.on('disconnect', () => {
      // 새 접속에 밀려 끊긴 소켓이면 자리를 비우지 않는다
      if (sockets.get(user.userId)?.id !== socket.id) return
      sockets.delete(user.userId)
      const room = current()
      if (room) {
        room.disconnect(user.userId, now())
        broadcast(room)
      }
    })
  })

  function tick() {
    const at = now()
    for (const room of [...rooms.values()]) {
      if (room.tick(at)) afterChange(room)
      else if (room.isAbandoned(at)) {
        for (const player of room.players) roomOf.delete(player.userId)
        rooms.delete(room.code)
      }
    }
  }
  const timer = setInterval(tick, TICK_MS)

  return {
    http,
    io,
    rooms,
    tick,
    close: () =>
      new Promise((resolve) => {
        clearInterval(timer)
        io.close(() => resolve())
      }),
  }
}
