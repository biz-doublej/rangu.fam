/**
 * `[[…]]` 위키 링크의 대상을 읽는다. 렌더러(클릭), 문서 화면(이동), 관리 화면(새 창)이 같이 쓴다.
 *
 * - `[[문서]]`, `[[문서#문단 제목]]`        → 다른 문서 (#뒤는 그 문서의 문단으로 이동)
 * - `[[#문단 제목]]`                       → 지금 문서 안의 문단
 * - `[[../]]`, `[[../형제]]`, `[[/하위]]`  → 지금 문서 기준 상위·형제·하위 문서
 * - `[[:파일:주소]]`, `[[:분류:이름]]`      → 그림을 넣거나 분류에 넣지 않고 링크만
 * - `[[https://…]]`                        → 바깥 주소 (http·https 만)
 */
import { headingSlug } from './slug'

export type WikiLinkTarget =
  | { kind: 'section'; anchor: string }
  | { kind: 'page'; title: string; section?: string }
  | { kind: 'category'; name: string }
  | { kind: 'file'; src: string }
  | { kind: 'external'; url: string }

/** 상위 문서 이름 — `강한울/학생회/2026` → `강한울/학생회`. 상위가 없으면 그대로. */
function parentOf(title: string): string {
  const index = title.lastIndexOf('/')
  return index > 0 ? title.slice(0, index) : title
}

/** `../`, `../../형제`, `/하위` 를 지금 문서 이름 기준으로 푼다 */
function resolveRelative(target: string, currentTitle: string): string {
  if (target.startsWith('/')) {
    const child = target.slice(1).replace(/\/+$/, '')
    return child ? `${currentTitle}/${child}` : currentTitle
  }
  let base = currentTitle
  let rest = target
  while (rest.startsWith('../')) {
    base = parentOf(base)
    rest = rest.slice(3)
  }
  rest = rest.replace(/\/+$/, '')
  return rest ? `${base}/${rest}` : base
}

export function resolveWikiLink(raw: string, currentTitle = ''): WikiLinkTarget {
  const target = (raw || '').trim()

  if (/^https?:\/\/\S+$/i.test(target)) return { kind: 'external', url: target }

  // 앞의 : 는 "그림·분류로 넣지 말고 링크만" 이라는 뜻
  const linkOnly = target.startsWith(':') ? target.slice(1).trim() : target
  const file = linkOnly.match(/^(?:파일|file):(.+)$/i)
  if (target.startsWith(':') && file) return { kind: 'file', src: file[1].trim() }
  const category = linkOnly.match(/^(?:분류|category):(.+)$/i)
  if (category) return { kind: 'category', name: category[1].trim() }

  const hashIndex = linkOnly.indexOf('#')
  const pagePart = hashIndex >= 0 ? linkOnly.slice(0, hashIndex).trim() : linkOnly
  const section = hashIndex >= 0 ? linkOnly.slice(hashIndex + 1).trim() : ''

  if (!pagePart) return { kind: 'section', anchor: headingSlug(section) || 'section' }

  const title =
    currentTitle && (pagePart.startsWith('../') || pagePart === '..' || pagePart.startsWith('/'))
      ? resolveRelative(pagePart === '..' ? '../' : pagePart, currentTitle)
      : pagePart
  return section ? { kind: 'page', title, section } : { kind: 'page', title }
}

/**
 * 문서 화면 주소 — 렌더러가 넘긴 `문서` 또는 `문서#문단 제목` 을 받는다.
 * 문단은 렌더러의 제목 id 와 같은 규칙(headingSlug)으로 바꾼다.
 */
export function wikiPath(link: string): string {
  const target = resolveWikiLink(link)
  switch (target.kind) {
    case 'category':
      return `/wiki/category/${encodeURIComponent(target.name)}`
    case 'section':
      return `#${encodeURIComponent(target.anchor)}`
    case 'external':
      return target.url
    case 'file':
      return target.src
    case 'page': {
      const anchor = target.section ? `#${encodeURIComponent(headingSlug(target.section) || 'section')}` : ''
      return `/wiki/${encodeURIComponent(target.title)}${anchor}`
    }
  }
}
