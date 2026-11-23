/**
 * 리스트·인용·꾸민 상자 블록을 읽는 순수 함수 — 렌더러가 이 결과로 중첩 <ul>/<ol>/<blockquote>/상자를 그린다.
 */
import { normalizeColor, normalizeColorPair, normalizeWidth, type WikiCellStyle } from '@/lib/tableColors'

/* ── 리스트 ─────────────────────────────────────────── */

export type ListStyle = 'disc' | '1' | 'a' | 'A' | 'i' | 'I'

export interface ListLine {
  /** 들여쓰기 단계 — 공백 2칸(탭 1개)이 한 단계 */
  depth: number
  style: ListStyle
  /** 번호 리스트의 시작 번호 (`3.` 으로 시작하면 3) */
  start?: number
  content: string
}

export interface ListNode {
  style: ListStyle
  start?: number
  items: Array<{ content: string; children: ListNode[] }>
}

const LIST_LINE = /^([ \t]*)([*-]|\d+\.|[aAiI]\.)[ \t]+(\S.*)$/

/** 원래 줄(앞 공백 포함)이 리스트 항목이면 읽는다 — `- 항목`, `* 항목`, `1. 항목`, `a. 항목`, `i. 항목` */
export function parseListLine(line: string): ListLine | null {
  const match = line.match(LIST_LINE)
  if (!match) return null
  const indent = match[1].replace(/\t/g, '  ').length
  const marker = match[2]
  const depth = Math.floor(indent / 2)
  const content = match[3].trimEnd()
  if (marker === '*' || marker === '-') return { depth, style: 'disc', content }
  if (/^\d+\.$/.test(marker)) return { depth, style: '1', start: parseInt(marker, 10), content }
  return { depth, style: marker[0] as ListStyle, content }
}

/**
 * 연속된 리스트 줄을 중첩 트리로 묶는다.
 * - 한 번에 두 단계 이상 깊어지면 한 단계만 깊어진 것으로 본다
 * - 같은 단계에서 기호 종류가 바뀌면(• → 1.) 새 리스트로 나눈다
 */
export function buildListTree(lines: ListLine[]): ListNode[] {
  const normalized: ListLine[] = []
  for (const line of lines) {
    const previous = normalized[normalized.length - 1]
    const depth = previous ? Math.min(line.depth, previous.depth + 1) : 0
    normalized.push({ ...line, depth })
  }

  let index = 0
  const buildAt = (depth: number): ListNode[] => {
    const lists: ListNode[] = []
    let current: ListNode | null = null
    while (index < normalized.length && normalized[index].depth >= depth) {
      const line = normalized[index]
      if (line.depth > depth && current) {
        current.items[current.items.length - 1].children.push(...buildAt(depth + 1))
        continue
      }
      if (!current || current.style !== line.style) {
        current = line.start !== undefined ? { style: line.style, start: line.start, items: [] } : { style: line.style, items: [] }
        lists.push(current)
      }
      current.items.push({ content: line.content, children: [] })
      index++
    }
    return lists
  }
  return buildAt(0)
}

/* ── 인용 ───────────────────────────────────────────── */

export interface QuoteNode {
  /** 글 줄 묶음 또는 한 단계 안쪽 인용 */
  parts: Array<{ kind: 'text'; lines: string[] } | { kind: 'quote'; node: QuoteNode }>
}

/** `>>>` 는 이랑위키 접기라 인용이 아니다 */
export function isQuoteLine(trimmed: string): boolean {
  return trimmed.startsWith('>') && !/^>>>/.test(trimmed)
}

/**
 * 연속된 `>` 줄을 한 인용으로 묶는다. `> > 글` 은 안쪽 인용 (최대 8단계).
 * 줄 맨 앞 `>` 하나와 그 뒤 공백 하나를 걷어 낸 나머지가 다시 `>` 로 시작하면 한 단계 안쪽이다.
 */
