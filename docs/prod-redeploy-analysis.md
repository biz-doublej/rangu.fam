# Phase 2-Prep — `rangu-fam` 프로덕션 재배포 분석

> 목적: "무엇이 어떻게 변했고, 어떤 리스크가 있는가"를 투명하게 공개해 **데이터 기반 배포 결정**을 돕는다.
> 이 문서는 **분석/런북**이며 실행 명령을 자동 수행하지 않는다. 검토 후 개발자가 실행.
> 작성 시점 기준: prod = Cloud Run `rangu-fam` 리비전 **`00017`**, HEAD = `9413fc6`.

---

## 1. Code Delta Analysis

| 항목 | 값 |
|---|---|
| prod 배포 기준선(추정) | `40c87ac`(wiki poll, 2026-06-11) **이전** — prod엔 `/api/game/*` 부재(404)로 확정 |
| 델타 | **≥ 49 커밋** (`5fd2e46`~HEAD), 약 12일치 |
| prod 리비전 | `rangu-fam-00017-4f8` |

**굵직한 변경(프로드 미반영):**
- **랑구 택틱스 전체 백엔드/프론트** — 결정론 엔진 연동, 게임 티켓 인증 seam, 메타데이터 파이프라인(`5fd2e46`~)
- PvP 매치메이커 + 관전, 덱 빌더(`tactics_decks`), 챔피언 각성(엔진+proto+VFX)
- 가챠 개봉 연출 격상 + 멀티풀, 전투/가챠 사운드 시스템
- (데스크톱 Tauri는 별 산출물이라 rangu-fam 배포와 무관)

**Next ↔ C# API 계약(신규 6 라우트, 프로드에 없음 → 추가됨):**
| 라우트 | 역할 | 비고 |
|---|---|---|
| `/api/game/ticket` | 게임 티켓(RS256 JWT, 60s) 발급 | `GAME_TICKET_PRIVATE_KEY` 필요 |
| `/api/game/jwks` | 공개키 노출(서버가 stateless 검증) | **이게 없어서 `jwks_unavailable`** |
| `/api/game/metadata/export` | 실 카드 카탈로그(DB) | 서버 부팅 의존 |
| `/api/game/metadata/demo` | 정적 데모 카탈로그(DB-free) | 폴백/검증용 |
| `/api/game/deck` | 활성 덱 서버간 페치 | `GAME_SERVER_SECRET` 인증 |
| `/api/game/tactics-deck` | 덱 저장/로드(유저) | `tactics_decks` 테이블 |

---

## 2. Database Migration Checklist

**결론: DB 리스크 낮음(증분·멱등·비파괴).** 플랫폼 전환 아님.

- ✅ **prod는 이미 Cloud SQL Postgres** (`doublej-platform:asia-northeast1:rangu-pg`, `DATABASE_URL` + Cloud SQL Auth Proxy 사이드카). 몽고→PG 같은 대공사 **없음**.
- ✅ **drizzle 마이그레이션 = `0000_initial` + `0001_wiki` 둘뿐, 신규 없음**(`_journal.json` 확인) → **재배포에 drizzle migrate 단계 불필요**(이미 적용됨).
- ⚙️ **신규 테이블은 maintenance API의 멱등 `CREATE TABLE IF NOT EXISTS`로 생성**(예: `tactics-decks` 라우트 L41). 즉 "마이그레이션"의 실체 = **배포 후 maintenance 엔드포인트 1회 실행**.

**배포 후 실행할 maintenance(기능별, `?confirm=1`, 멱등 — 재실행 안전):**
| 엔드포인트 | 생성/시드 | 필요 기능 |
|---|---|---|
| `/api/admin/maintenance/tactics-decks` | `tactics_decks` | 덱 빌더 저장 |
| `/api/admin/maintenance/battle-init` | 카드배틀 표 4개 | 웹 캐주얼 배틀 |
| `/api/admin/maintenance/prestige-cards` | `prestige_*` 카드 | 도감/제작 보상 |
| `/api/admin/maintenance/gift-boxes` | `user_perks` | 랜덤 선물상자 |
| `/api/admin/maintenance/cards-trades` | 교환 표 | 카드 교환 |
| `/api/admin/maintenance/wiki-stats` | 기간 통계 표 | 인기문서/연보 |

> ⚠️ 각 maintenance 라우트가 실제로 무엇을 만드는지 배포 직전 1줄씩 재확인 권장(위는 메모리/관례 기반). diagnostic류(`dupe-accounts`, `merge-account`, `reset-drops`)는 배포 전제 아님(필요 시 운영).

---

## 3. Environment Variable Delta (prod `rangu-fam`에 **추가** 필요)

현재 prod env: `NODE_ENV, AUTH_MODE, OIDC_*, ACCOUNTS_BASE_URL, NEXT_PUBLIC_ACCOUNTS_BASE_URL, DISCORD_*, JWT_SECRET, NEXTAUTH_SECRET, DATABASE_URL` — **이건 보존**.

