import { inArray } from 'drizzle-orm'
import { getDb } from '@/db/client'
import { wikiUsers } from '@/db/schema/wiki'

/** 기록에 저장된 작성자 ID로 현재 표시 이름을 찾는다. 옛 기록은 ID가 없어 호출부가 저장값을 쓴다. */
export async function loadDisplayNames(ids: Array<string | null | undefined>): Promise<Map<string, string>> {
  const unique = Array.from(new Set(ids.filter((id): id is string => Boolean(id))))
  if (unique.length === 0) return new Map()
  const rows = await getDb()
    .select({ id: wikiUsers.id, displayName: wikiUsers.displayName, username: wikiUsers.username })
    .from(wikiUsers)
    .where(inArray(wikiUsers.id, unique))
  return new Map(rows.map((row) => [row.id, row.displayName || row.username]))
}
