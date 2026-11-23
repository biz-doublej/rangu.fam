import { describe, expect, it } from 'vitest'
import { resolveWikiLink, wikiPath } from './links'

describe('resolveWikiLink', () => {
  it('reads plain pages and pages with a section', () => {
    expect(resolveWikiLink('강한울')).toEqual({ kind: 'page', title: '강한울' })
    expect(resolveWikiLink('강한울#학생회 활동')).toEqual({ kind: 'page', title: '강한울', section: '학생회 활동' })
  })

  it('reads a section of the current page', () => {
    expect(resolveWikiLink('#개요')).toEqual({ kind: 'section', anchor: '개요' })
    expect(resolveWikiLink('#주장 선임 과정')).toEqual({ kind: 'section', anchor: '주장-선임-과정' })
  })

  it('resolves parent, sibling and child pages from the current title', () => {
    expect(resolveWikiLink('../', '강한울/학생회')).toEqual({ kind: 'page', title: '강한울' })
    expect(resolveWikiLink('../야구', '강한울/학생회')).toEqual({ kind: 'page', title: '강한울/야구' })
    expect(resolveWikiLink('../../', '가/나/다')).toEqual({ kind: 'page', title: '가' })
    expect(resolveWikiLink('/2026년', '강한울/학생회')).toEqual({ kind: 'page', title: '강한울/학생회/2026년' })
    expect(resolveWikiLink('../', '강한울')).toEqual({ kind: 'page', title: '강한울' })
  })

  it('keeps relative-looking links as written when the current title is unknown', () => {
    expect(resolveWikiLink('/하위')).toEqual({ kind: 'page', title: '/하위' })
  })

  it('links to files and categories without embedding them', () => {
    expect(resolveWikiLink(':파일:/uploads/wiki/a.png')).toEqual({ kind: 'file', src: '/uploads/wiki/a.png' })
    expect(resolveWikiLink(':분류:인물')).toEqual({ kind: 'category', name: '인물' })
    expect(resolveWikiLink('분류:인물')).toEqual({ kind: 'category', name: '인물' })
  })

  it('reads http and https addresses as outside links only', () => {
    expect(resolveWikiLink('https://example.com/a?b=1')).toEqual({ kind: 'external', url: 'https://example.com/a?b=1' })
    expect(resolveWikiLink('javascript:alert(1)')).toEqual({ kind: 'page', title: 'javascript:alert(1)' })
  })
})

describe('wikiPath', () => {
  it('builds the page address with the heading anchor the renderer uses', () => {
    expect(wikiPath('강한울')).toBe('/wiki/%EA%B0%95%ED%95%9C%EC%9A%B8')
    expect(wikiPath('강한울/학생회#학생회 활동')).toBe(
      `/wiki/${encodeURIComponent('강한울/학생회')}#${encodeURIComponent('학생회-활동')}`
    )
    expect(wikiPath('분류:인물')).toBe(`/wiki/category/${encodeURIComponent('인물')}`)
  })
})
