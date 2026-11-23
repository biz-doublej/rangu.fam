/**
 * 문서 함수가 쓰는 본문 분석 도우미. 화면과 상관없는 순수 함수라 따로 두고 테스트한다.
 */
import { parseHeadingLine } from '@/lib/wikiHeadings'

/** `{{ … }}` 틀을 중괄호 깊이를 세어 통째로 지운다 (안에 `}}` 가 있어도 끝까지). */
function stripTemplates(text: string): string {
  let out = ''
  let depth = 0
  for (let i = 0; i < text.length; i++) {
    if (text[i] === '{' && text[i + 1] === '{') {
      depth++
      i++
      continue
    }
    if (depth > 0 && text[i] === '}' && text[i + 1] === '}') {
      depth--
      i++
      if (depth === 0) out += ' '
      continue
    }
    if (depth === 0) out += text[i]
  }
  return out
}

/**
 * 위키 문법을 걷어내고 읽히는 글자만 남긴다 (단어·글자 수, 키워드 밀도용).
 * - `[[문서|보일 글자]]` → 보일 글자, `[[문서]]` → 문서, `[[파일:…]]` `[[분류:…]]` → 지움
 * - `{{{#색 글자}}}` `{{{+1 글자}}}` `{{{배지 글자}}}` → 글자
 * - `{{틀 … }}` → 중괄호 깊이를 세어 통째로 지움
 */
export function sanitizeWikiText(value: string): string {
  if (!value) return ''
  let text = value
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')

  // 서식 블록 {{{#색 글자}}} 등은 안쪽부터 글자만 남긴다 (겹쳐 있어도 몇 번 반복해 풀기)
  for (let i = 0; i < 6; i++) {
    const next = text.replace(/\{\{\{(?:[^\s{}]+\s+)?([^{}]*)\}\}\}/g, ' $1 ')
    if (next === text) break
    text = next
  }

  text = stripTemplates(text)
    .replace(/\[\[(?:파일|분류|file|category):[^\]]*\]\]/gi, ' ')
    .replace(/\[\[(?:[^\]|]*\|)?([^\]]+)\]\]/g, ' $1 ')
    .replace(/\[이미지:[^\]]*\]/g, ' ')
    .replace(/\[([^\]]+)\]\((?:https?:\/\/|\/)[^)]*\)/g, ' $1 ')
    .replace(/\[\*[^\]]*\]/g, ' ')
    .replace(/\[(?:br|clearfix|목차)\]/gi, ' ')
    .replace(/!icon:\{[^}]*\}/g, ' ')

  return text
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
    .replace(/<[^<>\n]{1,120}>/g, ' ')
    .replace(/'''|''|\*\*|~~|__|\^\^|,,/g, '')
    .replace(/\|/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
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
  const lines = (raw || '').split('\n')
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

/** 각주 참조와 정의를 나눠 센다. 줄 맨 앞의 `[*1] 내용` 은 정의, 그 밖의 `[*1]` 은 참조. */
export function collectFootnotes(raw: string): {
  numberedRefs: Set<string>
  definitions: Set<string>
  autoRefs: number
} {
  const numberedRefs = new Set<string>()
  const definitions = new Set<string>()
  let autoRefs = 0
  const text = (raw || '').replace(/```[\s\S]*?```/g, '').replace(/`[^`\n]*`/g, '')
  for (const line of text.split('\n')) {
    const definition = line.trim().match(/^\[\*(\d+)\]\s+\S/)
    if (definition) {
      definitions.add(definition[1])
      continue
    }
    for (const match of line.matchAll(/\[\*(\d*)\]/g)) {
      if (match[1]) numberedRefs.add(match[1])
      else autoRefs++
    }
  }
  return { numberedRefs, definitions, autoRefs }
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
  const text = (raw || '').replace(/```[\s\S]*?```/g, '').replace(/`[^`\n]*`/g, '')
  const targets: string[] = []
  let categories = 0
  let files = 0
  for (const match of text.matchAll(/\[\[([^\]]+)\]\]/g)) {
    const target = match[1].split('|')[0].trim()
    // [[목차]], [[인포박스: …]] 같은 위키 기능은 링크가 아니다
    if (/^(목차|인포박스:|카드그리드:|탭바:)/.test(target)) continue
    if (/^(분류|category):/i.test(target)) categories++
    else if (/^(파일|file):/i.test(target)) files++
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

/** 한국어 종결 어미와 문장 부호로 문장을 나눈다. */
export function splitSentences(plain: string): string[] {
  return (plain || '')
    .split(/(?<=[.!?。…])\s+|(?<=[다요죠음함임][.!?]?)\s+(?=\S)/)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length > 5)
}
