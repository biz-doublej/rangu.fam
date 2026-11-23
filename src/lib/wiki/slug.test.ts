import { describe, expect, it } from 'vitest'
import { createHeadingSlugger, headingSlug } from './slug'

describe('headingSlug', () => {
  it('keeps Korean and English anchors the same as before', () => {
    expect(headingSlug('주장 선임 과정')).toBe('주장-선임-과정')
    expect(headingSlug('Hmmsim Legacy')).toBe('hmmsim-legacy')
    expect(headingSlug('9~10월 A매치 기간')).toBe('910월-a매치-기간')
  })

  it('gives the same anchor for titles with a slash everywhere', () => {
    expect(headingSlug('A/B')).toBe('ab')
  })

  it('keeps letters from every language', () => {
    expect(headingSlug('歴史')).toBe('歴史')
    expect(headingSlug('ㅋㅋ 밈')).toBe('ㅋㅋ-밈')
    expect(headingSlug('Café')).toBe('café')
  })
})

describe('createHeadingSlugger', () => {
  it('numbers repeated titles so each heading has its own id', () => {
    const slug = createHeadingSlugger()
    expect(slug('개요')).toBe('개요')
    expect(slug('경기 내용')).toBe('경기-내용')
    expect(slug('경기 내용')).toBe('경기-내용-2')
    expect(slug('경기 내용')).toBe('경기-내용-3')
  })

  it('never returns an empty id', () => {
    expect(createHeadingSlugger()('!!!')).toBe('section')
  })
})
