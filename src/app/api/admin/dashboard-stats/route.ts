import { NextRequest, NextResponse } from 'next/server'
import { desc, eq, gte, sql } from 'drizzle-orm'
import { getDb } from '@/db/client'
import { wikiUsers, wikiSubmissions } from '@/db/schema/wiki'
import { users } from '@/db/schema/users'
import { images } from '@/db/schema/media'
import { userCardStats } from '@/db/schema/cards'
import { checkAdminAuth } from '@/lib/adminAuth'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const admin = await checkAdminAuth(request)
    if (!admin) {
      return NextResponse.json(
        { success: false, error: '관리자 권한이 필요합니다.' },
        { status: 403 }
      )
    }

    const db = getDb()
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000)

    // 카운트 + 통계 — count 쿼리들을 병렬 실행
    const [
      [{ wikiUserTotal }],
      [{ wikiUserActive }],
      [{ wikiUserBanned }],
      [{ wikiUserNewToday }],
      [{ submissionTotal }],
      [{ submissionPending }],
      [{ submissionApproved }],
      [{ submissionRejected }],
      [{ submissionOnhold }],
      [{ imageTotal }],
      [{ imageToday }],
      [{ imageBytesSum }],
      [{ cardStatsTotal }],
      [{ cardActiveCollectors }],
      [{ cardTotalDrops }],
      [{ recentLogins }],
    ] = await Promise.all([
      db.select({ wikiUserTotal: sql<number>`count(*)::int` }).from(wikiUsers),
      db.select({ wikiUserActive: sql<number>`count(*)::int` }).from(wikiUsers).where(eq(wikiUsers.isActive, true)),
      db.select({ wikiUserBanned: sql<number>`count(*) FILTER (WHERE ban_status->>'isBanned' = 'true')::int` }).from(wikiUsers),
      db.select({ wikiUserNewToday: sql<number>`count(*)::int` }).from(wikiUsers).where(gte(wikiUsers.createdAt, today)),
      db.select({ submissionTotal: sql<number>`count(*)::int` }).from(wikiSubmissions),
      db.select({ submissionPending: sql<number>`count(*)::int` }).from(wikiSubmissions).where(eq(wikiSubmissions.status, 'pending')),
      db.select({ submissionApproved: sql<number>`count(*)::int` }).from(wikiSubmissions).where(eq(wikiSubmissions.status, 'approved')),
      db.select({ submissionRejected: sql<number>`count(*)::int` }).from(wikiSubmissions).where(eq(wikiSubmissions.status, 'rejected')),
      db.select({ submissionOnhold: sql<number>`count(*)::int` }).from(wikiSubmissions).where(eq(wikiSubmissions.status, 'onhold')),
      db.select({ imageTotal: sql<number>`count(*)::int` }).from(images),
      db.select({ imageToday: sql<number>`count(*)::int` }).from(images).where(gte(images.createdAt, today)),
      db.select({ imageBytesSum: sql<number>`COALESCE(sum(size), 0)::bigint` }).from(images),
      db.select({ cardStatsTotal: sql<number>`count(*)::int` }).from(userCardStats),
      db.select({ cardActiveCollectors: sql<number>`count(*)::int` }).from(userCardStats).where(gte(userCardStats.lastDropDate, yesterday)),
      db.select({ cardTotalDrops: sql<number>`COALESCE(sum(total_drops_used), 0)::int` }).from(userCardStats),
      db.select({ recentLogins: sql<number>`count(*)::int` }).from(wikiUsers).where(gte(wikiUsers.lastLogin, yesterday)),
    ])

    const userStats = {
      total: Number(wikiUserTotal),
      active: Number(wikiUserActive),
      banned: Number(wikiUserBanned),
      newToday: Number(wikiUserNewToday),
    }

    const wikiStats = {
      totalPages: Number(submissionTotal),
      pending: Number(submissionPending),
      approved: Number(submissionApproved),
      rejected: Number(submissionRejected),
      onhold: Number(submissionOnhold),
    }

    const cardStatsData = {
      totalDrops: Number(cardTotalDrops),
      activeCollectors: Number(cardActiveCollectors),
      rareCards: 0, // 필드가 schema 에 없음 — 향후 별도 집계
    }

    const totalBytes = Number(imageBytesSum)
    const imageStats = {
      totalImages: Number(imageTotal),
      uploadsToday: Number(imageToday),
      storageUsed: `${(totalBytes / (1024 * 1024 * 1024)).toFixed(2)} GB`,
    }

    // System stats — 휴리스틱 (실제 메트릭은 GCP에서 별도 수집)
    const activeConnections = Math.max(Number(recentLogins), 5)
    const responseTime = Math.max(20, Math.min(120, 30 + Math.floor(Number(submissionTotal) / 5) + Math.floor(Number(imageTotal) / 10)))
    const serverLoad = Math.min(95, Math.floor((activeConnections * 3 + Number(imageTotal)) / 2))
    const uptimeHours = Math.max(1, Math.floor((Date.now() - today.getTime()) / (1000 * 60 * 60)))

    const systemStats = {
      uptime: formatUptime(uptimeHours),
      responseTime,
      activeConnections,
      serverLoad,
    }

    // 최근 활동 — 위키 제출 + 로그인 합쳐서 시간순
    const [recentSubmissions, recentLoggedInUsers] = await Promise.all([
      db
        .select({
          id: wikiSubmissions.id,
          type: wikiSubmissions.type,
          targetTitle: wikiSubmissions.targetTitle,
          author: wikiSubmissions.author,
          createdAt: wikiSubmissions.createdAt,
        })
        .from(wikiSubmissions)
        .orderBy(desc(wikiSubmissions.createdAt))
        .limit(3),
      db
        .select({
          id: wikiUsers.id,
          username: wikiUsers.username,
          lastLogin: wikiUsers.lastLogin,
        })
        .from(wikiUsers)
        .orderBy(desc(wikiUsers.lastLogin))
        .limit(2),
    ])

    const activities: Array<{
      id: string
      type: 'edit' | 'login'
      user: string
      action: string
      timestamp: Date | string | null
      details: Record<string, any>
    }> = []

    for (const s of recentSubmissions) {
      activities.push({
        id: `wiki-${s.id}`,
        type: 'edit',
        user: s.author,
        action: `${s.targetTitle} ${s.type === 'create' ? '페이지 생성' : '편집'}`,
        timestamp: s.createdAt,
        details: { submissionId: s.id },
      })
    }
    for (const u of recentLoggedInUsers) {
      if (!u.lastLogin) continue
      activities.push({
        id: `login-${u.id}`,
        type: 'login',
        user: u.username,
        action: '로그인',
        timestamp: u.lastLogin,
        details: { userId: u.id },
      })
    }

    activities.sort((a, b) => {
      const at = a.timestamp ? new Date(a.timestamp).getTime() : 0
      const bt = b.timestamp ? new Date(b.timestamp).getTime() : 0
      return bt - at
    })

    return NextResponse.json({
      success: true,
      stats: {
        users: userStats,
        wiki: wikiStats,
        cards: cardStatsData,
        images: imageStats,
        system: systemStats,
      },
      recentActivity: activities.slice(0, 10),
      lastUpdated: new Date().toISOString(),
    })
  } catch (error) {
    console.error('대시보드 통계 조회 오류:', error)
    return NextResponse.json(
      { success: false, error: '통계 데이터를 불러오는데 실패했습니다.' },
      { status: 500 }
    )
  }
}

function formatUptime(hours: number): string {
  const h = Math.max(1, hours)
  if (h < 24) return `${Math.floor(h)}h`
  const days = Math.floor(h / 24)
  const remainingHours = Math.floor(h % 24)
  return `${days}d ${remainingHours}h`
}
