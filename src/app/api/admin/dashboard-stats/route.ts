import { NextRequest, NextResponse } from 'next/server'
import { desc, eq, gte, ne, sql } from 'drizzle-orm'
import { getDb } from '@/db/client'
import { wikiPages, wikiReports, wikiRevisions, wikiSubmissions, wikiUsers } from '@/db/schema/wiki'
import { images } from '@/db/schema/media'
import { checkAdminAuth } from '@/lib/adminAuth'

export const dynamic = 'force-dynamic'

function count(column = sql`*`) {
  return sql<number>`count(${column})::int`
}

/** 관리자 개요: 실제 집계와 서버 정보만 돌려준다. */
export async function GET(request: NextRequest) {
  try {
    if (!(await checkAdminAuth(request))) {
      return NextResponse.json({ success: false, error: '관리자 권한이 필요합니다.' }, { status: 403 })
    }

    const db = getDb()
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

    const dbStarted = Date.now()
    await db.execute(sql`SELECT 1`)
    const dbLatencyMs = Date.now() - dbStarted

    const [[userStats], [pageStats], [submissionStats], [imageStats], [editStats], openReports, recentEdits, recentSubmissions] =
      await Promise.all([
        db
          .select({
            total: count(),
            active: sql<number>`count(*) FILTER (WHERE ${wikiUsers.isActive})::int`,
            banned: sql<number>`count(*) FILTER (WHERE ${wikiUsers.banStatus}->>'isBanned' = 'true')::int`,
            newToday: sql<number>`count(*) FILTER (WHERE ${wikiUsers.createdAt} >= ${today})::int`,
            activeWeek: sql<number>`count(*) FILTER (WHERE ${wikiUsers.lastLogin} >= ${weekAgo})::int`,
          })
          .from(wikiUsers),
        db.select({ total: count() }).from(wikiPages).where(ne(wikiPages.isDeleted, true)),
        db
          .select({
            pending: sql<number>`count(*) FILTER (WHERE ${wikiSubmissions.status} = 'pending')::int`,
            onhold: sql<number>`count(*) FILTER (WHERE ${wikiSubmissions.status} = 'onhold')::int`,
            approved: sql<number>`count(*) FILTER (WHERE ${wikiSubmissions.status} = 'approved')::int`,
            rejected: sql<number>`count(*) FILTER (WHERE ${wikiSubmissions.status} = 'rejected')::int`,
          })
          .from(wikiSubmissions),
        db
          .select({ total: count(), bytes: sql<number>`COALESCE(sum(${images.size}), 0)::bigint` })
          .from(images),
        db.select({ week: count() }).from(wikiRevisions).where(gte(wikiRevisions.timestampAt, weekAgo)),
        db
          .select({ total: count() })
          .from(wikiReports)
          .where(eq(wikiReports.status, 'open'))
          .then((rows) => rows[0]?.total ?? 0)
          .catch(() => null),
        db
          .select({
            id: wikiRevisions.id,
            title: wikiPages.title,
            author: wikiRevisions.author,
            summary: wikiRevisions.summary,
            timestamp: wikiRevisions.timestampAt,
          })
          .from(wikiRevisions)
          .innerJoin(wikiPages, eq(wikiPages.id, wikiRevisions.pageId))
          .orderBy(desc(wikiRevisions.timestampAt))
          .limit(8),
        db
          .select({
            id: wikiSubmissions.id,
            title: wikiSubmissions.targetTitle,
            author: wikiSubmissions.author,
            createdAt: wikiSubmissions.createdAt,
          })
          .from(wikiSubmissions)
          .where(eq(wikiSubmissions.status, 'pending'))
          .orderBy(desc(wikiSubmissions.createdAt))
          .limit(5),
      ])

    const memory = process.memoryUsage()
    return NextResponse.json({
      success: true,
      stats: {
        users: userStats,
        pages: { total: pageStats.total, editsThisWeek: editStats.week },
        submissions: submissionStats,
        reports: { open: openReports },
        images: { total: imageStats.total, bytes: Number(imageStats.bytes) },
      },
      system: {
        revision: process.env.K_REVISION || 'local',
        service: process.env.K_SERVICE || 'local',
        nodeVersion: process.version,
        instanceUptimeSeconds: Math.round(process.uptime()),
        memoryMb: Math.round(memory.rss / 1024 / 1024),
        dbLatencyMs,
      },
      recentEdits,
      recentSubmissions,
      generatedAt: now.toISOString(),
    })
  } catch (error) {
    console.error('대시보드 통계 오류:', error)
    return NextResponse.json({ success: false, error: '통계를 불러오지 못했습니다.' }, { status: 500 })
  }
}
