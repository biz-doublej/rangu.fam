import { describe, expect, it } from 'vitest'
import { omokGame } from '../omok/rules'
import { RECONNECT_GRACE_MS, Room, cleanChatText, generateRoomCode, normalizeRoomCode } from './base'
import { findRoomGame } from './registry'

const A = { userId: 'a', name: '가' }
const B = { userId: 'b', name: '나' }
const C = { userId: 'c', name: '다' }
const newRoom = () => new Room('ABCDEF', omokGame, A, 0)
const started = () => {
  const room = newRoom()
  room.join(B, 0)
  room.start('a', 0, { seed: 1, matchId: 'm1' })
  return room
}

describe('방 코드', () => {
  it('6자리이고 헷갈리는 글자가 없다', () => {
    for (let i = 0; i < 200; i++) {
      const code = generateRoomCode()
      expect(code).toMatch(/^[A-HJKMNP-Z2-9]{6}$/)
      expect(normalizeRoomCode(code)).toBe(code)
    }
  })

  it('입력한 코드를 정리한다', () => {
    expect(normalizeRoomCode(' abc def ')).toBe('ABCDEF')
    expect(normalizeRoomCode('ABC')).toBeNull()
    expect(normalizeRoomCode('ABCDE0')).toBeNull() // 0 은 쓰지 않는 글자
    expect(normalizeRoomCode(null)).toBeNull()
  })
})

