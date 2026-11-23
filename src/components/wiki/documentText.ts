/**
 * 문서 함수가 쓰는 본문 분석 도우미. 화면과 상관없는 순수 함수라 따로 두고 테스트한다.
 * 본문은 렌더러와 같은 블록 AST(src/lib/wiki/parser)로 읽는다 — 화면에서 제목인 것만 제목, 표인 것만 표.
 */
import { prepareFootnotes } from '@/lib/wiki/footnotes'
import { prepareSource, stripEscapeJoiners } from '@/lib/wiki/source'
import { nestedBody, parseBlocks, type Block } from '@/lib/wiki/parser/blocks'
import { blockText, documentLinks, parseDocument, walkBlocks } from '@/lib/wiki/parser/document'
import { inlineText, parseInline } from '@/lib/wiki/parser/inline'

/** HTML 태그와 표 칸 지시자만 지운다 — `3 < 5 이고 7 > 2`, `<=>` 같은 본문은 남긴다 */
const TAGS = /<\/?[a-zA-Z][^<>\n]{0,120}>|<(?:[-|^v]*\d+|[:()]|#[^<>\s]{1,30})>/g

/** 글로 세지 않는 블록 — 정보상자·탭·분류 줄·카드·코드·그림·목차 같은 기능 */
const NOT_PROSE: Block['type'][] = [
  'person-infobox', 'group-infobox', 'inline-infobox', 'tabs', 'category-line', 'card-grid',
  'code', 'image', 'file', 'toc', 'footnotes', 'clearfix', 'role', 'rule',
]

/**
 * 위키 문법을 걷어내고 읽히는 글자만 남긴다 (단어·글자 수, 키워드 밀도용).
 * - 렌더러와 같은 블록 AST 를 걸어 문단·제목·목록·인용·표 칸·알림 상자·접기 안까지 글자만 꺼낸다
 * - `[[문서|보일 글자]]` → 보일 글자, 그림·분류·각주 표시·틀 부르기는 뺀다
 * - 각주 내용은 렌더러와 같은 규칙으로 본문에서 떼어 맨 뒤에 따로 붙인다 (문장에 섞이지 않게)
 *
 * keepLines — 줄바꿈을 남긴다 (문장 나누기용). 기본은 공백 하나로 모두 합친다.
 */
export function sanitizeWikiText(value: string, options: { keepLines?: boolean } = {}): string {
  if (!value) return ''
  const parsed = parseDocument(value)
  const pieces: string[] = []
  walkBlocks(parsed.blocks, (block) => {
    if (NOT_PROSE.includes(block.type)) return
    const text = blockText(block)
    if (text.trim()) pieces.push(text)
  })
  // 그 자리에 적은 각주 내용 (따로 적은 줄은 이미 위에서 셌다)
  const notes = parsed.footnotes
  for (const note of [
    ...notes.inline,
    ...Object.entries(notes.definitions)
      .filter(([key]) => !notes.definedOnOwnLine.has(key))
      .map(([, body]) => body),
  ]) {
    pieces.push(inlineText(parseInline(note)))
  }

  const cleaned = stripEscapeJoiners(pieces.join('\n'))
    .replace(TAGS, ' ')
    // 짝이 맞지 않아 글자로 남은 문법 기호
    .replace(/\{\{\{|\}\}\}|\{\{|\}\}/g, ' ')
    .replace(/'''|''|\*\*|~~|__|\^\^|,,/g, '')
    .replace(/\|/g, ' ')

  if (options.keepLines) {
    return cleaned
      .split('\n')
      .map((line) => line.replace(/\s+/g, ' ').trim())
      .filter(Boolean)
      .join('\n')
  }
  return cleaned.replace(/\s+/g, ' ').trim()
}

/** 읽기 시간 — 초를 먼저 구해서 "1분 60초" 같은 반올림 오류가 없게 한다. */
export function readingTime(units: number, perMinute: number): { total: number; minutes: number; seconds: number } {
  const total = Math.round((units / perMinute) * 60)
  return { total, minutes: Math.floor(total / 60), seconds: total % 60 }
}

export function formatDuration(totalSeconds: number): string {
  if (totalSeconds <= 0) return '0초'
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  if (minutes === 0) return `${seconds}초`
  return seconds === 0 ? `${minutes}분` : `${minutes}분 ${seconds}초`
}

/**
 * 문서 안 문단 제목과 그 아래 본문을 순서대로 나눈다 — 렌더러가 제목으로 그리는 것만 (접기·상자 안 포함, 목차와 같은 순서).
 * 각주 내용 줄(`[*1] 내용`)은 본문이 아니라 각주 목록에 나오므로 뺀다.
 * hasChildren — 바로 다음 제목이 더 깊은 단계라서 하위 문단을 품은 제목인지.
 */
export function splitSections(raw: string): Array<{ title: string; level: number; body: string; hasChildren: boolean }> {
  const sections: Array<{ title: string; level: number; body: string[] }> = []
  const collect = (text: string) => {
    const lines = text.split('\n')
    for (const block of parseBlocks(text)) {
      if (block.type === 'heading') {
        sections.push({ title: block.title, level: block.level, body: [] })
        continue
      }
      if (block.type === 'footnote-def') continue
      const body = nestedBody(block)
      if (body !== null) {
        if (block.type === 'details' && sections.length) sections[sections.length - 1].body.push(block.summary)
        collect(body)
        continue
      }
      if (sections.length) sections[sections.length - 1].body.push(lines.slice(block.start, block.end + 1).join('\n'))
    }
  }
  collect(prepareSource(raw || ''))
  return sections.map((section, index) => ({
    title: section.title,
    level: section.level,
    body: section.body.join('\n'),
    hasChildren: (sections[index + 1]?.level ?? 0) > section.level,
  }))
}

/**
 * 각주 참조와 내용을 렌더러와 같은 규칙(src/lib/wiki/footnotes.ts)으로 센다.
 * - numberedRefs: 본문에 나온 번호 (`[*1] 내용` 처럼 그 자리에 쓴 것도 포함)
 * - definitions: 내용이 있는 번호
 * - autoRefs: 번호 없는 각주 (`[*] 내용`, `[* 내용]`, 내용 없는 `[*]`)
 * - bareRefs: 그중 내용 없이 쓴 `[*]`
 */
export function collectFootnotes(raw: string): {
  numberedRefs: Set<string>
  definitions: Set<string>
  autoRefs: number
  bareRefs: number
} {
  const notes = prepareFootnotes(prepareSource(raw))
  return {
    numberedRefs: notes.numberedRefs,
    definitions: new Set(Object.keys(notes.definitions)),
    autoRefs: notes.inline.length + notes.bareRefs,
    bareRefs: notes.bareRefs,
  }
}

/** 링크를 종류별로 센다 (분류·파일은 문서 링크와 따로, 같은 대상은 한 번만). 코드 안은 세지 않는다. */
export function auditLinks(raw: string): {
  internal: number
  uniqueInternal: number
  categories: number
  files: number
  external: number
  uniqueExternal: number
} {
  const targets: string[] = []
  const urls: string[] = []
  let categories = 0
  let files = 0
  for (const link of documentLinks(raw || '')) {
    if (link.type === 'file') {
      files++
      continue
    }
    if (link.type === 'external') {
      urls.push(link.url)
      continue
    }
    const target = link.target
    // [[목차]], [[인포박스: …]] 같은 위키 기능은 링크가 아니다
    if (/^(목차|각주$|인포박스:|카드그리드:|탭바:)/.test(target)) continue
    if (/^:?(분류|category):/i.test(target)) categories++
    else if (/^:?(파일|file):/i.test(target)) files++
    else targets.push(target.split('#')[0].trim())
  }
  return {
    internal: targets.length,
    uniqueInternal: new Set(targets).size,
    categories,
    files,
    external: urls.length,
    uniqueExternal: new Set(urls).size,
  }
}

/**
 * 문장을 나눈다 — 문장 부호(따옴표·괄호가 뒤따라도) 뒤, 그리고 줄이 바뀌는 곳.
 * 목록·표·제목처럼 마침표 없이 끝나는 줄은 줄바꿈으로 나뉘므로
 * sanitizeWikiText(raw, { keepLines: true }) 결과를 넣는다.
 * (예전처럼 "다/요/음" 으로 끝나는 어절마다 자르면 "바다 위에…" 의 "바다" 에서 잘렸다)
 */
export function splitSentences(text: string): string[] {
  return (text || '')
    .split(/(?<=[.!?。…]["'”’)\]]?)[ \t]+|\n+/)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length > 5)
}

/* ── 표 점검 ─────────────────────────────────────────── */

export interface TableAudit {
  /** 표가 시작하는 원문 줄 번호 (1부터) */
  startLine: number
  rows: number
  /** 줄마다의 칸 수 — 합친 칸(<-2>, <|2>)을 펼쳐서 센다 */
  widths: number[]
  emptyCells: number
  /** 줄마다 칸 수가 다르다 */
  uneven: boolean
}

/**
 * `||` 표마다 줄별 칸 수와 빈 칸을 센다.
 * 가로 합치기 `<-2>` 는 2칸, 세로 합치기 `<|2>` `<^|2>` `<v|2>` 는 아래 줄에도 그 칸이 있는 것으로 센다.
 */
export function auditTables(raw: string): TableAudit[] {
  const tables: TableAudit[] = []
  const measure = (rows: string[], startLine: number) => {
    const table: TableAudit = { startLine, rows: 0, widths: [], emptyCells: 0, uneven: false }
    let spans: Array<{ rows: number; width: number }> = []
    for (const row of rows) {
      const carried = spans.reduce((sum, span) => sum + span.width, 0)
      spans = spans.map((span) => ({ ...span, rows: span.rows - 1 })).filter((span) => span.rows > 0)
      let width = carried
      for (const cell of row.slice(2, -2).split('||')) {
        const colspan = Number(cell.match(/<-(\d+)>/)?.[1] || 1)
        const rowspan = Number(cell.match(/<[\^v]?\|(\d+)>/)?.[1] || 1)
        width += colspan
        if (rowspan > 1) spans.push({ rows: rowspan - 1, width: colspan })
        if (!cell.replace(/<[^<>]*>/g, '').trim()) table.emptyCells++
      }
      table.rows++
      table.widths.push(width)
    }
    table.uneven = new Set(table.widths).size > 1
    tables.push(table)
  }
  const visit = (text: string, offset: number) => {
    for (const block of parseBlocks(text)) {
      if (block.type === 'table') measure(block.rows, offset + block.start + 1)
      else if (block.type === 'details' || block.type === 'styled-box') visit(block.body, offset + block.start + 1)
    }
  }
  visit(raw || '', 0)
  return tables
}

/* ── 자주 쓴 낱말 ────────────────────────────────────── */

// 낱말 끝의 조사 — 떼고 두 글자 이상 남는 말만 센다 ("고양이" → "고양" 처럼 틀리는 일은 드물어 받아들인다)
const JOSA = /(에서는|에서|에게|으로|로서|로써|부터|까지|처럼|보다|이다|였다|한다|은|는|이|가|을|를|에|의|와|과|로|도|만)$/
const STOPWORDS = new Set([
  '그리고', '하지만', '그러나', '그래서', '또한', '있다', '없다', '했다', '한다', '하는', '하고', '있는', '없는',
  '이다', '것이다', '것은', '것이', '것을', '위해', '대한', '때문', '때문에', '통해', '같은', '정도', '모든', '가장', '매우',
  '이후', '당시', '현재', '되었다', '된다', '되는', '등의', '그의', '그는', '이를', '이런', '그런',
])

export function topTerms(plain: string, limit = 10): Array<{ term: string; count: number }> {
  const freq = new Map<string, number>()
  for (const word of (plain || '').split(/\s+/)) {
    const bare = word.replace(/[^\p{L}\p{N}]/gu, '').toLowerCase()
    if (!bare || /^\d+$/.test(bare) || STOPWORDS.has(bare)) continue
    const term = bare.replace(JOSA, '')
    if (term.length < 2 || STOPWORDS.has(term)) continue
    freq.set(term, (freq.get(term) || 0) + 1)
  }
  return [...freq]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'ko'))
    .slice(0, limit)
    .map(([term, count]) => ({ term, count }))
}

/* ── 반복 표현 ───────────────────────────────────────── */

/** 같은 n어절 묶음이 minCount 번 이상 나온 것 — 겹치는 묶음(한 칸씩 밀린 것)은 하나만 남긴다 */
function repeatedGrams(words: string[], size: number, minCount: number): Array<{ phrase: string; count: number }> {
  const positions = new Map<string, number[]>()
  for (let i = 0; i + size <= words.length; i++) {
    const phrase = words.slice(i, i + size).join(' ')
    // 날짜·숫자뿐인 묶음("2025년 3월 4일")은 빼고, 글자가 다섯 자 이상인 것만
    if ((phrase.match(/\p{L}/gu)?.length || 0) < 5) continue
    const at = positions.get(phrase)
    if (at) at.push(i)
    else positions.set(phrase, [i])
  }
  const ranked = [...positions]
    .filter(([, at]) => at.length >= minCount)
    .sort((a, b) => b[1].length - a[1].length || a[1][0] - b[1][0])
  const covered = new Set<number>()
  const picked: Array<{ phrase: string; count: number }> = []
  for (const [phrase, at] of ranked) {
    if (at.every((position) => covered.has(position))) continue
    for (const position of at) for (let k = 0; k < size; k++) covered.add(position + k)
    picked.push({ phrase, count: at.length })
  }
  return picked
}

/** 아주 긴 문서는 앞부분만 본다 (어절 수만큼 Map 이 커지므로) */
export const REPEAT_WORD_LIMIT = 50_000

/**
 * phrases — 세 번 이상 쓴 3어절 표현 (군더더기)
 * passages — 두 번 이상 똑같이 나온 8어절 구절 (복사해 붙인 문단)
 */
export function repeatedPhrases(plain: string): {
  phrases: Array<{ phrase: string; count: number }>
  passages: Array<{ phrase: string; count: number }>
  truncated: boolean
} {
  const all = (plain || '').split(/\s+/).filter(Boolean)
  const words = all.slice(0, REPEAT_WORD_LIMIT)
  return {
    phrases: repeatedGrams(words, 3, 3),
    passages: repeatedGrams(words, 8, 2),
    truncated: all.length > REPEAT_WORD_LIMIT,
  }
}
