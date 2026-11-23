/**
 * 나무위키 `{{{#!wiki style="…" dark-style="…"}}}` 의 CSS 를 이랑위키 `:::상자` 옵션으로 옮긴다.
 *
 * 옮기는 것 (값은 src/lib/tableColors.ts 의 색·너비 검사를 통과한 것만):
 *   background / background-color → 배경 (dark-style 쪽은 `,#다크` 뒤 절반)
 *   color → 글자 (같은 규칙)          border / border-color → 테두리 (색만)
 *   text-align → 정렬                 width → 너비
 *   border-radius (0 이 아님) → 둥글게
 *   margin 의 좌우 auto → 위치=가운데 (왼쪽만 auto 면 위치=오른쪽)
 * 그 밖의 것(padding, font-size, class, 그러데이션, url() …)은 뺀다 — 임의 CSS 는 내보내지 않는다.
 */
import { normalizeColor, normalizeColorPair, normalizeWidth } from '../../tableColors'

/** CSS 값 하나를 색으로 읽는다 — #rgb·#rrggbb·색 이름·rgb(r,g,b) 만. rgb 는 #rrggbb 로 바꾼다 */
export function cssColor(value: string): string | null {
  const v = value.trim().replace(/\s*!important$/i, '')
  if (/^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i.test(v)) return v
  const rgb = v.match(/^rgb\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*\)$/i)
  if (rgb) {
    const parts = rgb.slice(1, 4).map(Number)
    if (parts.some((n) => n > 255)) return null
    return `#${parts.map((n) => n.toString(16).padStart(2, '0')).join('')}`
  }
  if (/^[a-z]+$/i.test(v) && !NOT_A_COLOR.has(v.toLowerCase())) return v
  return null
}

const NOT_A_COLOR = new Set([
  'none', 'inherit', 'initial', 'unset', 'revert', 'currentcolor', 'auto',
  // 테두리 모양 낱말
  'solid', 'dashed', 'dotted', 'double', 'hidden', 'groove', 'ridge', 'inset', 'outset', 'thin', 'medium', 'thick',
])

const SIDE: Record<string, string> = { left: '왼쪽', center: '가운데', right: '오른쪽' }

function declarations(css: string): Array<[string, string]> {
  return css
    .split(';')
    .map((part) => {
      const colon = part.indexOf(':')
      if (colon < 0) return null
      const name = part.slice(0, colon).trim().toLowerCase()
      const value = part.slice(colon + 1).trim().replace(/\s*!important$/i, '')
      return name ? ([name, value] as [string, string]) : null
    })
    .filter((pair): pair is [string, string] => pair !== null)
}

/** `margin` 단축 속성에서 왼쪽·오른쪽 값 */
function marginSides(value: string): { left: string; right: string; vertical: string[] } | null {
  const parts = value.trim().split(/\s+/)
  if (parts.length === 1) return { left: parts[0], right: parts[0], vertical: [parts[0]] }
  if (parts.length === 2) return { left: parts[1], right: parts[1], vertical: [parts[0]] }
  if (parts.length === 3) return { left: parts[1], right: parts[1], vertical: [parts[0], parts[2]] }
  if (parts.length === 4) return { left: parts[3], right: parts[1], vertical: [parts[0], parts[2]] }
  return null
}

const isZero = (value: string) => /^0(?:\.0+)?(?:px|em|rem|%)?$/i.test(value.trim())

export interface WikiBox {
  /** `:::상자` 뒤에 붙일 옵션 (없으면 빈 글) */
  options: string
  /** 옮기지 못하고 뺀 것 — 속성·CSS 이름만 (값은 경고에 싣지 않는다) */
  dropped: string[]
}

/**
 * `{{{#!wiki` 뒤 머리 글의 속성들(`style="…"`, `dark-style="…"`, `class="…"` 등)을 상자 옵션으로.
 * attributes 는 이름(소문자) → 값.
 */
