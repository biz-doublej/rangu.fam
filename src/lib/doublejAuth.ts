import jwt from 'jsonwebtoken'
import { NextRequest, NextResponse } from 'next/server'
import dbConnect from '@/lib/mongodb'
import { IWikiUser, WikiUser } from '@/models/Wiki'

export const DOUBLEJ_AUTH_COOKIE = 'doublej-token'
export const WIKI_AUTH_COOKIE = 'wiki-token'

const JWT_SECRET = process.env.JWT_SECRET || 'rangu-wiki-secret'
const COOKIE_MAX_AGE = 7 * 24 * 60 * 60 // 7 days

const MEMBER_DISCORD_TO_MEMBER_ID: Record<string, string> = {
  gabrieljung0727: 'jaewon',
  txxse0k: 'minseok',
  'sd_kim.h.s': 'seungchan',
  jinq09012239: 'jinkyu',
  'k.seoljin': 'hanul',
}

const WIKI_ADMIN_DISCORD_BY_USERNAME: Record<string, string> = {
  gabriel0727: 'gabrieljung0727',
  seoko1752: 'seoko1752',
  kanghu05: 'k.seoljin',
  '7738bell': 'alaudabell',
}

const CORE_MEMBER_USERNAMES = new Set([
  'jaewon',
  'minseok',
  'jingyu',
  'jinkyu',
  'hanul',
  'seungchan',
])

export interface DoubleJTokenPayload {
  userId: string
  username: string
  role: IWikiUser['role']
  iat?: number
  exp?: number
}

export function normalizeDiscordIdentifier(input?: string | null): string | null {
  if (!input) return null
  const normalized = input.toString().trim().toLowerCase()
  return normalized || null
}

export function resolveMemberIdFromUsername(username?: string | null): string | null {
  if (!username) return null
  const normalized = username.toLowerCase().trim()
  if (!CORE_MEMBER_USERNAMES.has(normalized)) return null
  if (normalized === 'jingyu') return 'jinkyu'
  return normalized
}

export function isCoreMember(username?: string | null): boolean {
  return !!resolveMemberIdFromUsername(username)
}

export function resolveMemberIdForUser(
  user: Pick<IWikiUser, 'username' | 'discordUsername' | 'discordId'>
): string | null {
  const discordKey = normalizeDiscordIdentifier(user.discordUsername || user.discordId)
  if (discordKey && MEMBER_DISCORD_TO_MEMBER_ID[discordKey]) {
    return MEMBER_DISCORD_TO_MEMBER_ID[discordKey]
  }
  return resolveMemberIdFromUsername(user.username)
}

export function isWhitelistedWikiAdmin(
  user: Pick<IWikiUser, 'username' | 'discordUsername' | 'discordId'>
): boolean {
  const usernameKey = user.username?.toLowerCase().trim()
  const expectedDiscord = WIKI_ADMIN_DISCORD_BY_USERNAME[usernameKey]
  if (!expectedDiscord) return false
  const linkedDiscord = normalizeDiscordIdentifier(user.discordUsername || user.discordId)
  return linkedDiscord === normalizeDiscordIdentifier(expectedDiscord)
}

function hasAdminPermissions(user: Pick<IWikiUser, 'permissions'>) {
  return Boolean(
    user.permissions?.canEdit &&
      user.permissions?.canDelete &&
      user.permissions?.canProtect &&
      user.permissions?.canBan &&
      user.permissions?.canManageUsers
  )
}

function hasEditorPermissions(user: Pick<IWikiUser, 'permissions'>) {
  return Boolean(
    user.permissions?.canEdit &&
      !user.permissions?.canDelete &&
      !user.permissions?.canProtect &&
      !user.permissions?.canBan &&
      !user.permissions?.canManageUsers
  )
}

