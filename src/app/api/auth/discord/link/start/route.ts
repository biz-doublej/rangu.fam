import { NextRequest, NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'
import { buildDiscordAuthorizeUrl } from '@/lib/discordOAuth'
import { getAuthenticatedWikiUser, sanitizeCallbackPath } from '@/lib/doublejAuth'

export const dynamic = 'force-dynamic'

const JWT_SECRET = process.env.JWT_SECRET || 'rangu-wiki-secret'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const callbackUrl = sanitizeCallbackPath(searchParams.get('callbackUrl'), '/settings/account')
  const clientId = process.env.DISCORD_CLIENT_ID

  if (!clientId) {
    return NextResponse.redirect(
      new URL('/settings/account?discordError=discord_not_configured', origin)
    )
  }

  const user = await getAuthenticatedWikiUser(request)
  if (!user) {
    return NextResponse.redirect(new URL('/login?error=login_required', origin))
  }

  const state = jwt.sign(
    {
      type: 'link',
      userId: String(user._id),
      callbackUrl,
    },
    JWT_SECRET,
    { expiresIn: '10m' }
  )

  const redirectUri = `${origin}/api/auth/discord/link/callback`
  const authUrl = buildDiscordAuthorizeUrl({
    clientId,
    redirectUri,
    state,
    scope: 'identify',
  })

  return NextResponse.redirect(authUrl)
}
