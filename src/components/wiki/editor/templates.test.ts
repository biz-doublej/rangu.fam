import { describe, expect, it } from 'vitest'
import { BLANK_PATTERN, EDITOR_TEMPLATE_GROUPS, blank } from './templates'

describe('blank', () => {
  it('picks 을 after a final consonant and 를 after a vowel', () => {
    expect(blank('이름')).toBe('{이름을 채워주세요}')
    expect(blank('소개')).toBe('{소개를 채워주세요}')
    expect(blank('생년월일')).toBe('{생년월일을 채워주세요}')
  })
})

describe('BLANK_PATTERN', () => {
  it('matches blanks but not namu {{{…}}} syntax', () => {
    const text = `{{{#a33a2e 빨간 글씨}}} ${blank('이름')} {{인물정보상자}}`
    expect(text.match(BLANK_PATTERN)).toEqual(['{이름을 채워주세요}'])
  })

  it('finds a blank in every built-in template', () => {
    for (const group of EDITOR_TEMPLATE_GROUPS) {
      for (const t of group.items) {
        expect(t.template.match(BLANK_PATTERN)?.length ?? 0).toBeGreaterThan(0)
      }
    }
  })
})
