import { describe, expect, it } from 'vitest'
import { resolveWikiColor } from './wikiAppearance'

describe('resolveWikiColor', () => {
  it('uses dark on phones and light on desktop when the reader has not chosen', () => {
    expect(resolveWikiColor(undefined, true)).toBe('dark')
    expect(resolveWikiColor('auto', true)).toBe('dark')
    expect(resolveWikiColor('auto', false)).toBe('light')
  })

  it('keeps an explicit choice on any screen', () => {
    expect(resolveWikiColor('light', true)).toBe('light')
    expect(resolveWikiColor('dark', false)).toBe('dark')
  })
})
