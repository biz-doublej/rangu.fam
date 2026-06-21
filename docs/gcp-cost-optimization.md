# GCP 비용 분석 & 최저 비용 구동 가이드

> 대상: `doublej-platform` 프로젝트 / `asia-northeast1`(도쿄) 리전
> 작성 기준: 2026-06. 모든 금액은 **공개 정가 기반 근사치**이며, 실제 청구는 트래픽·환율·할인(무료 등급/CUD)에 따라 달라집니다. 확정 견적은 [GCP Pricing Calculator](https://cloud.google.com/products/calculator)로 검증하세요.

---

## 0. TL;DR — 한 줄 결론

랑구팸은 **소규모·저트래픽 가족 사이트**입니다. 이 규모에서 비용은 *트래픽*이 아니라 **"항상 켜져 있는 자원"** 에서 거의 전부 발생합니다.

| 비용 동인 | 성격 | 최저비용 전략 |
|---|---|---|
| **Cloud SQL (Postgres)** | 24/7 과금 (스케일-투-제로 불가) | 💰 **가장 큰 절감 포인트.** 최소 티어 + 단일 영역(zonal) + 백업 최소화. 또는 서버리스 Postgres로 이전 |
| **dj-core VM (auth)** | 24/7 과금 | `e2-micro`로 다운사이즈. (단, 무료등급은 US 리전 한정) |
| **Cloud Run** (rangu-fam / rangu-bot-site) | 요청당 과금 + 스케일-투-제로 | min-instances=0 유지 → 저트래픽시 거의 무료 |
| Artifact Registry / Cloud Build / Logging | 누적·부수 비용 | 이미지 정리 정책 + 로그 보존 단축 |

**예상**: 현재 구성이 월 $40~70 수준이라면, 아래 최적화로 **월 $10~25**까지 낮출 수 있고, Postgres를 서버리스 무료 등급으로 옮기면 **월 $0~10**도 가능합니다.

---

## 1. 현재 아키텍처 인벤토리

| 자원 | 식별자 | 비고 |
|---|---|---|
| Cloud Run | `rangu-fam` | Next.js standalone, 포트 8080, `--set-secrets`로 JWT_SECRET 등 주입, Cloud SQL 인스턴스 마운트 |
| Cloud Run | `rangu-bot-site` | 봇 사이트 |
| Cloud SQL | Postgres (`doublej-platform`) | Drizzle 마이그레이션 대상. Cloud Run에서 유닉스 소켓으로 연결 |
| Compute Engine | `dj-core` VM | `auth.doublej.app` (OIDC). 반드시 Cloudflare Proxied 경유 |
| Artifact Registry | repo `rangu` | `asia-northeast1-docker.pkg.dev/$PROJECT/rangu/...` |
| Cloud Build | `cloudbuild.yaml` | 빌드 머신 `E2_HIGHCPU_8` |

배포 구성상 **좋은 점(이미 비용 효율적)**:
- Next.js `standalone` 출력 → 런타임 이미지가 작고 콜드스타트가 빠름 (Cloud Run 친화적).
- Alpine + non-root + tini → 군더더기 없음.

---

## 2. 서비스별 최저 비용 설정

### 2.1 Cloud Run — 저트래픽이면 사실상 무료

Cloud Run은 **요청을 처리하는 동안만** 과금하고, 유휴 시 인스턴스를 0으로 내릴 수 있습니다. 무료 등급(월): 200만 요청, 360,000 vCPU-초, 180,000 GiB-초, 1 GiB 북미 egress. 가족 사이트 트래픽은 이 한도를 넘기 어렵습니다.

**핵심: `min-instances=0`을 반드시 유지** (1로 두면 24/7 과금되어 절감 효과가 사라짐).

```bash
gcloud run services update rangu-fam \
  --region=asia-northeast1 \
  --min-instances=0 \
  --max-instances=3 \
  --cpu=1 \
  --memory=512Mi \
  --concurrency=80 \
  --cpu-throttling \
  --execution-environment=gen2
```

| 플래그 | 권장값 | 이유 |
|---|---|---|
| `--min-instances` | **0** | 유휴 시 과금 0. 가장 중요한 설정 |
| `--max-instances` | 2~3 | 폭주/비용 사고 방지 캡 |
| `--memory` | 512Mi (가능하면) | 메모리×시간 과금. Next standalone은 보통 충분. OOM이면 1Gi로 |
| `--concurrency` | 80 | 인스턴스당 동시 요청↑ → 인스턴스 수↓ |
| `--cpu-throttling` | on | 요청 처리 중에만 CPU 할당 (always-allocated는 더 비쌈) |

**트레이드오프**: min-instances=0이면 첫 요청에 **콜드스타트**(standalone 기준 보통 1~3초)가 생깁니다. 가족 사이트엔 수용 가능. 굳이 줄이려면 무료 등급 내에서 `min-instances=0`을 유지하되, 외부 업타임 핑(예: Cloud Scheduler 5분 간격)으로 웜 유지 — 단 이건 약간의 요청·vCPU 비용을 만들므로 보통 불필요.

`rangu-bot-site`도 동일 원칙 적용.

### 2.2 Cloud SQL — 여기서 돈이 샌다

Cloud SQL은 **인스턴스가 떠 있는 한 24/7 과금**(스케일-투-제로 불가). 저트래픽에서 보통 **전체 비용의 50~80%**.

**옵션 A — Cloud SQL 유지 + 최소 구성** (마이그레이션 부담 없음)
- 머신 타입: 최소 공유코어 `db-f1-micro`(또는 신규 Enterprise 에디션의 최소 vCPU). 근사 ~$8~12/월.
- 가용성: **Zonal(단일 영역)**. HA(Regional)는 2배 비용 → 가족 사이트엔 불필요.
- 스토리지: 최소(10GB)에서 시작, 자동 증가 on. SSD가 비싸면 데이터량 적을 때 HDD 고려.
- 백업: 자동 백업 보존 7일 정도로. PITR(로그) 불필요하면 off.

```bash
# 신규로 만들 때 (예시 — 기존 인스턴스는 edit로 다운사이즈)
gcloud sql instances patch <INSTANCE> \
  --tier=db-f1-micro \
  --availability-type=zonal \
  --no-enable-bin-log \
  --backup-start-time=18:00 \
  --retained-backups-count=7
```

> **저녁에만 쓰는 사이트라면**: Cloud SQL 인스턴스를 야간/심야에 **정지(stop)** 했다가 필요 시 start. 정지 중엔 컴퓨팅 과금이 멈춤(스토리지만 과금). Cloud Scheduler + Cloud Functions로 스케줄링 가능. 단, 정지 중엔 사이트 DB 기능이 죽으므로 신중히.

**옵션 B — 서버리스 Postgres로 이전 (월 $0~ 시작)** 💡
- [Neon](https://neon.tech), [Supabase](https://supabase.com) 등은 **스케일-투-제로 + 무료 등급**을 제공. 가족 사이트 데이터량이면 무료 한도 내가 현실적.
- 이미 **Drizzle**을 쓰므로 드라이버/연결 문자열 교체만으로 대체로 호환(둘 다 표준 Postgres 와이어 프로토콜). `DATABASE_URL`만 바꾸면 됨.
- 트레이드오프: GCP 밖 의존성 추가, egress/지연(리전 선택 중요, 도쿄/서울 근접 리전), 무료 등급의 콜드스타트.

> 권장: **단기엔 옵션 A(최소 티어)**, DB 사용이 가벼운 게 확실하면 **중기에 옵션 B 검토**.

### 2.3 dj-core VM (auth) — 다운사이즈

24/7 VM도 고정비입니다.

- 타입을 **`e2-micro`**(2 vCPU 버스트/1GB)로. auth 게이트웨이 정도면 충분한 경우가 많음.
- ⚠️ **무료 등급 e2-micro는 `us-west1`/`us-central1`/`us-east1` 한정** — 도쿄(asia-northeast1)는 무료 대상 아님. 그래도 e2-micro 자체가 저렴(~$7~8/월 근사).
- 장기 상시 구동이면 **CUD(약정 사용 할인) 1년**으로 추가 절감.
- 디스크는 표준 PD 최소 용량으로. 스냅샷 스케줄은 보존 짧게.

```bash
# 중지 후 머신타입 변경 (다운타임 발생 — auth 영향 주의)
gcloud compute instances stop dj-core --zone=<ZONE>
gcloud compute instances set-machine-type dj-core --zone=<ZONE> --machine-type=e2-micro
gcloud compute instances start dj-core --zone=<ZONE>
```

> 더 공격적으로 가려면 auth를 Cloud Run 컨테이너로 옮겨 VM을 없애는 방안도 있으나, OIDC/세션·CF Proxied 의존성 때문에 아키텍처 변경 비용이 큼. 별도 과제로.

### 2.4 Artifact Registry — 오래된 이미지 정리

빌드마다 `:$BUILD_ID` + `:latest` 두 태그가 쌓입니다. 이미지가 누적되면 스토리지 과금이 천천히 늘어남.

```bash
# 미사용 다이제스트 정리용 보존 정책 (예: 최근 5개만 유지)
gcloud artifacts repositories set-cleanup-policies rangu \
  --location=asia-northeast1 \
  --policy=cleanup-keep-recent.json
```
`cleanup-keep-recent.json` 예시(최근 5개 버전만 유지, 태그 없는 것 7일 후 삭제)는 [keep-most-recent-versions 문서](https://cloud.google.com/artifact-registry/docs/repositories/cleanup-policy) 참고.

### 2.5 Cloud Build & Logging

- **빌드 머신**: `E2_HIGHCPU_8`은 이 규모 Next 빌드엔 과할 수 있음. 빌드 시간 vs 분당 단가 트레이드오프 — 빌드가 느려도 괜찮으면 기본(`E2_MEDIUM`/`E2_STANDARD_2`)으로 낮춰 빌드 비용 절감. (빌드 빈도가 낮으면 영향 작음.)
- 매월 무료 빌드 시간(120 빌드-분/일 수준)이 있으니 저빈도면 사실상 무료.
- **Logging**: 기본 보존 30일. 필요 없으면 보존 단축 + **exclusion 필터**로 노이즈 로그(헬스체크 등) 수집 제외 → 수집량 과금 절감.

---

## 3. 빠른 적용 체크리스트

- [ ] `rangu-fam`, `rangu-bot-site` 모두 `--min-instances=0` 확인 (가장 중요)
- [ ] Cloud Run `--max-instances` 캡 설정 (비용 사고 방지)
- [ ] Cloud Run 메모리 512Mi로 낮춰보고 OOM 모니터링
- [ ] Cloud SQL `availability-type=zonal` 확인 (HA 불필요)
- [ ] Cloud SQL 티어를 최소(`db-f1-micro` 등)로 다운사이즈
- [ ] Cloud SQL 백업 보존 7일 / PITR off (불필요 시)
- [ ] dj-core VM `e2-micro`로 다운사이즈 검토
- [ ] Artifact Registry cleanup policy 적용
- [ ] **예산 알림(Budget Alert)** 설정 — 월 한도(예: $30) 초과 시 메일
- [ ] (중기) DB 사용량 가벼우면 Neon/Supabase 무료 등급 이전 검토

### 예산 알림 (필수 — 비용 사고 조기 경보)

```bash
gcloud billing budgets create \
  --billing-account=<BILLING_ACCOUNT_ID> \
  --display-name="rangu-monthly" \
  --budget-amount=30USD \
  --threshold-rule=percent=0.5 \
  --threshold-rule=percent=0.9 \
  --threshold-rule=percent=1.0
```

---

## 4. 비용 동인 우선순위 (요약)

```
영향 큼 ──────────────────────────────► 작음
 Cloud SQL  >  dj-core VM  >  Cloud Run  >  AR/Build/Logging
 (24/7)        (24/7)         (요청당)        (누적/부수)
```

저트래픽 가족 사이트에서 **Cloud Run은 거의 무료**입니다. 절감의 핵심은 **상시 구동 자원(Cloud SQL, VM)을 최소화**하는 것입니다.

---

## 5. 주의 / 검증

- 위 금액은 공개 정가 기반 **근사치**입니다. 환율(USD→KRW), 무료 등급 소진 여부, 약정 할인에 따라 실제 청구가 달라집니다.
- 변경 전 **현재 청구 내역**을 [Billing → Reports](https://console.cloud.google.com/billing)에서 서비스별로 확인해 "실제로 어디서 돈이 나가는지" 먼저 파악하세요. 추정보다 정확합니다.
- Cloud SQL 티어 변경/VM 머신타입 변경은 **재시작(다운타임)** 을 동반합니다. auth(dj-core)는 도달성 영향이 크니 저트래픽 시간대에 적용하세요.
