# Rangu.fam

네 친구의 온라인 공간. iOS Liquid Glass 스타일 디자인을 적용한 Next.js 14 풀스택 애플리케이션입니다.

## 주요 기능

| 도메인 | 설명 |
|------|------|
| 메인 | 스포트라이트 슬라이드, 세계 시간(서울/밴쿠버/스위스), 사이드바 북마크 위젯 |
| 멤버/프로필 | 멤버 카드, 프로필 페이지, 팔로우/팔로워 |
| 이랑위키 | 나무위키 스타일 위키. 페이지 CRUD, 리비전, 보호/잠금/이동, 카테고리, 토론, 모더레이션 |
| 카드 드랍 | Year/Special/Signature/Material/Prestige 5종, 등급 5단계, 크래프팅 시스템 |
| 인증 | DoubleJ SSO (OIDC + PKCE) + Discord OAuth 연동 |
| 어드민 | 대시보드 통계, 사용자 관리, 페이지 관리, 위키 인증 |
| University | `university.rangu.com` 호스트 헤더 기반 서브도메인 라우팅 |

## 기술 스택

- **프레임워크:** Next.js 14 (App Router), React 18, TypeScript 5
- **스타일링:** Tailwind CSS, Framer Motion, Lucide Icons
- **데이터:** PostgreSQL (FerretDB MongoDB-wire 브리지 경유), Mongoose ODM
- **인증:** OIDC (DoubleJ), Discord OAuth, JWT
- **인프라:** Docker Compose (Postgres 16 + FerretDB 2)
- **배포:** Netlify (현재) → GCP Cloud Run 이전 검토 중

## 시작하기

### 필수 요구사항

- Node.js 18 이상
- Docker (PostgreSQL + FerretDB 브리지용)

### 설치 및 실행

```bash
# 1. 의존성 설치
npm install

# 2. DB 브리지 실행
cd infra/postgres-bridge
cp .env.example .env
# .env에서 POSTGRES_PASSWORD 변경
docker compose up -d
cd ../..

# 3. 환경 변수 설정
cp .env.local.example .env.local
# 최소 필수: JWT_SECRET, NEXTAUTH_SECRET, POSTGRES_BRIDGE_URI

# 4. 개발 서버
npm run dev
# http://localhost:3000
```

자세한 PostgreSQL 전환 절차는 [docs/POSTGRES_TRANSITION_SSO.md](docs/POSTGRES_TRANSITION_SSO.md) 참고.

### 시드 데이터 (선택)

```bash
npm run seed             # 기본 데이터
npm run seed-extended    # 확장 데이터
npm run seed-wiki        # 위키 콘텐츠
npm run seed-bookmarks   # 북마크 샘플
```

### 빌드

```bash
npm run build
npm start
```

## 프로젝트 구조

```
src/
├── app/                    # Next.js App Router
│   ├── api/               # API 라우트 (73개)
│   │   ├── auth/         # OIDC + Discord OAuth
│   │   ├── account/      # 세션, 멤버 연결
│   │   ├── wiki/         # 위키 (페이지/모드/감사/리비전)
│   │   ├── cards/        # 카드 드랍/크래프트/인벤토리
│   │   ├── admin/        # 어드민 API
│   │   ├── bookmarks/    # 북마크 CRUD
│   │   ├── profiles/     # 프로필/팔로우
│   │   └── images/       # 이미지 업로드/서빙
│   ├── wiki/              # 위키 페이지
│   ├── cards/             # 카드 페이지
│   ├── admin/             # 어드민 패널
│   ├── members/           # 멤버 카드
│   └── settings/          # 계정 설정
├── components/             # React 컴포넌트
├── contexts/               # Auth / WikiAuth / Theme / Notification
├── lib/                    # database / serviceOidc / doublejAuth / logger 등
├── models/                 # Mongoose 모델 (15개)
├── services/               # 도메인 서비스 레이어
├── types/                  # 공통 타입
├── data/                   # 정적 데이터
└── config/                 # 설정 (브랜딩 등)

docs/                       # 운영 문서
infra/postgres-bridge/      # PostgreSQL + FerretDB Docker
scripts/                    # 시드/마이그레이션 스크립트
```

## 문서

- [docs/POSTGRES_TRANSITION_SSO.md](docs/POSTGRES_TRANSITION_SSO.md) — PostgreSQL 전환 + SSO 모드
- [docs/MIGRATION_CHECKLIST_NAS_POSTGRES_AWS.md](docs/MIGRATION_CHECKLIST_NAS_POSTGRES_AWS.md) — NAS/AWS 마이그레이션
- [docs/DISCORD_WEBHOOKS.md](docs/DISCORD_WEBHOOKS.md) — Discord 웹훅 설정
- [docs/BRANDING.md](docs/BRANDING.md) — 브랜딩 가이드
- [docs/service-login-platform-integration.md](docs/service-login-platform-integration.md) — 서비스 로그인 플랫폼 통합
- [HELP.md](HELP.md) — 이랑위키 사용자 도움말

## 인증 모드

`AUTH_MODE` 환경변수로 제어:

- `sso` (기본/권장): DoubleJ 계정 플랫폼 OIDC만 허용. 로컬 로그인/회원가입 라우트 제거됨.
- `legacy`: 과거 로컬 인증 모드 (지원 중단 예정)

자세한 OIDC 흐름은 [src/lib/serviceOidc.ts](src/lib/serviceOidc.ts) 참고.

## 라이선스

개인 프로젝트.
