import { NextResponse } from 'next/server'

export type AuthMode = 'legacy' | 'sso'

function normalizeAuthMode(input?: string | null): AuthMode {
  return input?.toLowerCase() === 'legacy' ? 'legacy' : 'sso'
}

export function getAuthMode(): AuthMode {
  return normalizeAuthMode(process.env.AUTH_MODE)
}

export function isLegacyAuthEnabled(): boolean {
  return getAuthMode() === 'legacy'
}

export function buildLocalAuthDisabledResponse(action: 'login' | 'register') {
  return NextResponse.json(
    {
      success: false,
      error: `로컬 ${action === 'login' ? '로그인' : '회원가입'}은 비활성화되었습니다. DoubleJ SSO 연동 후 다시 활성화하세요.`,
      authMode: getAuthMode(),
    },
    { status: 501 }
  )
}
