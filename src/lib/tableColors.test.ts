import { describe, expect, it } from 'vitest'
import { mergeCellStylesToCss, normalizeWidth, parseCellDirectives } from './tableColors'

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