export async function enforceUserAccessPolicy(user: IWikiUser | null): Promise<IWikiUser | null> {
  if (!user) return null

  const shouldBeAdmin = isWhitelistedWikiAdmin(user)
  let dirty = false

  if (shouldBeAdmin) {
    if (user.role !== 'admin') {
      user.role = 'admin'
      dirty = true
    }
    if (!hasAdminPermissions(user)) {
      user.permissions = {
        canEdit: true,
        canDelete: true,
        canProtect: true,
        canBan: true,
        canManageUsers: true,
      }
      dirty = true
    }
  } else {
    if (user.role === 'admin' || user.role === 'owner' || user.role === 'moderator') {
      user.role = 'editor'
      dirty = true
    }
    if (!hasEditorPermissions(user)) {
      user.permissions = {
        canEdit: true,
        canDelete: false,
        canProtect: false,
        canBan: false,
        canManageUsers: false,
      }
      dirty = true
    }
  }

  if (dirty) {
    await user.save()
  }

  return user
}

function isLegacyAdminUsername(username?: string | null): boolean {
  if (!username) return false
  const key = username.toLowerCase().trim()
  return Boolean(WIKI_ADMIN_DISCORD_BY_USERNAME[key])
}

function pickLatestDate(a?: Date, b?: Date): Date | undefined {
  if (!a && !b) return undefined
  if (!a) return b
  if (!b) return a
  return a > b ? a : b
}

// Discord 식별자(간편로그인 아이디)를 우선시하여 계정 아이디를 병합/정규화
export async function mergeSignupIdentityIntoDiscordIdentity(
  user: IWikiUser | null,
  discordIdentityRaw?: string | null
): Promise<IWikiUser | null> {
  if (!user) return null

  const discordIdentity = normalizeDiscordIdentifier(discordIdentityRaw)
  if (!discordIdentity) return user

  const currentUsername = user.username?.toLowerCase().trim()
  if (!currentUsername) return user

  // 기존 위키 관리자 계정명은 유지 (요구사항: 기존 username + 지정된 discord_id 조합으로 관리자 부여)
  if (isLegacyAdminUsername(currentUsername)) {
    if (user.discordUsername !== discordIdentity) {
      user.discordUsername = discordIdentity
      await user.save()
    }
    return enforceUserAccessPolicy(user)
  }

  if (currentUsername === discordIdentity) {
    if (user.discordUsername !== discordIdentity) {
      user.discordUsername = discordIdentity
      await user.save()
    }
    return enforceUserAccessPolicy(user)
  }

  await dbConnect()

  const candidateQuery: any[] = [
    { username: discordIdentity },
    { discordUsername: discordIdentity },
  ]
  if (user.discordId) {
    candidateQuery.push({ discordId: user.discordId })
  }

  const existingDiscordIdentityUser = await WikiUser.findOne({
    _id: { $ne: user._id },
    $or: candidateQuery,
  })

  if (existingDiscordIdentityUser) {
    existingDiscordIdentityUser.discordId = user.discordId || existingDiscordIdentityUser.discordId
    existingDiscordIdentityUser.discordUsername = discordIdentity
    existingDiscordIdentityUser.discordAvatar =
      user.discordAvatar || existingDiscordIdentityUser.discordAvatar
    existingDiscordIdentityUser.avatar = existingDiscordIdentityUser.avatar || user.avatar
    ;(existingDiscordIdentityUser as any).mainUserId =
      (existingDiscordIdentityUser as any).mainUserId || (user as any).mainUserId
    existingDiscordIdentityUser.edits = Math.max(
      existingDiscordIdentityUser.edits || 0,
      user.edits || 0
    )
    existingDiscordIdentityUser.pagesCreated = Math.max(
      existingDiscordIdentityUser.pagesCreated || 0,
      user.pagesCreated || 0
    )
    ;(existingDiscordIdentityUser as any).discussionPosts = Math.max(
      (existingDiscordIdentityUser as any).discussionPosts || 0,
      (user as any).discussionPosts || 0
    )
    existingDiscordIdentityUser.reputation = Math.max(
      existingDiscordIdentityUser.reputation || 0,
      user.reputation || 0
    )
    existingDiscordIdentityUser.lastLogin = pickLatestDate(
      existingDiscordIdentityUser.lastLogin,
      user.lastLogin
    )
    existingDiscordIdentityUser.lastActivity = pickLatestDate(
      existingDiscordIdentityUser.lastActivity,
      user.lastActivity
    )
    await existingDiscordIdentityUser.save()

    user.isActive = false
    user.discordId = undefined
    user.discordUsername = `${discordIdentity}__merged`
    user.discordAvatar = undefined
    if (user.displayName && !user.displayName.includes('(merged)')) {
      user.displayName = `${user.displayName} (merged)`
    }
    await user.save()

    return enforceUserAccessPolicy(existingDiscordIdentityUser)
  }

  user.username = discordIdentity
  user.discordUsername = discordIdentity

  // 자동 생성된 이메일 규칙이면 새 username 규칙으로 맞춤
  if (user.email?.endsWith('@doublej.local')) {
    const emailLocal = user.email.split('@')[0]
    if (emailLocal === currentUsername || emailLocal.startsWith(`${currentUsername}-`)) {
      const desiredEmail = `${discordIdentity}@doublej.local`
      const emailConflict = await WikiUser.exists({
        _id: { $ne: user._id },
        email: desiredEmail,
      })
      user.email = emailConflict
        ? `${discordIdentity}-${Date.now()}@doublej.local`
        : desiredEmail
    }
  }

  await user.save()
  return enforceUserAccessPolicy(user)
}

