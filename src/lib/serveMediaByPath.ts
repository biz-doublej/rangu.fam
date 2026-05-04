import { NextRequest, NextResponse } from 'next/server'

/**
 * GridFS-backed media asset serving (legacy MongoDB).
 *
 * Migration status: GridFS not ported to Postgres. Returns 404 so callers
 * fall through to alternate sources (e.g. images table, local filesystem).
 */
export async function serveMediaByPath(
  _prefix: string,
  segments: string[],
  _request: NextRequest
) {
  const path = segments.join('/')
  return NextResponse.json({ error: 'Media not found', path }, { status: 404 })
}
