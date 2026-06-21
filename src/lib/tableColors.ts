/**
 * Table Color Utilities for Wiki Tables
 * Supports RGB hex codes and predefined color names
 */

// Predefined color palette for common table colors
export const TABLE_COLOR_PRESETS = {
  // Header colors
  'blue-header': '#4472C4',
  'red-header': '#C65856',
  'green-header': '#70AD47',
  'orange-header': '#ED7D31',
  'purple-header': '#8E44AD',
  'gray-header': '#7B8FA1',
  
  // Background colors
  'light-blue': '#D4E6F1',
  'light-red': '#F8D7DA',
  'light-green': '#D4F7DC',
  'light-orange': '#FFE5CC',
  'light-purple': '#E8D5F4',
  'light-gray': '#F2F3F4',
  
  // Dark theme alternatives
  'dark-blue': '#2C3E50',
  'dark-red': '#8B0000',
  'dark-green': '#2D5016',
  'dark-orange': '#B8610A',
  'dark-purple': '#4A148C',
  'dark-gray': '#424242',
  
  // Standard colors
  'white': '#FFFFFF',
  'black': '#000000',
  'transparent': 'transparent'
} as const

export type ColorPreset = keyof typeof TABLE_COLOR_PRESETS

/**
 * Validates if a string is a valid RGB hex color
 */
