# Rangu.fam · 이랑위키 · DoubleJ — GCP 배포 가이드

세 도메인을 한 GCP 프로젝트에 배포하는 절차. 모든 명령은 PowerShell(`pwsh`) 기준.

| 도메인 | 호스팅 | Cloud Run 서비스 |
|--------|--------|-----------------|
| `rangu-fam.com`, `www.rangu-fam.com` | Cloud Run | `rangu-fam` |
| `irang.wiki`, `www.irang.wiki` | 같은 Cloud Run (host 미들웨어 라우팅) | `rangu-fam` |
| `auth.doublej.app` | Cloud Run | `dj-identity-api` |
| `accounts.doublej.app` | Cloud Run | `dj-accounts-web` |
| `admin.doublej.app` | Cloud Run (선택) | `dj-identity-admin` |

리전: **`asia-northeast1` (도쿄)** — 한국 latency 최저 + Cloud Run 도메인 매핑 지원.

---

## 0. 사전 준비 (한 번만)

### 0.1 GCP 프로젝트 + 결제

```powershell
# 1) 프로젝트 생성 (이미 있으면 건너뜀)
gcloud projects create doublej-prod --name='DoubleJ Production'

# 2) 결제 연결 (콘솔에서 직접) — 필수
#    https://console.cloud.google.com/billing/linkedaccount?project=doublej-prod

# 3) gcloud 로그인
gcloud auth login
gcloud config set project doublej-prod
```

### 0.2 도메인 소유 확인

각 도메인을 처음 매핑하기 전에 한 번 검증해야 합니다.

```powershell
gcloud domains verify rangu-fam.com
gcloud domains verify irang.wiki
gcloud domains verify doublej.app
```

각 명령은 브라우저를 열어 Search Console로 보냅니다. **TXT 레코드**를 받아 Cloudflare DNS에 등록 → 검증 완료. 같은 organization 도메인(`auth.`, `accounts.`, `admin.`)은 한 번 검증으로 OK.

### 0.3 Cloudflare DNS 모드 결정

각 호스트를 **DNS only (회색 구름)**으로 둡니다. Proxied(주황 구름)는 Cloud Run의 자동 SSL과 충돌할 수 있어 **나중에** 활성화하세요.

---

## 1. DoubleJ 배포 (auth + accounts)

```powershell
cd C:\Users\jaewo\Desktop\doublej-platform

# 1-1. GCP 부트스트랩 (APIs, Artifact Registry)
pwsh ./deploy/01-setup-gcp.ps1 -Project doublej-prod

# 1-2. Cloud SQL Postgres 생성 (~5분, ~$10/월)
#      비용 절약 원하면 건너뛰고 Neon/Supabase 무료 사용 가능 (03 단계에서 URL 입력)
pwsh ./deploy/02-postgres.ps1 -Project doublej-prod
#   → 출력의 DJ_DATABASE_URL 복사 보관

# 1-3. 시크릿 업로드 (JWT 키는 .dj-jwt-keys.local.txt에서 자동, 나머지는 프롬프트)
pwsh ./deploy/03-secrets.ps1 -Project doublej-prod
#   → DJ_DATABASE_URL: 위에서 복사한 값
#   → DJ_ADMIN_API_KEY: 임의 32자 (admin 콘솔 접근용)
#   → DISCORD_CLIENT_SECRET: Discord OAuth 사용 시

# 1-4. 빌드 + Cloud Run 배포 (10-15분)
pwsh ./deploy/04-deploy.ps1 -Project doublej-prod

# 1-5. 도메인 매핑
pwsh ./deploy/05-domains.ps1 -Project doublej-prod
#   → DNS 레코드 출력. 각 호스트마다 Cloudflare DNS에 추가
```

### Cloudflare DNS 레코드 (DoubleJ)

`05-domains.ps1` 실행 후 출력되는 값을 그대로 등록.

| Host | Type | Value |
|------|------|-------|
| `auth` | CNAME | `ghs.googlehosted.com.` |
| `accounts` | CNAME | `ghs.googlehosted.com.` |
| `admin` | CNAME (선택) | `ghs.googlehosted.com.` |

**Proxy status: DNS only (회색 구름)**

5~30분 후 SSL 자동 발급. 확인:
```powershell
curl.exe -I https://auth.doublej.app/.well-known/openid-configuration
curl.exe -I https://accounts.doublej.app
```

---

## 2. Rangu.fam + 이랑위키 배포

