import { NextRequest, NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'
import { buildDiscordAuthorizeUrl, resolveDiscordOAuthBaseUrl } from '@/lib/discordOAuth'
import { sanitizeCallbackPath } from '@/lib/doublejAuth'

export const dynamic = 'force-dynamic'

const JWT_SECRET = process.env.JWT_SECRET || 'rangu-wiki-secret'

export async function GET(request: NextRequest) {
  const clientId = process.env.DISCORD_CLIENT_ID

  if (!clientId) {
    return NextResponse.json(
      { success: false, error: 'DISCORD_CLIENT_ID가 설정되지 않았습니다.' },
      { status: 500 }
    )
  }

  const requestUrl = new URL(request.url)
  const { searchParams } = requestUrl
  const origin = resolveDiscordOAuthBaseUrl(requestUrl.origin)
  const callbackUrl = sanitizeCallbackPath(searchParams.get('callbackUrl'), '/')

  const state = jwt.sign(
    {
      type: 'login',
      callbackUrl,
    },
    JWT_SECRET,
    { expiresIn: '10m' }
  )

  const redirectUri = `${origin}/api/auth/discord/callback`
  const authUrl = buildDiscordAuthorizeUrl({
    clientId,
    redirectUri,
    state,
    scope: 'identify',
  })

  return NextResponse.redirect(authUrl)
}
