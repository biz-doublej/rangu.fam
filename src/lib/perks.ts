import { eq } from 'drizzle-orm'
import { getDb } from '@/db/client'
import { userPerks, type UserPerks } from '@/db/schema/cards'

/**
 * user_perks row 조회 — 가드.
 * 테이블이 아직 없거나(마이그레이션 전) row 가 없으면 null 반환.
 * 호출자는 null 을 "혜택 0" 으로 취급 → 기존 기능은 영향 없음.
 */
export async function getPerks(userId: string): Promise<UserPerks | null> {
  try {
    const db = getDb()
    const [row] = await db
      .select()
      .from(userPerks)
      .where(eq(userPerks.userId, userId))
      .limit(1)
    return row ?? null
  } catch {
    return null
  }
}
