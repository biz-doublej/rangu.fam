import { describe, expect, it } from 'vitest'
import { mergeCellStylesToCss, normalizeBackgroundImage, normalizeWidth, parseCellDirectives } from './tableColors'

describe('table width directives', () => {
  it('reads table and cell widths', () => {
    const parsed = parseCellDirectives('<tablewidth:100%><width:30%> 개발')
    expect(parsed.table.width).toBe('100%')
    expect(parsed.cell.width).toBe('30%')
    expect(parsed.content).toBe('개발')
  })

  it('treats bare numbers as pixels and rejects odd values', () => {
    expect(normalizeWidth('320')).toBe('320px')
    expect(normalizeWidth('150%')).toBeUndefined()
    expect(normalizeWidth('calc(100%)')).toBeUndefined()
  })

  it('drops a width it cannot use, like other directives', () => {
    const parsed = parseCellDirectives('<width:abc> 글')
    expect(parsed.cell.width).toBeUndefined()
    expect(parsed.content).toBe('글')
  })

  it('applies a cell width as css', () => {
    expect(mergeCellStylesToCss({ width: '30%' })).toEqual({ width: '30%' })
  })
})

describe('background image directive', () => {
  it('puts an image behind the cell text', () => {
    const parsed = parseCellDirectives('<bgimage:/api/images/serve/a.png><color:#fff> 감독')
    expect(parsed.content).toBe('감독')
    expect(mergeCellStylesToCss(parsed.cell)).toMatchObject({
      backgroundImage: 'url("/api/images/serve/a.png")',
      backgroundSize: 'cover',
      color: '#fff',
    })
  })

  it('rejects addresses that could break out of css', () => {
    expect(normalizeBackgroundImage('https://x.com/a.png')).toBe('https://x.com/a.png')
    expect(normalizeBackgroundImage('/a.png")};body{x')).toBeUndefined()
    expect(normalizeBackgroundImage('javascript:alert(1)')).toBeUndefined()
    expect(normalizeBackgroundImage('//evil.com/a.png')).toBeUndefined()
  })
})
