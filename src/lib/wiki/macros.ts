/**
 * 한 줄 매크로 `[이름:값]` 과 그림 옵션을 읽는 순수 함수 (렌더러와 문서 함수가 같이 쓴다).
 *
 *   [나이:2005-07-27]           → 만 나이
 *   [디데이:2026-12-25]          → D-31 / D-Day / D+5
 *   [오늘]                       → 2026-11-24
 *   [유튜브:id 시작=8 끝=30 너비=640]   [비메오:123456]
 *   [루비:漢字(한자)]
 *
 * 날짜는 한국 시간(KST) 기준으로 센다 — 서버와 브라우저 시간대가 달라도 같은 날로 계산되게.
 */

export interface DateParts {
  y: number
  m: number
  d: number
}

const KST_OFFSET_MS = 9 * 60 * 60 * 1000
const DAY_MS = 24 * 60 * 60 * 1000

/** 지금 한국 날짜 */
export function kstToday(now: Date = new Date()): DateParts {
  const kst = new Date(now.getTime() + KST_OFFSET_MS)
  return { y: kst.getUTCFullYear(), m: kst.getUTCMonth() + 1, d: kst.getUTCDate() }
}

/** `YYYY-MM-DD` — 실제로 있는 날짜만 (2월 30일 등은 거절) */
export function parseIsoDate(value: string): DateParts | null {
  const match = (value || '').trim().match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/)
  if (!match) return null
  const [y, m, d] = [Number(match[1]), Number(match[2]), Number(match[3])]
  const date = new Date(Date.UTC(y, m - 1, d))
  if (date.getUTCFullYear() !== y || date.getUTCMonth() !== m - 1 || date.getUTCDate() !== d) return null
  return { y, m, d }
}

export function formatDate({ y, m, d }: DateParts): string {
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}

/** 만 나이 — 생일이 지나야 한 살 더 */
export function ageOn(birth: DateParts, today: DateParts): number {
  const passed = today.m > birth.m || (today.m === birth.m && today.d >= birth.d)
  return today.y - birth.y - (passed ? 0 : 1)
}

/** D-day 표기 — 그날 전이면 D-남은날, 당일 D-Day, 지나면 D+지난날 */
export function ddayLabel(target: DateParts, today: DateParts): string {
  const diff = Math.round((Date.UTC(target.y, target.m - 1, target.d) - Date.UTC(today.y, today.m - 1, today.d)) / DAY_MS)
  if (diff === 0) return 'D-Day'
  return diff > 0 ? `D-${diff}` : `D+${-diff}`
}

/* ── 동영상 ─────────────────────────────────────────── */

export interface VideoSpec {
  provider: 'youtube' | 'vimeo'
  id: string
  start?: number
  end?: number
  /** `640px` 또는 `80%` */
  width?: string
}

function readOptions(tokens: string[]): Record<string, string> {
  const options: Record<string, string> = {}
  for (const token of tokens) {
    const pair = token.match(/^([^=]+)=(.+)$/)
    if (pair) options[pair[1].trim().toLowerCase()] = pair[2].trim()
  }
  return options
}

function readSeconds(value?: string): number | undefined {
  if (!value || !/^\d{1,6}$/.test(value)) return undefined
  return Number(value)
}

function readWidth(value?: string): string | undefined {
  const match = (value || '').match(/^(\d{1,4})(px|%)?$/)
  if (!match) return undefined
  if (match[2] === '%' && Number(match[1]) > 100) return undefined
  return `${match[1]}${match[2] || 'px'}`
}

/**
 * `[유튜브:…]` 의 값 — 영상 id(11자) 또는 유튜브 주소, 뒤에 `시작=8 끝=30 너비=640` (영문 start/end/width 도 됨).
 * id 는 정해진 글자만 허용하므로 iframe 주소에 다른 것이 섞이지 않는다.
 */
