import { describe, expect, it } from 'vitest'
import { extractCategoriesFromContent, hiddenCategoriesIn } from './wikiCategories'

describe('hidden categories', () => {
  it('keeps the category but marks it hidden', () => {
    const content = '[[분류:인물]]\n[[분류:결말 포함|가림]]\n[[분류:줄거리| 가림 ]]'
    expect(extractCategoriesFromContent(content)).toEqual(['인물', '결말 포함', '줄거리'])
    expect([...hiddenCategoriesIn(content)]).toEqual(['결말 포함', '줄거리'])
  })

  it('treats any other label as a plain category', () => {
    expect([...hiddenCategoriesIn('[[분류:인물|보이는 글]]')]).toEqual([])
  })
})
