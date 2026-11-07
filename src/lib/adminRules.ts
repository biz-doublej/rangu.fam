import { isGoogleLinked } from '@/lib/accountRules'

interface LinkableAccount {
  id: string
  username: string
  isActive: boolean
  ssoSubject: string | null
  naverId: string | null
}

export type AccountLinkPlan =
  | { ok: true; moveGoogle: boolean; moveNaver: boolean }
  | { ok: false; error: string }

/**
 * 새로 생긴 계정(source)의 로그인 수단을 기존 계정(target)으로 옮길 수 있는지 판단한다.
 * target 에 이미 같은 종류의 로그인이 있으면 덮어쓰지 않는다.
 */
export function planAccountLink(source: LinkableAccount, target: LinkableAccount): AccountLinkPlan {
  if (source.id === target.id) return { ok: false, error: '같은 계정끼리는 연결할 수 없습니다.' }
  if (!target.isActive) return { ok: false, error: '기존 계정이 비활성 상태입니다.' }

  const sourceGoogle = isGoogleLinked(source.ssoSubject)
  const targetGoogle = isGoogleLinked(target.ssoSubject)
  if (sourceGoogle && targetGoogle) {
    return { ok: false, error: '기존 계정에 이미 다른 구글 계정이 연결되어 있습니다.' }
  }
  if (source.naverId && target.naverId) {
    return { ok: false, error: '기존 계정에 이미 다른 네이버 계정이 연결되어 있습니다.' }
  }
  if (!sourceGoogle && !source.naverId) {
    return { ok: false, error: '옮길 로그인 수단(구글·네이버)이 새 계정에 없습니다.' }
  }
  return { ok: true, moveGoogle: sourceGoogle, moveNaver: Boolean(source.naverId) }
}

export const NOTICE_TONES = ['info', 'warning', 'success'] as const
export type NoticeTone = (typeof NOTICE_TONES)[number]

export interface NoticeInput {
  message: string
  linkUrl: string | null
  tone: NoticeTone
  isActive: boolean
  startsAt: Date | null
  endsAt: Date | null
}

function parseDate(value: unknown): Date | null | 'invalid' {
  if (value === null || value === undefined || value === '') return null
  const date = new Date(String(value))
  return Number.isNaN(date.getTime()) ? 'invalid' : date
}

export function validateNoticeInput(input: unknown): { ok: true; value: NoticeInput } | { ok: false; error: string } {
  const raw = (input || {}) as Record<string, unknown>
  const message = typeof raw.message === 'string' ? raw.message.trim() : ''
  if (!message || message.length > 200) return { ok: false, error: '공지 내용을 1~200자로 입력해 주세요.' }

  const link = typeof raw.linkUrl === 'string' ? raw.linkUrl.trim() : ''
  if (link && !link.startsWith('/') && !link.startsWith('https://')) {
    return { ok: false, error: '링크는 https:// 주소나 / 로 시작하는 사이트 주소만 쓸 수 있습니다.' }
  }
  if (link.startsWith('//')) return { ok: false, error: '링크 형식이 올바르지 않습니다.' }

  const tone = NOTICE_TONES.includes(raw.tone as NoticeTone) ? (raw.tone as NoticeTone) : 'info'
  const startsAt = parseDate(raw.startsAt)
  const endsAt = parseDate(raw.endsAt)
  if (startsAt === 'invalid' || endsAt === 'invalid') return { ok: false, error: '날짜 형식이 올바르지 않습니다.' }
  if (startsAt && endsAt && endsAt <= startsAt) return { ok: false, error: '종료 시각은 시작 시각보다 뒤여야 합니다.' }

  return {
    ok: true,
    value: { message, linkUrl: link || null, tone, isActive: raw.isActive !== false, startsAt, endsAt },
  }
}

/** 지금 보여줘야 하는 공지인지 */
export function isNoticeLive(notice: { isActive: boolean; startsAt: Date | null; endsAt: Date | null }, now = new Date()) {
  if (!notice.isActive) return false
  if (notice.startsAt && notice.startsAt > now) return false
  if (notice.endsAt && notice.endsAt <= now) return false
  return true
}
