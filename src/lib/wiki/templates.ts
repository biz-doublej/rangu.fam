/**
 * 틀 — `틀:이름` 문서를 다른 문서에서 `{{이름|키=값}}` 으로 불러 쓴다 (나무위키 [include(틀:이름, 키=값)] 와 같은 일).
 *
 *   틀 문서 안:  안녕하세요 @이름@ 님, 소속은 @소속=무소속@ 입니다.
 *   부르는 쪽:   {{인사|이름=강한울}}
 *   결과:        안녕하세요 강한울 님, 소속은 무소속 입니다.
 *
 * - `@키@` 는 넘긴 값으로, `@키=기본값@` 은 값이 없을 때 기본값으로 바뀐다. 이름 없이 넘긴 값은 `@1@` `@2@`.
 * - 펼치기는 한 단계만 — 틀 안에서 다른 틀을 불러도 그 틀은 펼치지 않는다 (나무위키도 중첩 불가, 순환도 생기지 않음).
 * - 렌더러가 직접 그리는 상자 이름(인물정보상자, 배너상자 …)은 예약어라 틀로 찾지 않는다.
 * - 코드 블록과 인라인 코드 안의 `{{…}}` 는 건드리지 않는다.
 */

export const TEMPLATE_PREFIX = '틀:'

/** 렌더러가 직접 그리는 `{{…}}` — 같은 이름의 틀 문서가 있어도 렌더러가 먼저 */
export const RESERVED_TEMPLATE_NAMES = ['인물정보상자', '그룹정보상자', '배너상자', '인용']

export function isReservedTemplateName(name: string): boolean {
  const bare = (name || '').trim().replace(/<[^>]*>.*$/, '').trim()
  return RESERVED_TEMPLATE_NAMES.includes(bare) || /^role\s*:/i.test(bare)
}

export interface TemplateCall {
  /** 원문에서 `{{` 의 위치 */
  start: number
  /** `}}` 다음 위치 */
  end: number
  name: string
  params: Record<string, string>
}

/**
 * 코드 자리를 같은 길이의 빈칸으로 가려 위치가 그대로인 글을 만든다.
 * 렌더러처럼 줄 단위로 본다 — 줄 맨 앞이 ``` 인 줄이 코드 블록을 열고 닫고(```` 네 개도), 나머지 줄은 `…` 만 코드.
 * (정규식으로 ``` 짝을 맞추면 ```` 처럼 쓴 문서에서 그 뒤 짝이 모두 어긋난다)
 */
