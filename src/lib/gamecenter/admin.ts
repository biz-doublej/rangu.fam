import { eq } from 'drizzle-orm'
import { getDb, type DB } from '@/db/client'
import { wikiUsers } from '@/db/schema/wiki'
import { GamecenterError, awardPointsTx, spendPointsTx, type PointsResult } from './points'
import { REASONS } from './rewards'
import { isValidRequestId } from './shop'

export interface AdjustInput {
  /** 대상 위키 사용자명 */
  username: string
  /** +지급 / -회수 (0 불가) */
  delta: number
  /** 사유 (필수) */
  note: string
  adminUsername: string
  requestId: string
  now?: Date
}

/**
 * 관리자 포인트 수동 조정. reason 은 'admin.adjust', 사유와 처리한 관리자는 ref_id 에 남긴다.
 * 하루 상한과 누적 획득에는 포함하지 않는다. 회수는 잔액보다 많이 할 수 없다.
 */
export async function adjustPoints(input: AdjustInput, db: DB = getDb()): Promise<PointsResult & { userId: string }> {
  const note = input.note.trim()
  if (note.length < 2) throw new GamecenterError('note_required', '조정 사유를 적어 주세요.')
  if (!Number.isSafeInteger(input.delta) || input.delta === 0 || Math.abs(input.delta) > 100_000) {
    throw new GamecenterError('invalid_amount', '조정할 포인트는 0 이 아닌 정수여야 합니다.')
  }
  if (!isValidRequestId(input.requestId)) {
    throw new GamecenterError('invalid_request_id', '요청 id 가 올바르지 않습니다.')
  }

  const [user] = await db
    .select({ id: wikiUsers.id })
    .from(wikiUsers)
    .where(eq(wikiUsers.username, input.username.trim().toLowerCase()))
    .limit(1)
  if (!user) throw new GamecenterError('user_not_found', '그 사용자명의 계정이 없습니다.', 404)

  const common = {
    userId: user.id,
    amount: Math.abs(input.delta),
    reason: REASONS.adminAdjust,
    refId: `${input.adminUsername}: ${note}`.slice(0, 200),
    idempotencyKey: `admin.adjust:${input.requestId}`,
    now: input.now,
  }
  const result = await db.transaction((tx) =>
    input.delta > 0
      ? awardPointsTx(tx, { ...common, countsToDailyCap: false, countsToLifetime: false })
      : spendPointsTx(tx, common)
  )
  return { ...result, userId: user.id }
}
