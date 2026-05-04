import { getRequiredEnv } from '@/lib/env'
import { NextRequest, NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
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
  const requestUrl = new URL(request.url)
  const { searchParams } = requestUrl
  const origin = resolveDiscordOAuthBaseUrl(requestUrl.origin)
  const code = searchParams.get('code')
  const stateToken = searchParams.get('state')

  if (!code || !stateToken) {
    return NextResponse.redirect(
      new URL('/settings/account?discordError=invalid_request', origin)
    )
  }

  const clientId = process.env.DISCORD_CLIENT_ID
  const clientSecret = process.env.DISCORD_CLIENT_SECRET
  if (!clientId || !clientSecret) {
    return NextResponse.redirect(
      new URL('/settings/account?discordError=discord_not_configured', origin)
    )
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

    const db = getDb()
    const [currentUser] = await db
      .select()
      .from(wikiUsers)
      .where(eq(wikiUsers.id, state.userId))
      .limit(1)

    if (!currentUser) {
      return NextResponse.redirect(new URL('/login?error=session_expired', origin))
    }

    const newAvatar = buildDiscordAvatarUrl(profile.id, profile.avatar)

    const [updated] = await db
      .update(wikiUsers)
      .set({
        discordId: profile.id,
        discordUsername: profile.username,
        discordAvatar: newAvatar || currentUser.discordAvatar,
        updatedAt: new Date(),
      })
      .where(eq(wikiUsers.id, state.userId))
      .returning()

    // legacy compat: createDoubleJToken/createWikiToken expect _id
    ;(updated as any)._id = updated.id

    const target = appendResult(
      sanitizeCallbackPath(state.callbackUrl, '/settings/account'),
      'discordLinked',
      '1'
    )

    const response = NextResponse.redirect(new URL(target, origin))
    setDoubleJAuthCookie(response, createDoubleJToken(updated as any))
    setWikiAuthCookie(response, createWikiToken(updated as any))
    return response
  } catch (error) {
    console.error('Discord 계정 연결 콜백 오류:', error)
    return NextResponse.redirect(
      new URL('/settings/account?discordError=link_failed', origin)
    )
  }
}
