import { fileURLToPath, URL } from 'node:url'
import { configDefaults, defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    // Keep colocated feature worktrees out of the root server test run.
    exclude: [...configDefaults.exclude, '**/.worktrees/**'],
  },
})
