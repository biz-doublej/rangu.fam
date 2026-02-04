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
  resolveDiscordOAuthBaseUrl,
} from '@/lib/discordOAuth'

export const dynamic = 'force-dynamic'

const JWT_SECRET = process.env.JWT_SECRET || 'rangu-wiki-secret'

type DiscordLoginState = {
  type: 'login'
  callbackUrl: string
  iat?: number
  exp?: number
}

function withError(path: string, error: string) {
  const url = new URL(path, 'http://localhost')
  url.searchParams.set('error', error)
  return `${url.pathname}${url.search}`
}

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const { searchParams } = requestUrl
  const origin = resolveDiscordOAuthBaseUrl(requestUrl.origin)
  const code = searchParams.get('code')
  const stateToken = searchParams.get('state')

  if (!code || !stateToken) {
    return NextResponse.redirect(new URL('/login?error=discord_auth_failed', origin))
  }

  const clientId = process.env.DISCORD_CLIENT_ID
  const clientSecret = process.env.DISCORD_CLIENT_SECRET

  if (!clientId || !clientSecret) {
    return NextResponse.redirect(new URL('/login?error=discord_not_configured', origin))
  }

  try {
    const state = jwt.verify(stateToken, JWT_SECRET) as DiscordLoginState
    if (state.type !== 'login') {
      throw new Error('Invalid state type')
    }

    const redirectUri = `${origin}/api/auth/discord/callback`
    const tokenData = await exchangeDiscordCodeForToken({
      clientId,
      clientSecret,
      code,
      redirectUri,
    })

    const profile = await fetchDiscordProfile(tokenData.access_token)

    await dbConnect()
    let user = await WikiUser.findOne({ discordId: profile.id })
    if (!user) {
      user = await WikiUser.findOne({ discordUsername: profile.username })
    }

    if (!user) {
      const target = withError('/login', 'discord_not_linked')
      return NextResponse.redirect(new URL(target, origin))
    }

    if (!user.isActive) {
      const target = withError('/login', 'account_inactive')
      return NextResponse.redirect(new URL(target, origin))
    }

    const isBanned = Boolean((user as any).isBanned || user?.banStatus?.isBanned)
    if (isBanned) {
      const target = withError('/login', 'account_banned')
      return NextResponse.redirect(new URL(target, origin))
    }

    user.discordUsername = profile.username
    user.discordId = profile.id
    user.discordAvatar = buildDiscordAvatarUrl(profile.id, profile.avatar) || user.discordAvatar
    user.lastLogin = new Date()
    user.lastActivity = new Date()
    await user.save()
    const canonicalUser = await mergeSignupIdentityIntoDiscordIdentity(user, profile.username)
    if (!canonicalUser) {
      const target = withError('/login', 'discord_auth_failed')
      return NextResponse.redirect(new URL(target, origin))
    }

    const callbackUrl = sanitizeCallbackPath(state.callbackUrl, '/')
    const response = NextResponse.redirect(new URL(callbackUrl, origin))
    setDoubleJAuthCookie(response, createDoubleJToken(canonicalUser))
    setWikiAuthCookie(response, createWikiToken(canonicalUser))

    return response
  } catch (error) {
    console.error('Discord 간편 로그인 콜백 오류:', error)
    return NextResponse.redirect(new URL('/login?error=discord_auth_failed', origin))
  }
}
