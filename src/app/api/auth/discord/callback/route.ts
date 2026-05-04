import { getRequiredEnv } from '@/lib/env'
import { NextRequest, NextResponse } from 'next/server'
import { eq, or } from 'drizzle-orm'
import jwt from 'jsonwebtoken'
import { getDb } from '@/db/client'
import { wikiUsers } from '@/db/schema/wiki'
import {
  createDoubleJToken,
  createWikiToken,
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

const JWT_SECRET = getRequiredEnv('JWT_SECRET')

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

    const db = getDb()
    const [user] = await db
      .select()
      .from(wikiUsers)
      .where(or(eq(wikiUsers.discordId, profile.id), eq(wikiUsers.discordUsername, profile.username)))
      .limit(1)

    if (!user) {
      return NextResponse.redirect(new URL(withError('/login', 'discord_not_linked'), origin))
    }

    if (!user.isActive) {
      return NextResponse.redirect(new URL(withError('/login', 'account_inactive'), origin))
    }

    const isBanned = Boolean(user.banStatus?.isBanned)
    if (isBanned) {
      return NextResponse.redirect(new URL(withError('/login', 'account_banned'), origin))
    }

    const newAvatar = buildDiscordAvatarUrl(profile.id, profile.avatar)
    const now = new Date()

    const [updated] = await db
      .update(wikiUsers)
      .set({
        discordUsername: profile.username,
        discordId: profile.id,
        discordAvatar: newAvatar || user.discordAvatar,
        lastLogin: now,
        lastActivity: now,
        updatedAt: now,
      })
      .where(eq(wikiUsers.id, user.id))
      .returning()

    // legacy compat
    ;(updated as any)._id = updated.id

    const callbackUrl = sanitizeCallbackPath(state.callbackUrl, '/')
    const response = NextResponse.redirect(new URL(callbackUrl, origin))
    setDoubleJAuthCookie(response, createDoubleJToken(updated as any))
    setWikiAuthCookie(response, createWikiToken(updated as any))

    return response
  } catch (error) {
    console.error('Discord 간편 로그인 콜백 오류:', error)
    return NextResponse.redirect(new URL('/login?error=discord_auth_failed', origin))
  }
}
