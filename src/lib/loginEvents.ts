import type { NextRequest } from 'next/server'
import { and, desc, eq, notInArray } from 'drizzle-orm'
import { getDb } from '@/db/client'
import { wikiLoginEvents } from '@/db/schema/wiki'

const MAX_EVENTS_PER_USER = 50

function resolveClientIp(request: NextRequest): string | null {
  const cloudflareIp = request.headers.get('cf-connecting-ip')
  if (cloudflareIp) return cloudflareIp.trim()
  const forwarded = request.headers.get('x-forwarded-for')?.split(',').map((part) => part.trim()).filter(Boolean)
  return forwarded?.[forwarded.length - 1] || null
}

/** 로그인 성공을 기록한다. 기록 실패가 로그인을 막으면 안 되므로 오류는 로그만 남긴다. */
export async function recordLoginEvent(request: NextRequest, userId: string, provider: 'google' | 'naver') {
  try {
    const db = getDb()
    await db.insert(wikiLoginEvents).values({
      userId,
      provider,
      ip: resolveClientIp(request),
      userAgent: request.headers.get('user-agent')?.slice(0, 400) || null,
    })
    const keep = await db
      .select({ id: wikiLoginEvents.id })
      .from(wikiLoginEvents)
      .where(eq(wikiLoginEvents.userId, userId))
      .orderBy(desc(wikiLoginEvents.createdAt))
      .limit(MAX_EVENTS_PER_USER)
    await db.delete(wikiLoginEvents).where(
      and(
        eq(wikiLoginEvents.userId, userId),
        notInArray(wikiLoginEvents.id, keep.map((row) => row.id))
      )
    )
  } catch (error) {
    console.error('로그인 내역 기록 실패:', error)
  }
}
