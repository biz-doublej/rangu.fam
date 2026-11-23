/**
 * 블록 AST — 본문을 줄 단위로 읽어 블록(문단, 제목, 표, 상자 …)으로 나눈다.
 *
 * 렌더러(NamuWikiRenderer)가 이 결과를 그대로 그리고, 목차·문서 함수·검색 발췌·OG 설명·링크 추출도
 * 같은 결과를 읽는다. 그래서 "화면에서 제목인 것"과 "목차의 제목"이 어긋나지 않는다.
 *
 * 블록을 알아보는 순서와 줄을 모으는 규칙은 예전 렌더러의 줄 순회와 한 글자도 다르지 않게 옮겼다
 * (운영 문서 전체를 그려 HTML 이 같음을 확인). 이상해 보이는 흐름도 그대로 둔 것이 있다 — 각 블록 설명 참고.
 *
 * 입력은 렌더러와 같은, 이미 다듬은 본문이다 (prepareSource → prepareFootnotes 를 거친 글).
 */
import { parseHeadingLine } from '@/lib/wikiHeadings'
import { isBannerBoxStart, readBannerBox } from '@/lib/bannerBox'
import { collectFencedBlock, isQuoteLine, parseListLine, type ListLine } from '@/lib/wiki/blocks'
import { isFootnoteDefinitionLine } from '@/lib/wiki/footnotes'

type BannerSpec = ReturnType<typeof readBannerBox>['spec']

interface Span {
  /** 첫 줄 번호 (0부터) */
  start: number
  /** 마지막으로 쓴 줄 번호 — 다음 블록은 end + 1 부터 */
  end: number
}

export type Block = Span &
  (
    | { type: 'banner'; spec: BannerSpec }
    | { type: 'person-infobox' | 'group-infobox'; paramsText: string; colorAttribs?: string }
    | { type: 'category-line'; categories: string[] }
    | { type: 'role'; role: string }
    | { type: 'citation'; quote: string; source?: string; url?: string }
    /** dash: `---`(3개 이상), plain: `***` */
    | { type: 'rule'; variant: 'dash' | 'plain' }
    | { type: 'timeline'; body: string }
    | { type: 'poll'; question: string; options: string[] }
    | { type: 'styled-box'; options: string; body: string }
    | { type: 'callout'; kind: 'info' | 'warn' | 'success' | 'error' | 'note' | 'tip'; content: string }
    | { type: 'details'; summary: string; body: string }
    | { type: 'tabs'; items: Array<{ label: string; link: string }> }
    | { type: 'inline-infobox'; title: string; image: string; rows: Array<{ key: string; value: string }> }
    | { type: 'clearfix' }
    | { type: 'footnotes' }
    | { type: 'toc'; folded: boolean }
    /** content 가 null 이면 닫는 ]] 를 못 찾은 것 (그 줄만 쓴다) */
    | { type: 'card-grid'; content: string | null }
    | { type: 'image'; src: string }
    | { type: 'file'; path: string; options: string }
    | { type: 'heading'; level: number; title: string; folded: boolean }
    | { type: 'list'; items: ListLine[] }
    | { type: 'quote'; lines: string[] }
    /** `:::이름 글` 한 줄 상자 (info/warn… 이 아닌 이름, 선택지가 모자란 :::poll 포함) */
    | { type: 'box'; kind: string; content: string }
    | { type: 'markdown-table'; lines: string[] }
    | { type: 'table'; rows: string[] }
    /** 따로 적은 각주 내용 줄 — 화면에는 그리지 않는다 (각주 목록에 나온다) */
    | { type: 'footnote-def'; text: string }
    | { type: 'code'; lang: string; code: string }
    | { type: 'paragraph'; text: string }
  )

export type BlockType = Block['type']

