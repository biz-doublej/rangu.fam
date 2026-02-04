import { NextRequest, NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'
import dbConnect from '@/lib/mongodb'
import { WikiUser } from '@/models/Wiki'
import {
  createDoubleJToken,
  createWikiToken,
  mergeSignupIdentityIntoDiscordIdentity,
  sanitizeCallbackPath,
  setDoubleJAuthCookie,
  setWikiAuthCookie,
} from '@/lib/doublejAuth'
import {
  buildDiscordAvatarUrl,
  exchangeDiscordCodeForToken,
  fetchDiscordProfile,
} from '@/lib/discordOAuth'

export const dynamic = 'force-dynamic'

const JWT_SECRET = process.env.JWT_SECRET || 'rangu-wiki-secret'

type DiscordLinkState = {
  type: 'link'
  userId: string
  callbackUrl: string
  iat?: number
  exp?: number
}

function appendResult(path: string, key: string, value: string) {
  const url = new URL(path, 'http://localhost')
  url.searchParams.set(key, value)
  return `${url.pathname}${url.search}`
}

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const stateToken = searchParams.get('state')

  if (!code || !stateToken) {
    return NextResponse.redirect(new URL('/settings/account?discordError=invalid_request', origin))
  }

  const clientId = process.env.DISCORD_CLIENT_ID
  const clientSecret = process.env.DISCORD_CLIENT_SECRET
  if (!clientId || !clientSecret) {
    return NextResponse.redirect(new URL('/settings/account?discordError=discord_not_configured', origin))
  }

  try {
    const state = jwt.verify(stateToken, JWT_SECRET) as DiscordLinkState
    if (state.type !== 'link' || !state.userId) {
      throw new Error('Invalid link state')
    }

    const redirectUri = `${origin}/api/auth/discord/link/callback`
    const tokenData = await exchangeDiscordCodeForToken({
      clientId,
      clientSecret,
      code,
      redirectUri,
    })

    const profile = await fetchDiscordProfile(tokenData.access_token)

    await dbConnect()
    const currentUser = await WikiUser.findById(state.userId)
    if (!currentUser) {
      return NextResponse.redirect(new URL('/login?error=session_expired', origin))
    }

    currentUser.discordId = profile.id
    currentUser.discordUsername = profile.username
    currentUser.discordAvatar = buildDiscordAvatarUrl(profile.id, profile.avatar) || currentUser.discordAvatar
    await currentUser.save()
    const canonicalUser = await mergeSignupIdentityIntoDiscordIdentity(currentUser, profile.username)
    if (!canonicalUser) {
      return NextResponse.redirect(new URL('/settings/account?discordError=link_failed', origin))
    }

    const target = appendResult(
      sanitizeCallbackPath(state.callbackUrl, '/settings/account'),
      'discordLinked',
      '1'
    )

    const response = NextResponse.redirect(new URL(target, origin))
    setDoubleJAuthCookie(response, createDoubleJToken(canonicalUser))
    setWikiAuthCookie(response, createWikiToken(canonicalUser))
    return response
  } catch (error) {
    console.error('Discord 계정 연결 콜백 오류:', error)
    return NextResponse.redirect(new URL('/settings/account?discordError=link_failed', origin))
  }
}
