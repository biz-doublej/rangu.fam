# PostgreSQL 전환 (SSO 준비 모드)

작성일: 2026-02-19
업데이트: 2026-03-01

## 목표

- 데이터 저장소를 PostgreSQL로 통일
- 기존 ORM 코드 대규모 재작성 없이 즉시 운영 가능 상태 확보
- 로컬 로그인/회원가입은 중지하고 DoubleJ SSO 연동으로 전환 준비
- 중요 키/시크릿은 코드에 하드코딩하지 않고 `.env`에서만 주입

## 전략

현재 코드베이스는 기존 ODM 사용 범위가 광범위하다.
즉시 전환은 아래 방식으로 수행한다.

1. PostgreSQL을 실제 저장소로 사용
2. FerretDB를 PostgreSQL 백엔드 브리지로 사용(저사양 NAS에서는 AWS 앱 호스트에 배치 권장)
3. 앱은 `POSTGRES_BRIDGE_URI`로 FerretDB에 연결

즉, 앱 코드는 기존 API를 호출하지만 데이터는 PostgreSQL에 저장된다.

## 저사양 NAS 운영 원칙 (DS225+ 4TB / RAM 2GB)

- NAS 역할은 `PostgreSQL + 백업` 중심으로 제한
- FerretDB/앱 런타임은 AWS(Lightsail)로 분리해서 NAS 메모리 사용량을 줄임
- NAS 5432 포트는 공인망에 열지 않고 Tailscale/WireGuard 터널만 허용
- 이미지/미디어는 S3 + CloudFront로 점진 이관해 NAS I/O 부담을 줄임
- PostgreSQL 시작 튜닝값(권장): `shared_buffers=128MB`, `work_mem=4MB`, `max_connections=30`

## 1) 인프라 실행

```bash
cd infra/postgres-bridge
cp .env.example .env
# .env에서 POSTGRES_PASSWORD 변경

docker compose up -d
```

기본 포트:
- PostgreSQL: `5432`
- FerretDB: `27017`

운영 권장:
- 개발/리허설: 현재 compose 그대로 PostgreSQL + FerretDB 동시 구동 가능
- 운영(DS225+ 2GB): NAS에는 PostgreSQL만 유지하고 FerretDB는 AWS 앱 호스트에서 구동 권장

## 2) 앱 환경변수

```bash
cp .env.example .env
```

`.env`에서 최소 아래 값을 설정:

```bash
AUTH_MODE="sso"
JWT_SECRET="replace-me"
NEXTAUTH_SECRET="replace-me"
POSTGRES_BRIDGE_URI="<SET_FERRETDB_ENDPOINT_URI>"
DATABASE_URL="postgresql://rangu_app:<password>@localhost:5432/rangu_fam"
WIKI_UPLOADS_DIR="/mnt/nas/wiki-uploads"
```

- `AUTH_MODE=sso`: `/api/auth/login`, `/api/auth/register` 비활성화
- 로컬 로그인 재활성화 필요 시 `AUTH_MODE=legacy`
- `WIKI_UPLOADS_DIR`: 위키 업로드 원본 저장 경로(NAS 마운트 경로 권장)

## 3) 현재 적용 범위

- DB 연결 유틸: `src/lib/database.ts`
- 로컬 인증 API 제어:
  - `src/app/api/auth/login/route.ts`
  - `src/app/api/auth/register/route.ts`
  - `src/lib/authMode.ts`

## 4) 다음 단계 (네이티브 PostgreSQL)

브리지 방식은 빠른 전환용이다. 이후 순서로 네이티브 SQL 전환을 진행한다.

1. Wiki/Card/Profile 도메인별 Prisma/Drizzle 스키마 확정
2. API 라우트별 기존 연산(`populate`, `aggregate`)을 SQL로 치환
3. FerretDB 제거 후 앱이 `DATABASE_URL`로 직접 접속