describe('방 상태 머신', () => {
  it('만든 사람이 방장이고, 최대 인원까지 들어온다', () => {
    const room = newRoom()
    expect(room).toMatchObject({ phase: 'lobby', hostId: 'a' })
    expect(room.join(B, 0)).toEqual({ ok: true })
    expect(room.join(C, 0)).toEqual({ ok: false, error: '방이 가득 찼습니다.' })
    expect(room.players.map((player) => player.userId)).toEqual(['a', 'b'])
  })

  it('방장만, 인원이 찼을 때만 시작할 수 있다', () => {
    const room = newRoom()
    expect(room.start('a', 0, { seed: 1, matchId: 'm1' }).ok).toBe(false)
    room.join(B, 0)
    expect(room.start('b', 0, { seed: 1, matchId: 'm1' })).toEqual({ ok: false, error: '방장만 할 수 있습니다.' })
    expect(room.start('a', 0, { seed: 1, matchId: 'm1' })).toEqual({ ok: true })
    expect(room.phase).toBe('playing')
    expect(room.start('a', 0, { seed: 1, matchId: 'm2' }).ok).toBe(false)
  })

  it('진행 중에는 새 사람이 못 들어오고, 참가자가 아니면 둘 수 없다', () => {
    const room = started()
    expect(room.join(C, 0).ok).toBe(false)
    expect(room.action('c', { type: 'place', x: 0, y: 0 }, 0)).toEqual({ ok: false, error: '이 방의 참가자가 아닙니다.' })
    expect(room.action('a', { type: 'place', x: 7, y: 7 }, 0)).toEqual({ ok: true })
  })

  it('끊기면 2분간 자리를 지키고, 돌아오면 그대로 이어진다', () => {
    const room = started()
    room.action('a', { type: 'place', x: 7, y: 7 }, 1000)
    room.disconnect('b', 2000)
    expect(room.players.find((player) => player.userId === 'b')).toMatchObject({ connected: false, disconnectedAt: 2000 })
    expect(room.tick(15_000)).toBe(false) // 턴 시간(30초)은 끊겨 있어도 흐른다 — 그 안에 돌아오면 된다
    expect(room.join(B, 20_000)).toEqual({ ok: true }) // 진행 중이어도 본인은 돌아올 수 있다
    expect(room.players.find((player) => player.userId === 'b')).toMatchObject({ connected: true, disconnectedAt: null })
    expect((room.snapshot('b', 20_000).state as any).board[7][7]).toBe(1)
    expect(room.phase).toBe('playing')
  })

  it('진행 중에 2분 넘게 돌아오지 않으면 상대 승으로 끝난다', () => {
    const room = started()
    room.disconnect('a', 0)
    // 턴 시간(30초)이 먼저 끝나므로 시간패로 끝난다
    expect(room.tick(31_000)).toBe(true)
    expect(room.phase).toBe('finished')
    expect(room.lastResult).toMatchObject({ matchId: 'm1', game: 'omok', summary: { reason: 'timeout' } })
    // 유예가 지나면 자리에서 빠지고 방장이 넘어간다
    room.tick(RECONNECT_GRACE_MS + 1)
    expect(room.players.map((player) => player.userId)).toEqual(['b'])
    expect(room.hostId).toBe('b')
  })

  it('스스로 나가면 그 판은 기권으로 끝나고 결과가 한 번만 나온다', () => {
    const room = started()
    room.leave('b', 5000)
    expect(room.phase).toBe('finished')
    const results = room.takeResults()
    expect(results).toHaveLength(1)
    expect(results[0]).toMatchObject({ matchId: 'm1', summary: { reason: 'abandon' } })
    expect(results[0].players.find((player) => player.userId === 'a')!.rank).toBe(1)
    expect(room.takeResults()).toEqual([])
  })

  it('끝난 뒤 방장이 다시 시작하면 새 판 번호로 이어지고 선공이 바뀐다', () => {
    const room = started()
    room.action('a', { type: 'resign' }, 100)
    expect(room).toMatchObject({ phase: 'finished', round: 1 })
    expect(room.takeResults()[0].matchId).toBe('m1')
    expect(room.start('a', 200, { seed: 2, matchId: 'm2' })).toEqual({ ok: true })
    expect(room.state).toMatchObject({ black: 'b', white: 'a' })
    expect(room.lastResult).toBeNull()
    room.action('b', { type: 'resign' }, 300)
    expect(room.takeResults()[0].matchId).toBe('m2')
  })

  it('대기실에서 끊긴 채 2분이 지나면 자리가 비워진다', () => {
    const room = newRoom()
    room.join(B, 0)
    room.disconnect('b', 1000)
    expect(room.tick(1000 + RECONNECT_GRACE_MS)).toBe(true)
    expect(room.players.map((player) => player.userId)).toEqual(['a'])
  })

  it('모두 나갔거나 모두 끊긴 채 2분이 지나면 방을 없앤다', () => {
    const room = newRoom()
    expect(room.isAbandoned(0)).toBe(false)
    room.disconnect('a', 1000)
    expect(room.isAbandoned(1000 + RECONNECT_GRACE_MS - 1)).toBe(false)
    expect(room.isAbandoned(1000 + RECONNECT_GRACE_MS)).toBe(true)
    const left = newRoom()
    left.leave('a', 0)
    expect(left.isAbandoned(0)).toBe(true)
  })

  it('한 줄 채팅: 정리해서 담고, 너무 빨리 보내면 막는다', () => {
    const room = newRoom()
    expect(room.say('a', '  안녕\n하세요  ', 1000)).toEqual({ ok: true })
    expect(room.chat[0]).toMatchObject({ userId: 'a', name: '가', text: '안녕 하세요' })
    expect(room.say('a', '또', 1100).ok).toBe(false)
    expect(room.say('a', '   ', 5000).ok).toBe(false)
    expect(room.say('c', '밖에서', 5000).ok).toBe(false)
    for (let i = 0; i < 60; i++) room.say('a', `말 ${i}`, 10_000 + i * 1000)
    expect(room.chat.length).toBeLessThanOrEqual(40)
    expect(cleanChatText('가'.repeat(300))).toHaveLength(100)
  })

  it('스냅샷에는 참가자·방장·판 상태가 들어 있다', () => {
    const room = started()
    expect(room.snapshot('a', 123)).toMatchObject({
      code: 'ABCDEF',
      game: 'omok',
      gameName: '오목',
      phase: 'playing',
      hostId: 'a',
      minPlayers: 2,
      maxPlayers: 2,
      serverNow: 123,
    })
  })

  it('게임 목록에서 id 로 찾는다', () => {
    expect(findRoomGame('omok')?.name).toBe('오목')
    expect(findRoomGame('toString')).toBeNull()
    expect(findRoomGame(undefined)).toBeNull()
  })
})