export function createDoubleJToken(user: Pick<IWikiUser, '_id' | 'username' | 'role'>): string {
  return jwt.sign(
    {
      userId: String(user._id),
      username: user.username,
      role: user.role,
    },
    JWT_SECRET,
    { expiresIn: '7d' }
  )
}

export function verifyDoubleJToken(token: string): DoubleJTokenPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as DoubleJTokenPayload
  } catch {
    return null
  }
}

export function createWikiToken(user: Pick<IWikiUser, '_id' | 'username' | 'role' | 'permissions'>): string {
  return jwt.sign(
    {
      userId: String(user._id),
      username: user.username,
      role: user.role,
      permissions: user.permissions,
    },
    JWT_SECRET,
    { expiresIn: '7d' }
  )
}

function cookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict' as const,
    maxAge: COOKIE_MAX_AGE,
    path: '/',
  }
}

export function setDoubleJAuthCookie(response: NextResponse, token: string) {
  response.cookies.set(DOUBLEJ_AUTH_COOKIE, token, cookieOptions())
}

export function clearDoubleJAuthCookie(response: NextResponse) {
  response.cookies.set(DOUBLEJ_AUTH_COOKIE, '', {
    ...cookieOptions(),
    maxAge: 0,
  })
}

export function setWikiAuthCookie(response: NextResponse, token: string) {
  response.cookies.set(WIKI_AUTH_COOKIE, token, cookieOptions())
}

export function clearWikiAuthCookie(response: NextResponse) {
  response.cookies.set(WIKI_AUTH_COOKIE, '', {
    ...cookieOptions(),
    maxAge: 0,
  })
}

export async function getAuthenticatedWikiUser(request: NextRequest): Promise<IWikiUser | null> {
  const token = request.cookies.get(DOUBLEJ_AUTH_COOKIE)?.value
  if (!token) return null

  const payload = verifyDoubleJToken(token)
  if (!payload?.userId) return null

  await dbConnect()
  const user = await WikiUser.findById(payload.userId)
  if (!user) return null

  if (!user.isActive) return null
  const isBanned = Boolean((user as any).isBanned || (user as any).banStatus?.isBanned)
  if (isBanned) return null

  return enforceUserAccessPolicy(user)
}

export function buildClientUser(
  user: Pick<IWikiUser, '_id' | 'username' | 'email' | 'discordId' | 'discordUsername' | 'avatar' | 'discordAvatar'>
) {
  const memberId = resolveMemberIdForUser(user)

  return {
    id: String(user._id),
    username: user.username,
    email: user.email || '',
    role: memberId ? 'member' as const : 'guest' as const,
    memberId: memberId || undefined,
    isLoggedIn: true,
    discordId: user.discordId || undefined,
    avatar: user.avatar || user.discordAvatar || undefined,
  }
}

export function sanitizeCallbackPath(input?: string | null, fallback: string = '/'): string {
  if (!input) return fallback
  if (!input.startsWith('/')) return fallback
  if (input.startsWith('//')) return fallback
  return input
}
