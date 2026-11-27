import { like, sql } from 'drizzle-orm'
import { getDb, type DB } from '@/db/client'
import { gcPointLedger } from '@/db/schema/gamecenter'
import { addDays, isoWeekId, kstDay, kstDayStart, kstWeekStartDay } from './kst'
import { awardPoints } from './points'
import { COMMON_REWARDS, REASONS } from './rewards'
import { ARCADE_GAMES, type ArcadeGame } from './runs'

/**
 * 게임별 주간·역대 랭킹과 주간 정산.
 * 순위는 사람마다 가장 좋은 판 하나로 매긴다 (점수가 같으면 먼저 낸 사람이 위).
 * 주는 월요일 0시 KST 에 시작한다.
 */

export type RankingPeriod = 'week' | 'all'

export interface RankingEntry {
  rank: number
  userId: string
  name: string
  score: number
  /** 엔진 결과 (테트리스: lines·tetrises / 등반: maxHeight·completedAt …) */
  result: Record<string, unknown> | null
  finishedAt: string
}

const rowsOf = (result: unknown) => ((result as any).rows ?? result) as any[]

/** 그 주(월요일 날짜)의 시작과 끝 순간 */
export function weekRange(weekStartDay: string): { from: Date; to: Date } {
  return { from: kstDayStart(weekStartDay), to: kstDayStart(addDays(weekStartDay, 7)) }
}

async function bestPerUser(db: DB, game: ArcadeGame, range: { from: Date; to: Date } | null, limit: number): Promise<RankingEntry[]> {
  const inRange = range ? sql`AND r.finished_at >= ${range.from.toISOString()}::timestamptz AND r.finished_at < ${range.to.toISOString()}::timestamptz` : sql``
  const rows = rowsOf(
    await db.execute(sql`
      SELECT b.user_id, b.score, b.result, b.finished_at, coalesce(u.display_name, u.username) AS name
      FROM (
        SELECT DISTINCT ON (r.user_id) r.user_id, r.score, r.stats -> 'result' AS result, r.finished_at
        FROM gc_runs r
        WHERE r.game = ${game} AND r.status = 'verified' AND r.score > 0 ${inRange}
        ORDER BY r.user_id, r.score DESC, r.finished_at ASC
      ) b
      JOIN wiki_users u ON u.id = b.user_id
      ORDER BY b.score DESC, b.finished_at ASC, b.user_id ASC
      LIMIT ${limit}
    `)
  )
  return rows.map((row, index) => ({
    rank: index + 1,
    userId: row.user_id,
    name: row.name,
    score: Number(row.score),
    result: row.result ?? null,
    finishedAt: new Date(row.finished_at).toISOString(),
  }))
}

export async function getRanking(
  input: { game: ArcadeGame; period: RankingPeriod; userId?: string; now?: Date; limit?: number },
  db: DB = getDb()
) {
  const now = input.now ?? new Date()
  const weekStart = kstWeekStartDay(kstDay(now))
  const range = input.period === 'week' ? weekRange(weekStart) : null
  // 내 순위도 같이 보려고 넉넉히 읽는다 (친구·위키 이용자 규모)
  const all = await bestPerUser(db, input.game, range, 500)
  return {
    game: input.game,
    period: input.period,
    weekStart,
    weekId: isoWeekId(weekStart),
    entries: all.slice(0, input.limit ?? 20),
    me: input.userId ? all.find((entry) => entry.userId === input.userId) ?? null : null,
  }
}

/** 그 주에 가장 크게 떨어진 사람 (등반) */
export async function biggestFallOfWeek(weekStartDay: string, db: DB = getDb()) {
  const { from, to } = weekRange(weekStartDay)
  const rows = rowsOf(
    await db.execute(sql`
      SELECT r.user_id, (r.stats -> 'result' ->> 'biggestFall')::int AS fall, coalesce(u.display_name, u.username) AS name
      FROM gc_runs r JOIN wiki_users u ON u.id = r.user_id
      WHERE r.game = 'climb' AND r.status = 'verified'
        AND r.finished_at >= ${from.toISOString()}::timestamptz AND r.finished_at < ${to.toISOString()}::timestamptz
        AND (r.stats -> 'result' ->> 'biggestFall')::int > 0
      ORDER BY fall DESC, r.finished_at ASC, r.user_id ASC
      LIMIT 1
    `)
  )
  return rows[0] ? { userId: rows[0].user_id as string, name: rows[0].name as string, fall: Number(rows[0].fall) } : null
}

/** 이 프로세스에서 이미 정산을 확인한 주 (매 요청마다 다시 조회하지 않게) */
const settledWeeks = new WeakMap<object, Set<string>>()

/**
 * 지난주 랭킹 정산: 테트리스·등반 1~3위와 ‘가장 크게 떨어진 사람’에게 지급한다.
 * 월요일 0시 KST 이후 첫 요청 때 불린다. 지급 키에 주 번호와 순위가 들어 있어 여러 번 불려도 한 번만 지급된다.
 */
export async function settleLastWeek(now: Date = new Date(), db: DB = getDb()): Promise<{ weekId: string; awards: number }> {
  const lastWeekStart = addDays(kstWeekStartDay(kstDay(now)), -7)
  const weekId = isoWeekId(lastWeekStart)

  const known = settledWeeks.get(db) ?? new Set<string>()
  settledWeeks.set(db, known)
  if (known.has(weekId)) return { weekId, awards: 0 }

  const [done] = await db
    .select({ id: gcPointLedger.id })
    .from(gcPointLedger)
    .where(like(gcPointLedger.idempotencyKey, `weekly:%:${weekId}:%`))
    .limit(1)
  if (done) {
    known.add(weekId)
    return { weekId, awards: 0 }
  }

  let awards = 0
  const range = weekRange(lastWeekStart)
  for (const game of ARCADE_GAMES) {
    const top = await bestPerUser(db, game, range, COMMON_REWARDS.weeklyRank.length)
    for (const entry of top) {
      const result = await awardPoints(
        {
          userId: entry.userId,
          amount: COMMON_REWARDS.weeklyRank[entry.rank - 1],
          reason: REASONS.weeklyRank,
          game,
          refId: weekId,
          idempotencyKey: `weekly:${game}:${weekId}:${entry.rank}`,
          countsToDailyCap: false,
          now,
        },
        db
      )
      if (result.status === 'applied') awards++
    }
  }
  const faller = await biggestFallOfWeek(lastWeekStart, db)
  if (faller) {
    const result = await awardPoints(
      {
        userId: faller.userId,
        amount: COMMON_REWARDS.weeklyBiggestFall,
        reason: REASONS.weeklyFall,
        game: 'climb',
        refId: weekId,
        idempotencyKey: `weekly:climb-fall:${weekId}:1`,
        countsToDailyCap: false,
        now,
      },
      db
    )
    if (result.status === 'applied') awards++
  }
  known.add(weekId)
  return { weekId, awards }
}

/** 화면 요청에 곁들여 부르는 정산 — 실패해도 원래 요청은 그대로 응답한다. */
export async function settleLastWeekQuietly(db: DB = getDb()) {
  try {
    await settleLastWeek(new Date(), db)
  } catch (error) {
    console.error('게임센터 주간 정산 오류:', error)
  }
}
