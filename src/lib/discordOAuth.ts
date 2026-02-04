interface DiscordTokenResponse {
  access_token: string
  token_type: string
  expires_in: number
  refresh_token?: string
  scope?: string
}

export interface DiscordProfile {
  id: string
  username: string
  global_name?: string | null
  avatar?: string | null
}

const DISCORD_API_BASE = 'https://discord.com/api'

export function resolveDiscordOAuthBaseUrl(origin: string): string {
  const configuredBaseUrl = process.env.DISCORD_REDIRECT_BASE_URL?.trim()
  if (!configuredBaseUrl) return origin
  return configuredBaseUrl.replace(/\/+$/, '')
}

export function buildDiscordAuthorizeUrl(params: {
  clientId: string
  redirectUri: string
  state: string
  scope?: string
}) {
  const query = new URLSearchParams({
    client_id: params.clientId,
    response_type: 'code',
    redirect_uri: params.redirectUri,
    scope: params.scope || 'identify',
    state: params.state,
    prompt: 'consent',
  })

  return `https://discord.com/oauth2/authorize?${query.toString()}`
}

export async function exchangeDiscordCodeForToken(params: {
  clientId: string
  clientSecret: string
  code: string
  redirectUri: string
}) {
  const body = new URLSearchParams({
    client_id: params.clientId,
    client_secret: params.clientSecret,
    grant_type: 'authorization_code',
    code: params.code,
    redirect_uri: params.redirectUri,
  })

  const response = await fetch(`${DISCORD_API_BASE}/oauth2/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body,
    cache: 'no-store',
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Discord token exchange failed: ${response.status} ${errorText}`)
  }

  return response.json() as Promise<DiscordTokenResponse>
}

export async function fetchDiscordProfile(accessToken: string): Promise<DiscordProfile> {
  const response = await fetch(`${DISCORD_API_BASE}/users/@me`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    cache: 'no-store',
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Discord profile fetch failed: ${response.status} ${errorText}`)
  }

  return response.json() as Promise<DiscordProfile>
}

export function buildDiscordAvatarUrl(discordId: string, avatar?: string | null): string | undefined {
  if (!avatar) return undefined
  return `https://cdn.discordapp.com/avatars/${discordId}/${avatar}.png`
}
