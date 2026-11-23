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

/**
 * 가린 분류 — `[[분류:X|가림]]` 로 쓴 분류 이름들. 줄거리 같은 내용이 분류 이름에 드러나지 않도록
 * 문서 끝 분류 목록에서 흐리게 보이고, 마우스를 올리거나 초점을 주면 보인다 (나무위키 [[분류:X#blur]]).
 */
export function hiddenCategoriesIn(rawContent: string | undefined | null): Set<string> {
  const names = new Set<string>()
  for (const match of (rawContent || '').matchAll(/\[\[(?:분류|카테고리):([^\]|]+)\|\s*가림\s*\]\]/gi)) {
    const cleaned = normalizeCategoryName(match[1] || '')
    if (cleaned) names.add(cleaned)
  }
  return names
}

export function buildCategoryRegex(name: string): RegExp {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return new RegExp(`\\[\\[(?:분류|카테고리):\\s*${escaped}\\s*(?:\\|[^\\]]*)?\\]\\]`, 'i')
}
