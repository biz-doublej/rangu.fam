import { describe, expect, it } from 'vitest'
import { isRanguTacticsMemberId, RANGU_TACTICS_MEMBERS } from '@/lib/ranguMembers'
import { PRESENCE_TTL_MS, projectPresenceSnapshot, resolvePresenceStatus } from './presence'

describe('Rangu tactics roster', () => {
  it('contains the five canonical members in sidebar order', () => {
    expect(RANGU_TACTICS_MEMBERS.map((member) => member.id)).toEqual([
      'hanul', 'jaewon', 'minseok', 'seungchan', 'jinkyu',
    ])
  })

  it('accepts only canonical member IDs', () => {
    expect(isRanguTacticsMemberId('jinkyu')).toBe(true)
    expect(isRanguTacticsMemberId('jingyu')).toBe(false)
  })
})

describe('presence status', () => {
  const now = new Date('2026-07-17T09:00:00.000Z')

  it('keeps a recent in-game heartbeat online', () => {
    expect(resolvePresenceStatus('in_game', new Date(now.getTime() - PRESENCE_TTL_MS + 1), now)).toBe('in_game')
  })

  it('marks exactly stale heartbeats offline', () => {
    expect(resolvePresenceStatus('lobby', new Date(now.getTime() - PRESENCE_TTL_MS), now)).toBe('offline')
  })

  it('projects every canonical member and leaves missing records offline', () => {
    const snapshot = projectPresenceSnapshot([], now)
    expect(snapshot.members).toHaveLength(5)
    expect(snapshot.members.every((member) => member.status === 'offline')).toBe(true)
  })
})
