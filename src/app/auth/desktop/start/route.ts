import { NextRequest, NextResponse } from 'next/server'
import {
  OIDC_STATE_COOKIE,
  buildAuthorizeUrl,
  createAuthState,
  createOidcStateCookieValue,
  createPkcePair,
  getMissingOidcEnvKeys,
  getOidcStateCookieOptions,
  resolvePublicOrigin,
} from '@/lib/serviceOidc'

export const dynamic = 'force-dynamic'

/**
 * 데스크톱(네이티브 셸) OIDC 진입점 — 루프백 핸드오프 브로커.
 *
 * 네이티브 앱(런처/게임)은 직접 IdP 와 OAuth 하지 않는다(클라이언트 시크릿을
 * 숨길 수 없으므로). 대신 이 라우트로 들어와 rangu.fam(컨피덴셜 클라이언트)이
 * 표준 Authorization Code + PKCE 를 대행한다. redirect_uri 는 이미 등록된
 * `${origin}/auth/callback` 을 그대로 재사용 → IdP 측 추가 등록 불필요.
 *
 * 앱이 미리 띄운 로컬 루프백 서버(127.0.0.1:port)를 state 쿠키에 서명·보관하고,
 * /auth/callback 이 인증 완료 후 그 포트로 단명 handoff code 를 돌려준다.
 *
 *   GET /auth/desktop/start?port=<loopback port>&state=<csrf>
 */
function parsePort(raw: string | null): number | null {
  if (!raw || !/^\d{1,5}$/.test(raw)) return null
  const port = Number(raw)
  return Number.isInteger(port) && port >= 1 && port <= 65535 ? port : null
}

function parseDesktopState(raw: string | null): string | null {
  if (!raw) return null
  // URL-safe·CRLF 차단(헤더/리다이렉트 인젝션 방지). 핸드오프 CSRF 토큰 용도.
  return /^[A-Za-z0-9._-]{8,200}$/.test(raw) ? raw : null
}

export async function GET(request: NextRequest) {
  const origin = resolvePublicOrigin(request)
  try {
    const requestUrl = new URL(request.url)
    const port = parsePort(requestUrl.searchParams.get('port'))
    const desktopState = parseDesktopState(requestUrl.searchParams.get('state'))

    if (port === null || desktopState === null) {
      return NextResponse.redirect(new URL('/login?error=desktop_invalid_request', origin))
    }

    const missingEnvKeys = getMissingOidcEnvKeys()
    if (missingEnvKeys.length > 0) {
      console.error(`OIDC 설정 누락: ${missingEnvKeys.join(', ')}`)
      return NextResponse.redirect(new URL('/login?error=oidc_not_configured', origin))
    }

    const state = createAuthState()
    const { codeVerifier, codeChallenge } = createPkcePair()
    const authorizeUrl = buildAuthorizeUrl({ origin, state, codeChallenge })

    const response = NextResponse.redirect(authorizeUrl)
    response.cookies.set(
      OIDC_STATE_COOKIE,
      createOidcStateCookieValue({
        state,
        codeVerifier,
        callbackUrl: '/',
        desktop: { port, state: desktopState },
      }),
      getOidcStateCookieOptions()
    )
    return response
  } catch (error) {
    console.error('데스크톱 OIDC 시작 처리 오류:', error)
    return NextResponse.redirect(new URL('/login?error=oidc_start_failed', origin))
  }
}
