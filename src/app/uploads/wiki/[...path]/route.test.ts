import fs from 'fs/promises'
import os from 'os'
import path from 'path'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

// 파일 시스템에 있는 업로드는 DB 없이 내려가므로 DB 모듈은 막아 둔다
vi.mock('@/db/client', () => ({ getDb: () => { throw new Error('db not available in test') } }))

describe('GET /uploads/wiki/[...path]', () => {
  let dir = ''

  beforeAll(async () => {
    dir = await fs.mkdtemp(path.join(os.tmpdir(), 'wiki-uploads-'))
    await fs.writeFile(
      path.join(dir, 'evil.svg'),
      '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script><rect width="10" height="10"/></svg>'
    )
    process.env.WIKI_UPLOADS_DIR = dir
  })

  afterAll(async () => {
    delete process.env.WIKI_UPLOADS_DIR
    await fs.rm(dir, { recursive: true, force: true })
  })

  it('serves uploaded SVG files with scripts blocked', async () => {
    const { GET } = await import('./route')
    const response = await GET(new NextRequest('http://localhost/uploads/wiki/evil.svg'), { params: { path: ['evil.svg'] } })
    expect(response.status).toBe(200)
    expect(response.headers.get('content-type')).toBe('image/svg+xml')
    expect(response.headers.get('content-security-policy')).toContain('sandbox')
    expect(response.headers.get('x-content-type-options')).toBe('nosniff')
  })
})
