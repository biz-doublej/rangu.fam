export interface WikiHeading {
  level: number
  title: string
  /** `==# 제목 #==` 처럼 처음부터 접어 둔 문단 */
  folded: boolean
}

/**
 * 한 줄이 문단 제목이면 단계·제목·기본 접힘 여부를 돌려준다.
 * - 나무위키식 `== 제목 ==`, 처음부터 접기 `==# 제목 #==`
 * - 마크다운식 `## 제목`
 */
export function parseHeadingLine(line: string): WikiHeading | null {
  const trimmed = line.trim()
  const namu = trimmed.match(/^(=+)\s*(.+?)\s*=+$/)
  if (namu) {
    const level = namu[1].length
    const inner = namu[2].trim()
    const folded = inner.match(/^#\s*(.+?)\s*#$/)
    if (folded) return { level, title: folded[1], folded: true }
    return { level, title: inner, folded: false }
  }
  // 마크다운 제목은 # 뒤에 띄어쓰기가 있어야 한다 (`#태그`, `#redirect` 는 제목이 아님)
  const markdown = trimmed.match(/^(#{1,6})\s+(.+)$/)
  if (markdown) return { level: markdown[1].length, title: markdown[2].trim(), folded: false }
  return null
}

/** 문단 접기 상태 — 기본 접힘과 사용자가 누른 것을 합친다. */
export function isFoldCollapsed(defaultFolded: boolean, toggled: boolean): boolean {
  return defaultFolded !== toggled
}

const REVEAL_EVENT = 'irang-wiki:reveal'

/**
 * 접힌 문단 안에 있는 요소로 이동하기 전에 부른다. 렌더러가 감싼 문단을 모두 펼친다.
 * 렌더러가 동기로 다시 그리므로 호출 직후 바로 스크롤해도 된다.
 */
export function revealWikiElement(element: Element | null) {
  if (!element || typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent(REVEAL_EVENT, { detail: element }))
}

export function onRevealWikiElement(handler: (element: Element) => void) {
  const listener = (event: Event) => handler((event as CustomEvent<Element>).detail)
  window.addEventListener(REVEAL_EVENT, listener)
  return () => window.removeEventListener(REVEAL_EVENT, listener)
}
