/**
 * 파티·보드 게임 방의 공통 상태 머신.
 * 실시간 서버(services/game-rt)가 방마다 하나씩 들고, 게임 규칙은 RoomGame 구현(오목 등)이 맡는다.
 *
 * 순수 로직이다 — 소켓·타이머·시계를 직접 쓰지 않고 모든 메서드가 now(밀리초)를 받는다.
 * 그래서 서버 없이도 테스트할 수 있다.
 *
 * 대기실(lobby) → 진행(playing) → 끝(finished) → (호스트가 다시 시작하면) 진행 …
 */

/** 끊긴 사람의 자리를 지켜 주는 시간 */
export const RECONNECT_GRACE_MS = 2 * 60 * 1000
export const ROOM_CODE_LENGTH = 6
/** 헷갈리는 글자(0·O, 1·I·L)는 뺀다 */
const ROOM_CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'
export const CHAT_MAX_LENGTH = 100
const CHAT_KEEP = 40
const CHAT_MIN_INTERVAL_MS = 500

export type RoomPhase = 'lobby' | 'playing' | 'finished'

export interface RoomUser {
  userId: string
  name: string
}

export interface RoomPlayer extends RoomUser {
  connected: boolean
  /** 끊긴 시각 (연결 중이면 null) */
  disconnectedAt: number | null
}

export interface MatchPlayerResult {
  userId: string
  /** 1 = 1위. 무승부면 같은 순위 */
  rank: number
  score: number
  role?: string
  /** 게임별 집계 (정답 수 등) — 본 서버가 보상을 계산할 때 쓴다 */
  stats?: Record<string, number>
}

export interface MatchResult {
  matchId: string
  game: string
  players: MatchPlayerResult[]
  summary: Record<string, unknown>
}

export interface ChatMessage {
  id: number
  userId: string
  name: string
  text: string
  at: number
}

/** 게임 규칙 한 벌. S = 게임 상태, A = 플레이어가 보내는 동작 */
export interface RoomGame<S = any, A = any> {
  id: string
  name: string
  minPlayers: number
  maxPlayers: number
  /** 판을 시작한다. round 는 이 방에서 몇 번째 판인지 (0부터) — 선공을 번갈아 줄 때 쓴다. */
  init(players: RoomUser[], opts: { now: number; seed: number; round: number; data?: unknown; options?: Record<string, unknown> }): S
  /**
   * 시작 전에 본 서버에서 받아와야 하는 자료가 있으면 그 이름 (예: 퀴즈의 자기 답).
   * 실시간 서버가 내부 API 로 받아 init 의 data 로 넘긴다.
   */
  needs?: string
  /** 시작할 수 있는지 확인한다. 안 되면 이유(문장)를 돌려준다. */
  validate?(players: RoomUser[], data: unknown): string | null
  /** 동작을 적용한다. 받아들일 수 없으면 이유를 돌려준다. 상태는 직접 고친다. */
  apply(state: S, userId: string, action: A, now: number): { ok: true } | { ok: false; error: string }
  /** 시간이 흘러서 바뀌는 일(턴 시간 초과 등)을 처리한다. 바뀌었으면 true. */
  tick(state: S, now: number): boolean
  /** 진행 중인 사람이 자리를 비워 돌아오지 않았을 때 (기권 처리 등) */
  abandon(state: S, userId: string, now: number): void
  /** 판이 끝났으면 결과, 아니면 null */
  result(state: S): Omit<MatchResult, 'matchId' | 'game'> | null
  /** 그 사람에게 보여 줄 상태 (숨길 정보가 있는 게임은 여기서 가린다) */
  view(state: S, userId: string): unknown
  /**
   * 그림 획처럼 자주, 많이 오가는 자료. 방 상태 전체를 다시 보내지 않고 다른 참가자에게 그대로 흘려보낸다.
   * 받아들이면 relay(남들에게 보낼 내용)를 돌려준다.
   */
  stream?(state: S, userId: string, payload: unknown, now: number): { ok: true; relay: unknown } | { ok: false; error: string }
  /** 늦게 들어오거나 다시 접속한 사람에게 보낼, 지금까지 흘려보낸 자료 전체 */
  streamSnapshot?(state: S): unknown
}

export interface RoomSnapshot {
  code: string
  game: string
  gameName: string
  phase: RoomPhase
  hostId: string
  minPlayers: number
  maxPlayers: number
  players: RoomPlayer[]
  chat: ChatMessage[]
  /** 진행 중이거나 막 끝난 판의 상태 (대기실에서는 null) */
  state: unknown
  /** 막 끝난 판의 결과와, 본 서버가 알려 준 보상 */
  lastResult: MatchResult | null
  lastRewards: Record<string, number> | null
  round: number
  serverNow: number
}

export type RoomError =
  | 'room_full'
  | 'already_started'
  | 'not_in_room'
  | 'not_host'
  | 'not_enough_players'
  | 'not_playing'
  | 'empty_message'
  | 'too_fast'

