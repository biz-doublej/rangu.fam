import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedWikiUser } from '@/lib/doublejAuth'
import { getDb } from '@/db/client'
import { getPresenceSnapshot, parsePresenceState, recordPresence } from '@/lib/tactics/presence'

export const dynamic = 'force-dynamic'

async function requirePresenceUser(request: NextRequest) {
  const user = await getAuthenticatedWikiUser(request)
  return user ? { userId: String(user.id || user._id) } : null
}

export async function GET(request: NextRequest) {
  const auth = await requirePresenceUser(request)
  if (!auth) return NextResponse.json({ success: false, error: 'not_authenticated' }, { status: 401 })

  try {
    return NextResponse.json({ success: true, ...(await getPresenceSnapshot(getDb())) })
  } catch (error) {
    console.error('tactics presence route error', error)
    return NextResponse.json({ success: false, error: 'presence_unavailable' }, { status: 503 })
  }
}

export async function POST(request: NextRequest) {
  const auth = await requirePresenceUser(request)
  if (!auth) return NextResponse.json({ success: false, error: 'not_authenticated' }, { status: 401 })

  const state = parsePresenceState((await request.json().catch(() => null))?.state)
  if (!state) return NextResponse.json({ success: false, error: 'invalid_presence_state' }, { status: 400 })

  try {
    const db = getDb()
    await recordPresence(db, auth.userId, state, new Date())
    return NextResponse.json({ success: true, ...(await getPresenceSnapshot(db)) })
  } catch (error) {
    console.error('tactics presence route error', error)
    return NextResponse.json({ success: false, error: 'presence_unavailable' }, { status: 503 })
  }
}
