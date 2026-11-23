/**
 * 문서 함수가 쓰는 본문 분석 도우미. 화면과 상관없는 순수 함수라 따로 두고 테스트한다.
 */
import { parseHeadingLine } from '@/lib/wikiHeadings'
import { prepareFootnotes } from '@/lib/wiki/footnotes'
import { prepareSource, stripEscapeJoiners } from '@/lib/wiki/source'

/**
 * `{{ … }}` 틀을 중괄호 깊이를 세어 통째로 지운다 (안에 `}}` 가 있어도 끝까지).
 * 끝까지 닫히지 않은 `{{` 는 오타로 보고 그 두 글자만 버린 뒤 뒤쪽을 다시 읽는다
 * — 짝 없는 `{{` 하나 때문에 뒤의 본문이 통째로 사라지지 않게.
 */
function stripTemplates(text: string): string {
  let out = ''
  let rest = text
  for (;;) {
    let chunk = ''
    let depth = 0
    let openedAt = -1
    for (let i = 0; i < rest.length; i++) {
      if (rest[i] === '{' && rest[i + 1] === '{') {
        if (depth === 0) openedAt = i
        depth++
        i++
        continue
      }
      if (depth > 0 && rest[i] === '}' && rest[i + 1] === '}') {
        depth--
        i++
        if (depth === 0) chunk += ' '
        continue
      }
      if (depth === 0) chunk += rest[i]
    }
    if (depth === 0) return out + chunk
    out += chunk
    rest = rest.slice(openedAt + 2)
  }
}

/**
 * 서식 블록에서 글자만 남긴다.
 * - `{{{#!wiki style="…"` 첫 줄은 속성이라 통째로 버린다
 * - `{{{#색 글}}}` `{{{+1 글}}}` `{{{-1 글}}}` `{{{배지 글}}}` `{{{#!folding 제목 …}}}` 은 첫 낱말만 서식
 * - 그 밖의 `{{{글}}}` 은 글 전체가 본문
 */