export const ROOM_ERROR_TEXT: Record<RoomError, string> = {
  room_full: '방이 가득 찼습니다.',
  already_started: '이미 시작한 방입니다. 판이 끝난 뒤에 들어올 수 있습니다.',
  not_in_room: '이 방의 참가자가 아닙니다.',
  not_host: '방장만 할 수 있습니다.',
  not_enough_players: '인원이 모자랍니다.',
  not_playing: '진행 중인 판이 없습니다.',
  empty_message: '보낼 말을 적어 주세요.',
  too_fast: '조금 천천히 보내 주세요.',
}

type Outcome = { ok: true } | { ok: false; error: string }
const fail = (error: RoomError): Outcome => ({ ok: false, error: ROOM_ERROR_TEXT[error] })

export function generateRoomCode(random: () => number = Math.random): string {
  let code = ''
  for (let i = 0; i < ROOM_CODE_LENGTH; i++) code += ROOM_CODE_ALPHABET[Math.floor(random() * ROOM_CODE_ALPHABET.length)]
  return code
}

/** 사용자가 적은 코드를 정리한다 (공백 제거, 대문자). 형식이 아니면 null */
export function normalizeRoomCode(raw: unknown): string | null {
  const code = String(raw ?? '').replace(/\s+/g, '').toUpperCase()
  return new RegExp(`^[${ROOM_CODE_ALPHABET}]{${ROOM_CODE_LENGTH}}$`).test(code) ? code : null
}

export function cleanChatText(raw: unknown): string {
  return Array.from(String(raw ?? '').replace(/[\u0000-\u001f\u007f]+/g, ' ').replace(/\s+/g, ' ').trim())
    .slice(0, CHAT_MAX_LENGTH)
    .join('')
}

export class Room<S = any, A = any> {
  phase: RoomPhase = 'lobby'
  players: RoomPlayer[] = []
  hostId: string
  state: S | null = null
  chat: ChatMessage[] = []
  round = 0
  matchId: string | null = null
  lastResult: MatchResult | null = null
  lastRewards: Record<string, number> | null = null
  /** 아직 본 서버에 보고하지 않은 결과 */
  private pendingResults: MatchResult[] = []
  private chatSeq = 0
  private lastChatAt = new Map<string, number>()
  /** 아무도 없게 된 시각 (정리용) */
  emptySince: number | null = null

  constructor(
    public readonly code: string,
    public readonly game: RoomGame<S, A>,
    host: RoomUser,
    now: number
  ) {
    this.hostId = host.userId
    this.join(host, now)
  }

  has(userId: string): boolean {
    return this.players.some((player) => player.userId === userId)
  }

  /** 들어오거나(대기실·끝난 방), 끊겼다 돌아온다(언제든). */
  join(user: RoomUser, now: number): Outcome {
    const existing = this.players.find((player) => player.userId === user.userId)
    if (existing) {
      existing.connected = true
      existing.disconnectedAt = null
      existing.name = user.name
      this.emptySince = null
      return { ok: true }
    }
    if (this.phase === 'playing') return fail('already_started')
    if (this.players.length >= this.game.maxPlayers) return fail('room_full')
    this.players.push({ ...user, connected: true, disconnectedAt: null })
    this.emptySince = null
    return { ok: true }
  }

  /** 소켓이 끊겼다 — 자리는 RECONNECT_GRACE_MS 동안 지킨다. */
  disconnect(userId: string, now: number) {
    const player = this.players.find((entry) => entry.userId === userId)
    if (!player || !player.connected) return
    player.connected = false
    player.disconnectedAt = now
    if (this.players.every((entry) => !entry.connected)) this.emptySince = now
  }

  /** 스스로 나간다. 진행 중이면 그 판은 기권으로 끝난다. */
  leave(userId: string, now: number) {
    if (!this.has(userId)) return
    if (this.phase === 'playing' && this.state) {
      this.game.abandon(this.state, userId, now)
      this.finishIfOver()
    }
    this.remove(userId, now)
  }

  private remove(userId: string, now: number) {
    this.players = this.players.filter((player) => player.userId !== userId)
    if (this.hostId === userId) {
      // 방장이 나가면 남은 사람 중 연결된 사람(없으면 첫 사람)이 방장이 된다
      const next = this.players.find((player) => player.connected) ?? this.players[0]
      if (next) this.hostId = next.userId
    }
    if (this.players.every((player) => !player.connected)) this.emptySince = this.emptySince ?? now
  }

  /** 시작해도 되는 사람·상태인지 (자료를 받아오기 전에 먼저 확인한다) */
  canStart(userId: string): Outcome {
    if (!this.has(userId)) return fail('not_in_room')
    if (userId !== this.hostId) return fail('not_host')
    if (this.phase === 'playing') return fail('already_started')
    if (this.players.filter((player) => player.connected).length < this.game.minPlayers) return fail('not_enough_players')
    return { ok: true }
  }

