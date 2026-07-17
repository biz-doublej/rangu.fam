import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { RANGU_TACTICS_MEMBERS } from '@/lib/ranguMembers'

const mocks = vi.hoisted(() => ({
  getAuthenticatedWikiUser: vi.fn(),
  getDb: vi.fn(),
  getPresenceSnapshot: vi.fn(),
  recordPresence: vi.fn(),
}))

vi.mock('@/lib/doublejAuth', () => ({
  getAuthenticatedWikiUser: mocks.getAuthenticatedWikiUser,
}))

vi.mock('@/db/client', () => ({
  getDb: mocks.getDb,
}))

vi.mock('@/lib/tactics/presence', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/tactics/presence')>()),
  getPresenceSnapshot: mocks.getPresenceSnapshot,
  recordPresence: mocks.recordPresence,
}))

import { GET, POST } from './route'

const db = { connection: 'presence-test' }
const snapshot = {
  members: RANGU_TACTICS_MEMBERS.map((member) => ({
    ...member,
    status: 'offline' as const,
    lastHeartbeatAt: null,
  })),
}

function request(method: 'GET' | 'POST', body?: string) {
  return new NextRequest('http://localhost/api/game/presence', { method, body })
}

describe('game presence route', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getAuthenticatedWikiUser.mockResolvedValue({ id: 'wiki-user-id' })
    mocks.getDb.mockReturnValue(db)
    mocks.getPresenceSnapshot.mockResolvedValue(snapshot)
    mocks.recordPresence.mockResolvedValue(undefined)
  })

  it('returns 401 for an unauthenticated GET without accessing the database', async () => {
    mocks.getAuthenticatedWikiUser.mockResolvedValue(null)

    const response = await GET(request('GET'))

    expect(response.status).toBe(401)
    expect(await response.json()).toEqual({ success: false, error: 'not_authenticated' })
    expect(mocks.getDb).not.toHaveBeenCalled()
  })

  it('returns the canonical presence snapshot for an authenticated GET', async () => {
    const response = await GET(request('GET'))

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ success: true, ...snapshot })
    expect(mocks.getPresenceSnapshot).toHaveBeenCalledWith(db)
  })

  it('returns 503 instead of a partial roster when the GET snapshot fails', async () => {
    const failure = new Error('database unavailable')
    mocks.getPresenceSnapshot.mockRejectedValue(failure)
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined)

    const response = await GET(request('GET'))

    expect(response.status).toBe(503)
    expect(await response.json()).toEqual({ success: false, error: 'presence_unavailable' })
    expect(error).toHaveBeenCalledWith('tactics presence route error', failure)
    error.mockRestore()
  })

  it('rejects a POST with a non-writable presence state before accessing the database', async () => {
    const response = await POST(request('POST', JSON.stringify({ state: 'offline' })))

    expect(response.status).toBe(400)
    expect(await response.json()).toEqual({ success: false, error: 'invalid_presence_state' })
    expect(mocks.getDb).not.toHaveBeenCalled()
  })

  it('rejects malformed POST JSON without recording a heartbeat', async () => {
    const response = await POST(request('POST', '{"state":'))

    expect(response.status).toBe(400)
    expect(await response.json()).toEqual({ success: false, error: 'invalid_presence_state' })
    expect(mocks.recordPresence).not.toHaveBeenCalled()
  })

  it('returns 401 for an unauthenticated POST before parsing or persisting it', async () => {
    mocks.getAuthenticatedWikiUser.mockResolvedValue(null)

    const response = await POST(request('POST', '{"state":'))

    expect(response.status).toBe(401)
    expect(await response.json()).toEqual({ success: false, error: 'not_authenticated' })
    expect(mocks.getDb).not.toHaveBeenCalled()
    expect(mocks.recordPresence).not.toHaveBeenCalled()
  })

  it('returns 503 when recording a valid POST fails', async () => {
    const failure = new Error('database unavailable')
    mocks.recordPresence.mockRejectedValue(failure)
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined)

    const response = await POST(request('POST', JSON.stringify({ state: 'lobby' })))

    expect(response.status).toBe(503)
    expect(await response.json()).toEqual({ success: false, error: 'presence_unavailable' })
    expect(mocks.getPresenceSnapshot).not.toHaveBeenCalled()
    expect(error).toHaveBeenCalledWith('tactics presence route error', failure)
    error.mockRestore()
  })

  it('records a valid POST for the authenticated user with a server timestamp', async () => {
    mocks.getAuthenticatedWikiUser.mockResolvedValue({ id: '', _id: 'fallback-wiki-user-id' })

    const response = await POST(request('POST', JSON.stringify({
      state: 'in_game',
      userId: 'ignored-client-user-id',
      timestamp: 'ignored-client-timestamp',
    })))

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ success: true, ...snapshot })
    expect(mocks.recordPresence).toHaveBeenCalledWith(db, 'fallback-wiki-user-id', 'in_game', expect.any(Date))
    expect(mocks.getPresenceSnapshot).toHaveBeenCalledWith(db)
  })
})
