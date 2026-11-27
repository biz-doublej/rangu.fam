import { randomUUID } from 'crypto'
import { Pool } from 'pg'
import { drizzle } from 'drizzle-orm/node-postgres'
import * as schema from '@/db/schema'
import type { DB } from '@/db/client'
import { GC_DDL_STATEMENTS, shopSeedStatements } from './ddl'

/**
 * 통합 테스트용 Postgres.
 * 지갑 잠금(FOR UPDATE)·유니크 제약·동시 구매 경쟁은 실제 DB 에서만 확인할 수 있어서,
 * GC_TEST_DATABASE_URL 이 있을 때만 돌린다 (없으면 해당 테스트는 건너뜀).
 *
 *   GC_TEST_DATABASE_URL=postgresql://postgres@127.0.0.1:5432/gctest npx vitest run src/lib/gamecenter
 *
 * 테스트 파일마다 새 스키마를 만들고 끝나면 지운다. 운영 DB 주소를 넣지 말 것.
 */
export const TEST_DATABASE_URL = process.env.GC_TEST_DATABASE_URL

export interface TestDb {
  db: DB
  pool: Pool
  createUser: (username?: string) => Promise<string>
  close: () => Promise<void>
}

export async function openTestDb(): Promise<TestDb> {
  if (!TEST_DATABASE_URL) throw new Error('GC_TEST_DATABASE_URL 이 필요합니다.')
  const schemaName = `gc_test_${randomUUID().replace(/-/g, '')}`

  const admin = new Pool({ connectionString: TEST_DATABASE_URL, max: 1 })
  await admin.query(`CREATE SCHEMA ${schemaName}`)

  const pool = new Pool({
    connectionString: TEST_DATABASE_URL,
    max: 10,
    options: `-c search_path=${schemaName}`,
  })
  // 게임센터가 참조하는 wiki_users 의 최소 모양
  await pool.query(`CREATE TABLE wiki_users (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    username text NOT NULL UNIQUE,
    display_name text
  )`)
  for (const statement of [...GC_DDL_STATEMENTS, ...shopSeedStatements()]) {
    await pool.query(statement)
  }

  const db = drizzle(pool, { schema }) as unknown as DB
  return {
    db,
    pool,
    async createUser(username = `user-${randomUUID().slice(0, 8)}`) {
      const { rows } = await pool.query('INSERT INTO wiki_users (username) VALUES ($1) RETURNING id', [username])
      return rows[0].id as string
    },
    async close() {
      await pool.end()
      await admin.query(`DROP SCHEMA ${schemaName} CASCADE`)
      await admin.end()
    },
  }
}
