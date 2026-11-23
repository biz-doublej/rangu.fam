/**
 * 틀 문서를 DB 에서 읽는 서버 전용 도우미 — 문서 조회 API(틀 미리 싣기)와 틀 API 가 같이 쓴다.
 * 펼치기 자체는 순수 함수(src/lib/wiki/templates.ts)가 하고, 여기는 `틀:이름` 문서의 본문만 가져온다.
 *
 * 틀을 고치면 다음 조회부터 바로 반영된다 — 펼친 결과를 저장하지 않고 읽을 때마다 펼치기 때문에
 * 틀을 쓰는 문서의 캐시를 따로 지울 일이 없다.
 */
import { and, ilike, inArray, ne } from 'drizzle-orm'
import { getDb } from '@/db/client'
import { wikiPages } from '@/db/schema/wiki'
import { TEMPLATE_PREFIX, findTemplateCalls, templateNamesIn } from './templates'

/** 한 번에 불러오는 틀 수 상한 — 한 문서가 이보다 많은 틀을 쓰면 나머지는 펼치지 않는다 */
export const MAX_TEMPLATES_PER_REQUEST = 30

/** 이름 → 틀 본문 (없는 틀은 null) */
export async function loadTemplates(names: string[]): Promise<Record<string, string | null>> {
  const wanted = [...new Set(names.map((name) => name.trim()).filter(Boolean))].slice(0, MAX_TEMPLATES_PER_REQUEST)
  if (wanted.length === 0) return {}
  const db = getDb()
  const rows = await db
    .select({ title: wikiPages.title, content: wikiPages.content })
    .from(wikiPages)
    .where(and(inArray(wikiPages.title, wanted.map((name) => `${TEMPLATE_PREFIX}${name}`)), ne(wikiPages.isDeleted, true)))
  const found = new Map(rows.map((row) => [row.title.slice(TEMPLATE_PREFIX.length), row.content || '']))
  return Object.fromEntries(wanted.map((name) => [name, found.has(name) ? found.get(name)! : null]))
}

/** 문서 본문이 부르는 틀을 한 번에 불러온다 */
export async function loadTemplatesFor(content: string): Promise<Record<string, string | null>> {
  return loadTemplates(templateNamesIn(content))
}

/**
 * 이 틀을 쓰는 문서 — 본문에 `{{이름` 이 든 문서를 고른 뒤, 실제로 그 틀을 부르는지 다시 확인한다
 * (코드 블록 속 예시나 이름이 앞부분만 같은 틀은 뺀다).
 */
export async function findTemplateUsages(name: string, limit = 200): Promise<string[]> {
  const bare = name.trim()
  if (!bare) return []
  const db = getDb()
  const escaped = bare.replace(/[\\%_]/g, (ch) => `\\${ch}`)
  const rows = await db
    .select({ title: wikiPages.title, content: wikiPages.content })
    .from(wikiPages)
    .where(and(ilike(wikiPages.content, `%{{${escaped}%`), ne(wikiPages.isDeleted, true)))
    .limit(limit * 2)
  return rows
    .filter((row) => findTemplateCalls(row.content || '').some((call) => call.name === bare))
    .map((row) => row.title)
    .slice(0, limit)
}
