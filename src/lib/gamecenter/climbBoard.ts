import { asc, eq, sql } from 'drizzle-orm'
import { getDb, type DB } from '@/db/client'
import { gcClimbSigns } from '@/db/schema/gamecenter'
import { wikiUsers } from '@/db/schema/wiki'
import { CLIMB_MAP } from '@/games/climb/map'
import { kstDay, kstWeekStartDay } from './kst'
import { GamecenterError } from './points'
import { biggestFallOfWeek } from './ranking'

/** 랑구 등반의 친구 요소: 최고 높이 깃발, 표지판(구역당 1개, 20자), 이번 주 가장 크게 떨어진 사람 */

export const SIGN_MAX_LENGTH = 20
const rowsOf = (result: unknown) => ((result as any).rows ?? result) as any[]

/** 표지판 글을 정리한다: 줄바꿈·제어 문자를 없애고 20자로 자른다. */
export function cleanSignText(raw: unknown): string {
  return Array.from(String(raw ?? '').replace(/[\u0000-\u001f\u007f]+/g, ' ').replace(/\s+/g, ' ').trim())
    .slice(0, SIGN_MAX_LENGTH)
    .join('')
}

async function myBest(userId: string, db: DB) {
  const [row] = rowsOf(
    await db.execute(sql`
      SELECT coalesce(max((stats -> 'result' ->> 'maxHeight')::int), 0) AS height,
             coalesce(max((stats -> 'result' ->> 'maxZone')::int), 1) AS zone,
             min((stats -> 'result' ->> 'completedAt')::int) AS time
      FROM gc_runs WHERE user_id = ${userId} AND game = 'climb' AND status = 'verified'
    `)
  )
  return { bestHeight: Number(row?.height ?? 0), maxZone: Number(row?.zone ?? 1), bestTime: row?.time === null || row?.time === undefined ? null : Number(row.time) }
}

export async function getClimbBoard(userId: string, now: Date = new Date(), db: DB = getDb()) {
  const flags = rowsOf(
    await db.execute(sql`
      SELECT r.user_id, coalesce(u.display_name, u.username) AS name, max((r.stats -> 'result' ->> 'maxHeight')::int) AS height
      FROM gc_runs r JOIN wiki_users u ON u.id = r.user_id
      WHERE r.game = 'climb' AND r.status = 'verified'
      GROUP BY r.user_id, u.display_name, u.username
      HAVING max((r.stats -> 'result' ->> 'maxHeight')::int) > 0
      ORDER BY height DESC
      LIMIT 30
    `)
  ).map((row) => ({ userId: row.user_id as string, name: row.name as string, height: Number(row.height), mine: row.user_id === userId }))

  const signs = await db
    .select({
      zone: gcClimbSigns.zone,
      text: gcClimbSigns.text,
      author: sql<string>`coalesce(${wikiUsers.displayName}, ${wikiUsers.username})`,
      mine: sql<boolean>`${gcClimbSigns.userId} = ${userId}`,
    })
    .from(gcClimbSigns)
    .innerJoin(wikiUsers, eq(wikiUsers.id, gcClimbSigns.userId))
    .orderBy(asc(gcClimbSigns.zone))

  return {
    mapVersion: CLIMB_MAP.version,
    flags,
    signs,
    weeklyFall: await biggestFallOfWeek(kstWeekStartDay(kstDay(now)), db),
    me: await myBest(userId, db),
  }
}

/** 표지판 남기기. 그 구역에 올라가 본 사람만 쓸 수 있고, 구역당 하나라 새로 쓰면 이전 글을 덮는다. */
export async function writeClimbSign(input: { userId: string; zone: unknown; text: unknown; now?: Date }, db: DB = getDb()) {
  const zone = Number(input.zone)
  if (!Number.isInteger(zone) || zone < 1 || zone > CLIMB_MAP.zones.length) {
    throw new GamecenterError('invalid_zone', '구역이 올바르지 않습니다.')
  }
  const text = cleanSignText(input.text)
  if (!text) throw new GamecenterError('empty_sign', '표지판에 남길 말을 적어 주세요.')
  if ((await myBest(input.userId, db)).maxZone < zone) {
    throw new GamecenterError('zone_not_reached', '그 구역에 올라가 본 사람만 표지판을 남길 수 있습니다.', 403)
  }
  const now = input.now ?? new Date()
  const [row] = await db
    .insert(gcClimbSigns)
    .values({ zone, userId: input.userId, text, updatedAt: now })
    .onConflictDoUpdate({ target: gcClimbSigns.zone, set: { userId: input.userId, text, updatedAt: now } })
    .returning()
  return row
}
