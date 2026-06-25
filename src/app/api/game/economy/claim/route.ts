import { NextRequest, NextResponse } from 'next/server'
import { and, eq, sql } from 'drizzle-orm'
import { getAuthenticatedWikiUser } from '@/lib/doublejAuth'
import { getDb } from '@/db/client'
import { tacticsQuestProgress, tacticsPassProgress } from '@/db/schema/tacticsEconomy'
import { findQuest, findPassTier, periodKeyFor, PASS_SEASON, type Currency } from '@/lib/tactics/economyRules'
import { addCurrency, grantItem, getWallet } from '@/lib/tactics/economyService'

export const dynamic = 'force-dynamic'

/**
 * 퀘스트/패스 보상 수령 — 서버 검증 후 지급. [경제 E1]
 * 모든 보상 지급은 서버권위(클라가 '완료'라 우기지 못함 — 진행은 match-result 가 적립).
 *   POST { kind: 'quest', id: questId }   → 퀘스트 완료 시 보상 지급
 *   POST { kind: 'pass',  id: level }      → 해당 티어 XP 도달 시 보상 지급
 */
export async function POST(request: NextRequest) {
  const user = await getAuthenticatedWikiUser(request)
  if (!user) return NextResponse.json({ success: false, error: 'not_authenticated' }, { status: 401 })
  const userId = (user as { id: string }).id
  const body = (await request.json().catch(() => null)) as { kind?: string; id?: string | number } | null
  const now = new Date()
  const db = getDb()

  try {
    if (body?.kind === 'quest') {
      const def = findQuest(String(body?.id ?? ''))
      if (!def) return NextResponse.json({ success: false, error: 'quest_not_found' }, { status: 404 })
      const periodKey = periodKeyFor(def.period, now)

      const out = await db.transaction(async (tx) => {
        const [row] = await tx
          .select()
          .from(tacticsQuestProgress)
          .where(
            and(
              eq(tacticsQuestProgress.userId, userId),
              eq(tacticsQuestProgress.questId, def.id),
              eq(tacticsQuestProgress.periodKey, periodKey),
            ),
          )
          .limit(1)
        if (!row || row.progress < def.target) return { error: 'not_complete' as const }

        // 멱등 수령 — claimed=false 인 행만 true 로(동시 클릭 방어).
        const claimedRows = await tx
          .update(tacticsQuestProgress)
          .set({ claimed: true, updatedAt: new Date() })
          .where(
            and(
              eq(tacticsQuestProgress.userId, userId),
              eq(tacticsQuestProgress.questId, def.id),
              eq(tacticsQuestProgress.periodKey, periodKey),
              eq(tacticsQuestProgress.claimed, false),
            ),
          )
          .returning({ id: tacticsQuestProgress.id })
        if (claimedRows.length === 0) return { error: 'already_claimed' as const }

        await addCurrency(tx, userId, def.reward.currency, def.reward.amount)
        const wallet = await getWallet(tx, userId)
        return { wallet, reward: def.reward }
      })

      if ('error' in out) {
        return NextResponse.json({ success: false, error: out.error }, { status: out.error === 'already_claimed' ? 409 : 400 })
      }
      return NextResponse.json({ success: true, ...out })
    }

    if (body?.kind === 'pass') {
      const level = Number(body?.id)
      const tier = findPassTier(level)
      if (!tier) return NextResponse.json({ success: false, error: 'tier_not_found' }, { status: 404 })

      const out = await db.transaction(async (tx) => {
        await tx
          .insert(tacticsPassProgress)
          .values({ userId, season: PASS_SEASON })
          .onConflictDoNothing({ target: [tacticsPassProgress.userId, tacticsPassProgress.season] })

        // 원자적: xp 도달 + 미수령 일 때만 claimedTiers 에 level 추가.
        const levelJson = JSON.stringify([level])
        const res = await tx.execute(sql`
          UPDATE "tactics_pass_progress"
          SET "claimed_tiers" = "claimed_tiers" || ${levelJson}::jsonb, "updated_at" = now()
          WHERE "user_id" = ${userId} AND "season" = ${PASS_SEASON}
            AND "xp" >= ${tier.xpRequired}
            AND NOT ("claimed_tiers" @> ${levelJson}::jsonb)
          RETURNING "claimed_tiers" AS claimed_tiers
        `)
        const rows = ((res as { rows?: unknown[] }).rows ?? res) as Array<{ claimed_tiers: number[] }>
        if (!rows || rows.length === 0) {
          const [row] = await tx
            .select()
            .from(tacticsPassProgress)
            .where(and(eq(tacticsPassProgress.userId, userId), eq(tacticsPassProgress.season, PASS_SEASON)))
            .limit(1)
          const xp = row?.xp ?? 0
          const reason: 'locked' | 'already_claimed' = xp < tier.xpRequired ? 'locked' : 'already_claimed'
          return { error: reason }
        }

        if (tier.reward.kind === 'item' && tier.reward.itemId) {
          await grantItem(tx, userId, tier.reward.itemId)
        } else {
          await addCurrency(tx, userId, tier.reward.kind as Currency, tier.reward.amount ?? 0)
        }
        const wallet = await getWallet(tx, userId)
        return { wallet, claimedTiers: rows[0].claimed_tiers, reward: tier.reward }
      })

      if ('error' in out) {
        return NextResponse.json({ success: false, error: out.error }, { status: out.error === 'already_claimed' ? 409 : 400 })
      }
      return NextResponse.json({ success: true, ...out })
    }

    return NextResponse.json({ success: false, error: 'bad_kind' }, { status: 400 })
  } catch (e) {
    console.error('economy claim 오류:', e)
    return NextResponse.json({ success: false, error: 'server_error' }, { status: 500 })
  }
}