export function isValidHexColor(color: string): boolean {
  if (!color) return false
  
  // Remove # if present
  const cleanColor = color.replace(/^#/, '')
  
  // Check if it's a valid 3 or 6 digit hex
  const hexPattern = /^[0-9A-Fa-f]{3}$|^[0-9A-Fa-f]{6}$/
  return hexPattern.test(cleanColor)
}

/**
 * Normalizes color input to a valid CSS color value
 */
export function normalizeColor(color: string): string {
  if (!color) return ''
  
  // Check if it's a preset color
  if (color in TABLE_COLOR_PRESETS) {
    return TABLE_COLOR_PRESETS[color as ColorPreset]
  }
  
  // Check if it's a valid hex color
  if (isValidHexColor(color)) {
    return color.startsWith('#') ? color : `#${color}`
  }
  
  // Check if it's a valid CSS color name or function
  const cssColorPattern = /^(rgb|rgba|hsl|hsla)\(|^[a-zA-Z]+$/
  if (cssColorPattern.test(color)) {
    return color
  }
  
  return ''
}

/**
 * Converts 3-digit hex to 6-digit hex
 */
export function expandHexColor(hex: string): string {
  const cleanHex = hex.replace(/^#/, '')
  
  if (cleanHex.length === 3) {
    return `#${cleanHex.split('').map(char => char + char).join('')}`
  }
  
  if (cleanHex.length === 6) {
    return `#${cleanHex}`
  }
  
  return hex
}

/**
 * Determines if a color is dark (for automatic text color selection)
 */
export function isColorDark(color: string): boolean {
  const normalizedColor = normalizeColor(color)
  
  if (!normalizedColor || normalizedColor === 'transparent') {
    return false
  }
  
  // Convert to RGB values
  let r: number, g: number, b: number
  
  if (normalizedColor.startsWith('#')) {
    const hex = expandHexColor(normalizedColor).slice(1)
    r = parseInt(hex.slice(0, 2), 16)
    g = parseInt(hex.slice(2, 4), 16)
    b = parseInt(hex.slice(4, 6), 16)
  } else {
    // For CSS color names and functions, assume medium brightness
    return false
  }
  
  // Calculate luminance using standard formula
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  return luminance < 0.5
}

/**
 * Gets appropriate text color for a given background color
 */
export function getContrastColor(backgroundColor: string): string {
  return isColorDark(backgroundColor) ? '#FFFFFF' : '#000000'
}

/**
 * Parses table color attributes from wiki syntax
 * Supports formats like: ||<bgcolor:#ff0000> Cell Content ||
 */
export function parseTableColorAttributes(cellContent: string): {
  content: string
  backgroundColor?: string
  textColor?: string
  borderColor?: string
} {
  const result = {
    content: cellContent,
    backgroundColor: undefined as string | undefined,
    textColor: undefined as string | undefined,
    borderColor: undefined as string | undefined
  }
  
  // Match color attributes: <bgcolor:#color>, <color:#color>, <border:#color>
  const colorAttributePattern = /<(bgcolor|color|border):(#?[^>]+)>/g
  let match
  
  while ((match = colorAttributePattern.exec(cellContent)) !== null) {
    const [fullMatch, attribute, colorValue] = match
    const normalizedColor = normalizeColor(colorValue.trim())
    
    if (normalizedColor) {
      switch (attribute) {
        case 'bgcolor':
          result.backgroundColor = normalizedColor
          break
        case 'color':
          result.textColor = normalizedColor
          break
        case 'border':
          result.borderColor = normalizedColor
          break
      }
    }
    
    // Remove the attribute from content
    result.content = result.content.replace(fullMatch, '')
  }
  
  result.content = result.content.trim()
  return result
}

// ─────────────────────────────────────────────────────────────────
// 확장 표 지시자 (2026-06) — 셀/행/표 3단계 캐스케이드
//
//   셀:  <bgcolor:#x> <color:#x> <border:#x> <align:center> <font:이름>
//   행:  <rowbgcolor:#x> <rowcolor:#x> <rowalign:center> <rowfont:이름>   ← 행 첫 셀에 한 번만
//   표:  <tablebgcolor:#x> <tablecolor:#x> <tablealign:center>
//        <tablefont:이름> <tableborder:#x>                                ← 표 첫 셀에 한 번만
//
// 우선순위: 셀 > 행 > 표 > 기본값. 기존 셀 단위 문법은 그대로 동작한다.
// ─────────────────────────────────────────────────────────────────

export interface WikiCellStyle {
  backgroundColor?: string
  textColor?: string
  borderColor?: string
  textAlign?: 'left' | 'center' | 'right'
  fontFamily?: string
}

export interface ParsedCellDirectives {
  content: string
  cell: WikiCellStyle
  row: WikiCellStyle
  table: WikiCellStyle
  /** 열 병합 — 나무위키식 `<-N>` */
  colSpan?: number
  /** 행 병합 — 나무위키식 `<|N>` (다음 행에서는 해당 칸을 생략) */
  rowSpan?: number
}

const ALIGN_VALUES = new Set(['left', 'center', 'right'])

/** font-family 값 정제 — CSS 주입 위험 문자를 제거 */
export function sanitizeFontFamily(value: string): string {
  return value.replace(/["'<>{};\\]/g, '').trim()
}

/**
 * 셀 본문에서 셀/행/표 지시자를 모두 추출한다.
 * 알 수 없는 지시자는 건드리지 않으므로 기존 문서와 호환된다.
 */
export function parseCellDirectives(cellContent: string): ParsedCellDirectives {
  const result: ParsedCellDirectives = { content: cellContent, cell: {}, row: {}, table: {} }

  // `<...>` 토큰을 훑되, 내부가 "지시자들로만" 빈틈없이 구성될 때만 소비한다.
  // 그렇지 않으면(`<b>`, `<div ...>` 등 일반 텍스트) 원문 그대로 둠 → 기존 문서 비파괴.
  // sticky(y) 정규식으로 토큰을 연속 매칭 → 백트래킹 폭주 없음 + 따옴표 폰트(공백) 지원.
  result.content = cellContent
    .replace(/<([^<>]+)>/g, (full, inner: string) => {
      const pairs: Array<{ scope: string; attr: string; value: string }> = []
      const spans: Array<{ kind: 'col' | 'row'; n: number }> = []
      // key:value 지시자 또는 병합 토큰(-N = 열 병합, |N = 행 병합)
      const pairRe =
        /\s*(?:(table|row)?(bgcolor|color|border|align|font):("[^"]*"|[^\s>]+)|(-\d+)|(\|\d+))\s*/y
      let idx = 0
      let ok = true
      while (idx < inner.length) {
        pairRe.lastIndex = idx
        const m = pairRe.exec(inner)
        if (!m || m.index !== idx) {
          ok = false
          break
        }
        if (m[4]) {
          spans.push({ kind: 'col', n: parseInt(m[4].slice(1), 10) })
        } else if (m[5]) {
          spans.push({ kind: 'row', n: parseInt(m[5].slice(1), 10) })
        } else {
          let value = m[3].trim()
          if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1)
          pairs.push({ scope: (m[1] || '').toLowerCase(), attr: m[2].toLowerCase(), value })
        }
        idx = pairRe.lastIndex
      }
      if (!ok || (pairs.length === 0 && spans.length === 0)) return full // 지시자 블록이 아님 → 보존

      for (const { kind, n } of spans) {
        if (!Number.isInteger(n) || n < 2 || n > 50) continue
        if (kind === 'col') result.colSpan = n
        else result.rowSpan = n
      }

      for (const { scope, attr, value } of pairs) {
        const target = scope === 'table' ? result.table : scope === 'row' ? result.row : result.cell
        switch (attr) {
          case 'bgcolor': {
            const c = normalizeColor(value)
            if (c) target.backgroundColor = c
            break
          }
          case 'color': {
            const c = normalizeColor(value)
            if (c) target.textColor = c
            break
          }
          case 'border': {
            const c = normalizeColor(value)
            if (c) target.borderColor = c
            break
          }
          case 'align': {
            const v = value.toLowerCase()
            if (ALIGN_VALUES.has(v)) target.textAlign = v as WikiCellStyle['textAlign']
            break
          }
          case 'font': {
            const f = sanitizeFontFamily(value)
            if (f) target.fontFamily = f
            break
          }
        }
      }
      return ''
    })
    .trim()

  return result
}

/** 행/표 스타일 수집용 — 먼저 지정된 값을 우선한다 (덮어쓰지 않음) */
export function assignStyleDefaults(target: WikiCellStyle, source: WikiCellStyle): void {
  if (!target.backgroundColor && source.backgroundColor) target.backgroundColor = source.backgroundColor
  if (!target.textColor && source.textColor) target.textColor = source.textColor
  if (!target.borderColor && source.borderColor) target.borderColor = source.borderColor
  if (!target.textAlign && source.textAlign) target.textAlign = source.textAlign
  if (!target.fontFamily && source.fontFamily) target.fontFamily = source.fontFamily
}

/** 레이어 병합 (뒤 레이어가 우선) → React inline style */
export function mergeCellStylesToCss(
  ...layers: Array<WikiCellStyle | undefined>
): React.CSSProperties {
  const merged: WikiCellStyle = {}
  for (const layer of layers) {
    if (!layer) continue
    if (layer.backgroundColor) merged.backgroundColor = layer.backgroundColor
    if (layer.textColor) merged.textColor = layer.textColor
    if (layer.borderColor) merged.borderColor = layer.borderColor
    if (layer.textAlign) merged.textAlign = layer.textAlign
    if (layer.fontFamily) merged.fontFamily = layer.fontFamily
  }

  const css: React.CSSProperties = {}
  if (merged.backgroundColor) css.backgroundColor = merged.backgroundColor
  if (merged.textColor) css.color = merged.textColor
  if (merged.borderColor) css.borderColor = merged.borderColor
  if (merged.textAlign) css.textAlign = merged.textAlign
  if (merged.fontFamily) css.fontFamily = merged.fontFamily
  return css
}

/**
 * Generates table color syntax for insertion
 */
export function generateTableColorSyntax(options: {
  backgroundColor?: string
  textColor?: string
  borderColor?: string
}): string {
  const attributes: string[] = []
  
  if (options.backgroundColor) {
    const bgColor = normalizeColor(options.backgroundColor)
    if (bgColor) attributes.push(`bgcolor:${bgColor}`)
  }
  
  if (options.textColor) {
    const textColor = normalizeColor(options.textColor)
    if (textColor) attributes.push(`color:${textColor}`)
  }
  
  if (options.borderColor) {
    const borderColor = normalizeColor(options.borderColor)
    if (borderColor) attributes.push(`border:${borderColor}`)
  }
  
  return attributes.length > 0 ? `<${attributes.join(' ')}>` : ''
}

/**
 * Gets CSS styles object from color attributes
 */
export function getTableCellStyles(attributes: {
  backgroundColor?: string
  textColor?: string
  borderColor?: string
}): React.CSSProperties {
  const styles: React.CSSProperties = {}
  
  if (attributes.backgroundColor) {
    styles.backgroundColor = attributes.backgroundColor
  }
  
  if (attributes.textColor) {
    styles.color = attributes.textColor
  }
  
  if (attributes.borderColor) {
    styles.borderColor = attributes.borderColor
  }
  
  return styles
}

/**
 * Color palette for UI picker
 */
export const COLOR_PICKER_PALETTE = [
  // Row 1 - Headers
  { name: '파란 헤더', value: TABLE_COLOR_PRESETS['blue-header'] },
  { name: '빨간 헤더', value: TABLE_COLOR_PRESETS['red-header'] },
  { name: '초록 헤더', value: TABLE_COLOR_PRESETS['green-header'] },
  { name: '주황 헤더', value: TABLE_COLOR_PRESETS['orange-header'] },
  { name: '보라 헤더', value: TABLE_COLOR_PRESETS['purple-header'] },
  { name: '회색 헤더', value: TABLE_COLOR_PRESETS['gray-header'] },
  
  // Row 2 - Light backgrounds
  { name: '연한 파랑', value: TABLE_COLOR_PRESETS['light-blue'] },
  { name: '연한 빨강', value: TABLE_COLOR_PRESETS['light-red'] },
  { name: '연한 초록', value: TABLE_COLOR_PRESETS['light-green'] },
  { name: '연한 주황', value: TABLE_COLOR_PRESETS['light-orange'] },
  { name: '연한 보라', value: TABLE_COLOR_PRESETS['light-purple'] },
  { name: '연한 회색', value: TABLE_COLOR_PRESETS['light-gray'] },
  
  // Row 3 - Dark backgrounds  
  { name: '어두운 파랑', value: TABLE_COLOR_PRESETS['dark-blue'] },
  { name: '어두운 빨강', value: TABLE_COLOR_PRESETS['dark-red'] },
  { name: '어두운 초록', value: TABLE_COLOR_PRESETS['dark-green'] },
  { name: '어두운 주황', value: TABLE_COLOR_PRESETS['dark-orange'] },
  { name: '어두운 보라', value: TABLE_COLOR_PRESETS['dark-purple'] },
  { name: '어두운 회색', value: TABLE_COLOR_PRESETS['dark-gray'] },
  
  // Row 4 - Standard
  { name: '흰색', value: TABLE_COLOR_PRESETS['white'] },
  { name: '검은색', value: TABLE_COLOR_PRESETS['black'] },
  { name: '투명', value: TABLE_COLOR_PRESETS['transparent'] }
]