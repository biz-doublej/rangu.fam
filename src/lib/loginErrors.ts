/** /auth/callback 이 `?error=` 로 넘기는 코드 → 사용자 안내 문구 */
const LOGIN_ERROR_MESSAGES: Record<string, string> = {
  oidc_not_configured: '구글 로그인 설정이 누락되었습니다. 관리자에게 GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET 설정을 요청해주세요.',
  oidc_start_failed: '로그인 시작 처리에 실패했습니다. 잠시 후 다시 시도해주세요.',
  oidc_authorize_failed: 'Google 로그인이 취소되었거나 실패했습니다.',
  invalid_oauth_callback: '로그인 응답이 올바르지 않습니다. 다시 시도해주세요.',
  state_missing: '로그인 세션이 만료되었습니다. 다시 로그인해주세요.',
  state_mismatch: '보안 검증(state)이 일치하지 않습니다. 다시 로그인해주세요.',
  identity_not_found: 'Google 계정 정보를 확인하지 못했습니다.',
  email_not_verified: '이메일 인증이 완료된 Google 계정만 로그인할 수 있습니다.',
  session_sync_failed: '서비스 세션 생성에 실패했습니다.',
  oidc_callback_failed: '로그인 처리 중 오류가 발생했습니다.',
  account_inactive: '비활성화된 계정입니다.',
  account_banned: '차단된 계정입니다.',
}

export function getLoginErrorMessage(code: string | null | undefined): string | null {
  if (!code) return null
  return LOGIN_ERROR_MESSAGES[code] || '로그인 중 오류가 발생했습니다.'
}
