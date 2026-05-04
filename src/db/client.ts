import { Pool } from 'pg'
import { drizzle } from 'drizzle-orm/node-postgres'
import * as schema from './schema'
import { getRequiredEnv, getOptionalEnv } from '@/lib/env'

declare global {
  // eslint-disable-next-line no-var
  var __pgPool: Pool | undefined
  // eslint-disable-next-line no-var
  var __drizzleDb: ReturnType<typeof drizzle<typeof schema>> | undefined
}

/**
 * Resolve the Postgres connection URL.
 *
 * In Cloud Run we use the Unix socket exposed by the Cloud SQL Auth Proxy
 * sidecar (`--add-cloudsql-instances=<conn>`). The URL format is:
 *   postgresql://user:pass@/db?host=/cloudsql/<connection_name>
 *
 * Locally / non-prod we use a direct TCP connection from `DATABASE_URL`.
 */
function resolveConnectionString(): string {
  const explicit = getOptionalEnv('DATABASE_URL')
  if (explicit) return explicit

  // Build from Cloud SQL connection name + creds
  const conn = getRequiredEnv('CLOUD_SQL_CONNECTION_NAME')
  const user = getRequiredEnv('PG_USER')
  const password = getRequiredEnv('PG_PASSWORD')
  const db = getRequiredEnv('PG_DATABASE')
  return `postgresql://${user}:${encodeURIComponent(password)}@/${db}?host=/cloudsql/${conn}`
}

function buildPool(): Pool {
  return new Pool({
    connectionString: resolveConnectionString(),
    max: Number(process.env.PG_POOL_MAX || 10),
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 10_000,
  })
}

/**
 * Singleton Drizzle client. In dev (HMR) we cache on `globalThis` so that
 * pool isn't recreated on every reload.
 */
export function getDb() {
  if (!global.__drizzleDb) {
    const pool = global.__pgPool ?? buildPool()
    if (!global.__pgPool) global.__pgPool = pool
    global.__drizzleDb = drizzle(pool, { schema })
  }
  return global.__drizzleDb
}

export type DB = ReturnType<typeof getDb>
export { schema }