```powershell
cd C:\Users\jaewo\Desktop\rangu.fam

# 2-1. GCP 부트스트랩 (같은 프로젝트면 1단계와 통합 가능 — repo만 추가)
pwsh ./deploy/01-setup-gcp.ps1 -Project doublej-prod

# 2-2. 시크릿 (.env.local에서 자동 추출)
#      먼저 .env.local의 OIDC_CLIENT_SECRET을 admin 콘솔에서 복사한 값으로 채울 것
pwsh ./deploy/02-secrets.ps1 -Project doublej-prod

# 2-3. 빌드 + 배포
pwsh ./deploy/03-deploy.ps1 -Project doublej-prod

# 2-4. 도메인 매핑 (rangu-fam.com + irang.wiki 한꺼번에)
pwsh ./deploy/04-domains.ps1 -Project doublej-prod
```

### Cloudflare DNS 레코드 (Rangu/Wiki)

| Host | Type | Value |
|------|------|-------|
| `@` (rangu-fam.com) | A 4개 | (Cloud Run에서 출력하는 IP) |
| `www` (rangu-fam.com) | CNAME | `ghs.googlehosted.com.` |
| `@` (irang.wiki) | A 4개 | 같은 IP들 |
| `www` (irang.wiki) | CNAME | `ghs.googlehosted.com.` |

> apex 도메인(`@`)은 CNAME 못 쓰므로 A 레코드 4개. Cloud Run이 출력하는 4개 IP를 모두 등록.

확인:
```powershell
curl.exe -I https://rangu-fam.com
curl.exe -I https://irang.wiki         # /wiki로 자동 rewrite (미들웨어)
curl.exe https://rangu-fam.com/api/spotlight   # API 200
```

---

## 3. OIDC 클라이언트 redirect URI 갱신

`admin.doublej.app`에서 `rangu-fam-web` 클라이언트 편집:

**Redirect URIs (3개 모두):**
```
http://localhost:3000/auth/callback   ← 로컬 개발
https://rangu-fam.com/auth/callback   ← 프로덕션 메인
https://irang.wiki/auth/callback      ← 위키 도메인 (같은 클라이언트 공유)
```

> 미들웨어가 `/auth/callback`은 그대로 둬서 origin별로 callback이 분리됩니다. 같은 OIDC 클라이언트로 두 도메인 다 커버 가능.

---

## 4. 예상 비용 (월)

| 항목 | 비용 (USD) | 비고 |
|------|-----------|------|
| Cloud Run (3 서비스) | $0 ~ $1 | 무료 한도 2M 요청, 360k GiB-초 |
| Cloud SQL db-f1-micro | $9.37 | Neon 무료로 갈 시 $0 |
| Cloud Build | $0 ~ $1 | 일 120분 무료 |
| Artifact Registry | <$1 | 0.5GB 무료 |
| Cloud Storage (이미지 이전 후) | $0 | 5GB 무료 |
| 송신 트래픽 | $0 ~ $1 | Cloudflare CDN 흡수 |
| **합계** | **$10 ~ $15** | (≈13,000 ~ 19,000원) |

월 1만 원으로 맞추려면: Cloud SQL 대신 **Neon Postgres 무료**.

---

## 5. 트러블슈팅

| 증상 | 원인 / 해결 |
|------|-------------|
| `redirect_uri_mismatch` | admin 콘솔에 `https://rangu-fam.com/auth/callback`, `https://irang.wiki/auth/callback` 둘 다 등록했는지 확인 |
| Cloud Run cold start 5-10초 | `--min-instances=1`로 변경 (월 ~$5 추가) |
| `irang.wiki/foo` 404 | 미들웨어가 `/wiki/foo`로 rewrite 안 됨 → `WIKI_HOSTS` set 확인 |
| Cloud SQL 연결 실패 | `--add-cloudsql-instances` 플래그 + `--set-env-vars DJ_DATABASE_URL=...?host=/cloudsql/...` 형식 |
| Cloudflare 강제 HTTPS 무한 redirect | Cloudflare SSL/TLS mode를 **Full (Strict)**로 설정 |
| 이미지 빌드 시 ENOSPC | Cloud Build에서 `machineType: E2_HIGHCPU_8` (이미 cloudbuild.yaml에 설정됨) |

---

## 6. 배포 후 후속 작업 (선택)

- [ ] `public/images/cards/` 145MB → Cloud Storage 이전 + URL 교체 (이미지 빌드 크기 절감)
- [ ] Cloudflare proxied 모드로 전환 (CDN + DDoS 보호)
- [ ] `--min-instances=1`로 cold start 제거
- [ ] Cloud Logging 알람 설정 (5xx, 인증 실패 spike)
- [ ] Cloud SQL → Neon으로 마이그레이션 검토 (월 $9 절감)
- [ ] 나머지 DoubleJ 서비스 배포 (`audit-log-service`, `session-service`, `admin`, `discord-connector`, `token-service`)