const PERSON_INFOBOX = [/^\{\{\s*인물정보상자(<[^>]+>)?\s*$/i, /^\{\{\s*인물정보상자(<[^>]+>)?\b/i]
const GROUP_INFOBOX = [/^\{\{\s*그룹정보상자(<[^>]+>)?\s*$/i, /^\{\{\s*그룹정보상자(<[^>]+>)?\b/i]
const IMAGE_LINE = /^\[이미지:([^\]]+)\]$/
const FILE_LINE = /^\[\[파일:([^\]|]+)(?:\|([^\]]+))?\]\]$/
const INFOBOX_LINE = /^\[\[인포박스:(.+)\]\]$/
const TABS_LINE = /^\[\[탭바:(.+)\]\]$/
const LOOSE_FOOTNOTE_DEF = /^\[\*(\d+|[a-zA-Z가-힣\d]+)\]\s*(.+)$/

export const isMarkdownTableLine = (value: string) => /^\|.*\|\s*$/.test(value)

export function parseMarkdownTableRow(row: string): string[] {
  const parts = row.split('|')
  parts.shift()
  parts.pop()
  return parts.map((cell) => cell.trim())
}

export const isMarkdownSeparatorRow = (cells: string[]) => cells.length > 0 && cells.every((cell) => /^:?-{2,}:?$/.test(cell))

/** `{{인물정보상자 …}}` / `{{그룹정보상자 …}}` — 한 줄로 닫히면 그 줄만, 아니면 `}}` 줄까지 */
function readInfobox(lines: string[], i: number, name: string): { paramsText: string; colorAttribs?: string; end: number } {
  const line = lines[i]
  const trimmed = line.trim()
  const colorMatch = trimmed.match(new RegExp(`\\{\\{\\s*${name}(<[^>]+>)`, 'i'))
  const colorAttribs = colorMatch ? colorMatch[1] : undefined
  const after = line.replace(new RegExp(`^.*${name}(<[^>]+>)?`, 'i'), '')
  if (after.includes('}}')) {
    const inner = after.replace(new RegExp(`^.*?\\{\\{\\s*${name}(<[^>]+>)?\\s*`, 'i'), '').replace(/}}.*$/, '')
    return { paramsText: inner, colorAttribs, end: i }
  }
  const buf: string[] = []
  let j = i + 1
  while (j < lines.length) {
    if (/^}}\s*$/.test(lines[j].trim())) break
    buf.push(lines[j])
    j++
  }
  return { paramsText: buf.join('\n'), colorAttribs, end: j }
}

/** 다음 줄에서 문단이 끝나는가 (빈 줄이나 다른 블록이 시작되는 줄) */
function endsParagraph(nextLine: string): boolean {
  const t = nextLine.trim()
  return (
    !t ||
    t.startsWith('=') ||
    t.startsWith('#') ||
    t.startsWith('*') ||
    t.startsWith('-') ||
    t.startsWith('1.') ||
    parseListLine(nextLine) !== null ||
    t.startsWith('>') ||
    t.startsWith('||') ||
    t.startsWith('[[') ||
    t.startsWith('{{') ||
    t.startsWith(':::') ||
    t === '---' ||
    t === '***' ||
    // 코드 블록이 문단 바로 아래에서 시작해도 문단에 붙지 않게 (예전에는 ``` 가 문단에 섞여
    // 코드 예시 속 {{인물정보상자 …}} 가 진짜 상자로 그려지고 뒤의 ``` 짝이 모두 어긋났다)
    t.startsWith('```') ||
    LOOSE_FOOTNOTE_DEF.test(t)
  )
}

export function parseBlocks(text: string): Block[] {
  const lines = (text || '').split('\n')
  const blocks: Block[] = []

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const trimmed = line.trim()

    // 배너상자 {{배너상자 … }}
    if (isBannerBoxStart(trimmed)) {
      const { spec, end } = readBannerBox(lines, i)
      blocks.push({ type: 'banner', start: i, end, spec })
      i = end
      continue
    }

    // 인물·그룹 정보상자
    if (PERSON_INFOBOX.some((re) => re.test(trimmed))) {
      const box = readInfobox(lines, i, '인물정보상자')
      blocks.push({ type: 'person-infobox', start: i, end: box.end, paramsText: box.paramsText, colorAttribs: box.colorAttribs })
      i = box.end
      continue
    }
    if (GROUP_INFOBOX.some((re) => re.test(trimmed))) {
      const box = readInfobox(lines, i, '그룹정보상자')
      blocks.push({ type: 'group-infobox', start: i, end: box.end, paramsText: box.paramsText, colorAttribs: box.colorAttribs })
      i = box.end
      continue
    }

    if (!trimmed) continue

    // 분류: A | B | C 줄
    if (trimmed.startsWith('분류:')) {
      const categories = trimmed
        .substring(3)
        .replace(/^:/, '')
        .split('|')
        .map((value) => value.replace(/^\{?|\}?$/g, '').trim())
        .filter(Boolean)
      blocks.push({ type: 'category-line', start: i, end: i, categories })
      continue
    }

    // {{role:developer}}
    const roleMatch = trimmed.match(/^\{\{\s*role\s*:\s*([a-zA-Z0-9_-]+)\s*\}\}$/i)
    if (roleMatch) {
      blocks.push({ type: 'role', start: i, end: i, role: roleMatch[1].toLowerCase() })
      continue
    }

    // {{인용| 인용문 | 출처 | 링크 }} — 인용문이 비면 아래 규칙으로 넘어간다
    const citationMatch = trimmed.match(/^\{\{\s*인용\s*\|(.+)\}\}$/)
    if (citationMatch) {
      const [quote, source, url] = citationMatch[1].split('|').map((segment) => segment.trim())
      if (quote) {
        blocks.push({ type: 'citation', start: i, end: i, quote, source: source || undefined, url: url || undefined })
        continue
      }
    }

    if (/^-{3,}$/.test(trimmed)) {
      blocks.push({ type: 'rule', start: i, end: i, variant: 'dash' })
      continue
    }

    // :::timeline … :::
    if (/^:::timeline\s*$/i.test(trimmed)) {
      const buf: string[] = []
      let j = i + 1
      while (j < lines.length && !/^:::\s*$/.test(lines[j].trim())) buf.push(lines[j++])
      blocks.push({ type: 'timeline', start: i, end: j, body: buf.join('\n') })
      i = j
      continue
    }

    // :::poll 질문 … ::: — 선택지가 두 개 미만이면 그 줄은 일반 `:::이름 글` 상자로 그려진다
    // (예전 렌더러가 줄을 다 읽은 뒤 아래 규칙으로 넘어가던 흐름 그대로)
    const pollOpen = trimmed.match(/^:::poll\s+(.+)$/i)
    if (pollOpen) {
      const buf: string[] = []
      let j = i + 1
      while (j < lines.length && !/^:::\s*$/.test(lines[j].trim())) buf.push(lines[j++])
      const question = pollOpen[1].trim()
      const options = buf.map((option) => option.trim()).filter(Boolean)
      if (question && options.length >= 2) {
        blocks.push({ type: 'poll', start: i, end: j, question, options })
      } else {
        const boxMatch = trimmed.match(/^:::(\w+)\s*(.*)$/)
        if (boxMatch) blocks.push({ type: 'box', start: i, end: j, kind: boxMatch[1], content: boxMatch[2] })
      }
      i = j
      continue
    }

    // :::상자 … :::
    const styledBox = trimmed.match(/^:::상자(?:\s+(.*))?$/)
    if (styledBox) {
      const { body, end } = collectFencedBlock(lines, i)
      blocks.push({ type: 'styled-box', start: i, end, options: styledBox[1] || '', body: body.join('\n') })
      i = end
      continue
    }

    // :::info 등 알림 상자 — 같은 줄에서 닫히면 한 줄짜리
    const calloutOpen = trimmed.match(/^:::(info|warn|warning|success|error|danger|note|tip)\s*(.*)$/i)
    if (calloutOpen) {
      const raw = calloutOpen[1].toLowerCase()
      const kind = (raw === 'warning' ? 'warn' : raw === 'danger' ? 'error' : raw) as
        'info' | 'warn' | 'success' | 'error' | 'note' | 'tip'
      const rest = calloutOpen[2].trim()
      if (rest.endsWith(':::')) {
        blocks.push({ type: 'callout', start: i, end: i, kind, content: rest.slice(0, -3).trim() })
        continue
      }
      const buf: string[] = []
      if (rest) buf.push(rest)
      let j = i + 1
      while (j < lines.length && !/^:::\s*$/.test(lines[j].trim())) buf.push(lines[j++])
      blocks.push({ type: 'callout', start: i, end: j, kind, content: buf.join('\n') })
      i = j
      continue
    }

    // >>> 제목 … <<<
    const detailsOpen = trimmed.match(/^>>>\s*(.+)?$/)
    if (detailsOpen) {
      const buf: string[] = []
      let j = i + 1
      while (j < lines.length && !/^<<<\s*$/.test(lines[j].trim())) buf.push(lines[j++])
      blocks.push({ type: 'details', start: i, end: j, summary: (detailsOpen[1] || '자세히 보기').trim(), body: buf.join('\n') })
      i = j
      continue
    }

    // [[탭바: 항목=링크 | …]]
    const tabsMatch = trimmed.match(TABS_LINE)
    if (tabsMatch) {
      const items = tabsMatch[1]
        .split('|')
        .map((segment) => segment.trim())
        .filter(Boolean)
        .map((pair) => {
          const [label, link] = pair.split('=').map((value) => (value || '').trim())
          return { label, link: link || label }
        })
      blocks.push({ type: 'tabs', start: i, end: i, items })
      continue
    }

    // [[인포박스: 제목=… | 이미지=… | 키=값]]
    const infoboxMatch = trimmed.match(INFOBOX_LINE)
    if (infoboxMatch) {
      let title = ''
      let image = ''
      const rows: Array<{ key: string; value: string }> = []
      for (const pair of infoboxMatch[1].split('|').map((segment) => segment.trim()).filter(Boolean)) {
        const [k, ...rest] = pair.split('=')
        const key = (k || '').trim()
        const value = rest.join('=').trim()
        if (!key) continue
        if (key === '제목' || key.toLowerCase() === 'title') title = value
        else if (key === '이미지' || key.toLowerCase() === 'image') image = value
        else rows.push({ key, value })
      }
      blocks.push({ type: 'inline-infobox', start: i, end: i, title, image, rows })
      continue
    }

    if (/^\[clearfix\]$/i.test(trimmed)) {
      blocks.push({ type: 'clearfix', start: i, end: i })
      continue
    }
    if (trimmed === '[[각주]]') {
      blocks.push({ type: 'footnotes', start: i, end: i })
      continue
    }
    if (trimmed === '[[목차:접기]]' || trimmed === '[[목차]]') {
      blocks.push({ type: 'toc', start: i, end: i, folded: trimmed === '[[목차:접기]]' })
      continue
    }

    // [[카드그리드: …]] — 여러 줄이면 ]] 로 끝나는 줄까지
    if (trimmed.startsWith('[[카드그리드:')) {
      if (trimmed.endsWith(']]')) {
        blocks.push({ type: 'card-grid', start: i, end: i, content: trimmed })
        continue
      }
      let j = i
      let content = ''
      let found = false
      while (j < lines.length) {
        const current = lines[j].trim()
        content += j === i ? current : '\n' + current
        if (current.endsWith(']]')) {
          found = true
          break
        }
        j++
      }
      // 닫는 줄이 없으면 오류 상자만 — 그 아래 줄들은 평소처럼 읽는다
      blocks.push(found ? { type: 'card-grid', start: i, end: j, content } : { type: 'card-grid', start: i, end: i, content: null })
      if (found) i = j
      continue
    }

    const imageMatch = trimmed.match(IMAGE_LINE)
    if (imageMatch) {
      blocks.push({ type: 'image', start: i, end: i, src: imageMatch[1].trim() })
      continue
    }
    const fileMatch = trimmed.match(FILE_LINE)
    if (fileMatch) {
      blocks.push({ type: 'file', start: i, end: i, path: fileMatch[1].trim(), options: fileMatch[2] || '' })
      continue
    }

    const heading = parseHeadingLine(trimmed)
    if (heading) {
      blocks.push({ type: 'heading', start: i, end: i, level: heading.level, title: heading.title, folded: heading.folded })
      continue
    }

    // 목록 — 원래 줄의 앞 공백으로 깊이를 잰다
    if (parseListLine(line)) {
      const items: ListLine[] = []
      let j = i
      while (j < lines.length) {
        const parsed = parseListLine(lines[j])
        if (!parsed) break
        items.push(parsed)
        j++
      }
      blocks.push({ type: 'list', start: i, end: j - 1, items })
      i = j - 1
      continue
    }

    if (isQuoteLine(trimmed)) {
      const quoteLines: string[] = []
      let j = i
      while (j < lines.length && isQuoteLine(lines[j].trim())) quoteLines.push(lines[j++])
      blocks.push({ type: 'quote', start: i, end: j - 1, lines: quoteLines })
      i = j - 1
      continue
    }

    // :::이름 글 (알 수 없는 이름의 한 줄 상자)
    if (trimmed.startsWith(':::')) {
      const boxMatch = trimmed.match(/^:::(\w+)\s*(.*)$/)
      if (boxMatch) {
        blocks.push({ type: 'box', start: i, end: i, kind: boxMatch[1], content: boxMatch[2] })
        continue
      }
    }

    // markdown 표 | a | b | — 둘째 줄이 구분선일 때만, 아니면 아래 || 표로 넘어간다
    if (isMarkdownTableLine(trimmed)) {
      const tableLines: string[] = []
      let j = i
      while (j < lines.length && isMarkdownTableLine(lines[j].trim())) tableLines.push(lines[j++].trim())
      if (
        tableLines.length >= 2 &&
        parseMarkdownTableRow(tableLines[0]).length > 0 &&
        isMarkdownSeparatorRow(parseMarkdownTableRow(tableLines[1]))
      ) {
        blocks.push({ type: 'markdown-table', start: i, end: j - 1, lines: tableLines })
        i = j - 1
        continue
      }
    }

    // || 칸 || 칸 || 표 — 이어진 줄을 모은다
    if (trimmed.startsWith('||') && trimmed.endsWith('||')) {
      const rows: string[] = []
      let j = i
      while (j < lines.length && lines[j].trim().startsWith('||') && lines[j].trim().endsWith('||')) rows.push(lines[j++].trim())
      blocks.push({ type: 'table', start: i, end: j - 1, rows })
      i = j - 1
      continue
    }

    // 따로 적은 각주 내용 줄 (본문에는 그리지 않는다)
    const looseDefinition = trimmed.match(LOOSE_FOOTNOTE_DEF)
    if (isFootnoteDefinitionLine(trimmed) || (looseDefinition && looseDefinition[2].trim().length > 5)) {
      blocks.push({ type: 'footnote-def', start: i, end: i, text: trimmed })
      continue
    }

    if (trimmed === '---' || trimmed === '***') {
      blocks.push({ type: 'rule', start: i, end: i, variant: 'plain' })
      continue
    }

    // ``` 코드 블록 — 줄 맨 앞이 ``` 인 다음 줄까지
    if (trimmed.startsWith('```')) {
      const lang = trimmed.slice(3).trim().toLowerCase()
      const codeLines: string[] = []
      let j = i + 1
      while (j < lines.length && !lines[j].trim().startsWith('```')) codeLines.push(lines[j++])
      blocks.push({ type: 'code', start: i, end: j, lang, code: codeLines.join('\n') })
      i = j
      continue
    }

    // 문단 — 빈 줄이나 다른 블록이 시작되는 줄까지
    const paragraphLines = [line]
    let j = i + 1
    while (j < lines.length && !endsParagraph(lines[j])) paragraphLines.push(lines[j++])
    blocks.push({ type: 'paragraph', start: i, end: j - 1, text: paragraphLines.join('\n') })
    i = j - 1
  }

  return blocks
}

/** 안에 다시 블록을 품는 블록의 본문 (렌더러가 parseContent 로 다시 그리는 것) */
export function nestedBody(block: Block): string | null {
  switch (block.type) {
    case 'banner':
      return block.spec.body
    case 'styled-box':
    case 'details':
      return block.body
    default:
      return null
  }
}
