import 'dotenv/config'
import { defineConfig } from 'drizzle-kit'

/**
 * Drizzle Kit config — used by `drizzle-kit generate` / `migrate` / `push`.
 * Reads DATABASE_URL from environment. For migrations against Cloud SQL,
 * temporarily run the Cloud SQL Auth Proxy locally and point DATABASE_URL
 * at `localhost:5432`.
 */
export default defineConfig({
  schema: './src/db/schema.ts',
  out: './src/db/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
  verbose: true,
  strict: true,
})
