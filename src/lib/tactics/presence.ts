import { eq } from 'drizzle-orm'
import { tacticsPresence } from '@/db/schema/tacticsPresence'
import { wikiUsers } from '@/db/schema/wiki'
import { RANGU_TACTICS_MEMBERS, type RanguTacticsMemberId } from '@/lib/ranguMembers'

type Db = any

export type PresenceState = 'lobby' | 'in_game'
export type PresenceStatus = PresenceState | 'offline'

export const PRESENCE_TTL_MS = 65_000

export interface PresenceSnapshot {
  members: Array<{
    id: RanguTacticsMemberId
    name: string
    avatar: string
    status: PresenceStatus
    lastHeartbeatAt: Date | null
  }>
}

type PresenceRecord = {
  memberId: string
  state: PresenceState
  lastHeartbeatAt: Date
}

export function resolvePresenceStatus(
  state: PresenceState,
  lastHeartbeatAt: Date,
  now = new Date(),
): PresenceStatus {
  return now.getTime() - lastHeartbeatAt.getTime() < PRESENCE_TTL_MS ? state : 'offline'
}

export function projectPresenceSnapshot(records: PresenceRecord[], now = new Date()): PresenceSnapshot {
  return {
    members: RANGU_TACTICS_MEMBERS.map((member) => {
      const record = records.find((candidate) => candidate.memberId === member.id)
      return {
        ...member,
        status: record ? resolvePresenceStatus(record.state, record.lastHeartbeatAt, now) : 'offline',
        lastHeartbeatAt: record?.lastHeartbeatAt ?? null,
      }
    }),
  }
}

export async function getPresenceSnapshot(db: Db, now = new Date()): Promise<PresenceSnapshot> {
  const { resolveMemberIdForUser } = await import('@/lib/doublejAuth')
  const rows = await db
    .select({
      user: wikiUsers,
      state: tacticsPresence.state,
      lastHeartbeatAt: tacticsPresence.lastHeartbeatAt,
    })
    .from(wikiUsers)
    .leftJoin(tacticsPresence, eq(wikiUsers.id, tacticsPresence.userId))

  const records = rows.flatMap((row: {
    user: typeof wikiUsers.$inferSelect
    state: PresenceState | null
    lastHeartbeatAt: Date | null
  }) => {
    const memberId = resolveMemberIdForUser(row.user)
    if (!memberId || !row.state || !row.lastHeartbeatAt) return []
    return [{ memberId, state: row.state, lastHeartbeatAt: row.lastHeartbeatAt }]
  })

  return projectPresenceSnapshot(records, now)
}

export async function recordPresence(db: Db, userId: string, state: PresenceState, now: Date): Promise<void> {
  await db
    .insert(tacticsPresence)
    .values({ userId, state, lastHeartbeatAt: now, updatedAt: now })
    .onConflictDoUpdate({
      target: tacticsPresence.userId,
      set: { state, lastHeartbeatAt: now, updatedAt: now },
    })
}
