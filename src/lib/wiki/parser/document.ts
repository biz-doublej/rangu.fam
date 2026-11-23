/**
 * 문서 단위 AST 도우미 — 렌더러와 같은 블록 AST 를 걸어 다니며 목차·글자·링크·표를 꺼낸다.
 *
 * 렌더러처럼 먼저 원문을 다듬는다: `//` 주석과 `\` 이스케이프(prepareSource) → 각주(prepareFootnotes).
 * 접기(>>>)·꾸민 상자(:::상자)·배너상자 본문은 렌더러가 다시 블록으로 그리므로 그 안까지 들어간다.
 */
import { prepareFootnotes, type PreparedFootnotes } from '@/lib/wiki/footnotes'
import { prepareSource } from '@/lib/wiki/source'
import { createHeadingSlugger } from '@/lib/wiki/slug'
import { parseCellDirectives } from '@/lib/tableColors'
import { resolveWikiLink } from '@/lib/wiki/links'
import { nestedBody, parseBlocks, parseMarkdownTableRow, type Block } from './blocks'
import { inlineLinks, inlineText, parseInline, type InlineLink } from './inline'

export interface ParsedDocument {
  blocks: Block[]
  footnotes: PreparedFootnotes
}

/** 렌더러와 같은 순서로 다듬고 블록으로 나눈다 */
export function parseDocument(content: string): ParsedDocument {
  const footnotes = prepareFootnotes(prepareSource(content || ''))
  return { blocks: parseBlocks(footnotes.text), footnotes }
}

/**
 * 블록을 문서 순서대로(안에 품은 블록까지) 방문한다. depth 는 몇 겹 안쪽인지.
 * 안쪽 블록은 그 본문을 다시 나눈 결과라 줄 번호는 본문 기준이다.
 */
export function walkBlocks(blocks: Block[], visit: (block: Block, depth: number) => void, depth = 0): void {
  for (const block of blocks) {
    visit(block, depth)
    const body = nestedBody(block)
    if (body && body.trim()) walkBlocks(parseBlocks(body), visit, depth + 1)
  }
}

/** `|키=값` 줄들에서 값만 (정보상자) */
function paramValues(paramsText: string): string[] {
  return paramsText
    .split('\n')
    .map((line) => line.match(/^\s*\|?\s*[^=|]+?\s*=(.*)$/)?.[1]?.trim() || '')
    .filter(Boolean)
}

const BANNER_TEXT_KEYS = ['윗글', '제목', '덧글', '사진설명', '아래왼쪽', '아래', '아래오른쪽']

/**
 * 블록이 품은 인라인 글 — 렌더러가 인라인 문법으로 그리는 부분.
 * text: 읽히는 글자로 셀 것 (정보상자·탭·분류 줄은 글이 아니라 빼고), links: 링크를 셀 것 (정보상자 안 링크도 링크).
 */
export function blockSources(block: Block): { text: string[]; links: string[] } {
  switch (block.type) {
    case 'paragraph':
      return { text: [block.text], links: [block.text] }
    case 'heading':
      return { text: [block.title], links: [block.title] }
    case 'list': {
      const items = block.items.map((item) => item.content)
      return { text: items, links: items }
    }
    case 'quote': {
      const lines = block.lines.map((line) => line.trim().replace(/^(?:>[ \t]?)+/, ''))
      return { text: lines, links: lines }
    }
    case 'table': {
      const cells = block.rows.flatMap((row) => row.split('||').slice(1, -1).map((cell) => parseCellDirectives(cell.trim()).content))
      return { text: cells, links: cells }
    }
    case 'markdown-table': {
      const cells = [block.lines[0], ...block.lines.slice(2)].flatMap((row) =>
        parseMarkdownTableRow(row).map((cell) => parseCellDirectives(cell).content)
      )
      return { text: cells, links: cells }
    }
    case 'callout':
    case 'box':
      return { text: [block.content], links: [block.content] }
    case 'timeline': {
      const lines = block.body.split('\n').map((line) => line.split('|').map((part) => part.trim()).join(' '))
      return { text: lines, links: lines }
    }
    case 'poll':
      return { text: [block.question, ...block.options], links: [block.question, ...block.options] }
    case 'citation': {
      const parts = [block.quote, block.source || ''].filter(Boolean)
      return { text: parts, links: block.url ? [...parts, block.url] : parts }
    }
    case 'details':
      return { text: [block.summary], links: [block.summary] }
    case 'footnote-def': {
      const body = block.text.replace(/^\[\*[^\]]*\]\s*/, '')
      return { text: [body], links: [body] }
    }
    case 'person-infobox':
    case 'group-infobox':
      return { text: [], links: paramValues(block.paramsText) }
    case 'inline-infobox':
      return { text: [], links: block.rows.map((row) => row.value) }
    case 'banner':
      return { text: [], links: BANNER_TEXT_KEYS.map((key) => block.spec.params[key] || '').filter(Boolean) }
    case 'tabs':
      return { text: [], links: block.items.map((item) => `[[${item.link}|${item.label}]]`) }
    case 'category-line':
      return { text: [], links: block.categories.map((name) => `[[분류:${name}]]`) }
    case 'file':
      return { text: [], links: [`[[파일:${block.path}]]`] }
    default:
      return { text: [], links: [] }
  }
}

