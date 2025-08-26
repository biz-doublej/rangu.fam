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