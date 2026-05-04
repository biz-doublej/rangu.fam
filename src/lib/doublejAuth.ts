import { getRequiredEnv } from '@/lib/env'
import jwt from 'jsonwebtoken'
import { NextRequest, NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { getDb } from '@/db/client'
import { wikiUsers, type WikiUser as DrizzleWikiUser } from '@/db/schema/wiki'
import crypto from 'crypto'

// Drizzle row를 IWikiUser shape (legacy) 으로 다루기 위한 alias.
// _id 필드는 호출자 측에서 user.id 값으로 채워줌.
export type IWikiUser = DrizzleWikiUser & {
  _id?: string
  // legacy Mongoose API 호환 — Drizzle row에선 동작 안 함
  save?: () => Promise<unknown>
  toObject?: () => unknown
}


export const DOUBLEJ_AUTH_COOKIE = 'doublej-token'
export const WIKI_AUTH_COOKIE = 'wiki-token'

const JWT_SECRET = getRequiredEnv('JWT_SECRET')
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

/**
 * DoubleJ SSO `preferred_username` → 코어 멤버 슬러그 매핑.
 *
 * SSO 가입 시점에 멤버명과 다른 사용자명을 쓴 사람들을 위한 별칭. 신규 멤버가
 * 합류할 때마다 한 줄 추가하면 됨. 키는 항상 소문자/공백제거 정규화.
 */
const USERNAME_ALIAS_TO_MEMBER_ID: Record<string, string> = {
  jung051004: 'jaewon', // 정재원
}

/**
 * 이메일 → 멤버 슬러그 매핑.
 *
 * SSO username 이 무엇이든 IdP 가 발급한 email 로 매칭. username/discord 둘 다
 * 모를 때 가장 안정적인 fallback. 키는 항상 소문자/공백제거 정규화.
 */
const EMAIL_TO_MEMBER_ID: Record<string, string> = {
  'jaewonjung1004@gmail.com': 'jaewon',
  'kanghu05@gmail.com': 'hanul',
  'jinq0901@gmail.com': 'jinkyu',
  '05alstjr@gmail.com': 'minseok',
  'mushbit@naver.com': 'seungchan',
  '3gb3gb1004@gmail.com': 'seungchan', // 연결된 보조 이메일
}

/**
 * 위키 관리자 이메일 화이트리스트.
 * Discord 연동 안 됐어도 email 만으로 admin 권한 부여.
 */
const WIKI_ADMIN_EMAILS = new Set([
  'jaewonjung1004@gmail.com',
  'kanghu05@gmail.com',
])

/**
 * 위키 관리자 username 화이트리스트.
 * email/Discord 둘 다 못 받는 경우의 마지막 fallback.
 * 위키 username 은 SSO username 또는 wiki_users 에 저장된 값.
 */
const WIKI_ADMIN_USERNAMES = new Set([
  'gabriel0727', // 정재원
  'kanghu05',    // 강한울
  'jung051004',  // 정재원 (alias)
])

function normalizeEmail(input?: string | null): string | null {
  if (!input) return null
  const v = input.toString().trim().toLowerCase()
  return v || null
}

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
  if (USERNAME_ALIAS_TO_MEMBER_ID[normalized]) {
    return USERNAME_ALIAS_TO_MEMBER_ID[normalized]
  }
  if (!CORE_MEMBER_USERNAMES.has(normalized)) return null
  if (normalized === 'jingyu') return 'jinkyu'
  return normalized
}

export function isCoreMember(username?: string | null): boolean {
  return !!resolveMemberIdFromUsername(username)
}

export function resolveMemberIdForUser(
  user: Pick<IWikiUser, 'username' | 'discordUsername' | 'discordId' | 'email'>
): string | null {
  // 1. 이메일 매핑 (가장 안정적, IdP 가 어떤 username 으로 발급해도 작동)
  const email = normalizeEmail(user.email)
  if (email && EMAIL_TO_MEMBER_ID[email]) {
    return EMAIL_TO_MEMBER_ID[email]
  }
  // 2. Discord 연동 매핑
  const discordKey = normalizeDiscordIdentifier(user.discordUsername || user.discordId)
  if (discordKey && MEMBER_DISCORD_TO_MEMBER_ID[discordKey]) {
    return MEMBER_DISCORD_TO_MEMBER_ID[discordKey]
  }
  // 3. username (alias 또는 코어 슬러그)
  return resolveMemberIdFromUsername(user.username)
}

