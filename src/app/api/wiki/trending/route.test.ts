import { describe, expect, it, vi } from 'vitest'
import { PgDialect } from 'drizzle-orm/pg-core'
import type { SQL } from 'drizzle-orm'

const execute = vi.fn()

vi.mock('@/db/client', () => ({
  getDb: () => ({ execute }),
}))

import { GET } from './route'

describe('GET /api/wiki/trending', () => {
  it('casts the window offset so Postgres does not parse it as date - date', async () => {
    execute.mockResolvedValueOnce({ rows: [{ title: '문서', slug: 'doc', views: 3 }] })

    const res = await GET(new Request('http://localhost/api/wiki/trending?period=week'))
    const body = await res.json()

    const { sql, params } = new PgDialect().sqlToQuery(execute.mock.calls[0][0] as SQL)
    expect(sql).toMatch(/::date - \$1::int/)
    expect(params[0]).toBe(6)
    expect(body).toEqual({
      success: true,
      period: 'week',
      trending: [{ title: '문서', slug: 'doc', views: 3 }],
    })
  })
})
