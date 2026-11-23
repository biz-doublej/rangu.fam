import { headingSlug } from './slug'

/**
 * 나무위키식 넘겨주기(redirect) 문법 파서.
 *
 * 문서 본문의 첫 번째 비어있지 않은 줄이 아래 형태면 넘겨주기 문서로 취급한다:
 *   #redirect 강한울
 *   # redirect 강한울
 *   #REDIRECT [[강한울]]
 *   #넘겨주기 강한울
 *
 * 서버(저장 시 isRedirect/redirectTarget 세팅)와 클라이언트(뷰어 자동 이동)가
 * 같은 규칙을 쓰도록 공용 모듈로 분리.
 */
export function parseRedirectTarget(content: string | null | undefined): string | null {
  if (!content) return null

  // 첫 몇 줄만 검사 (본문이 길어도 비용 고정)
  const lines = content.split('\n', 5)
  const firstLine = lines.map((l) => l.trim()).find((l) => l.length > 0)
  if (!firstLine) return null

  const m = firstLine.match(/^#\s*(?:redirect|넘겨주기)\s+(.+)$/i)
  if (!m) return null

  let target = m[1].trim()

  // `[[대상]]` / `[[대상|표시]]` 형태 허용
  const bracket = target.match(/^\[\[([^\]]+)\]\]/)
  if (bracket) target = bracket[1]
  target = target.split('|')[0].trim()

  return target || null
}

/**
 * `대상 문서#문단 제목` 을 문서와 문단으로 나눈다 (`#redirect 강한울#학생회 활동`).
 * 문단이 없으면 section 없이 문서만.
 */
export function splitRedirectTarget(target: string): { title: string; section?: string } {
  const index = target.indexOf('#')
  if (index <= 0) return { title: target.trim() }
  const title = target.slice(0, index).trim()
  const section = target.slice(index + 1).trim()
  return section ? { title, section } : { title }
}

/**
 * 넘겨줄 주소 — `?from=` 으로 출발 문서를 알리고, 문단이 있으면 그 문단의 앵커(#)로 내려간다.
 * 앵커는 렌더러의 제목 id 와 같은 규칙(headingSlug).
 */
export function redirectPath(target: string, from: string): string {
  const { title, section } = splitRedirectTarget(target)
  const anchor = section ? `#${encodeURIComponent(headingSlug(section) || 'section')}` : ''
  return `/wiki/${encodeURIComponent(title)}?from=${encodeURIComponent(from)}${anchor}`
}
