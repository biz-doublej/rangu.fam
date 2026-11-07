import { describe, expect, it } from 'vitest'
import { inlineContentDisposition } from './contentDisposition'

describe('inlineContentDisposition', () => {
  it('produces a header value that Response accepts for Korean names', () => {
    const value = inlineContentDisposition('강한울 사진.webp')
    expect(() => new Response('x', { headers: { 'Content-Disposition': value } })).not.toThrow()
    expect(value).toBe(
      `inline; filename="___ __.webp"; filename*=UTF-8''${encodeURIComponent('강한울 사진.webp')}`
    )
  })

  it('keeps ASCII names readable and escapes quotes', () => {
    expect(inlineContentDisposition('photo "1".png')).toBe(
      `inline; filename="photo _1_.png"; filename*=UTF-8''photo%20%221%22.png`
    )
  })

  it('falls back when the name is empty', () => {
    expect(inlineContentDisposition('')).toBe(`inline; filename="file"; filename*=UTF-8''file`)
  })
})
