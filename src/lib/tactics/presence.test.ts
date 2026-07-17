import { describe, expect, it } from 'vitest'
import { isRanguTacticsMemberId, RANGU_TACTICS_MEMBERS } from '@/lib/ranguMembers'
import { PRESENCE_TTL_MS, projectPresenceSnapshot, recordPresence, resolvePresenceStatus } from './presence'

type StoredPresence = {
  userId: string
  state: 'lobby' | 'in_game'
  lastHeartbeatAt: Date
  updatedAt: Date
}

function createPresenceDb() {
  const rows = new Map<string, StoredPresence>()

  return {
    rows,
    db: {
      insert: () => ({
        values: (values: StoredPresence) => ({
          onConflictDoUpdate: ({ set }: { set: Omit<StoredPresence, 'userId'> }) => {
            const existing = rows.get(values.userId)
            rows.set(values.userId, existing ? { ...existing, ...set } : values)
            return Promise.resolve()
          },
        }),
      }),
    },
  }
}

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

describe('presence persistence', () => {
  it('upserts one heartbeat row with the latest state and server timestamps', async () => {
    const { db, rows } = createPresenceDb()
    const userId = '7299e3cf-d58d-4f56-a260-f8ba00d02d40'
    const firstHeartbeatAt = new Date('2026-07-17T09:00:00.000Z')
    const secondHeartbeatAt = new Date('2026-07-17T09:00:30.000Z')

    await recordPresence(db, userId, 'lobby', firstHeartbeatAt)
    await recordPresence(db, userId, 'in_game', secondHeartbeatAt)

    expect(rows.size).toBe(1)
    expect(rows.get(userId)).toEqual({
      userId,
      state: 'in_game',
      lastHeartbeatAt: secondHeartbeatAt,
      updatedAt: secondHeartbeatAt,
    })
  })
})