function maskCode(text: string): string {
  let inFence = false
  return text
    .split('\n')
    .map((line) => {
      if (line.trim().startsWith('```')) {
        inFence = !inFence
        return ' '.repeat(line.length)
      }
      if (inFence) return ' '.repeat(line.length)
      return line.replace(/`[^`\n]*`/g, (span) => ' '.repeat(span.length))
    })
    .join('\n')
}

/**
 * `{{` 에서 시작해 짝이 맞는 `}}` 를 찾는다. 안의 `{{{글}}}` 서식은 세 겹으로 따로 짝을 맞춘다
 * (`{{틀|이름={{{#fff 흰}}}}}` 에서 끝을 잘못 잡지 않게).
 */
function findCallEnd(text: string, start: number): number {
  const stack: number[] = []
  let i = start
  while (i < text.length) {
    if (text.startsWith('{{{', i)) {
      stack.push(3)
      i += 3
    } else if (text.startsWith('{{', i)) {
      stack.push(2)
      i += 2
    } else if (text.startsWith('}}}', i) && stack[stack.length - 1] === 3) {
      stack.pop()
      i += 3
    } else if (text.startsWith('}}', i) && stack[stack.length - 1] === 2) {
      stack.pop()
      i += 2
      if (stack.length === 0) return i
    } else {
      i++
    }
  }
  return -1
}

/** 맨 바깥 `|` 에서만 나눈다 — `[[문서|글]]`, `{{{…}}}`, `{{…}}` 안의 `|` 는 값의 일부 */
function splitTopLevel(inner: string): string[] {
  const parts: string[] = []
  let depthBrace = 0
  let depthLink = 0
  let current = ''
  for (let i = 0; i < inner.length; i++) {
    const two = inner.slice(i, i + 2)
    if (two === '{{') { depthBrace++; current += two; i++; continue }
    if (two === '}}' && depthBrace > 0) { depthBrace--; current += two; i++; continue }
    if (two === '[[') { depthLink++; current += two; i++; continue }
    if (two === ']]' && depthLink > 0) { depthLink--; current += two; i++; continue }
    if (inner[i] === '|' && depthBrace === 0 && depthLink === 0) {
      parts.push(current)
      current = ''
      continue
    }
    current += inner[i]
  }
  parts.push(current)
  return parts
}

function parseCall(inner: string): { name: string; params: Record<string, string> } {
  const [rawName = '', ...rest] = splitTopLevel(inner)
  const params: Record<string, string> = {}
  let position = 0
  for (const part of rest) {
    const named = part.match(/^\s*([^=\s|{}[\]@]{1,40})\s*=([\s\S]*)$/)
    // 나무위키 include 에서 넘어온 값의 \, 는 쉼표
    if (named) params[named[1]] = named[2].trim().replace(/\\,/g, ',')
    else params[String(++position)] = part.trim().replace(/\\,/g, ',')
  }
  return { name: rawName.trim(), params }
}

/** 글 안의 틀 부르기를 앞에서부터 찾는다 (예약어 상자와 `{{{…}}}` 서식은 빼고) */
export function findTemplateCalls(content: string): TemplateCall[] {
  const text = maskCode(content || '')
  const calls: TemplateCall[] = []
  let from = 0
  while (from < text.length) {
    const start = text.indexOf('{{', from)
    if (start < 0) break
    // {{{ 서식 / 앞이 { 인 경우는 틀이 아니다
    if (text[start + 2] === '{' || (start > 0 && text[start - 1] === '{')) {
      let skip = start
      while (text[skip] === '{') skip++
      from = skip
      continue
    }
    const end = findCallEnd(text, start)
    if (end < 0) {
      from = start + 2
      continue
    }
    const { name, params } = parseCall(content.slice(start + 2, end - 2))
    if (name && !name.includes('\n') && !isReservedTemplateName(name) && name.length <= 60) {
      calls.push({ start, end, name, params })
    }
    from = end
  }
  return calls
}

/** 부르는 틀 이름들 (중복 없이) */
export function templateNamesIn(content: string): string[] {
  return [...new Set(findTemplateCalls(content).map((call) => call.name))]
}

const PLACEHOLDER = /@([^@\s=]{1,40})(?:=([^@\n]*))?@/g

/** 틀 문서 안의 `@키@` `@키=기본값@` 을 채운다 */
export function fillTemplate(templateContent: string, params: Record<string, string>): string {
  return (templateContent || '').replace(PLACEHOLDER, (_, key: string, fallback?: string) =>
    params[key] !== undefined && params[key] !== '' ? params[key] : fallback ?? ''
  )
}

/** 틀 문서가 받는 칸 — 문서에 처음 나온 순서, 기본값이 있으면 함께 */
export function templateParameters(templateContent: string): Array<{ name: string; fallback?: string }> {
  const seen = new Map<string, string | undefined>()
  for (const match of maskCode(templateContent || '').matchAll(PLACEHOLDER)) {
    if (!seen.has(match[1]) || (seen.get(match[1]) === undefined && match[2] !== undefined)) seen.set(match[1], match[2])
  }
  return [...seen].map(([name, fallback]) => (fallback === undefined ? { name } : { name, fallback }))
}

/**
 * 틀을 펼친다. templates[이름] 이
 * - 글이면: 그 틀로 채워 넣는다 (펼친 결과 안의 틀은 다시 펼치지 않는다)
 * - null 이면: 없는 틀 — `[[틀:이름]]` 링크로 바꿔 만들 수 있게 한다
 * - undefined 면: 아직 불러오는 중 — 빈칸 (불러오면 다시 펼친다)
 */
export function expandTemplates(content: string, templates: Record<string, string | null | undefined>): string {
  const calls = findTemplateCalls(content)
  if (calls.length === 0) return content
  let out = ''
  let last = 0
  for (const call of calls) {
    out += content.slice(last, call.start)
    const template = templates[call.name]
    if (typeof template === 'string') out += fillTemplate(template, call.params)
    else if (template === null) out += `[[${TEMPLATE_PREFIX}${call.name}]]`
    last = call.end
  }
  return out + content.slice(last)
}
