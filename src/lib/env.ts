function normalize(value: string | undefined): string | undefined {
  const trimmed = value?.trim()
  return trimmed ? trimmed : undefined
}

export function getOptionalEnv(key: string): string | undefined {
  return normalize(process.env[key])
}

export function getRequiredEnv(key: string): string {
  const value = getOptionalEnv(key)
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`)
  }
  return value
}

export function getRequiredEnvAny(keys: string[]): string {
  for (const key of keys) {
    const value = getOptionalEnv(key)
    if (value) {
      return value
    }
  }

  throw new Error(`Missing required environment variable. One of [${keys.join(', ')}] must be set.`)
}
