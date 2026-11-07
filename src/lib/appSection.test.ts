import { describe, expect, it } from 'vitest'
import { detectSection } from './appSection'

describe('detectSection', () => {
  it('treats every irang.wiki page as wiki even though the browser path has no /wiki', () => {
    expect(detectSection('/', 'irang.wiki', true)).toBe('wiki')
    expect(detectSection('/recent', 'www.irang.wiki', true)).toBe('wiki')
    expect(detectSection('/wiki', 'irang.wiki', true)).toBe('wiki')
  })

  it('keeps account settings outside the wiki section on the wiki host', () => {
    expect(detectSection('/settings/account', 'irang.wiki', true)).toBe('rangu')
  })

  it('opens the admin dashboard as admin on the wiki host', () => {
    expect(detectSection('/admin', 'irang.wiki', true)).toBe('admin')
    expect(detectSection('/administrator', 'irang.wiki', true)).toBe('wiki')
  })

  it('uses the path on the main host', () => {
    expect(detectSection('/', 'rangu-fam.com', true)).toBe('archive')
    expect(detectSection('/', 'rangu-fam.com', false)).toBe('rangu')
    expect(detectSection('/wiki/stats', 'rangu-fam.com', true)).toBe('wiki')
    expect(detectSection('/admin', 'rangu-fam.com', true)).toBe('admin')
    expect(detectSection('/m/jaewon', undefined, true)).toBe('member')
    expect(detectSection(null, undefined, true)).toBe('rangu')
  })
})
