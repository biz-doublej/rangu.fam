import { describe, expect, it } from 'vitest'
import { parseRedirectTarget, redirectPath, splitRedirectTarget } from './redirect'

describe('parseRedirectTarget', () => {
  it('reads the target with or without a section', () => {
    expect(parseRedirectTarget('#redirect 강한울')).toBe('강한울')
    expect(parseRedirectTarget('#넘겨주기 [[강한울#학생회 활동|표시]]')).toBe('강한울#학생회 활동')
    expect(parseRedirectTarget('그냥 문서')).toBeNull()
  })
})

describe('splitRedirectTarget', () => {
  it('splits the page from the section', () => {
    expect(splitRedirectTarget('강한울#학생회 활동')).toEqual({ title: '강한울', section: '학생회 활동' })
    expect(splitRedirectTarget('강한울')).toEqual({ title: '강한울' })
    expect(splitRedirectTarget('강한울#')).toEqual({ title: '강한울' })
  })
})

describe('redirectPath', () => {
  it('keeps the section as the address anchor instead of part of the title', () => {
    expect(redirectPath('강한울#학생회 활동', '한울')).toBe(
      `/wiki/${encodeURIComponent('강한울')}?from=${encodeURIComponent('한울')}#${encodeURIComponent('학생회-활동')}`
    )
    expect(redirectPath('강한울/야구', '한울야구')).toBe(
      `/wiki/${encodeURIComponent('강한울/야구')}?from=${encodeURIComponent('한울야구')}`
    )
  })
})
