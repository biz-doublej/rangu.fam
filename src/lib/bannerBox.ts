import { normalizeColor, normalizeColorPair, normalizeWidth } from './tableColors'

/**
 * {{배너상자 ... }} 블록 — 위쪽 배너(배경 이미지·로고·제목), 사진, 펼치기·접기 띠,
 * 위키 문법으로 쓰는 본문, 아래쪽 이전·다음 링크로 이뤄진 상자.
 *
 *   {{배너상자
 *   |윗글=대한민국 축구 국가대표팀
 *   |제목=감독
 *   |덧글=(전임제)
 *   |배경=이미지주소
 *   |본문=
 *   ||<tablewidth:100%> ... ||
 *   }}
 *
 * `|본문=` 다음 줄부터 닫는 `}}` 전까지는 위키 문법 그대로 본문이 된다.
 */
export interface BannerBoxSpec {
  params: Record<string, string>
  body: string
}

/** 여는 줄인지 — `{{배너상자` 만 있는 줄 */
export function isBannerBoxStart(line: string): boolean {
  return /^\{\{\s*배너상자\s*$/.test(line.trim())
}

/**
 * 여는 줄 다음부터 읽어 상자 내용과 닫는 줄 위치를 돌려준다.
 * 본문 안에 다른 `{{...}}` 블록이 있어도 짝을 맞춰 건너뛴다.
 */
export function readBannerBox(lines: string[], start: number): { spec: BannerBoxSpec; end: number } {
  const params: Record<string, string> = {}
  const bodyLines: string[] = []
  let inBody = false
  let depth = 0
  let lastKey = ''
  let i = start + 1

  for (; i < lines.length; i++) {
    const raw = lines[i]
    const trimmed = raw.trim()
    if (trimmed === '}}' && depth === 0) break

    // 본문 뒤에도 |아래=… 처럼 값을 적을 수 있다 (표의 || 줄과는 구분)
    const late = depth === 0 && inBody ? trimmed.match(/^\|(?!\|)\s*([^=|]+?)\s*=\s*(.*)$/) : null
    if (late) {
      params[late[1]] = late[2].trim()
      lastKey = ''
      continue
    }

    if (inBody) {
      // 본문 안의 블록 템플릿 짝 맞추기 ({{{ 인라인 문법은 제외)
      if (/^\{\{(?!\{)/.test(trimmed) && !trimmed.includes('}}')) depth++
      else if (trimmed === '}}') depth--
      bodyLines.push(raw)
      continue
    }

    // |본문= 을 빼먹고 바로 표(||)를 써도 거기서부터 본문으로 본다
    if (trimmed.startsWith('||')) {
      inBody = true
      bodyLines.push(raw)
      continue
    }

    const pair = trimmed.match(/^\|\s*([^=|]+?)\s*=\s*(.*)$/)
    if (pair) {
      const key = pair[1]
      if (key === '본문' || key === '내용') {
        inBody = true
        if (pair[2].trim()) bodyLines.push(pair[2])
        continue
      }
      params[key] = pair[2].trim()
      lastKey = key
    } else if (lastKey && trimmed) {
      // 값이 여러 줄이면 줄바꿈으로 잇는다
      params[lastKey] += `\n${trimmed}`
    }
  }

  return { spec: { params, body: bodyLines.join('\n') }, end: i }
}

const SAFE_COLOR = /^(#[0-9a-fA-F]{3,8}|[a-zA-Z]+)$/

const YES = new Set(['예', '네', 'yes', 'true', '1', 'o'])
const NO = new Set(['아니오', '아니요', 'no', 'false', '0', 'x'])

export interface BannerBoxStyle {
  /** 배너 배경색 (배경 이미지가 없거나 불러오기 전) */
  bannerColor: string
  /** 배너 글자색 */
  bannerText: string
  /** 펼치기·접기 띠 색 */
  barColor: string
  barText: string
  /** 본문 바탕·글자색 (비우면 위키 기본). 쉼표 뒤는 다크 모드 색 */
  bodyColor?: string
  bodyColorDark?: string
  bodyText?: string
  bodyTextDark?: string
  /** 배너 무늬 — |무늬=사선 이면 사선 줄무늬 (그림 없이) */
  pattern?: 'diagonal'
  patternColor: string
  /** 유니폼 옆띠 — 배너 양끝과 펼치기 띠에 검은 띠·흰 선 장식 */
  trim: boolean
  trimColor: string
  trimLineColor: string
  /** 상자 안 배지 기본색 */
  badgeColor?: string
  /** 상자 본문 링크색 (쉼표 뒤는 다크 모드) */
  linkColor?: string
  linkColorDark?: string
  /** 왼쪽·오른쪽 이미지를 배너 위쪽 모서리에 붙일지 */
  sideImagesTop: boolean
  /** 상자 테두리 */
  border: string
  /** 상자 너비 (비우면 문단 폭) */
  width?: string
  /** 배너 높이 */
  height: string
  /** 오른쪽에 띄우기 (넓은 화면에서만) */
  floatRight: boolean
  /** 펼치기·접기 띠를 보일지 */
  collapsible: boolean
  /** 처음에 접혀 있는지 */
  startCollapsed: boolean
  /** 문서 맨 위(안내문보다 위)로 옮길지 */
  pinTop: boolean
}

function flag(value: string | undefined): boolean | undefined {
  if (!value) return undefined
  const v = value.trim().toLowerCase()
  if (YES.has(v)) return true
  if (NO.has(v)) return false
  return undefined
}

/** 색·너비 같은 값은 검증해서 안전한 값만 쓴다 */
export function resolveBannerBoxStyle(params: Record<string, string>): BannerBoxStyle {
  // 배너 색은 CSS 그라디언트 문자열에 들어가므로 #hex 나 색 이름만 받는다
  const color = (key: string, fallback?: string) => {
    const value = normalizeColor((params[key] || '').trim())
    return value && SAFE_COLOR.test(value) ? value : fallback
  }
  const bannerColor = color('배경색', '#1f2a37')!
  const heightValue = normalizeWidth(params['높이'] || '')
  const collapsible = flag(params['접기']) ?? true
  const pair = (key: string) => normalizeColorPair(params[key] || '')
  const body = pair('본문색')
  const bodyText = pair('본문글자색')
  const link = pair('링크색')
  return {
    bodyColorDark: body.dark,
    bodyTextDark: bodyText.dark,
    pattern: params['무늬']?.trim() === '사선' ? 'diagonal' : undefined,
    patternColor: color('무늬색', '#770007')!,
    trim: flag(params['옆띠']) ?? false,
    trimColor: color('옆띠색', '#000000')!,
    trimLineColor: color('옆띠선색', '#ffffff')!,
    badgeColor: color('배지색'),
    linkColor: link.light,
    linkColorDark: link.dark,
    sideImagesTop: params['옆이미지위치']?.trim() === '위',
    bannerColor,
    bannerText: color('글자색', '#ffffff')!,
    barColor: color('띠색', '#000000')!,
    barText: color('띠글자색', '#ffffff')!,
    bodyColor: body.light,
    bodyText: bodyText.light,
    border: color('테두리색', bannerColor)!,
    width: normalizeWidth(params['너비'] || ''),
    height: heightValue && heightValue.endsWith('px') ? heightValue : '92px',
    floatRight: params['위치']?.trim() === '오른쪽',
    collapsible,
    startCollapsed: collapsible && (flag(params['접힘']) ?? false),
    pinTop: flag(params['맨위']) ?? false,
  }
}

/**
 * 배너 사선 줄무늬 (나무위키 국가대표 틀의 그 무늬). 색은 검증된 값만 들어온다.
 */
export function diagonalPattern(base: string, dark: string): string {
  return `repeating-linear-gradient(45deg, ${dark} 2%, ${base} 5% 12%, ${dark} 15% 17%, ${base} 20%, ${dark} 22%, ${base} 25% 30%, ${dark} 32%, ${base} 35% 37%, ${dark} 40%, ${base} 42% 45%, ${dark} 47%)`
}

/** 배너 양끝 유니폼 옆띠 — 바깥 흰 선·검은 띠, 안쪽 세로 막대 */
export function bannerTrim(line: string, band: string): string {
  return [
    `linear-gradient(to bottom, transparent 32%, ${band} 32%) 8% 0% / 2.5% 100% no-repeat`,
    `linear-gradient(to bottom, transparent 32%, ${band} 32%) 92% 0% / 2.5% 100% no-repeat`,
    `linear-gradient(to bottom, ${line} 7%, transparent 7% 32%, ${line} 32%) 10% 0% / 1.5% 100% no-repeat`,
    `linear-gradient(to bottom, ${line} 7%, transparent 7% 32%, ${line} 32%) 90% 0% / 1.5% 100% no-repeat`,
    `linear-gradient(to right, ${line} 1%, ${band} 1% 3.5%, transparent 3.5% 96.5%, ${band} 96.5% 99%, ${line} 99%)`,
  ].join(', ')
}

/** 펼치기·접기 띠의 옆띠 장식 */
export function barTrim(edge: string, line: string, bar: string): string {
  return `linear-gradient(to right, ${edge} 2%, ${line} 2% 4%, ${bar} 4% 96%, ${line} 96% 98%, ${edge} 98%)`
}

/** `[[파일:주소]]` 로 적어도, 주소만 적어도 이미지 주소를 꺼낸다 */
export function imageAddress(value: string | undefined): string {
  const raw = (value || '').trim()
  const file = raw.match(/^\[\[파일:([^\]|]+)(?:\|[^\]]*)?\]\]$/)
  return (file ? file[1] : raw).trim()
}