export function isWhitelistedWikiAdmin(
  user: Pick<IWikiUser, 'username' | 'discordUsername' | 'discordId' | 'email'>
): boolean {
  // 1. username 직접 화이트리스트 — IdP/Discord 무관, 가장 단순
  const usernameKey = user.username?.toLowerCase().trim() || ''
  if (usernameKey && WIKI_ADMIN_USERNAMES.has(usernameKey)) return true
  // 2. 이메일 화이트리스트
  const email = normalizeEmail(user.email)
  if (email && WIKI_ADMIN_EMAILS.has(email)) return true
  // 3. legacy Discord 연동 검증
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

  // Mongoose 문서는 .save() — Drizzle row은 plain object. 호출자에서 persist.
  if (dirty) {
    if (typeof (user as any).save === 'function') {
      // legacy mongoose
      await (user as any).save()
    } else if ((user as any).id) {
      // Drizzle row — 직접 DB 업데이트 (이게 빠져있어서 admin 승격이 메모리에만 적용되고
      // 다음 요청에서 role 이 다시 'editor' 로 돌아가는 버그가 있었음).
      try {
        const db = getDb()
        await db
          .update(wikiUsers)
          .set({
            role: user.role,
            permissions: user.permissions,
            updatedAt: new Date(),
          })
          .where(eq(wikiUsers.id, (user as any).id))
      } catch (e) {
        console.error('enforceUserAccessPolicy persist failed:', e)
      }
    }
  }

  return user
}

// (구) mergeSignupIdentityIntoDiscordIdentity / isLegacyAdminUsername / pickLatestDate
// — 마이그레이션 후 모두 미사용. 제거됨. 필요 시 git history 참고 (commit b816569).

export function createDoubleJToken(user: Pick<IWikiUser, '_id' | 'username' | 'role'>): string {
  return jwt.sign(
    {
      userId: String(user._id || (user as any).id),
      username: user.username,
      role: user.role,
    },
    JWT_SECRET,
    { expiresIn: '7d' }
  )
}

function normalizeUsernameForStorage(rawInput?: string | null): string {
  const source = (rawInput || '').toString().trim().toLowerCase()
  const sanitized = source
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 20)

  if (sanitized.length >= 3) return sanitized
  if (!sanitized) return `user-${Date.now().toString().slice(-6)}`
  return `${sanitized}x`.slice(0, 20)
}

async function resolveUniqueUsername(baseUsername: string): Promise<string> {
  const base = normalizeUsernameForStorage(baseUsername)
  const db = getDb()

  const existsBy = async (username: string): Promise<boolean> => {
    const [row] = await db
      .select({ id: wikiUsers.id })
      .from(wikiUsers)
      .where(eq(wikiUsers.username, username))
      .limit(1)
    return !!row
  }

  if (!(await existsBy(base))) return base

  for (let index = 1; index < 1000; index += 1) {
    const candidate = `${base}-${index}`.slice(0, 20)
    if (!(await existsBy(candidate))) return candidate
  }

  return `${base.slice(0, 12)}-${Date.now().toString().slice(-6)}`.slice(0, 20)
}

async function resolveUniqueEmail(baseEmail: string): Promise<string> {
  const normalized = (baseEmail || '').trim().toLowerCase()
  const fallbackBase = normalized || `user-${Date.now().toString().slice(-6)}@doublej.local`
  const db = getDb()

  const existsBy = async (email: string): Promise<boolean> => {
    const [row] = await db
      .select({ id: wikiUsers.id })
      .from(wikiUsers)
      .where(eq(wikiUsers.email, email))
      .limit(1)
    return !!row
  }

  if (!(await existsBy(fallbackBase))) return fallbackBase

  const [localPart, domainPart] = fallbackBase.split('@')
  const domain = domainPart || 'doublej.local'

  for (let index = 1; index < 1000; index += 1) {
    const candidate = `${localPart}-${index}@${domain}`
    if (!(await existsBy(candidate))) return candidate
  }

  return `${localPart.slice(0, 12)}-${Date.now().toString().slice(-6)}@${domain}`
}

export interface OidcUserProfile {
  subject: string
  username: string
  email?: string
  displayName?: string
  avatar?: string
}