export interface DocumentHeading {
  level: number
  title: string
  anchor: string
  folded: boolean
}

/**
 * 목차 — 렌더러가 제목으로 그리는 것만, 그리는 순서 그대로(접기·상자 안 포함), 렌더러와 같은 id 규칙으로.
 * (예전 서버 목차는 줄만 훑어서 알림 상자 안의 `== 글 ==` 처럼 제목으로 안 그려지는 줄도 넣었다)
 */
export function documentHeadings(content: string): DocumentHeading[] {
  const slugger = createHeadingSlugger()
  const headings: DocumentHeading[] = []
  walkBlocks(parseDocument(content).blocks, (block) => {
    if (block.type === 'heading') {
      headings.push({ level: block.level, title: block.title, anchor: slugger(block.title), folded: block.folded })
    }
  })
  return headings
}

/** 블록 하나의 읽히는 글자 (줄바꿈 유지) */
export function blockText(block: Block): string {
  return blockSources(block)
    .text.map((source) => inlineText(parseInline(source)))
    .join('\n')
}

/** 문서 안 링크 — 위키 링크 대상과 바깥 주소 (코드 안은 빼고, 정보상자·표·각주 안은 포함) */
export function documentLinks(content: string): InlineLink[] {
  const parsed = parseDocument(content)
  const links: InlineLink[] = []
  walkBlocks(parsed.blocks, (block) => {
    for (const source of blockSources(block).links) links.push(...inlineLinks(parseInline(source)))
  })
  // 그 자리 각주의 내용 안 링크
  for (const note of [...parsed.footnotes.inline, ...Object.values(parsed.footnotes.definitions)]) {
    links.push(...inlineLinks(parseInline(note)))
  }
  return links
}

/**
 * 이 문서가 가리키는 위키 문서 제목들 (중복 없이) — 역링크·고립 문서·관계도에 쓴다.
 * 그림·분류·`[[목차]]` 같은 기능·바깥 주소·이 문서 안 `[[#문단]]` 은 빼고, `#문단` 은 떼고, `[[../]]` 는 지금 제목으로 푼다.
 */
export function documentPageLinks(content: string, currentTitle = ''): string[] {
  const titles = new Set<string>()
  for (const link of documentLinks(content)) {
    if (link.type !== 'link') continue
    if (/^(목차|각주$|인포박스:|탭바:|카드그리드:)/.test(link.target)) continue
    const target = resolveWikiLink(link.target, currentTitle)
    if (target.kind === 'page' && target.title) titles.add(target.title)
  }
  return [...titles]
}

/**
 * 이 문서의 분류 — 화면에 그려지는 것만: `[[분류:X]]` (`|가림` 은 떼고), `분류: A | B` 줄.
 * 코드 안에 예시로 쓴 분류와 `[[:분류:X]]` 링크는 넣지 않는다.
 */
export function documentCategories(content: string): string[] {
  const names = new Set<string>()
  for (const link of documentLinks(content)) {
    if (link.type !== 'link') continue
    const name = link.target.match(/^(?:분류|카테고리):(.+)$/i)?.[1]
    const cleaned = name?.trim().replace(/\s+/g, ' ')
    if (cleaned) names.add(cleaned)
  }
  return [...names]
}

/**
 * 문서에서 읽히는 글자 전부 — 검색 발췌·글자 수용. 제목·표·정보상자 값도 넣고, 코드·그림·틀 부르기는 뺀다.
 */
export function documentPlainText(content: string): string {
  const parts: string[] = []
  walkBlocks(parseDocument(content).blocks, (block) => {
    const sources = blockSources(block)
    const texts = sources.text.length ? sources.text : block.type === 'person-infobox' || block.type === 'group-infobox' || block.type === 'inline-infobox' || block.type === 'banner' ? sources.links : []
    for (const source of texts) {
      const text = inlineText(parseInline(source)).replace(/\s+/g, ' ').trim()
      if (text) parts.push(text)
    }
  })
  return parts.join(' ')
}

/** 본문 글만 이어 붙인 것 — 검색 발췌, 공유용 설명에 쓴다 (정보상자·표·코드·제목은 빼고 문단·목록·인용만) */
export function documentProse(content: string, limit = Infinity): string {
  const parts: string[] = []
  let length = 0
  walkBlocks(parseDocument(content).blocks, (block) => {
    if (length >= limit) return
    if (block.type !== 'paragraph' && block.type !== 'list' && block.type !== 'quote') return
    const text = blockText(block).replace(/\s+/g, ' ').trim()
    if (!text) return
    parts.push(text)
    length += text.length + 1
  })
  return parts.join(' ')
}
