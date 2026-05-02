# 타 서비스에서 로그인 플랫폼 이용 가이드

기준일: 2026-03-02  
기준 코드: `apps/dj-identity-api/src/server.ts`, `docs/api-spec/service-oidc-sso-integration.md`

## 1) 목적

- 서비스 A/B/C가 `auth.doublej.app` 기반 OIDC로 로그인한다.
- 로그인/회원가입/계정설정 UI는 `accounts.doublej.app`로 통합한다.
- 각 서비스는 자체 세션을 유지하되, 인증 소스는 공통(`auth`)으로 일원화한다.

## 2) 전제 조건

- `https://auth.doublej.app/health` 응답 정상
- `https://auth.doublej.app/.well-known/openid-configuration` 응답 정상
- `https://accounts.doublej.app/signin` 접근 정상
- 서비스 도메인 준비 완료 (예: `https://service-a.doublej.app`)

## 3) 연동 방식 (권장)

- 프로토콜: OAuth 2.0 Authorization Code + PKCE
- 로그인 진입: 서비스 프론트 -> 서비스 백엔드 `/auth/start`
- 인증 UI: `https://accounts.doublej.app/signin`
- 인가/토큰: `https://auth.doublej.app/oauth2/*`

주의:

- `iframe` 임베드 방식 금지
- 브라우저에서 `client_secret` 처리 금지
- 서비스별로 OIDC 클라이언트를 분리해서 등록

## 4) 1회 설정: OIDC 클라이언트 등록

### 4.1 관리자 API 키 준비

- `DJ_ADMIN_API_KEY`는 운영 서버의 `.env.identity`에 설정된 값을 사용
- 키가 노출되었으면 새 키 발급 후 `dj-identity-api` 재시작

### 4.2 서비스 클라이언트 생성

```bash
curl -X POST "https://auth.doublej.app/v1/admin/oidc/clients" \
  -H "x-admin-api-key: <DJ_ADMIN_API_KEY>" \
  -H "content-type: application/json" \
  -d '{
    "name": "Service A Web",
    "redirectUris": ["https://service-a.doublej.app/auth/callback"],
    "postLogoutRedirectUris": ["https://service-a.doublej.app"],
    "allowedScopes": ["openid", "profile", "email", "offline_access"],
    "requirePkce": true,
    "confidential": true
  }'
```

응답의 `client.clientId`, `client.clientSecret`를 서비스 백엔드 시크릿으로 저장한다.

## 5) 서비스 백엔드 구현

### 5.1 환경변수

```env
OIDC_ISSUER=https://auth.doublej.app
OIDC_CLIENT_ID=<발급된 clientId>
OIDC_CLIENT_SECRET=<발급된 clientSecret>
OIDC_REDIRECT_URI=https://service-a.doublej.app/auth/callback
OIDC_SCOPE=openid profile email offline_access
```

### 5.2 `/auth/start` 구현 규칙

1. `state` 생성 (CSRF 방지)
2. `code_verifier` 생성
3. `code_challenge=S256(code_verifier)` 생성
4. 아래 authorize URL 생성
5. `accounts` 로그인 페이지로 리다이렉트 (`continue`에 authorize URL 전달)

authorize URL 예시:

```text
https://auth.doublej.app/oauth2/authorize
?response_type=code
&client_id=<OIDC_CLIENT_ID>
&redirect_uri=https%3A%2F%2Fservice-a.doublej.app%2Fauth%2Fcallback
&scope=openid%20profile%20email%20offline_access
&state=<STATE>
&code_challenge=<CODE_CHALLENGE>
&code_challenge_method=S256
&consent_action=approve
```

accounts 리다이렉트 예시:

```text
https://accounts.doublej.app/signin?continue=<URLENCODED_AUTHORIZE_URL>
```

### 5.3 `/auth/callback` 구현 규칙

1. `code`, `state` 수신
2. 저장된 `state`와 비교 검증
3. 저장된 `code_verifier`로 `/oauth2/token` 코드 교환
4. 토큰 응답으로 서비스 자체 세션 생성
5. 브라우저에는 서비스 세션 쿠키만 전달

토큰 교환 요청:

```bash
curl -X POST "https://auth.doublej.app/oauth2/token" \
  -H "content-type: application/x-www-form-urlencoded" \
  -d "grant_type=authorization_code&code=<CODE>&client_id=<CLIENT_ID>&client_secret=<CLIENT_SECRET>&redirect_uri=https%3A%2F%2Fservice-a.doublej.app%2Fauth%2Fcallback&code_verifier=<CODE_VERIFIER>"
```

## 6) 서비스 프론트 구현

- 로그인 버튼은 `accounts` 직접 호출이 아니라 서비스 백엔드 `/auth/start`를 호출한다.

예시:

```ts
window.location.href = "/auth/start";
```

## 7) Access Token 검증 (서비스 API)

- `/.well-known/openid-configuration`에서 `jwks_uri`를 읽어 JWKS 캐시
- Access token 검증 시 최소 체크:
  - `iss == https://auth.doublej.app`
  - `aud == doublej-services` (운영 audience와 일치)
  - `exp` 만료
  - 필요한 scope 포함

Node SDK 예시:

```ts
import { verifyAccessToken, requireScope } from "@doublej/dj-auth-sdk-node";

const { payload } = await verifyAccessToken(token, {
  issuer: "https://auth.doublej.app",
  audience: "doublej-services"
});

if (!requireScope(payload, "openid")) {
  throw new Error("insufficient_scope");
}
```

## 8) 계정 관련 화면 연결

타 서비스에서 직접 구현하지 말고 아래 링크로 이동시킨다.

- 회원가입: `https://accounts.doublej.app/signup`
- 로그인: `https://accounts.doublej.app/signin`
- 계정 홈: `https://accounts.doublej.app/account`
- 개인정보: `https://accounts.doublej.app/account/personal-info`
- 보안: `https://accounts.doublej.app/account/security`
- 연결 관리: `https://accounts.doublej.app/account/connections`
- 결제: `https://accounts.doublej.app/account/billing`

## 9) 오류 처리 기준

주요 오류:

- `invalid_client`
- `invalid_redirect_uri`
- `invalid_grant`
- `invalid_grant_pkce_mismatch`
- `login_required`

대응 원칙:

- `state` 불일치 시 즉시 로그인 중단
- 인가 코드는 1회성으로만 사용 (재사용 금지)
- 실패 시 `client_id`, `redirect_uri`, `code_verifier` 순으로 점검

## 10) 운영 체크리스트

- [ ] 서비스별 OIDC 클라이언트 분리 등록
- [ ] `redirectUris`는 실제 서비스 callback과 정확히 일치
- [ ] `DJ_ADMIN_API_KEY` 노출 이력 있으면 교체
- [ ] refresh token은 서비스 서버 저장소에 보관
- [ ] `localStorage`에 refresh token 저장 금지
- [ ] `CORS_ORIGIN`에 실제 도메인만 허용

## 11) 검증 명령어

```bash
curl -sS https://auth.doublej.app/.well-known/openid-configuration
curl -sS https://auth.doublej.app/oauth2/jwks
curl -I https://accounts.doublej.app/signin
```