export async function findOrCreateWikiUserFromOidcProfile(
  profile: OidcUserProfile
): Promise<IWikiUser | null> {
  const db = getDb()

  const subject = profile.subject?.trim()
  if (!subject) return null

  const normalizedUsername = normalizeUsernameForStorage(profile.username)
  const normalizedEmail = profile.email?.trim().toLowerCase()
  const displayName = profile.displayName?.trim()
  const avatar = profile.avatar?.trim()

  // ssoSubject → email → username 순으로 매칭
  let [user] = await db
    .select()
    .from(wikiUsers)
    .where(eq(wikiUsers.ssoSubject, subject))
    .limit(1)

  if (!user && normalizedEmail) {
    const [byEmail] = await db
      .select()
      .from(wikiUsers)
      .where(eq(wikiUsers.email, normalizedEmail))
      .limit(1)
    user = byEmail
  }

  if (!user) {
    const [byUsername] = await db
      .select()
      .from(wikiUsers)
      .where(eq(wikiUsers.username, normalizedUsername))
      .limit(1)
    user = byUsername
  }

  const now = new Date()

  if (!user) {
    const username = await resolveUniqueUsername(normalizedUsername)
    const email = await resolveUniqueEmail(normalizedEmail || `${username}@doublej.local`)
    // 로컬 password auth는 제거됐지만 wiki_users.password 컬럼이 NOT NULL이라 placeholder 필요.
    // SSO-only 사용자는 이 값으로 절대 로그인 불가 (bcrypt가 아닌 임의 base64 문자열).
    const placeholderPassword = `__oidc__${crypto.randomBytes(48).toString('base64')}`

    const [created] = await db
      .insert(wikiUsers)
      .values({
        username,
        email,
        password: placeholderPassword,
        ssoSubject: subject,
        displayName: displayName || username,
        avatar: avatar || null,
        role: 'editor',
        permissions: {
          canEdit: true,
          canDelete: false,
          canProtect: false,
          canBan: false,
          canManageUsers: false,
        },
        edits: 0,
        pagesCreated: 0,
        discussionPosts: 0,
        reputation: 0,
        preferences: {
          theme: 'auto',
          timezone: 'Asia/Seoul',
          emailNotifications: true,
          showEmail: false,
          autoWatchPages: true,
        },
        isActive: true,
        lastLogin: now,
        lastActivity: now,
      })
      .returning()
    user = created
  } else {
    const updates: Record<string, any> = { lastLogin: now, lastActivity: now, updatedAt: now }

    if (!user.ssoSubject || user.ssoSubject !== subject) {
      updates.ssoSubject = subject
    }

    if (normalizedEmail && user.email !== normalizedEmail) {
      // 이메일 충돌 체크 (자기 자신 제외)
      const [conflict] = await db
        .select({ id: wikiUsers.id })
        .from(wikiUsers)
        .where(eq(wikiUsers.email, normalizedEmail))
        .limit(1)
      if (!conflict || conflict.id === user.id) {
        updates.email = normalizedEmail
      }
    }

    if (displayName && user.displayName !== displayName) {
      updates.displayName = displayName
    }

    if (avatar && user.avatar !== avatar) {
      updates.avatar = avatar
    }

    const [updated] = await db
      .update(wikiUsers)
      .set(updates)
      .where(eq(wikiUsers.id, user.id))
      .returning()
    user = updated
  }

  if (!user) return null
  // legacy compat
  ;(user as any)._id = user.id
  return enforceUserAccessPolicy(user as any)
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
      userId: String(user._id || (user as any).id),
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

  const db = getDb()
  const [user] = await db
    .select()
    .from(wikiUsers)
    .where(eq(wikiUsers.id, payload.userId))
    .limit(1)
  if (!user) return null

  if (!user.isActive) return null
  const isBanned = Boolean((user as any).banStatus?.isBanned)
  if (isBanned) return null

  // Drizzle row 호환 형태로 IWikiUser shape 변환 — _id 필드 추가 (legacy code 호환)
  ;(user as any)._id = user.id
  return enforceUserAccessPolicy(user as any)
}

export function buildClientUser(
  user: Pick<IWikiUser, '_id' | 'username' | 'email' | 'discordId' | 'discordUsername' | 'avatar' | 'discordAvatar'>
) {
  const memberId = resolveMemberIdForUser(user)

  return {
    id: String(user._id || (user as any).id),
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
