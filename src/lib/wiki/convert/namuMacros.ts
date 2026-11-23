/**
 * 나무위키 매크로·그림 옵션 → 이랑위키 형식 (src/lib/wiki/macros.ts 가 읽는 모양).
 *
 *   [age(2005-07-27)]                         → [나이:2005-07-27]
 *   [dday(2026-12-25)]                        → [디데이:2026-12-25]
 *   [date] / [datetime]                       → [오늘]
 *   [youtube(id, start=8, end=30, width=640)] → [유튜브:id 시작=8 끝=30 너비=640]
 *   [vimeo(123456)]                           → [비메오:123456]
 *   [ruby(漢字, ruby=한자)]                   → [루비:漢字(한자)]
 *   [[파일:x|width=300&align=center&theme=dark&border-radius=8&rendering=pixelated]]
 *                                             → [[파일:x|300px 가운데 다크 둥글게 픽셀]]
 */

export interface MacroResult {
  /** 바꾼 글 (못 바꾸면 원래 글) */
  text: string
  notes: Array<{ kind: 'unsupported' | 'lossy'; message: string }>
}

/** 실제로 있는 YYYY-MM-DD 날짜인지 */
function isRealDate(value: string): boolean {
  const m = value.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/)
  if (!m) return false
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])]
  const date = new Date(Date.UTC(y, mo - 1, d))
  return date.getUTCFullYear() === y && date.getUTCMonth() === mo - 1 && date.getUTCDate() === d
}

/** 괄호 바깥의 쉼표로 나눈다 */
function splitArgs(args: string): string[] {
  const out: string[] = []
  let depth = 0
  let current = ''
  for (const ch of args) {
    if (ch === '(') depth++
    else if (ch === ')') depth = Math.max(0, depth - 1)
    if (ch === ',' && depth === 0) {
      out.push(current.trim())
      current = ''
    } else {
      current += ch
    }
  }
  out.push(current.trim())
  return out.filter((part, index) => part || index === 0)
}

function readOptions(parts: string[]): Array<[string, string]> {
  return parts
    .map((part) => {
      const eq = part.indexOf('=')
      return eq < 0 ? ([part.trim().toLowerCase(), ''] as [string, string]) : ([part.slice(0, eq).trim().toLowerCase(), part.slice(eq + 1).trim()] as [string, string])
    })
    .filter(([name]) => name)
}

/** 1~4자리 숫자에 px·% (100% 이하) — 렌더러의 너비 검사와 같다 */
function isWidth(value: string): boolean {
  const m = value.match(/^(\d{1,4})(px|%)?$/)
  return !!m && !(m[2] === '%' && Number(m[1]) > 100)
}

const isSeconds = (value: string) => /^\d{1,6}$/.test(value)

