import { NextRequest, NextResponse } from 'next/server'
import { and, inArray, ne } from 'drizzle-orm'
import { getDb } from '@/db/client'
import { wikiPages } from '@/db/schema/wiki'

export const dynamic = 'force-dynamic'

/**
 * Batch existence check for wiki page titles.
 *
 *  GET  /api/wiki/exists?titles=A,B,C
 *  POST /api/wiki/exists  { titles: ["A", "B", "C"] }
 *
 * Returns: { success: true, exists: { "A": true, "B": false, ... } }
 */
const MAX_TITLES = 200

function uniqueTitles(input: unknown): string[] {
  if (!Array.isArray(input)) return []
  const set = new Set<string>()
  for (const v of input) {
    if (typeof v !== 'string') continue
    const t = v.trim()
    if (!t) continue
    set.add(t)
    if (set.size >= MAX_TITLES) break
  }
  return Array.from(set)
}

async function lookup(titles: string[]) {
  if (titles.length === 0) return {}
  const db = getDb()
  const docs = await db
    .select({ title: wikiPages.title })
    .from(wikiPages)
    .where(and(inArray(wikiPages.title, titles), ne(wikiPages.isDeleted, true)))

  const found = new Set<string>(docs.map((d) => d.title))
  const map: Record<string, boolean> = {}
  for (const t of titles) map[t] = found.has(t)
  return map
}

export async function GET(request: NextRequest) {
  try {
    const raw = request.nextUrl.searchParams.get('titles') || ''
    const titles = uniqueTitles(raw.split(',').map((s) => decodeURIComponent(s)))
    const exists = await lookup(titles)
    return NextResponse.json({ success: true, exists })
  } catch (e) {
    return NextResponse.json(
      { success: false, error: e instanceof Error ? e.message : '존재 여부 조회 실패' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const titles = uniqueTitles(body?.titles)
    const exists = await lookup(titles)
    return NextResponse.json({ success: true, exists })
  } catch (e) {
    return NextResponse.json(
      { success: false, error: e instanceof Error ? e.message : '존재 여부 조회 실패' },
      { status: 500 }
    )
  }
}