  start(userId: string, now: number, opts: { seed: number; matchId: string; data?: unknown; options?: Record<string, unknown> }): Outcome {
    if (!this.has(userId)) return fail('not_in_room')
    if (userId !== this.hostId) return fail('not_host')
    if (this.phase === 'playing') return fail('already_started')
    const present = this.players.filter((player) => player.connected)
    if (present.length < this.game.minPlayers) return fail('not_enough_players')
    const users = present.map(({ userId: id, name }) => ({ userId: id, name }))
    const problem = this.game.validate?.(users, opts.data)
    if (problem) return { ok: false, error: problem }
    // 끊긴 채로 남아 있는 사람은 새 판에 넣지 않는다
    this.players = present
    this.state = this.game.init(users, { now, seed: opts.seed, round: this.round, data: opts.data, options: opts.options })
    this.matchId = opts.matchId
    this.phase = 'playing'
    this.lastResult = null
    this.lastRewards = null
    return { ok: true }
  }

  action(userId: string, action: A, now: number): Outcome {
    if (!this.has(userId)) return fail('not_in_room')
    if (this.phase !== 'playing' || !this.state) return fail('not_playing')
    const outcome = this.game.apply(this.state, userId, action, now)
    if (outcome.ok) this.finishIfOver()
    return outcome
  }

  /** 그림 획 같은 흐름 자료를 받는다. 받아들였으면 남들에게 보낼 내용을 돌려준다. */
  stream(userId: string, payload: unknown, now: number): { ok: true; relay: unknown } | { ok: false; error: string } {
    if (!this.has(userId)) return fail('not_in_room') as { ok: false; error: string }
    if (this.phase !== 'playing' || !this.state || !this.game.stream) return fail('not_playing') as { ok: false; error: string }
    return this.game.stream(this.state, userId, payload, now)
  }

  /** 지금까지의 흐름 자료 전체 (없으면 null) */
  streamSnapshot(): unknown {
    if (!this.state || !this.game.streamSnapshot) return null
    return this.game.streamSnapshot(this.state)
  }

  say(userId: string, raw: unknown, now: number): Outcome {
    const player = this.players.find((entry) => entry.userId === userId)
    if (!player) return fail('not_in_room')
    const text = cleanChatText(raw)
    if (!text) return fail('empty_message')
    if (now - (this.lastChatAt.get(userId) ?? -Infinity) < CHAT_MIN_INTERVAL_MS) return fail('too_fast')
    this.lastChatAt.set(userId, now)
    this.chat.push({ id: ++this.chatSeq, userId, name: player.name, text, at: now })
    if (this.chat.length > CHAT_KEEP) this.chat = this.chat.slice(-CHAT_KEEP)
    return { ok: true }
  }

  /** 시간 경과 처리: 턴 시간, 돌아오지 않은 사람 정리. 바뀐 것이 있으면 true. */
  tick(now: number): boolean {
    let changed = false
    if (this.phase === 'playing' && this.state) {
      if (this.game.tick(this.state, now)) changed = true
    }
    for (const player of [...this.players]) {
      if (player.connected || player.disconnectedAt === null) continue
      if (now - player.disconnectedAt < RECONNECT_GRACE_MS) continue
      if (this.phase === 'playing' && this.state) this.game.abandon(this.state, player.userId, now)
      this.remove(player.userId, now)
      changed = true
    }
    if (this.finishIfOver()) changed = true
    return changed
  }

  private finishIfOver(): boolean {
    if (this.phase !== 'playing' || !this.state || !this.matchId) return false
    const result = this.game.result(this.state)
    if (!result) return false
    const match: MatchResult = { matchId: this.matchId, game: this.game.id, ...result }
    this.phase = 'finished'
    this.round++
    this.lastResult = match
    this.pendingResults.push(match)
    return true
  }

  /** 아직 보고하지 않은 결과를 꺼낸다 (한 번만 나온다). */
  takeResults(): MatchResult[] {
    const results = this.pendingResults
    this.pendingResults = []
    return results
  }

  /** 모두 나갔거나, 모두 끊긴 채 유예 시간이 지났으면 방을 없애도 된다. */
  isAbandoned(now: number): boolean {
    if (this.players.length === 0) return true
    return this.emptySince !== null && now - this.emptySince >= RECONNECT_GRACE_MS
  }

  snapshot(userId: string, now: number): RoomSnapshot {
    return {
      code: this.code,
      game: this.game.id,
      gameName: this.game.name,
      phase: this.phase,
      hostId: this.hostId,
      minPlayers: this.game.minPlayers,
      maxPlayers: this.game.maxPlayers,
      players: this.players.map((player) => ({ ...player })),
      chat: this.chat,
      state: this.state ? this.game.view(this.state, userId) : null,
      lastResult: this.lastResult,
      lastRewards: this.lastRewards,
      round: this.round,
      serverNow: now,
    }
  }
}
