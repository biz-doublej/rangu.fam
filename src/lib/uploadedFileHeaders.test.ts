import { describe, expect, it } from 'vitest'
import { uploadedFileHeaders } from './uploadedFileHeaders'

describe('uploadedFileHeaders', () => {
  it('blocks scripts in uploaded SVG files', () => {
    const headers = uploadedFileHeaders('image/svg+xml', 'logo.svg', 120)
    expect(headers['Content-Security-Policy']).toContain('sandbox')
    expect(headers['Content-Security-Policy']).toContain("default-src 'none'")
    expect(headers['Content-Security-Policy']).not.toContain('script-src')
    expect(headers['X-Content-Type-Options']).toBe('nosniff')
  })

  it('keeps the existing type, size and file name headers', () => {
    const headers = uploadedFileHeaders('image/png', '사진.png', 42)
    expect(headers['Content-Type']).toBe('image/png')
    expect(headers['Content-Length']).toBe('42')
    expect(headers['Content-Disposition']).toContain("filename*=UTF-8''%EC%82%AC%EC%A7%84.png")
  })
})