const YOUTUBE_URL = /(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/
const VIMEO = /^(?:https?:\/\/(?:www\.|player\.)?vimeo\.com\/(?:video\/)?)?(\d{1,12})(?:[/?#].*)?$/

function droppedNote(what: string, names: string[]): MacroResult['notes'][number] {
  return { kind: 'lossy', message: `${what} 중 이랑위키에서 쓸 수 없는 것을 뺐습니다: ${names.join(', ')}` }
}

/**
 * `[name(args)]` / `[name]` 하나를 바꾼다. 이랑위키에 없는 매크로면 null (부른 쪽이 '그대로 둠' 경고를 낸다).
 * args 는 괄호를 뺀 안쪽 글 (괄호가 없으면 undefined).
 */
export function convertNamuMacro(full: string, rawName: string, args: string | undefined): MacroResult | null {
  const name = rawName.toLowerCase()
  const keep = (message: string): MacroResult => ({ text: full, notes: [{ kind: 'unsupported', message }] })

  if (args === undefined) {
    if (name === 'date') return { text: '[오늘]', notes: [] }
    if (name === 'datetime') return { text: '[오늘]', notes: [{ kind: 'lossy', message: '[datetime] 은 시각 없이 오늘 날짜만 보여 주는 [오늘] 로 바꿨습니다.' }] }
    return null
  }

  const parts = splitArgs(args)
  switch (name) {
    case 'age':
    case 'dday': {
      const date = parts[0]
      if (parts.length !== 1 || !isRealDate(date)) return keep(`[${rawName}(…)] 의 날짜를 읽지 못해 그대로 두었습니다.`)
      if (name === 'age') return { text: `[나이:${date}]`, notes: [] }
      return {
        text: `[디데이:${date}]`,
        notes: [{ kind: 'lossy', message: '[dday] 는 나무위키처럼 남은 날 수가 아니라 D-31 · D-Day · D+5 처럼 보입니다.' }],
      }
    }

    case 'youtube': {
      const first = parts[0]
      const fromUrl = first.match(YOUTUBE_URL)
      const id = fromUrl ? fromUrl[1] : /^[A-Za-z0-9_-]{11}$/.test(first) ? first : null
      if (!id) return keep(`[${rawName}(…)] 의 영상 id 를 읽지 못해 그대로 두었습니다.`)
      const urlStart = first.match(/[?&]t=(\d{1,6})s?(?:&|$)/)
      let start = urlStart ? urlStart[1] : undefined
      let end: string | undefined
      let width: string | undefined
      const dropped: string[] = []
      for (const [key, value] of readOptions(parts.slice(1))) {
        if (key === 'start' && isSeconds(value)) start = value
        else if (key === 'end' && isSeconds(value)) end = value
        else if (key === 'width' && isWidth(value)) width = value
        else dropped.push(key)
      }
      const options = [start && `시작=${start}`, end && `끝=${end}`, width && `너비=${width}`].filter(Boolean)
      return {
        text: `[유튜브:${[id, ...options].join(' ')}]`,
        notes: dropped.length ? [droppedNote('동영상 옵션', dropped)] : [],
      }
    }

    case 'vimeo': {
      const match = parts[0].match(VIMEO)
      if (!match) return keep(`[${rawName}(…)] 의 영상 id 를 읽지 못해 그대로 두었습니다.`)
      let width: string | undefined
      const dropped: string[] = []
      for (const [key, value] of readOptions(parts.slice(1))) {
        if (key === 'width' && isWidth(value)) width = value
        else dropped.push(key)
      }
      return {
        text: `[비메오:${match[1]}${width ? ` 너비=${width}` : ''}]`,
        notes: dropped.length ? [droppedNote('동영상 옵션', dropped)] : [],
      }
    }

    case 'ruby': {
      const base = parts[0]
      const options = readOptions(parts.slice(1))
      const ruby = options.find(([key]) => key === 'ruby')?.[1]
      const plain = /^[^()[\]\n]+$/
      if (!base || !ruby || !plain.test(base) || !plain.test(ruby)) return keep(`[${rawName}(…)] 을 읽지 못해 그대로 두었습니다.`)
      const dropped = options.filter(([key]) => key !== 'ruby').map(([key]) => key)
      return {
        text: `[루비:${base}(${ruby})]`,
        notes: dropped.length ? [droppedNote('루비 옵션', dropped)] : [],
      }
    }

    default:
      return null
  }
}

/* ── 그림 옵션 ──────────────────────────────────────── */

const IMAGE_ALIGN: Record<string, string> = { left: '왼쪽', center: '가운데', right: '오른쪽' }

/**
 * 나무위키 `width=300&align=center…` → 이랑위키 낱말 `300px 가운데 …`.
 * 그림 설명(alt)이 있으면 낱말 형식에 담을 수 없으므로 이랑위키도 읽는 `key=value` 형식으로 두되, 쓸 수 없는 키는 뺀다.
 */
export function convertImageOptions(raw: string): { text: string; dropped: string[] } {
  const pairs = raw
    .split('&')
    .map((pair) => {
      const eq = pair.indexOf('=')
      return eq < 0 ? [pair.trim().toLowerCase(), ''] : [pair.slice(0, eq).trim().toLowerCase(), pair.slice(eq + 1).trim()]
    })
    .filter(([name]) => name)

  const words: string[] = []
  const kept: string[] = []
  const dropped: string[] = []
  let alt: string | undefined
  for (const [name, value] of pairs) {
    const lower = value.toLowerCase()
    if (name === 'width' && isWidth(value)) {
      words.push(/%$/.test(value) || /px$/i.test(value) ? value.toLowerCase() : `${value}px`)
      kept.push(`width=${value}`)
    } else if (name === 'align' && IMAGE_ALIGN[lower]) {
      words.push(IMAGE_ALIGN[lower])
      kept.push(`align=${lower}`)
    } else if (name === 'theme' && (lower === 'dark' || lower === 'light')) {
      words.push(lower === 'dark' ? '다크' : '라이트')
      kept.push(`theme=${lower}`)
    } else if (name === 'border-radius') {
      if (!/^0(?:px|%)?$/.test(lower)) {
        words.push('둥글게')
        kept.push(`border-radius=${value}`)
      }
    } else if (name === 'rendering' && lower === 'pixelated') {
      words.push('픽셀')
      kept.push('rendering=pixelated')
    } else if (name === 'border' && (lower === '1' || lower === '0')) {
      if (lower === '1') {
        words.push('테두리')
        kept.push('border=1')
      }
    } else if (name === 'alt' && value && !/[|\]\n]/.test(value)) {
      alt = value
    } else {
      dropped.push(name)
    }
  }
  if (alt !== undefined) return { text: [...kept, `alt=${alt}`].join('&'), dropped }
  return { text: words.join(' '), dropped }
}