export function parseYoutube(value: string): VideoSpec | null {
  const [first = '', ...rest] = (value || '').trim().split(/[\s,]+/)
  const fromUrl = first.match(/(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/)
  const id = fromUrl ? fromUrl[1] : /^[A-Za-z0-9_-]{11}$/.test(first) ? first : null
  if (!id) return null
  const options = readOptions(rest)
  const urlStart = first.match(/[?&]t=(\d{1,6})s?(?:&|$)/)
  const spec: VideoSpec = { provider: 'youtube', id }
  const start = readSeconds(options['시작'] ?? options.start) ?? (urlStart ? Number(urlStart[1]) : undefined)
  const end = readSeconds(options['끝'] ?? options.end)
  const width = readWidth(options['너비'] ?? options.width)
  if (start !== undefined) spec.start = start
  if (end !== undefined) spec.end = end
  if (width) spec.width = width
  return spec
}

/** `[비메오:123456]` 또는 비메오 주소 */
export function parseVimeo(value: string): VideoSpec | null {
  const [first = '', ...rest] = (value || '').trim().split(/[\s,]+/)
  const match = first.match(/^(?:https?:\/\/(?:www\.|player\.)?vimeo\.com\/(?:video\/)?)?(\d{1,12})(?:[/?#].*)?$/)
  if (!match) return null
  const spec: VideoSpec = { provider: 'vimeo', id: match[1] }
  const width = readWidth(readOptions(rest)['너비'] ?? readOptions(rest).width)
  if (width) spec.width = width
  return spec
}

export function videoEmbedUrl(spec: VideoSpec): string {
  if (spec.provider === 'vimeo') return `https://player.vimeo.com/video/${spec.id}`
  const query = new URLSearchParams()
  if (spec.start !== undefined) query.set('start', String(spec.start))
  if (spec.end !== undefined) query.set('end', String(spec.end))
  const qs = query.toString()
  // 쿠키를 남기지 않는 주소
  return `https://www.youtube-nocookie.com/embed/${spec.id}${qs ? `?${qs}` : ''}`
}

/* ── 루비 ───────────────────────────────────────────── */

/** `[루비:漢字(한자)]` — 괄호 앞이 본문, 괄호 안이 위에 작게 붙는 글자 */
export function parseRuby(value: string): { base: string; ruby: string } | null {
  const match = (value || '').trim().match(/^([^()]+)\(([^()]+)\)$/)
  if (!match) return null
  return { base: match[1].trim(), ruby: match[2].trim() }
}

/* ── 그림 옵션 ──────────────────────────────────────── */

export interface ImageOptions {
  width?: string
  align?: 'left' | 'center' | 'right'
  /** 다크·라이트 화면 한쪽에서만 보이기 */
  theme?: 'dark' | 'light'
  rounded?: boolean
  pixelated?: boolean
  border?: boolean
  alt?: string
}

const WORD_ALIGN: Record<string, ImageOptions['align']> = {
  왼쪽: 'left', 가운데: 'center', 오른쪽: 'right', left: 'left', center: 'center', right: 'right',
}

/**
 * `[[파일:주소|…]]` 의 옵션.
 * - 이랑위키 낱말: `300px 가운데 다크 둥글게 픽셀 테두리` (띄어 쓴 낱말, 순서 상관없음, 숫자만 쓰면 px)
 * - 나무위키 형식도 읽는다: `width=300&align=center&theme=dark&border-radius=8&rendering=pixelated`
 * - 그 밖의 글은 예전처럼 그림 설명(alt)으로 쓴다
 */
export function parseImageOptions(raw: string): ImageOptions {
  const text = (raw || '').trim()
  const options: ImageOptions = {}
  if (!text) return options

  if (text.includes('=')) {
    const pairs = Object.fromEntries(
      text
        .split('&')
        .map((pair) => pair.split('=').map((part) => part.trim()))
        .filter(([name, value]) => name && value)
        .map(([name, value]) => [name.toLowerCase(), value])
    )
    const width = readWidth(pairs.width)
    if (width) options.width = width
    if (WORD_ALIGN[pairs.align]) options.align = WORD_ALIGN[pairs.align]
    if (pairs.theme === 'dark' || pairs.theme === 'light') options.theme = pairs.theme
    if (pairs['border-radius'] && pairs['border-radius'] !== '0') options.rounded = true
    if (pairs.rendering === 'pixelated') options.pixelated = true
    if (pairs.border === '1') options.border = true
    if (pairs.alt) options.alt = pairs.alt
    return options
  }

  const words = text.split(/\s+/)
  const known = words.every((word) => readWidth(word) || WORD_ALIGN[word] || ['다크', '라이트', '둥글게', '픽셀', '테두리'].includes(word))
  if (!known) {
    // 낱말 옵션이 아니면 예전처럼 설명 글
    options.alt = text
    return options
  }
  for (const word of words) {
    const width = readWidth(word)
    if (width) options.width = width
    else if (WORD_ALIGN[word]) options.align = WORD_ALIGN[word]
    else if (word === '다크') options.theme = 'dark'
    else if (word === '라이트') options.theme = 'light'
    else if (word === '둥글게') options.rounded = true
    else if (word === '픽셀') options.pixelated = true
    else if (word === '테두리') options.border = true
  }
  return options
}
