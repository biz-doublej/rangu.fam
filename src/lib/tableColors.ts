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
  /** 표는 <tablewidth:100%>, 칸은 <width:30%> — 숫자만 쓰면 px */
  width?: string
  /** <bgimage:주소> — 칸(또는 <tablebgimage:주소> 표) 뒤에 깔리는 그림 */
  backgroundImage?: string
  /** <bgcolor:#fff,#1c1d1f> 처럼 쉼표 뒤에 적은 다크 모드 색 */
  backgroundColorDark?: string
  textColorDark?: string
  /** <nopad> — 칸 안쪽 여백 없애기 */
  noPadding?: boolean
  /** <위> <아래> <valign:middle> — 칸 안 세로 위치 */
  verticalAlign?: 'top' | 'middle' | 'bottom'
  /** <높이:60> <height=60> — 칸 높이 (px) */
  height?: string
  /** <단어줄바꿈> <keepall> — 한글 낱말 중간에서 줄을 바꾸지 않음 */
  keepAll?: boolean
}

/**
 * `#밝은색,#어두운색` 처럼 라이트/다크 두 색을 받는다. 쉼표가 없으면 한 색만.
 * rgb(…) 같은 함수형 색은 쉼표를 품고 있으므로 나누지 않는다.
 */
export function normalizeColorPair(value: string): { light?: string; dark?: string } {
  const v = value.trim()
  if (/^(rgb|hsl)a?\(/i.test(v) || !v.includes(',')) {
    return { light: normalizeColor(v) || undefined }
  }
  const [light, dark] = v.split(',').map((part) => part.trim())
  return { light: normalizeColor(light) || undefined, dark: normalizeColor(dark || '') || undefined }
}

export interface ParsedCellDirectives {
  content: string
  cell: WikiCellStyle
  row: WikiCellStyle
  table: WikiCellStyle
  /** 열 — <열배경:#색> <열글자:#색> <colbgcolor=…> 는 이 칸부터 아래로 같은 열 전체 */
  col: WikiCellStyle
  /** 열 병합 — `<-N>` 또는 `<가로:N>` */
  colSpan?: number
  /** 행 병합 — `<|N>` 또는 `<세로:N>` (다음 행에서는 해당 칸을 생략) */
  rowSpan?: number
  /** <머리글> — 이 줄을 머리글 줄로 (첫 줄은 원래 머리글) */
  header?: boolean
  /** <표위치:오른쪽> <tablealign=right> — 표 자체를 놓을 자리 */
  tablePosition?: 'left' | 'center' | 'right'
  /** <정렬버튼> <sortable> — 머리글 칸에 정렬 버튼 (표 전체에 한 번) */
  sortable?: boolean
}

const ALIGN_VALUES = new Set(['left', 'center', 'right'])
const VALIGN_VALUES = new Set(['top', 'middle', 'bottom'])
const KOREAN_SIDE: Record<string, 'left' | 'center' | 'right'> = { 왼쪽: 'left', 가운데: 'center', 오른쪽: 'right' }

/** 높이 값 정제 — 1~4자리 숫자(px)만 */
export function normalizeHeight(value: string): string | undefined {
  const m = value.trim().match(/^(\d{1,4})(px)?$/)
  return m ? `${m[1]}px` : undefined
}

/**
 * 한 `<…>` 안에서 지시자 하나를 읽는다 (sticky). 순서대로:
 *  1~3 영문 지시자 `[table|row|col]이름:값` (`=` 도 됨)
 *  4~5 한글 값 지시자 `가로:3` `세로:2` `높이:60` `열배경:#색` `열글자:#색` `표위치:오른쪽`
 *  6~7 병합 `-N` `|N`
 *  8   값 없는 지시자 `nopad` `keepall` `왼쪽` `가운데` `오른쪽` `위` `아래` `단어줄바꿈` `머리글`
 */
const DIRECTIVE =
  /\s*(?:(table|row|col)?(bgimage|bgcolor|bordercolor|color|border|align|valign|font|width|height)[:=]("[^"]*"|[^\s>]+)|(가로|세로|높이|열배경|열글자|표위치)[:=]([^\s>]+)|(-\d+)|(\|\d+)|(nopad|(?:table|row)?keepall|sortable|왼쪽|가운데|오른쪽|위|아래|단어줄바꿈|머리글|정렬버튼)(?=\s|$))\s*/iy

/**
 * 배경 그림 주소 정제 — 사이트 안 경로(/…) 나 http(s) 주소만, CSS 를 깨는 문자 없이.
 * CSS url("…") 안에 들어가므로 따옴표·괄호·역슬래시·공백을 허용하지 않는다.
 */
export function normalizeBackgroundImage(value: string): string | undefined {
  const v = value.trim()
  if (!/^(https?:\/\/|\/(?!\/))[^\s"'()\\<>]+$/.test(v)) return undefined
  return v
}

/** 너비 값 정제 — 1~4자리 숫자에 px 또는 % 만 허용 */
export function normalizeWidth(value: string): string | undefined {
  const m = value.trim().match(/^(\d{1,4})(px|%)?$/)
  if (!m) return undefined
  if (m[2] === '%' && Number(m[1]) > 100) return undefined
  return `${m[1]}${m[2] || 'px'}`
}

/** font-family 값 정제 — CSS 주입 위험 문자를 제거 */
export function sanitizeFontFamily(value: string): string {
  return value.replace(/["'<>{};\\]/g, '').trim()
}

/**
 * 셀 본문에서 셀/행/표 지시자를 모두 추출한다.
 * 알 수 없는 지시자는 건드리지 않으므로 기존 문서와 호환된다.
 */
export function parseCellDirectives(cellContent: string): ParsedCellDirectives {
  const result: ParsedCellDirectives = { content: cellContent, cell: {}, row: {}, table: {}, col: {} }

  // `<...>` 토큰을 훑되, 내부가 "지시자들로만" 빈틈없이 구성될 때만 소비한다.
  // 그렇지 않으면(`<b>`, `<div ...>`, `<위키>` 등 일반 텍스트) 원문 그대로 둠 → 기존 문서 비파괴.
  // sticky(y) 정규식으로 토큰을 연속 매칭 → 백트래킹 폭주 없음 + 따옴표 폰트(공백) 지원.
  // 인라인 코드(`<가운데>` 처럼 문법을 보여 주는 칸) 안의 꺾쇠는 지시자가 아니다 — 잠시 가려 두었다가 되돌린다
  const code: string[] = []
  const masked = cellContent.replace(/`[^`\n]*`/g, (span) => {
    code.push(span)
    return `\u0000${code.length - 1}\u0000`
  })
  result.content = masked
    .replace(/<([^<>]+)>/g, (full, inner: string) => {
      const pairs: Array<{ scope: string; attr: string; value: string }> = []
      const spans: Array<{ kind: 'col' | 'row'; n: number }> = []
      let idx = 0
      let ok = true
      while (idx < inner.length) {
        DIRECTIVE.lastIndex = idx
        const m = DIRECTIVE.exec(inner)
        if (!m || m.index !== idx) {
          ok = false
          break
        }
        if (m[6]) {
          spans.push({ kind: 'col', n: parseInt(m[6].slice(1), 10) })
        } else if (m[7]) {
          spans.push({ kind: 'row', n: parseInt(m[7].slice(1), 10) })
        } else if (m[4]) {
          const value = m[5].trim()
          switch (m[4]) {
            case '가로': spans.push({ kind: 'col', n: parseInt(value, 10) }); break
            case '세로': spans.push({ kind: 'row', n: parseInt(value, 10) }); break
            case '높이': pairs.push({ scope: '', attr: 'height', value }); break
            case '열배경': pairs.push({ scope: 'col', attr: 'bgcolor', value }); break
            case '열글자': pairs.push({ scope: 'col', attr: 'color', value }); break
            case '표위치': pairs.push({ scope: 'table', attr: 'align', value: KOREAN_SIDE[value] || value }); break
          }
        } else if (m[8]) {
          const flag = m[8].toLowerCase()
          if (flag === 'nopad') pairs.push({ scope: '', attr: 'nopad', value: '' })
          else if (flag.endsWith('keepall') || flag === '단어줄바꿈') {
            pairs.push({ scope: flag.startsWith('table') ? 'table' : flag.startsWith('row') ? 'row' : '', attr: 'keepall', value: '' })
          } else if (flag in KOREAN_SIDE) pairs.push({ scope: '', attr: 'align', value: KOREAN_SIDE[flag] })
          else if (flag === '위') pairs.push({ scope: '', attr: 'valign', value: 'top' })
          else if (flag === '아래') pairs.push({ scope: '', attr: 'valign', value: 'bottom' })
          else if (flag === '머리글') result.header = true
          else if (flag === '정렬버튼' || flag === 'sortable') result.sortable = true
        } else {
          let value = m[3].trim()
          if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1)
          pairs.push({ scope: (m[1] || '').toLowerCase(), attr: m[2].toLowerCase(), value })
        }
        idx = DIRECTIVE.lastIndex
      }
      if (!ok || (pairs.length === 0 && spans.length === 0 && !result.header && !result.sortable)) return full // 지시자 블록이 아님 → 보존

      for (const { kind, n } of spans) {
        if (!Number.isInteger(n) || n < 2 || n > 50) continue
        if (kind === 'col') result.colSpan = n
        else result.rowSpan = n
      }

      for (const { scope, attr, value } of pairs) {
        // <tablealign:…> / <표위치:…> 는 표 안 글자가 아니라 표 자체의 자리
        if (scope === 'table' && attr === 'align') {
          const v = value.toLowerCase()
          if (ALIGN_VALUES.has(v)) result.tablePosition = v as ParsedCellDirectives['tablePosition']
          continue
        }
        const target =
          scope === 'table' ? result.table : scope === 'row' ? result.row : scope === 'col' ? result.col : result.cell
        switch (attr) {
          case 'bgcolor': {
            const { light, dark } = normalizeColorPair(value)
            if (light) {
              target.backgroundColor = light
              target.backgroundColorDark = dark
            }
            break
          }
          case 'color': {
            const { light, dark } = normalizeColorPair(value)
            if (light) {
              target.textColor = light
              target.textColorDark = dark
            }
            break
          }
          case 'nopad': {
            target.noPadding = true
            break
          }
          case 'bordercolor':
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
          case 'bgimage': {
            const url = normalizeBackgroundImage(value)
            if (url) target.backgroundImage = url
            break
          }
          case 'width': {
            const w = normalizeWidth(value)
            if (w) target.width = w
            break
          }
          case 'height': {
            const h = normalizeHeight(value)
            if (h) target.height = h
            break
          }
          case 'valign': {
            const v = value.toLowerCase()
            if (VALIGN_VALUES.has(v)) target.verticalAlign = v as WikiCellStyle['verticalAlign']
            break
          }
          case 'keepall': {
            target.keepAll = true
            break
          }
        }
      }
      return ''
    })
    .replace(/\u0000(\d+)\u0000/g, (_, index) => code[Number(index)] ?? '')
    .trim()

  return result
}

/** 행/표 스타일 수집용 — 먼저 지정된 값을 우선한다 (덮어쓰지 않음) */
export function assignStyleDefaults(target: WikiCellStyle, source: WikiCellStyle): void {
  if (!target.backgroundColor && source.backgroundColor) {
    target.backgroundColor = source.backgroundColor
    target.backgroundColorDark = source.backgroundColorDark
  }
  if (!target.textColor && source.textColor) {
    target.textColor = source.textColor
    target.textColorDark = source.textColorDark
  }
  if (!target.noPadding && source.noPadding) target.noPadding = true
  if (!target.borderColor && source.borderColor) target.borderColor = source.borderColor
  if (!target.textAlign && source.textAlign) target.textAlign = source.textAlign
  if (!target.fontFamily && source.fontFamily) target.fontFamily = source.fontFamily
  if (!target.width && source.width) target.width = source.width
  if (!target.backgroundImage && source.backgroundImage) target.backgroundImage = source.backgroundImage
  if (!target.verticalAlign && source.verticalAlign) target.verticalAlign = source.verticalAlign
  if (!target.height && source.height) target.height = source.height
  if (!target.keepAll && source.keepAll) target.keepAll = true
}

/**
 * 정렬용 글자 — 칸 원문에서 위키 문법을 걷어 낸다 (`[[문서|보일 글자]]` → 보일 글자, `1,234` → 1234).
 */
export function cellSortKey(content: string): string {
  return (content || '')
    .replace(/\[\[(?:[^\]|]*\|)?([^\]]*)\]\]/g, '$1')
    .replace(/\{\{\{(?:[#+-][^\s{}]*\s+)?([^{}]*)\}\}\}/g, '$1')
    .replace(/\[\*[^\]]*\]/g, '')
    .replace(/\[br\]/gi, ' ')
    .replace(/<[^<>]*>/g, '')
    .replace(/'''|''|~~|__|\*\*/g, '')
    .replace(/(\d),(?=\d{3}\b)/g, '$1')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * 줄 순서 — column 열의 글자로 정렬(숫자는 숫자 크기대로, 한글은 가나다순), 빈 칸은 방향과 관계없이 맨 아래.
 * 같은 값은 원래 순서를 지킨다.
 */
export function sortRowOrder(keys: string[][], column: number, direction: 1 | -1): number[] {
  const collator = new Intl.Collator('ko', { numeric: true, sensitivity: 'base' })
  return keys
    .map((row, index) => ({ index, key: row[column] ?? '' }))
    .sort((a, b) => {
      if (!a.key || !b.key) return a.key ? -1 : b.key ? 1 : a.index - b.index
      return collator.compare(a.key, b.key) * direction || a.index - b.index
    })
    .map((row) => row.index)
}

/**
 * 칸마다 몇 번째 열에서 시작하는지 — 위 줄의 세로 병합(<|N>)이 차지한 자리를 건너뛰고,
 * 가로 병합(<-N>)은 그 칸 수만큼 차지한다. 열 색(<열배경:…>)을 같은 열에 이어 칠할 때 쓴다.
 */
export function layoutTableColumns(rows: Array<Array<{ colSpan?: number; rowSpan?: number }>>): number[][] {
  const occupied: Array<Set<number>> = rows.map(() => new Set<number>())
  return rows.map((cells, rowIndex) => {
    let column = 0
    return cells.map((cell) => {
      while (occupied[rowIndex].has(column)) column++
      const start = column
      const colSpan = cell.colSpan || 1
      const rowSpan = cell.rowSpan || 1
      for (let r = rowIndex; r < Math.min(rows.length, rowIndex + rowSpan); r++) {
        for (let c = start; c < start + colSpan; c++) occupied[r].add(c)
      }
      column = start + colSpan
      return start
    })
  })
}

/** 레이어 병합 (뒤 레이어가 우선) → React inline style */
export function mergeCellStylesToCss(
  ...layers: Array<WikiCellStyle | undefined>
): React.CSSProperties {
  const merged: WikiCellStyle = {}
  for (const layer of layers) {
    if (!layer) continue
    // 색을 덮어쓰면 그 층의 다크 색도 함께 바꾼다 (아래 층의 다크 색이 남지 않게)
    if (layer.backgroundColor) {
      merged.backgroundColor = layer.backgroundColor
      merged.backgroundColorDark = layer.backgroundColorDark
    }
    if (layer.textColor) {
      merged.textColor = layer.textColor
      merged.textColorDark = layer.textColorDark
    }
    if (layer.borderColor) merged.borderColor = layer.borderColor
    if (layer.textAlign) merged.textAlign = layer.textAlign
    if (layer.fontFamily) merged.fontFamily = layer.fontFamily
    if (layer.width) merged.width = layer.width
    if (layer.backgroundImage) merged.backgroundImage = layer.backgroundImage
    if (layer.noPadding) merged.noPadding = true
    if (layer.verticalAlign) merged.verticalAlign = layer.verticalAlign
    if (layer.height) merged.height = layer.height
    if (layer.keepAll) merged.keepAll = true
  }

  const css: React.CSSProperties & Record<string, string> = {}
  if (merged.backgroundColor) css.backgroundColor = merged.backgroundColor
  if (merged.textColor) css.color = merged.textColor
  // 다크 모드 색은 변수로 넘기고 globals.css 가 다크 화면에서만 적용한다
  if (merged.backgroundColorDark) css['--wd-bg'] = merged.backgroundColorDark
  if (merged.textColorDark) css['--wd-color'] = merged.textColorDark
  if (merged.noPadding) css.padding = '0'
  if (merged.borderColor) css.borderColor = merged.borderColor
  if (merged.textAlign) css.textAlign = merged.textAlign
  if (merged.fontFamily) css.fontFamily = merged.fontFamily
  if (merged.width) css.width = merged.width
  if (merged.verticalAlign) css.verticalAlign = merged.verticalAlign
  if (merged.height) css.height = merged.height
  if (merged.keepAll) css.wordBreak = 'keep-all'
  if (merged.backgroundImage) {
    css.backgroundImage = `url("${merged.backgroundImage}")`
    css.backgroundSize = 'cover'
    css.backgroundPosition = 'center'
  }
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