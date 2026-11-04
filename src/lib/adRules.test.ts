import { describe, expect, it } from 'vitest'
import { validateAdInput } from './adRules'

const valid = {
  title: '  공작소의 밤 ',
  linkUrl: 'https://drive.google.com/drive/folders/abc',
  desktopImage: '/ads/ad2-pc.webp',
  mobileImage: '/api/images/serve/ad-1.webp',
}

describe('validateAdInput', () => {
  it('accepts and trims a valid ad', () => {
    expect(validateAdInput(valid)).toEqual({
      ok: true,
      value: { ...valid, title: '공작소의 밤', isActive: true },
    })
  })

  it('keeps an ad inactive when requested', () => {
    const result = validateAdInput({ ...valid, isActive: false })
    expect(result.ok && result.value.isActive).toBe(false)
  })

  it('rejects unsafe links', () => {
    expect(validateAdInput({ ...valid, linkUrl: 'javascript:alert(1)' }).ok).toBe(false)
    expect(validateAdInput({ ...valid, linkUrl: 'http://example.com' }).ok).toBe(false)
  })

  it('rejects missing titles and external images', () => {
    expect(validateAdInput({ ...valid, title: ' ' }).ok).toBe(false)
    expect(validateAdInput({ ...valid, desktopImage: 'https://example.com/a.png' }).ok).toBe(false)
    expect(validateAdInput({ ...valid, mobileImage: '//example.com/a.png' }).ok).toBe(false)
  })
})