export function parseQuoteBlock(lines: string[], maxDepth = 8): QuoteNode {
  const build = (body: string[], depth: number): QuoteNode => {
    const parts: QuoteNode['parts'] = []
    let i = 0
    while (i < body.length) {
      if (depth < maxDepth && body[i].startsWith('>')) {
        const inner: string[] = []
        while (i < body.length && body[i].startsWith('>')) {
          inner.push(body[i].replace(/^>[ \t]?/, ''))
          i++
        }
        parts.push({ kind: 'quote', node: build(inner, depth + 1) })
        continue
      }
      const last = parts[parts.length - 1]
      if (last && last.kind === 'text') last.lines.push(body[i])
      else parts.push({ kind: 'text', lines: [body[i]] })
      i++
    }
    return { parts }
  }
  return build(
    lines.map((line) => line.trim().replace(/^>[ \t]?/, '')),
    1
  )
}

/* ── 꾸민 상자 :::상자 ───────────────────────────────── */

export interface StyledBoxOptions {
  style: WikiCellStyle
  /** 상자 자체를 놓을 자리 (너비를 줄였을 때) */
  position?: 'left' | 'center' | 'right'
  rounded?: boolean
  /** 읽지 못한 키 — 편집 화면 경고용 */
  ignored: string[]
}

const SIDE: Record<string, 'left' | 'center' | 'right'> = {
  왼쪽: 'left', 가운데: 'center', 오른쪽: 'right', left: 'left', center: 'center', right: 'right',
}

/**
 * `:::상자 배경=#fff,#1c1d1f 글자=#333 테두리=#c00 정렬=가운데 위치=가운데 너비=80% 둥글게` 의 옵션.
 * 허용한 키만, 값은 색·너비 검사를 거친 것만 쓴다 (임의 CSS 는 받지 않는다).
 */
export function parseStyledBoxOptions(rest: string): StyledBoxOptions {
  const result: StyledBoxOptions = { style: {}, ignored: [] }
  for (const token of (rest || '').trim().split(/\s+/).filter(Boolean)) {
    if (token === '둥글게') {
      result.rounded = true
      continue
    }
    const pair = token.match(/^([^=:]+)[=:](.+)$/)
    if (!pair) {
      result.ignored.push(token)
      continue
    }
    const [, key, value] = pair
    switch (key) {
      case '배경': {
        const { light, dark } = normalizeColorPair(value)
        if (light) {
          result.style.backgroundColor = light
          result.style.backgroundColorDark = dark
        } else result.ignored.push(token)
        break
      }
      case '글자': {
        const { light, dark } = normalizeColorPair(value)
        if (light) {
          result.style.textColor = light
          result.style.textColorDark = dark
        } else result.ignored.push(token)
        break
      }
      case '테두리': {
        const color = normalizeColor(value)
        if (color) result.style.borderColor = color
        else result.ignored.push(token)
        break
      }
      case '정렬': {
        if (SIDE[value]) result.style.textAlign = SIDE[value]
        else result.ignored.push(token)
        break
      }
      case '위치': {
        if (SIDE[value]) result.position = SIDE[value]
        else result.ignored.push(token)
        break
      }
      case '너비': {
        const width = normalizeWidth(value)
        if (width) result.style.width = width
        else result.ignored.push(token)
        break
      }
      default:
        result.ignored.push(token)
    }
  }
  return result
}

/**
 * `:::이름` 으로 연 블록의 본문 줄을 닫는 `:::` 까지 모은다. 안에 다른 `:::` 블록이 있어도 짝을 맞춘다
 * (한 줄로 닫힌 `:::info 글 :::` 은 짝에 넣지 않는다). 닫는 줄이 없으면 문서 끝까지.
 */
export function collectFencedBlock(lines: string[], openIndex: number): { body: string[]; end: number } {
  const body: string[] = []
  let depth = 1
  let j = openIndex + 1
  for (; j < lines.length; j++) {
    const t = lines[j].trim()
    if (/^:::\s*$/.test(t)) {
      depth--
      if (depth === 0) break
    } else if (/^:::\S/.test(t) && !/\S\s*:::$/.test(t.slice(3))) {
      depth++
    }
    body.push(lines[j])
  }
  return { body, end: j }
}
