/**
 * 나무위키 `[include(틀:이름, 칸=값, 칸2=값)]` → 이랑위키 틀 부르기 `{{이름|칸=값|칸2=값}}`.
 * 이랑위키가 부르기를 읽는 규칙(src/lib/wiki/templates.ts)에 맞춰 쓴다:
 *  - 맨 바깥 `|` 에서 칸을 나눈다 — `[[…]]`, `{{{…}}}`, `{{…}}` 안의 `|` 만 값의 일부
 *  - 칸 이름은 빈칸·`= | { } [ ] @` 없이 40자까지, 틀 이름은 60자까지 한 줄
 *  - 나무위키 값 안의 `\,` 는 쉼표 (이랑위키에서는 그냥 `,`)
 */

/** 렌더러가 직접 그리는 `{{…}}` 상자 이름 — 같은 이름으로 부르면 틀 대신 그 상자가 그려진다 */
const RESERVED_NAMES = ['인물정보상자', '그룹정보상자', '배너상자', '인용']

export function isReservedName(name: string): boolean {
  const bare = name.trim().replace(/<[^>]*>.*$/, '').trim()
  return RESERVED_NAMES.includes(bare) || /^role\s*:/i.test(bare)
}

/** `[include(` 다음 칸부터 짝이 맞는 `)]` 를 찾아 `]` 다음 칸을 돌려준다 (없으면 -1) */
export function findIncludeEnd(text: string, from: number): number {
  let paren = 0
  let link = 0
  let brace = 0
  for (let i = from; i < text.length; i++) {
    if (text[i] === '\\') {
      i++
      continue
    }
    if (text.startsWith('{{{', i)) {
      brace++
      i += 2
    } else if (text.startsWith('}}}', i) && brace > 0) {
      brace--
      i += 2
    } else if (text.startsWith('[[', i)) {
      link++
      i++
    } else if (text.startsWith(']]', i) && link > 0) {
      link--
      i++
    } else if (text[i] === '(') {
      paren++
    } else if (text[i] === ')') {
      if (paren > 0) paren--
      else if (link === 0 && brace === 0 && text[i + 1] === ']') return i + 2
    }
  }
  return -1
}

/** 괄호·`[[…]]`·`{{{…}}}` 바깥에서만 sep 로 나눈다. `\` 다음 글자는 건너뛴다(그대로 남긴다) */
function splitTopLevel(text: string, sep: string, limit = Infinity): string[] {
  const parts: string[] = []
  let current = ''
  let paren = 0
  let link = 0
  let brace = 0
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    if (ch === '\\' && i + 1 < text.length) {
      current += ch + text[i + 1]
      i++
      continue
    }
    if (text.startsWith('{{{', i)) {
      brace++
      current += '{{{'
      i += 2
      continue
    }
    if (text.startsWith('}}}', i) && brace > 0) {
      brace--
      current += '}}}'
      i += 2
      continue
    }
    if (text.startsWith('[[', i)) {
      link++
      current += '[['
      i++
      continue
    }
    if (text.startsWith(']]', i) && link > 0) {
      link--
      current += ']]'
      i++
      continue
    }
    if (ch === '(') paren++
    else if (ch === ')' && paren > 0) paren--
    if (ch === sep && paren === 0 && link === 0 && brace === 0 && parts.length < limit) {
      parts.push(current)
      current = ''
      continue
    }
    current += ch
  }
  parts.push(current)
  return parts
}

/** 이랑위키가 부르기를 나눌 때 값이 쪼개지거나 부르기가 일찍 끝나는지 — 바깥의 `|` 나 짝 없는 `}}` */
function breaksCall(value: string): boolean {
  let link = 0
  let triple = 0
  let double = 0
  for (let i = 0; i < value.length; i++) {
    if (value.startsWith('{{{', i)) {
      triple++
      i += 2
    } else if (value.startsWith('}}}', i) && triple > 0) {
      triple--
      i += 2
    } else if (value.startsWith('{{', i)) {
      double++
      i++
    } else if (value.startsWith('}}', i)) {
      if (double === 0) return true
      double--
      i++
    } else if (value.startsWith('[[', i)) {
      link++
      i++
    } else if (value.startsWith(']]', i) && link > 0) {
      link--
      i++
    } else if (value[i] === '|' && link === 0 && triple === 0 && double === 0) {
      return true
    }
  }
  return false
}

const KEY = /^[^=\s|{}[\]@]{1,40}$/
const NAME = /^[^|{}[\]\n]{1,60}$/

export type IncludeResult =
  | { kind: 'call'; text: string; name: string; reserved: boolean }
  | { kind: 'keep'; note: { kind: 'unsupported' | 'lossy'; message: string } }

/**
 * `[include(` 와 `)]` 사이의 글을 틀 부르기로 바꾼다.
 * restore 는 가려 둔 인라인 코드를 원래 글로 되돌린다 — 값 검사는 원래 글로 한다.
 */
export function convertInclude(args: string, restore: (text: string) => string): IncludeResult {
  const [page = '', ...rest] = splitTopLevel(args, ',')
  const target = page.trim().match(/^틀\s*:\s*(.*)$/)
  if (!target) {
    return { kind: 'keep', note: { kind: 'unsupported', message: '틀이 아닌 문서를 넣는 [include(…)] 는 이랑위키에 없어 그대로 두었습니다.' } }
  }
  const name = target[1].trim()
  if (!NAME.test(name)) {
    return { kind: 'keep', note: { kind: 'unsupported', message: '[include(틀:…)] 의 틀 이름을 읽지 못해 그대로 두었습니다.' } }
  }

  const params: string[] = []
  for (const part of rest) {
    if (!part.trim()) continue
    const [rawKey, rawValue] = splitTopLevel(part, '=', 1)
    const named = rawValue !== undefined
    const key = named ? rawKey.trim() : ''
    const value = (named ? rawValue : rawKey).trim().replace(/\\,/g, ',')
    if (named && !KEY.test(key)) {
      return {
        kind: 'keep',
        note: { kind: 'lossy', message: `[include(틀:${name})] 의 칸 이름(${key})은 이랑위키 틀에서 쓸 수 없어 그대로 두었습니다.` },
      }
    }
    if (breaksCall(restore(value))) {
      return {
        kind: 'keep',
        note: { kind: 'lossy', message: `[include(틀:${name})] 의 값에 | 가 있어 이랑위키 틀 부르기로 바꾸지 못하고 그대로 두었습니다.` },
      }
    }
    params.push(named ? `${key}=${value}` : value)
  }
  return { kind: 'call', text: `{{${[name, ...params].join('|')}}}`, name, reserved: isReservedName(name) }
}
