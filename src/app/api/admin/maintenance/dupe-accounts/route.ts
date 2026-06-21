import { NextRequest, NextResponse } from 'next/server'
import { sql } from 'drizzle-orm'
import { getDb } from '@/db/client'
import { userCards } from '@/db/schema/cards'
import { wikiUsers } from '@/db/schema/wiki'
import { checkAdminAuth } from '@/lib/adminAuth'
import { resolveMemberIdForUser } from '@/lib/doublejAuth'

export const dynamic = 'force-dynamic'

/**
 * 중복 계정 진단 (읽기 전용).
 * 같은 멤버(resolveMemberIdForUser)로 해석되는 wiki_users 계정을 묶어,
 * 각 계정의 식별정보·SSO 여부·카드 보유량을 보여준다. 병합 전에 어떤 계정이
 * 현재 로그인(SSO) 계정인지 확인하는 용도. 아무것도 변경하지 않는다.
 *
 *   GET /api/admin/maintenance/dupe-accounts   (관리자)
 */
export async function GET(request: NextRequest) {
  try {
    const admin = await checkAdminAuth(request)
    if (!admin) {
      return NextResponse.json({ success: false, error: '관리자 권한이 필요합니다.' }, { status: 403 })
    }

    const db = getDb()

    const users = await db
      .select({
        id: wikiUsers.id,
        username: wikiUsers.username,
        email: wikiUsers.email,
        displayName: wikiUsers.displayName,
        ssoSubject: wikiUsers.ssoSubject,
        discordId: wikiUsers.discordId,
        discordUsername: wikiUsers.discordUsername,
        isActive: wikiUsers.isActive,
        lastLogin: wikiUsers.lastLogin,
        createdAt: wikiUsers.createdAt,
      })
      .from(wikiUsers)

    const counts = await db
      .select({
        userId: userCards.userId,
        unique: sql<number>`count(*)::int`,
        total: sql<number>`coalesce(sum(${userCards.quantity}), 0)::int`,
      })
      .from(userCards)
      .groupBy(userCards.userId)
    const countMap = new Map(counts.map((c) => [c.userId, { unique: c.unique, total: c.total }]))

    const groups = new Map<string, any[]>()
    for (const u of users) {
      const memberId = resolveMemberIdForUser(u)
      if (!memberId) continue
      const list = groups.get(memberId) ?? []
      list.push({
        id: u.id,
        username: u.username,
        displayName: u.displayName,
        email: u.email,
        hasSso: !!u.ssoSubject,
        discord: u.discordUsername || u.discordId || null,
        isActive: u.isActive,
        lastLogin: u.lastLogin,
        createdAt: u.createdAt,
        cards: countMap.get(u.id) ?? { unique: 0, total: 0 },
      })
      groups.set(memberId, list)
    }

    const duplicateGroups = [...groups.entries()]
      .filter(([, list]) => list.length > 1)
      .map(([memberId, accounts]) => ({
        memberId,
        count: accounts.length,
        // 카드 많은 순 — 보통 현재 쓰는 계정이 위로
        accounts: accounts.sort((a, b) => b.cards.total - a.cards.total),
      }))

    return NextResponse.json({
      success: true,
      note: '병합 시 keep=유지 계정 id, remove=몰수·비활성 계정 id 를 골라 merge-account 라우트에 넣으세요. hasSso=true 인 계정이 현재 로그인 계정일 가능성이 높습니다(그 계정을 보통 keep).',
      memberCount: groups.size,
      duplicateGroups,
    })
  } catch (error) {
    console.error('dupe-accounts 진단 오류:', error)
    return NextResponse.json(
      { success: false, error: '진단 중 오류가 발생했습니다.', detail: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}
