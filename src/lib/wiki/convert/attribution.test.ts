import { describe, expect, it } from 'vitest'
import { attributionNote, isUsableSourceUrl, namuTitleFromUrl } from './attribution'

describe('namu attribution', () => {
  it('reads the namu page name from its address', () => {
    expect(namuTitleFromUrl('https://namu.wiki/w/%EA%B0%95%ED%95%9C%EC%9A%B8')).toBe('강한울')
    expect(namuTitleFromUrl('https://namu.wiki/w/강한울?from=x#s-1')).toBe('강한울')
    expect(namuTitleFromUrl('https://example.com/w/강한울')).toBeNull()
  })

  it('accepts only http(s) addresses that cannot break the link', () => {
    expect(isUsableSourceUrl('https://namu.wiki/w/%EA%B0%95')).toBe(true)
    expect(isUsableSourceUrl('javascript:alert(1)')).toBe(false)
    expect(isUsableSourceUrl('https://namu.wiki/w/a (b)')).toBe(false)
  })

  it('writes a note box with the source and the license', () => {
    const note = attributionNote('https://namu.wiki/w/%EA%B0%95%ED%95%9C%EC%9A%B8', '한울')
    expect(note).toContain(':::note')
    expect(note).toContain('[나무위키 「강한울」](https://namu.wiki/w/%EA%B0%95%ED%95%9C%EC%9A%B8)')
    expect(note).toContain('CC BY-NC-SA 2.0 KR')
    expect(attributionNote('https://example.com/page', '직접 정한 제목')).toContain('「직접 정한 제목」')
  })
})
