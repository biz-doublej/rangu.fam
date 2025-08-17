import { IWikiUser, IWikiPage } from '@/models/Wiki'

type Role = IWikiUser['role']
type ProtectionLevel = IWikiPage['protection']['level']

const ROLE_PRIORITY: Record<Role, number> = {
  viewer: 0,
  editor: 1,
  moderator: 2,
  admin: 3,
  owner: 4,
}

export function isModeratorOrAbove(user?: IWikiUser | null) {
  if (!user) return false
  return ROLE_PRIORITY[user.role] >= ROLE_PRIORITY.moderator
}

export function isAdminOrAbove(user?: IWikiUser | null) {
  if (!user) return false
  return ROLE_PRIORITY[user.role] >= ROLE_PRIORITY.admin
}

export function isAutoconfirmed(user?: IWikiUser | null) {
  if (!user) return false
  const createdAt = (user as any).createdAt ? new Date((user as any).createdAt) : null
  const sevenDaysMs = 7 * 24 * 60 * 60 * 1000
  const oldEnough = createdAt ? Date.now() - createdAt.getTime() >= sevenDaysMs : false
  return user.edits >= 10 || oldEnough
}

export function canProtectPage(user?: IWikiUser | null) {
  if (!user) return false
  return Boolean(user.permissions?.canProtect) || isModeratorOrAbove(user)
}

export function canEditPage(user: IWikiUser | null | undefined, page: IWikiPage): boolean {
  const level: ProtectionLevel = page?.protection?.level || 'none'

  if (level === 'none') {
    return Boolean(user?.permissions?.canEdit)
  }

  if (!user) return false

  switch (level) {
    case 'semi':
      // 반보호: 자동 확정 사용자 이상만
      return isAutoconfirmed(user) || isModeratorOrAbove(user)
    case 'full':
      // 준전면 보호: 운영(모더레이터) 이상만
      return isModeratorOrAbove(user)
    case 'admin':
      // 전면 보호: 관리자 이상만
      return isAdminOrAbove(user)
    default:
      return false
  }
}

export function canMovePage(user?: IWikiUser | null) {
  if (!user) return false
  return isModeratorOrAbove(user)
}

// 간단한 분당 편집 레이트 리밋 (프로세스 메모리 기반)
const EDIT_BUCKET: Map<string, { count: number; resetAt: number }> = new Map()

export function isRateLimited(key: string, limitPerMinute: number): boolean {
  const now = Date.now()
  const bucket = EDIT_BUCKET.get(key)
  if (!bucket || now > bucket.resetAt) {
    EDIT_BUCKET.set(key, { count: 1, resetAt: now + 60_000 })
    return false
  }
  if (bucket.count >= limitPerMinute) {
    return true
  }
  bucket.count += 1
  return false
}


