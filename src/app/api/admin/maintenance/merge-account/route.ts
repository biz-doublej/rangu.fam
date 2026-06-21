import { NextRequest, NextResponse } from 'next/server'
import { eq, or, sql } from 'drizzle-orm'
import { getDb } from '@/db/client'
import { cardDrops, cardTrades, userCards, userCardStats, userPerks } from '@/db/schema/cards'
import { wikiUsers } from '@/db/schema/wiki'
import { checkAdminAuth } from '@/lib/adminAuth'
import { resolveMemberIdForUser } from '@/lib/doublejAuth'

export const dynamic = 'force-dynamic'

/**
 * 중복 계정 병합 — remove 계정의 카드/혜택을 몰수하고 계정을 비활성화한다.
 * (옛 계정이 보유했던 카드는 이전되지 않고 사라진다 = 요청사항.)
 * keep 계정은 건드리지 않는다. wiki_users row 는 삭제하지 않고 isActive=false 로만 바꿔
 * FK·기록을 보존한다.
 *
 *   GET /api/admin/maintenance/merge-account?keep=<id>&remove=<id>            → dry-run
 *   GET /api/admin/maintenance/merge-account?keep=<id>&remove=<id>&confirm=1  → 실행
 *   ...&force=1  → remove 계정에 SSO(ssoSubject)가 붙어 있어도 강행 (주의: 로그인 영향 가능)
 *
 * 먼저 /api/admin/maintenance/dupe-accounts 로 정확한 id 를 확인하세요.
 */
export async function GET(request: NextRequest) {
  try {
    const admin = await checkAdminAuth(request)
    if (!admin) {
      return NextResponse.json({ success: false, error: '관리자 권한이 필요합니다.' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const keepId = searchParams.get('keep') || ''
    const removeId = searchParams.get('remove') || ''
    const confirm = searchParams.get('confirm') === '1'
    const force = searchParams.get('force') === '1'

    if (!keepId || !removeId) {
      return NextResponse.json(
        { success: false, error: 'keep, remove 쿼리 파라미터(계정 id)가 필요합니다.' },
        { status: 400 }
      )
    }
    if (keepId === removeId) {
      return NextResponse.json({ success: false, error: 'keep 과 remove 가 같습니다.' }, { status: 400 })
    }

    const db = getDb()
    const [keep] = await db.select().from(wikiUsers).where(eq(wikiUsers.id, keepId)).limit(1)
    const [remove] = await db.select().from(wikiUsers).where(eq(wikiUsers.id, removeId)).limit(1)
    if (!keep || !remove) {
      return NextResponse.json({ success: false, error: '계정을 찾을 수 없습니다.' }, { status: 404 })
    }

    const keepMember = resolveMemberIdForUser(keep)
    const removeMember = resolveMemberIdForUser(remove)
    if (keepMember && removeMember && keepMember !== removeMember) {
      return NextResponse.json(
        {
          success: false,
          error: `두 계정이 다른 멤버로 해석됩니다 (keep=${keepMember}, remove=${removeMember}). 잘못된 id 일 수 있어 중단합니다.`,
        },
        { status: 409 }
      )
    }

    // 몰수될 카드 집계 (dry-run 표시용)
    const [c] = await db
      .select({
        unique: sql<number>`count(*)::int`,
        total: sql<number>`coalesce(sum(${userCards.quantity}), 0)::int`,
      })
      .from(userCards)
      .where(eq(userCards.userId, removeId))
    const forfeit = c ?? { unique: 0, total: 0 }

    const removeHasSso = !!remove.ssoSubject
    const warnings: string[] = []
    if (removeHasSso) {
      warnings.push(
        'remove 계정에 SSO(ssoSubject)가 붙어 있습니다. 이 계정이 현재 로그인 계정이면 비활성화 시 로그인이 막힐 수 있습니다. 확실하면 &force=1 로 강행하세요.'
      )
    }

    const plan = {
      keep: { id: keep.id, username: keep.username, displayName: keep.displayName, hasSso: !!keep.ssoSubject },
      remove: { id: remove.id, username: remove.username, displayName: remove.displayName, hasSso: removeHasSso },
      willForfeit: forfeit,
    }

    if (!confirm) {
      return NextResponse.json({
        success: true,
        applied: false,
        message: 'dry-run — ?confirm=1 로 호출하면 remove 계정의 카드를 몰수하고 비활성화합니다.',
        plan,
        warnings,
      })
    }

    if (removeHasSso && !force) {
      return NextResponse.json(
        {
          success: false,
          error: 'remove 계정에 SSO 가 붙어 있어 중단했습니다. 의도한 게 맞으면 &force=1 을 추가하세요.',
          plan,
          warnings,
        },
        { status: 409 }
      )
    }

    const now = new Date()

    // remove 계정의 카드/혜택 몰수 — 카드는 이전하지 않고 삭제
    await db.delete(userCards).where(eq(userCards.userId, removeId))
    await db.delete(cardDrops).where(eq(cardDrops.userId, removeId))
    try {
      await db.delete(userCardStats).where(eq(userCardStats.userId, removeId))
    } catch {}
    try {
      await db.delete(userPerks).where(eq(userPerks.userId, removeId))
    } catch {}
    try {
      await db
        .delete(cardTrades)
        .where(or(eq(cardTrades.fromUserId, removeId), eq(cardTrades.toUserId, removeId)))
    } catch {}

    // 계정 비활성화 (행은 보존)
    await db
      .update(wikiUsers)
      .set({ isActive: false, updatedAt: now })
      .where(eq(wikiUsers.id, removeId))

    return NextResponse.json({
      success: true,
      applied: true,
      message: `병합 완료 — remove 계정(${remove.displayName || remove.username}) 카드 ${forfeit.total}장 몰수 + 계정 비활성화. keep 계정(${keep.displayName || keep.username})은 그대로입니다.`,
      plan,
      appliedBy: admin.username,
    })
  } catch (error) {
    console.error('merge-account 오류:', error)
    return NextResponse.json(
      { success: false, error: '병합 중 오류가 발생했습니다.', detail: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}