| 추가할 변수 | 값/형식 | 이유 |
|---|---|---|
| `GAME_TICKET_PRIVATE_KEY` | RS256 PKCS8 PEM(Secret Manager) | 티켓 발급 + `/api/game/jwks` 공개키 — **`jwks_unavailable` 근본 해결** |
| `GAME_SERVER_SECRET` | 랜덤 시크릿(Secret Manager) | 덱 브릿지 인증 — **택틱스 서버와 동일값** |
| `NEXT_PUBLIC_TACTICS_WS_URL` | `wss://rangu-tactics-server-128968514573.asia-northeast1.run.app/ws/tactics` | FE→택틱스 WS(**빌드 ARG**, 번들에 베이크) |

키 생성 예:
```bash
openssl genpkey -algorithm RSA -pkcs8 -out game_ticket.pem -pkeyopt rsa_keygen_bits:2048
gcloud secrets create GAME_TICKET_PRIVATE_KEY --data-file=game_ticket.pem --project=doublej-platform
gcloud secrets create GAME_SERVER_SECRET --data-file=<(openssl rand -base64 32) --project=doublej-platform
```

---

## 4. Deployment Runbook

### Phase A — Pre-flight (비파괴, 되돌리기 쉬움)
1. **DB 백업**: `gcloud sql backups create --instance=rangu-pg --project=doublej-platform` (롤백 안전망)
2. **키/시크릿 생성**: 위 §3 — `GAME_TICKET_PRIVATE_KEY`, `GAME_SERVER_SECRET` → Secret Manager
3. **drizzle 마이그레이션**: 신규 없음 확인됨 → **할 일 없음**(이미 0000/0001 적용)
4. **Next 이미지 빌드**: 루트 `Dockerfile`로, `--build-arg NEXT_PUBLIC_TACTICS_WS_URL=wss://…/ws/tactics`

### Phase B — Deploy
5. **`rangu-fam` 재배포** (신규 이미지 + env/시크릿 추가):
   ```bash
   gcloud run deploy rangu-fam --image=asia-northeast1-docker.pkg.dev/doublej-platform/rangu/rangu-fam:latest \
     --region=asia-northeast1 \
     --set-secrets="GAME_TICKET_PRIVATE_KEY=GAME_TICKET_PRIVATE_KEY:latest,GAME_SERVER_SECRET=GAME_SERVER_SECRET:latest" \
     # 기존 env/시크릿(DATABASE_URL, JWT_SECRET, OIDC_* …)은 유지되도록 주의
   ```
   > Cloud Run은 새 리비전으로 롤아웃 → **헬스 실패 시 트래픽 안 넘어감**(00017 유지). 안전.
6. **maintenance 1회 실행**(§2 표, `?confirm=1`) — 멱등이라 순서 무관/재실행 안전
7. **택틱스 서버 env 전환**: `Metadata__ExportUrl`을 `/demo`→`/export`, `GAME_SERVER_SECRET` 시크릿 연결, `min-instances=1`로 복구(실 PvP)
   ```bash
   gcloud run services update rangu-tactics-server --region=asia-northeast1 \
     --update-env-vars="Metadata__ExportUrl=https://rangu.fam/api/game/metadata/export" \
     --update-secrets="GAME_SERVER_SECRET=GAME_SERVER_SECRET:latest" --min-instances=1
   ```

### Phase C — Verify
8. `curl https://rangu.fam/api/game/jwks` → **공개키 JSON(404 아님)**
9. `curl https://rangu.fam/api/game/metadata/export` → 카드 카탈로그
10. **택틱스 서버 재프로브**: 유효 티켓으로 connect → `ConnectAccepted`(더 이상 `jwks_unavailable` 아님)
11. **풀 매치**: 브라우저 2개(서로 다른 멤버) → `/play` PvP → 실 덱으로 대전

### 롤백
- `gcloud run services update-traffic rangu-fam --to-revisions=rangu-fam-00017-4f8=100` (즉시 이전 리비전 복귀)

---

## 5. Risk Assessment

| 리스크 | 수준 | 완화 |
|---|---|---|
| 49커밋 일괄 라이브(테스트 표면 큼) | 중 | 리비전 롤백 즉시 가능, 비게임 변경은 점진 추가분 |
| DB 스키마 충돌/파괴 | **낮음** | 신규 drizzle 마이그레이션 0, maintenance는 `IF NOT EXISTS` 멱등, 사전 백업 |
| DB 플랫폼 전환 | **없음** | prod 이미 Cloud SQL `rangu-pg` |
| env/시크릿 누락 | 중 | §3 체크리스트, 기존 env 보존 주의 |
| 인증 키 체인 불일치 | 중 | `GAME_TICKET_PRIVATE_KEY`는 prod에서 발급+검증(jwks) 동일 키라 self-consistent |

**종합: 낮음~중.** 최대 변수는 "한 번에 많이 나간다"는 점이며, Cloud Run 리비전 롤백 + DB 백업으로 회복 경로가 명확하다.
