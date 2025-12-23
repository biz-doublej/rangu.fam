const CATEGORY_PATTERN = /\[\[(?:분류|카테고리):([^\]|]+)(?:\|[^\]]*)?\]\]/gi

export function normalizeCategoryName(value: string): string {
  return value.trim().replace(/\s+/g, ' ')
}

export function extractCategoriesFromContent(rawContent: string | undefined | null): string[] {
  if (!rawContent) return []
  const names = new Set<string>()
  let match: RegExpExecArray | null
  CATEGORY_PATTERN.lastIndex = 0
  while ((match = CATEGORY_PATTERN.exec(rawContent)) !== null) {
    const cleaned = normalizeCategoryName(match[1] || '')
    if (cleaned) {
      names.add(cleaned)
    }
  }
  return Array.from(names)
}

export function buildCategoryRegex(name: string): RegExp {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return new RegExp(`\\[\\[(?:분류|카테고리):\\s*${escaped}\\s*(?:\\|[^\\]]*)?\\]\\]`, 'i')
}