export function wikiBoxOptions(attributes: Array<[string, string]>): WikiBox {
  const dropped: string[] = []
  const drop = (name: string) => {
    if (!dropped.includes(name)) dropped.push(name)
  }
  let style = ''
  let darkStyle = ''
  for (const [name, value] of attributes) {
    if (name === 'style') style += `;${value}`
    else if (name === 'dark-style') darkStyle += `;${value}`
    else drop(name)
  }

  let background: string | undefined
  let text: string | undefined
  let border: string | undefined
  let align: string | undefined
  let width: string | undefined
  let rounded = false
  let leftAuto = false
  let rightAuto = false

  for (const [name, value] of declarations(style)) {
    switch (name) {
      case 'background':
      case 'background-color': {
        const color = cssColor(value)
        if (color) background = color
        else drop(name)
        break
      }
      case 'color': {
        const color = cssColor(value)
        if (color) text = color
        else drop(name)
        break
      }
      case 'border':
      case 'border-color': {
        if (name === 'border' && (isZero(value) || /^none$/i.test(value))) {
          drop(name)
          break
        }
        const color = value
          .split(/\s+/)
          .map(cssColor)
          .find((c): c is string => c !== null)
        if (color) border = color
        else drop(name)
        break
      }
      case 'text-align': {
        const side = SIDE[value.toLowerCase()]
        if (side) align = side
        else drop(name)
        break
      }
      case 'width': {
        const w = normalizeWidth(value)
        if (w) width = value.trim()
        else drop(name)
        break
      }
      case 'border-radius': {
        if (!isZero(value)) rounded = true
        break
      }
      case 'margin': {
        const sides = marginSides(value)
        if (!sides) {
          drop(name)
          break
        }
        leftAuto = sides.left === 'auto'
        rightAuto = sides.right === 'auto'
        const leftover = [...sides.vertical, ...(leftAuto ? [] : [sides.left]), ...(rightAuto ? [] : [sides.right])]
        if (leftover.some((v) => !isZero(v))) drop(name)
        break
      }
      case 'margin-left':
        leftAuto = value === 'auto'
        if (!leftAuto && !isZero(value)) drop(name)
        break
      case 'margin-right':
        rightAuto = value === 'auto'
        if (!rightAuto && !isZero(value)) drop(name)
        break
      default:
        drop(name)
    }
  }

  let darkBackground: string | undefined
  let darkText: string | undefined
  for (const [name, value] of declarations(darkStyle)) {
    if (name === 'background' || name === 'background-color') {
      const color = cssColor(value)
      if (color) darkBackground = color
      else drop(`dark-style ${name}`)
    } else if (name === 'color') {
      const color = cssColor(value)
      if (color) darkText = color
      else drop(`dark-style ${name}`)
    } else {
      drop(`dark-style ${name}`)
    }
  }
  // 다크 색만 있고 밝은 색이 없으면 이랑위키로 나타낼 수 없다
  if (darkBackground && !background) {
    drop('dark-style background')
    darkBackground = undefined
  }
  if (darkText && !text) {
    drop('dark-style color')
    darkText = undefined
  }

  const options: string[] = []
  // 내보내기 전에 렌더러와 같은 검사를 한 번 더 거친다
  const pair = (light: string, dark: string | undefined, key: string, name: string) => {
    const value = dark ? `${light},${dark}` : light
    const checked = normalizeColorPair(value)
    if (checked.light && (!dark || checked.dark)) options.push(`${key}=${value}`)
    else drop(name)
  }
  if (background) pair(background, darkBackground, '배경', 'background')
  if (text) pair(text, darkText, '글자', 'color')
  if (border) {
    if (normalizeColor(border)) options.push(`테두리=${border}`)
    else drop('border')
  }
  if (align) options.push(`정렬=${align}`)
  if (leftAuto && rightAuto) options.push('위치=가운데')
  else if (leftAuto) options.push('위치=오른쪽')
  if (width) options.push(`너비=${width}`)
  if (rounded) options.push('둥글게')

  return { options: options.join(' '), dropped }
}

/** `style="…"` 처럼 따옴표로 감싼 속성들. 그 뒤 남은 글의 시작 위치도 돌려준다 */
export function readAttributes(header: string): { attributes: Array<[string, string]>; end: number } {
  const attributes: Array<[string, string]> = []
  const pattern = /\s*([A-Za-z][A-Za-z-]*)\s*=\s*(?:"([^"]*)"|'([^']*)')/y
  let end = 0
  for (;;) {
    pattern.lastIndex = end
    const m = pattern.exec(header)
    if (!m) break
    attributes.push([m[1].toLowerCase(), m[2] ?? m[3] ?? ''])
    end = pattern.lastIndex
  }
  return { attributes, end }
}
