/** 계정 설정의 순수 규칙. DB에 의존하지 않아 단위 테스트로 검증한다. */

export const GOOGLE_LINK_PREFIX = 'google:'
export const DISPLAY_NAME_COOLDOWN_DAYS = 7

const DISPLAY_NAME_PATTERN = /^[가-힣a-zA-Z0-9 _-]+$/
const RESERVED_DISPLAY_WORDS = ['운영자', '관리자', 'admin', 'moderator', '이랑위키', '랑구팸']

export type DisplayNameCheck = { ok: true; value: string } | { ok: false; error: string }

export function validateDisplayName(raw: unknown, options: { isAdmin?: boolean } = {}): DisplayNameCheck {
  const value = typeof raw === 'string' ? raw.trim().replace(/\s+/g, ' ') : ''
  if (value.length < 2 || value.length > 20) {
    return { ok: false, error: '표시 이름은 2~20자로 입력해 주세요.' }
  }
  if (!DISPLAY_NAME_PATTERN.test(value)) {
    return { ok: false, error: '한글, 영문, 숫자, 공백, _, - 만 사용할 수 있습니다.' }
  }
  if (!options.isAdmin) {
    const lower = value.toLowerCase()
    if (RESERVED_DISPLAY_WORDS.some((word) => lower.includes(word))) {
      return { ok: false, error: '운영진으로 오해할 수 있는 이름은 사용할 수 없습니다.' }
    }
  }
  return { ok: true, value }
}

/** 다음 변경 가능 시각. 지금 바꿀 수 있으면 null. */
export function nextDisplayNameChangeAt(lastChanged: Date | null | undefined, now: Date = new Date()): Date | null {
  if (!lastChanged) return null
  const next = new Date(lastChanged.getTime() + DISPLAY_NAME_COOLDOWN_DAYS * 24 * 60 * 60 * 1000)
  return next > now ? next : null
}

export function isGoogleLinked(ssoSubject: string | null | undefined): boolean {
  return Boolean(ssoSubject?.startsWith(GOOGLE_LINK_PREFIX))
}

export function countLoginMethods(user: { ssoSubject?: string | null; naverId?: string | null }): number {
  return (isGoogleLinked(user.ssoSubject) ? 1 : 0) + (user.naverId ? 1 : 0)
}

export type GoogleEmailMatch = 'link' | 'google_account_mismatch' | 'google_not_linked'

/** 구글 subject로 못 찾고 이메일로 찾은 회원을 이 구글 계정에 붙여도 되는지 판단한다. */
export function classifyGoogleEmailMatch(user: {
  ssoSubject?: string | null
  googleUnlinkedAt?: Date | null
}): GoogleEmailMatch {
  if (user.googleUnlinkedAt) return 'google_not_linked'
  if (isGoogleLinked(user.ssoSubject)) return 'google_account_mismatch'
  return 'link'
}

export function maskIp(ip: string | null | undefined): string {
  const value = ip?.trim()
  if (!value) return '알 수 없음'
  if (value.includes(':')) {
    const parts = value.split(':').filter(Boolean)
    return parts.length >= 2 ? `${parts[0]}:${parts[1]}:…` : '알 수 없음'
  }
  const parts = value.split('.')
  return parts.length === 4 ? `${parts[0]}.${parts[1]}.*.*` : '알 수 없음'
}

export function summarizeUserAgent(userAgent: string | null | undefined): string {
  const ua = userAgent || ''
  const browser = /Edg\//.test(ua)
    ? 'Edge'
    : /Whale\//.test(ua)
      ? 'Whale'
      : /SamsungBrowser\//.test(ua)
        ? 'Samsung Internet'
        : /Chrome\//.test(ua)
          ? 'Chrome'
          : /Firefox\//.test(ua)
            ? 'Firefox'
            : /Safari\//.test(ua)
              ? 'Safari'
              : '알 수 없는 브라우저'
  const os = /Windows/.test(ua)
    ? 'Windows'
    : /Android/.test(ua)
      ? 'Android'
      : /iPhone|iPad/.test(ua)
        ? 'iOS'
        : /Mac OS X/.test(ua)
          ? 'macOS'
          : /Linux/.test(ua)
            ? 'Linux'
            : '알 수 없는 기기'
  return `${browser} · ${os}`
}

/** 네이버 state 파라미터(`<state>.<base64url 콜백 경로>`)를 나눈다. */
export function parseNaverState(value: string | null | undefined): { state: string; callbackUrl: string } | null {
  const [state, encoded] = (value || '').split('.')
  if (!state || !encoded) return null
  try {
    return { state, callbackUrl: Buffer.from(encoded, 'base64url').toString('utf8') }
  } catch {
    return null
  }
}