const FORMAT_BLOCK = /\{\{\{(?:#!wiki[^\n{}]*\n|(?:[#+-][^\s{}]*|배지[^\s{}]*)\s+)?([^{}]*)\}\}\}/g

/** HTML 태그와 표 칸 지시자만 지운다 — `3 < 5 이고 7 > 2`, `<=>` 같은 본문은 남긴다 */
const TAGS = /<\/?[a-zA-Z][^<>\n]{0,120}>|<(?:[-|^v]*\d+|[:()]|#[^<>\s]{1,30})>/g

/**
 * 위키 문법을 걷어내고 읽히는 글자만 남긴다 (단어·글자 수, 키워드 밀도용).
 * - `[[문서|보일 글자]]` → 보일 글자, `[[문서]]` → 문서, `[[파일:…]]` `[[분류:…]]` → 지움
 * - `{{{#색 글자}}}` `{{{+1 글자}}}` `{{{배지 글자}}}` → 글자
 * - `{{틀 … }}` → 중괄호 깊이를 세어 통째로 지움
 * - 각주 내용은 렌더러와 같은 규칙으로 본문에서 떼어 맨 뒤에 따로 붙인다 (문장에 섞이지 않게)
 *
 * keepLines — 줄바꿈을 남긴다 (문장 나누기용). 기본은 공백 하나로 모두 합친다.
 */
export function sanitizeWikiText(value: string, options: { keepLines?: boolean } = {}): string {
  if (!value) return ''
  // 렌더러와 같은 순서: // 주석 줄과 \ 이스케이프 → 각주
  const notes = prepareFootnotes(prepareSource(value))
  const placedNotes = Object.entries(notes.definitions)
    .filter(([key]) => !notes.definedOnOwnLine.has(key))
    .map(([, body]) => body)

  let text = [notes.text, ...notes.inline, ...placedNotes]
    .join('\n')
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')

  // 서식 블록은 안쪽부터 글자만 남긴다 (겹쳐 있어도 몇 번 반복해 풀기)
  for (let i = 0; i < 6; i++) {
    const next = text.replace(FORMAT_BLOCK, ' $1 ')
    if (next === text) break
    text = next
  }

  text = stripTemplates(text)
    .replace(/\[\[(?:목차(?::접기)?|각주)\]\]/g, ' ')
    .replace(/\[\[:?(?:파일|분류|file|category):[^\]]*\]\]/gi, ' ')
    .replace(/\[\[(?:[^\]|]*\|)?([^\]]+)\]\]/g, ' $1 ')
    .replace(/\[이미지:[^\]]*\]/g, ' ')
    .replace(/\[([^\]]+)\]\((?:https?:\/\/|\/)[^)]*\)/g, ' $1 ')
    .replace(/\[\*@?\d*\]/g, ' ')
    .replace(/\[(?:br|clearfix|목차)\]/gi, ' ')
    .replace(/!icon:\{[^}]*\}/g, ' ')

  const cleaned = text
    .split('\n')
    .map((line) => {
      const trimmed = line.trim()
      const heading = parseHeadingLine(trimmed)
      if (heading) return heading.title
      if (/^:::/.test(trimmed) || /^(>>>|<<<)/.test(trimmed)) return ''
      if (/^-{3,}$/.test(trimmed)) return ''
      return trimmed
        .replace(/^(\*|-|\d+\.)\s+/, '')
        .replace(/^>\s*/, '')
        .replace(/^분류:/, '')
    })
    .join('\n')
    .replace(TAGS, ' ')
    .replace(/'''|''|\*\*|~~|__|\^\^|,,/g, '')
    .replace(/\|/g, ' ')

  if (options.keepLines) {
    return stripEscapeJoiners(cleaned)
      .split('\n')
      .map((line) => line.replace(/\s+/g, ' ').trim())
      .filter(Boolean)
      .join('\n')
  }
  return stripEscapeJoiners(cleaned).replace(/\s+/g, ' ').trim()
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
 * 문서 안 문단 제목(코드 블록 제외)과 그 아래 본문을 순서대로 나눈다.
 * 각주 내용 줄(`[*1] 내용`)은 본문이 아니라 각주 목록에 나오므로 뺀다.
 * hasChildren — 바로 다음 제목이 더 깊은 단계라서 하위 문단을 품은 제목인지.
 */
export function splitSections(raw: string): Array<{ title: string; level: number; body: string; hasChildren: boolean }> {
  const lines = prepareSource(raw || '').split('\n')
  const sections: Array<{ title: string; level: number; body: string[] }> = []
  let inFence = false
  for (const line of lines) {
    const trimmed = line.trim()
    if (trimmed.startsWith('```')) inFence = !inFence
    const heading = inFence || trimmed.startsWith('```') ? null : parseHeadingLine(trimmed)
    if (heading) {
      sections.push({ title: heading.title, level: heading.level, body: [] })
    } else if (sections.length > 0 && !/^\[\*\d*\]\s+\S/.test(trimmed)) {
      sections[sections.length - 1].body.push(line)
    }
  }
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

/** 링크를 종류별로 센다 (분류·파일은 문서 링크와 따로, 같은 대상은 한 번만). */
export function auditLinks(raw: string): {
  internal: number
  uniqueInternal: number
  categories: number
  files: number
  external: number
  uniqueExternal: number
} {
  const text = prepareSource(raw || '').replace(/```[\s\S]*?```/g, '').replace(/`[^`\n]*`/g, '')
  const targets: string[] = []
  let categories = 0
  let files = 0
  for (const match of text.matchAll(/\[\[([^\]]+)\]\]/g)) {
    const target = match[1].split('|')[0].trim()
    // [[목차]], [[인포박스: …]] 같은 위키 기능은 링크가 아니다
    if (/^(목차|각주$|인포박스:|카드그리드:|탭바:)/.test(target)) continue
    if (/^:?(분류|category):/i.test(target)) categories++
    else if (/^:?(파일|file):/i.test(target)) files++
    else targets.push(target.split('#')[0].trim())
  }
  const urls = text.match(/https?:\/\/[^\s\]|<>"')]+/g) || []
  return {
    internal: targets.length,
    uniqueInternal: new Set(targets).size,
    categories: categories + (text.match(/^\s*분류:/gm)?.length || 0),
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
  const lines = (raw || '').split('\n')
  let current: TableAudit | null = null
  let spans: Array<{ rows: number; width: number }> = []
  let inFence = false

  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim()
    if (trimmed.startsWith('```')) inFence = !inFence
    if (inFence || trimmed.startsWith('```') || !trimmed.startsWith('||') || trimmed.length < 4 || !trimmed.endsWith('||')) {
      current = null
      continue
    }
    if (!current) {
      current = { startLine: i + 1, rows: 0, widths: [], emptyCells: 0, uneven: false }
      tables.push(current)
      spans = []
    }

    const carried = spans.reduce((sum, span) => sum + span.width, 0)
    spans = spans.map((span) => ({ ...span, rows: span.rows - 1 })).filter((span) => span.rows > 0)

    let width = carried
    for (const cell of trimmed.slice(2, -2).split('||')) {
      const colspan = Number(cell.match(/<-(\d+)>/)?.[1] || 1)
      const rowspan = Number(cell.match(/<[\^v]?\|(\d+)>/)?.[1] || 1)
      width += colspan
      if (rowspan > 1) spans.push({ rows: rowspan - 1, width: colspan })
      if (!cell.replace(/<[^<>]*>/g, '').trim()) current.emptyCells++
    }
    current.rows++
    current.widths.push(width)
    current.uneven = new Set(current.widths).size > 1
  }
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
