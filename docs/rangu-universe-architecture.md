# 랑구 유니버스 클라이언트 — 통합 아키텍처 설계서

> 대상: `doublej-platform` / `asia-northeast1`(도쿄) · 기존 스택(Next.js + Cloud Run + Cloud SQL/Drizzle + `auth.doublej.app` OIDC) 확장
> 목표: 웹으로만 돌던 **랑구팸**(커뮤니티) + **이랑위키**를 **데스크톱/모바일 클라이언트**로 확장하고, 그 안에서 **미니게임(테트리스)** 과 **하드코어 카드게임(랑구 택틱스)** 을 통합 실행.
> 작성 기준: 2026-06. 금액은 공개 정가 기반 **근사치** — 확정은 [GCP Pricing Calculator](https://cloud.google.com/products/calculator)로 검증. 비용 일반론은 [gcp-cost-optimization.md](./gcp-cost-optimization.md) 참고.

---

## 0. TL;DR

| 영역 | 결론 |
|---|---|
| 데스크톱 셸 | **Tauri** (Rust 코어 = 런처/패처, React 프런트 재사용) |
| 모바일 셸 | **Capacitor** (기존 Next.js 웹 그대로 래핑) |
| 인증 | **DoubleJ OIDC + PKCE**, 토큰 3종(refresh / access / 단명 game-ticket) |
| 테트리스 | **HTML5(TS + Canvas)** 한 벌 → 양쪽 웹뷰 공유 (추가 개발 ≈ 0) |
| 랑구 택틱스 | **Unity(Dumb Client) ↔ .NET 8(Authoritative)** / WSS + Protobuf |
| 게임서버 인프라 | ⚠️ **GKE+Agones 폐기** → **Cloud Run(WS) 기본 / e2-micro 상시무료 VM 대안** |

> ### ⚠️ 핵심 정정 (비용 폭탄 방지)
> 초안의 **GKE + Agones**는 동접 수천~수만 매치를 오토스케일하는 **엔터프라이즈급**이라, 아무도 안 해도 컨트롤플레인+노드풀 고정비로 **월 ₩90,000+ ($70~)** 가 샌다. 소규모 커뮤니티 + "월 ₩10,000 이하" 예산엔 100% 과투자. **턴제 카드게임**은 틱레이트가 낮아 아래 초저가 인프라로 충분하다.

---

## 1. 전체 토폴로지

```
                          ┌──────────────────────────────────┐
                          │   DoubleJ SSO  (OIDC / OAuth2)     │
                          │   auth.doublej.app  (dj-core VM)   │
                          │   /authorize  /token  /jwks        │
                          └───────────────┬──────────────────┘
                       Auth Code + PKCE   │   (모든 네이티브 클라 = public client)
        ┌──────────────────┬──────────────┴──────────────┬───────────────────────┐
        ▼                  ▼                              ▼                        ▼
 ┌────────────┐   ┌──────────────────┐         ┌─────────────────────┐    (게임만 별도 프로세스)
 │ Web 브라우저 │   │ Mobile (Capacitor)│         │ Desktop (Tauri)     │
 │ Next.js    │   │ WebView + Native  │         │ Launcher + WebView  │
 └─────┬──────┘   └────────┬─────────┘         └───┬───────────┬─────┘
       │ HTTPS             │ HTTPS                  │ WebView    │ spawn / patch
       │                   │                        │            ▼
       ▼                   ▼                        ▼      ┌──────────────┐
 ┌────────────────────────────────────────────────────┐  │ 랑구 택틱스    │
 │  rangu.fam 백엔드 (Next.js API · Cloud Run)          │  │ (Unity .exe) │
 │  랑구팸 / 이랑위키 / 카드(인벤·도감·확률드랍) / 점수   │◄─┘  └──────┬───────┘
 │  Cloud SQL (Postgres + Drizzle)                      │         │ WSS (or gRPC)
 └──────────────────────────┬──────────────────────────┘         ▼
                            │ 카드 메타데이터 export(JSON) ┌────────────────────────────┐
                            └────────────────────────────►│ 랑구 택틱스 게임서버 (.NET 8) │
                                                          │ Authoritative              │
                                                          │ ✅ Cloud Run(WS) / e2-micro │
                                                          │ ❌ (NOT GKE+Agones)         │
                                                          └────────────────────────────┘
```

설계 원칙: **"웹은 한 벌, 셸만 플랫폼별, 무거운 게임만 분리, 인프라는 스케일-투-제로."**

---

## Q1. 데스크톱 / 모바일 클라이언트 래퍼 스택

### 결론
| 플랫폼 | 추천 | 차선 |
|---|---|---|
| 데스크톱 (Win/Mac) | **Tauri** | Electron |
| 모바일 (iOS/Android) | **Capacitor** | React Native |
| 공통 | **pnpm + Turborepo 모노레포** | — |

### 데스크톱 → Tauri
데스크톱의 본질 업무는 "웹 띄우기"가 아니라 **런처/패처**(랑구 택틱스 다운로드·델타패치·해시검증·서명확인·외부 `.exe` 실행)다. 이게 선택을 가른다.

- **런처 로직이 Rust 네이티브 코어로** → 대용량 다운로드, delta update, 무결성 해시, 코드서명 확인, 프로세스 spawn/IPC가 Tauri 강점.
- **번들 5~15MB, 저메모리** → 상주형 "클라이언트"에 적합 (Electron은 Chromium 동봉 100MB+).
- 프런트는 **React/TS 그대로** → 기존 인력 재사용, 네이티브 레이어만 얇게 Rust.
- **차선(Electron)**: 팀에 Rust 거부감 크면. `electron-updater` 자동업데이트가 가장 성숙. 단 무겁다.

### 모바일 → Capacitor
요구 기능 대부분이 **웹뷰(랑구팸·위키)** 이고 이미 Next.js/React 자산이 있다.

- **기존 웹 코드를 거의 그대로 iOS/Android 래핑** → 재사용 극대화 = 가성비 1위.
- 네이티브 능력(보안 스토리지·푸시·딥링크·IAP)은 Capacitor 플러그인으로 충분.
- 테트리스(HTML5)도 같은 웹뷰에서 그대로 → 별도 개발 0.
- **차선(React Native)**: 위키/커뮤니티를 네이티브 UI로 다시 그릴 가치가 생길 때. 지금은 과투자. Flutter는 React 자산을 버려서 제외.

### 모노레포 구조
```
rangu-universe/
├─ apps/
│  ├─ web/            # 기존 Next.js (랑구팸·위키·카드·점수 API) ← single source of truth
│  ├─ desktop/        # Tauri 셸 (런처/패처 + WebView가 web 로드)
│  └─ mobile/         # Capacitor 셸 (WebView가 web 로드)
├─ packages/
│  ├─ auth-sdk/       # DoubleJ OIDC(PKCE) 공통 SDK (Q2)
│  ├─ tetris/         # HTML5 테트리스 공유 모듈 (Q3)
│  └─ ui/             # 공유 React 컴포넌트
└─ game/
   ├─ rangu-tactics-client/   # Unity 프로젝트
   └─ rangu-tactics-server/   # .NET Authoritative 서버 (Q4)
```
→ 웹 한 벌을 데스크톱·모바일·브라우저가 공유. 인증 SDK도 한 벌.

---

## Q2. 통합 인증 (DoubleJ SSO) 흐름

핵심: **모든 네이티브 셸 = public client → Authorization Code + PKCE** (Implicit/Password Grant 금지). 토큰을 **3종으로 분리**.

| 토큰 | 용도 | 저장 위치 | 수명 |
|---|---|---|---|
| Refresh Token | 갱신 | **OS 보안 저장소**(Keychain / Keystore / Windows Credential Manager) | 길게 |
| Access Token | rangu.fam API 호출 | 메모리 | 분 단위 |
| **Game Ticket (JWT)** | 게임서버 입장 전용 | 1회용·메모리 | **~60초, `aud=rangu-tactics`** |

### 흐름도
```
① 런처 로그인 (PKCE)
   Native Shell ──시스템 브라우저──► auth.doublej.app/authorize?code_challenge=...
                ◄──redirect rangu://callback?code=...──
   Native ──code + verifier──► /token ──► { id_token, access_token, refresh_token }
   refresh_token → OS 보안 저장소에 저장

② 내장 웹뷰(위키/커뮤니티)에 세션 주입   ← "쿠키 핸드오프"
   Native ──access_token──► rangu.fam  /api/session/exchange
   백엔드 ──Set-Cookie(HttpOnly, domain=rangu.fam)──► WebView
   ⇒ 웹뷰는 평소 웹과 100% 동일하게 쿠키 세션으로 동작 (코드 분기 없음)

③ 외부 게임(랑구 택틱스)에 세션 전달      ← "단명 티켓 + 루프백"
   (실행 직전)
   Native ──access_token──► rangu.fam  /api/game/ticket
   백엔드 ──aud=rangu-tactics, exp=60s 서명 JWT──► Native
   Native ──127.0.0.1 루프백 IPC(1회용 nonce)──► Unity.exe   ※커맨드라인 토큰 노출 금지
   Unity ──WSS 연결 + ticket 제시──► 게임서버
   게임서버 ──JWKS(auth.doublej.app)로 서명/aud/exp 검증──► 매치 입장 허용
```

### 왜 이렇게?
- **웹뷰=쿠키, 게임=단명 티켓**으로 분리 → 게임서버가 오래 사는 토큰을 만질 일이 없어 유출 면적 최소화.
- **게임서버는 stateless 검증(JWKS)** → DoubleJ에 매 요청 묻지 않음, 핵 방지에 유리.
- 토큰을 커맨드라인/임시파일로 안 넘기고 **로컬 루프백 1회용 핸드오프** → 타 프로세스 탈취 차단.
- 만료 시 Native가 refresh로 갱신 → 웹뷰 쿠키 재발급 + 게임 티켓 재발급.

### 백엔드 추가 엔드포인트 (기존 `doublejAuth` 연동)
- `POST /api/session/exchange` — access_token 검증 후 rangu.fam HttpOnly 세션 쿠키 발급.
- `POST /api/game/ticket` — access_token 검증 후 `aud=rangu-tactics`, `exp=60s` 단명 JWT 서명·발급.

---

## Q3. 테트리스 크로스 플랫폼 전략

### 결론: **HTML5(TypeScript) 한 벌 → 양쪽 웹뷰에서 그대로**
Tauri도 Capacitor도 결국 **웹뷰**라, 웹 게임 하나면 데스크톱·모바일·브라우저까지 **동일 코드로 커버**. 추가 개발 0, 유지보수 1곳.

### 엔진 선택
- 테트리스는 그리드 기반 2D → **무거운 엔진 불필요.**
  - **1순위: TypeScript + Canvas (필요 시 PixiJS 렌더)** — 가볍고 60fps 쉬움, 번들 작음.
  - **2순위: Phaser** — 씬/사운드/이펙트/입력 추상화를 빨리 얹고 싶을 때.
- `packages/tetris`로 만들어 `web`의 라우트(`/games/tetris`)로 임베드 → 모바일·데스크톱 웹뷰가 자동 흡수.

### 체크리스트
- **입력 추상화**: 키보드(데스크톱) vs 터치/스와이프(모바일)를 한 인터페이스로.
- **반응형 캔버스 + 오프라인**: 에셋 번들 동봉, 점수만 온라인 동기화.
- **점수/랭킹**: 기존 rangu.fam API(이미 카드 점수 인프라 존재)에 `tetris_scores` 테이블만 추가. 인증은 Q2 세션 그대로.
- 게임패드/네이티브 진동은 **나중에 필요할 때만** Capacitor 플러그인 보강 — 지금은 과투자 금지.

---

## Q4. 랑구 택틱스 (LoR 베이스) 통신 아키텍처

### 4-1. 클라이언트 엔진 = Unity
- "Dumb Client"라 룰 책임은 없지만 **연출/애니메이션/파티클/카드 비주얼**이 핵심 → Unity의 2D/3D + Timeline + 에셋 생태계가 압도적.
- Win/Mac 1소스 빌드, 인력 풀 큼.
- (대안 **Godot**: 더 가볍고 무료, 비용 최소화 최우선이면 고려. 단 카드게임 툴·레퍼런스는 Unity가 풍부.)
- 클라가 하는 일: **Intent 전송**(카드 냄/타깃/우선권 패스) + **서버가 보낸 Event를 애니메이션으로 재생**. 그게 전부.

### 4-2. Authoritative 서버 = C# / .NET 8
| 후보 | 장점 | 단점 |
|---|---|---|
| **C#/.NET 8 (추천)** | Unity와 **카드 모델·DTO C# 라이브러리 1벌 공유**, 결정론적 룰 엔진에 강타입, gRPC/WS 우수 | 기존 TS 스택과 언어 분리 |
| TS(Colyseus/Node) | 기존 Postgres/Drizzle·타입 **재사용**, 룸 동기화 프레임워크 성숙 | 복잡한 룰 스택 타입 안정성↓ |

→ 본질이 **복잡한 "스택 해석 + 핵 방지 + 결정론"** 이고 Unity와 모델 공유가 되므로 **.NET 권위.**
→ **카드 메타데이터 저작·저장은 기존 Postgres/Drizzle** 에 두고 → **버전드 JSON export → 게임서버 부팅 시 로드** = Data-Driven 충족 (하드코딩 금지).

### 4-3. 통신 = WSS (메시지 = Protobuf)
턴제라 틱레이트가 낮음 → **WebSocket(WSS) + Protobuf 메시지**가 가장 단순·견고(방화벽/NAT 친화). 강타입 계약을 원하면 gRPC 양방향 스트리밍도 동일 패턴.

```
Unity (Dumb Client)                       Game Server (Authoritative, .NET)
   │  Intent: PlayCard{cardId, targets[]}      │
   │ ─────────────────────────────────────────►│ 1. 검증: 내 차례? 마나? 합법 타깃?  (불법→거부)
   │                                           │ 2. 룰 엔진: 스택 push/resolve, 효과 계산
   │                                           │ 3. RNG: **서버 시드**만 사용 (클라 주사위 금지)
   │  ◄──────────────────────────────────────  │ 4. Event 델타 broadcast (양 플레이어에게)
   │  Events:[CardPlayed, StatChanged, ...]    │    ※상대 손패=숨김정보는 마스킹/미전송
   │ 5. 이벤트 시퀀스를 애니메이션으로 재생       │
```

### 4-4. LoR 제약 충족
- **Authoritative**: 클라는 Intent만, **서버가 전체 상태 보유**. 클라 결과값 절대 불신.
- **Dumb Client**: 클라는 룰 모름 — UI/연출만.
- **Data-Driven**: 카드 효과/스탯은 서버가 메타데이터(JSON)로 관리, 클라/서버 하드코딩 금지.
- **숨김정보 보호**: 상대 손패/덱 순서는 서버에만 → 클라엔 마스킹 상태만 전송 (메모리핵 무력화).
- **결정론 + 재접속**: 모든 무작위 = **서버 시드 RNG**, 매치 = **Event 로그**로 표현 → 끊기면 `풀 스냅샷 + 이벤트 replay`로 복구. (이벤트 로그를 Cloud SQL에 저장하면 인스턴스 재시작에도 복구 가능 — 아래 인프라 참고.)
- **덱 검증**: 입장 시 서버가 소유 카드(기존 Postgres 인벤토리)와 덱 합법성 검증.

---

## Q4-인프라. 게임서버 배포 — 비용 재측정 (정정의 핵심)

### 옵션 비교
| 옵션 | 유휴 비용 | 활성 비용 | 레이턴시 | 운영부담 | 결론 |
|---|---|---|---|---|---|
| ❌ ~~GKE + Agones~~ | **₩90,000+/월 고정** | + | 낮음(도쿄) | 높음 | **폐기** — 동접 수천 매치용 오버스펙 |
| ✅ **Cloud Run (WS)** | **₩0** (scale-to-zero) | 무료티어+초당 과금 | **낮음(asia-northeast1)** | **낮음(매니지드)** | **기본 추천** |
| ✅ **e2-micro VM (US)** | **₩0** (상시무료 등급) | ₩0 (플랫) | 중간(US ~150ms) | 중간(직접 운영) | 상시 플레이/콜드스타트 회피용 대안 |

### Cloud Run + WebSocket (기본)
.NET 8 서버를 Docker로 말아 Cloud Run에. **유저가 게임할 때만 켜지고 유휴엔 0**.

```bash
gcloud run deploy rangu-tactics \
  --region=asia-northeast1 \
  --image=asia-northeast1-docker.pkg.dev/$PROJECT/rangu/rangu-tactics:$TAG \
  --min-instances=0 \        # 유휴 ₩0 (가장 중요)
  --max-instances=1 \        # ★ 소규모: 1로 고정 → 모든 매치가 같은 인스턴스 = in-memory 상태 OK
  --concurrency=250 \        # WS 다중 연결을 한 인스턴스에 수용
  --cpu=1 --memory=512Mi \
  --timeout=3600 \           # WS 최대 60분 (Cloud Run 상한). 이후 재연결+resync
  --no-cpu-throttling \      # WS 연결 중 CPU 상시 할당 (게임 루프 안정)
  --session-affinity \       # 동일 클라 재연결 시 같은 인스턴스 선호
  --execution-environment=gen2
```

**⚠️ 반드시 알아야 할 두 가지 (문서화 목적):**
1. **WS 연결 = 장시간 요청** → Cloud Run은 연결이 열린 **전체 시간 동안 CPU 과금**. 그래서 "라이트/가끔" 플레이는 **무료티어(월 180,000 vCPU-초 ≈ 50 인스턴스-시간)** 안에서 거의 ₩0, "매일 장시간 상시" 플레이면 활성 시간이 쌓여 비용이 올라간다.
2. **상태 일관성**: 한 매치의 두 플레이어가 **같은 인스턴스**에 있어야 in-memory 매치 상태가 성립 → **`max-instances=1`** 로 고정(소규모에 적합). 동접 매치가 한 인스턴스 용량(메모리)을 넘기 전까진 이걸로 충분. 그 이상 커지면 Redis(Memorystore) 공유상태가 필요해지는데 그건 월 ~$30+ → **그 단계 오기 전엔 절대 도입 금지.**

- **60분 타임아웃 대응**: 매치가 길어지면 클라가 자동 재연결 → 서버가 `풀 스냅샷 + 이벤트 replay`로 resync (4-4의 복구 메커니즘과 동일). 이벤트 로그를 Cloud SQL에 저장하면 인스턴스 교체/재배포에도 안전.
- **콜드스타트**: 유휴 후 첫 접속 시 .NET 콜드스타트 1~3초 — 로비/매칭 단계라 체감 적음. (.NET 8 trim/ReadyToRun으로 단축.)

### e2-micro 상시무료 VM (대안)
- `us-west1`/`us-central1`/`us-east1` 중 **1 e2-micro 상시무료**(2 vCPU 버스트/1GB, 표준 PD 30GB, egress 1GB/월). 항상 켜져 있어 **콜드스타트 0 + in-memory 상태 안정**.
- **턴제라 US 레이턴시(~150ms)는 무관** — 핵심 통찰.
- 단점: **직접 운영**(Docker/OS 패치/TLS), 1GB RAM 빠듯(서버 린하게), 단일 장애점.
- **언제 이걸로?** 매일 장시간 상시 플레이라 Cloud Run 활성 시간이 무료티어를 넘기 시작할 때, 또는 콜드스타트가 싫을 때.

### 비용 결론
- **현실 시나리오(소규모 커뮤니티, 간헐적 매치)**: Cloud Run 기본 = **월 ₩0~2,000** (대부분 무료티어 내). 예산 "월 ₩10,000 이하" 무난 통과.
- **상시 플레이로 커지면**: e2-micro로 전환 = **플랫 ₩0**(상시무료 한도 내) + 약간의 egress.
- 어느 쪽이든 **GKE 대비 월 ₩90,000+ 절감.**

---

## 2. 개발 로드맵 (정정 반영)

| 단계 | 가늠 | 내용 |
|---|---|---|
| **P0 기반** | 2~3주 | Turborepo 모노레포, `auth-sdk`(PKCE), `/api/session/exchange`·`/api/game/ticket` 백엔드 |
| **P1 모바일** | 3~4주 | Capacitor 셸 + 랑구팸·위키 웹뷰 + SSO + 푸시/딥링크. 스토어 1차 출시 |
| **P2 데스크톱 셸** | 3~4주 | Tauri 셸 + 자동업데이트 + SSO (게임 런처 골격) |
| **P3 테트리스** | 2주 | `packages/tetris` HTML5 → 웹/모바일/데스크톱 동시 + 점수 API |
| **P4 택틱스 코어** | 6~10주 | .NET 권위 서버(룰·스택·결정론) + 카드 메타데이터 export 파이프라인 + Protobuf 계약 + PvE |
| **P5 택틱스 클라** | 6~10주 | Unity Dumb Client(연출/애니) + WSS 연동 + 게임 티켓 인증 |
| **P6 런처화·PvP** | 4~6주 | Tauri 다운로더/패처(delta·해시·서명) + **Cloud Run(WS) 배포** + 매칭(간이) + PvP·재접속 |

> P6에서 ~~GKE/Agones~~ 대신 **Cloud Run(WS) 단일 인스턴스**로 출발. 매칭도 별도 인프라 없이 백엔드(Next.js API) + 게임서버 룸으로 간이 구현.
> P4/P5는 **Protobuf 스키마 확정 후 병렬** 진행 가능.

---

## 3. 통합 기술 스택 요약

| 레이어 | 채택 |
|---|---|
| 데스크톱 | **Tauri** (Rust 코어 + React) — 런처/패처/자동업데이트 |
| 모바일 | **Capacitor** (기존 Next.js 웹 재사용) |
| 웹/백엔드 | **Next.js + Cloud Run + Cloud SQL(Postgres/Drizzle)** *(현행 유지)* |
| 인증 | **DoubleJ OIDC + PKCE**, 토큰 3종, JWKS 검증 |
| 테트리스 | **TypeScript + Canvas/PixiJS** (또는 Phaser) — 웹뷰 공유 |
| 랑구 택틱스 클라 | **Unity** (Dumb Client) |
| 랑구 택틱스 서버 | **.NET 8** (Authoritative) / **WSS + Protobuf** |
| 카드 데이터 | **Postgres → 버전드 JSON export** (Data-Driven) |
| 게임서버 인프라 | **Cloud Run(WS, min=0/max=1)** 기본 / **e2-micro 상시무료 VM** 대안 |

---

## 4. 확장 트리거 (언제 인프라를 키울까 — 아마 안 옴)

GKE/Agones·Redis 같은 "큰 인프라"는 **아래 신호가 실제로 관측될 때만** 검토. 그 전엔 도입 금지(비용 사고).

- [ ] 동시 진행 매치가 **단일 Cloud Run 인스턴스 메모리/CPU를 지속적으로 포화**시킴 (메트릭으로 확인)
- [ ] `max-instances`를 2+ 로 올려야 하고, 그래서 **매치 상태 공유(Redis)** 가 불가피해짐
- [ ] 글로벌 유저로 **멀티리전 매칭/지연 최적화**가 사업적으로 필요해짐

→ 이 중 하나라도 **실측**되기 전까진 Cloud Run 단일 인스턴스 / e2-micro로 충분하다.

---

## 5. 주의 / 검증

- 금액은 공개 정가 기반 **근사치** — 환율·무료티어 소진·약정 할인에 따라 달라짐. 변경 전 [Billing → Reports](https://console.cloud.google.com/billing)에서 실제 청구를 먼저 확인.
- **예산 알림(Budget Alert)** 필수 — 게임서버 활성 시간이 예상보다 늘면 조기 경보 ([gcp-cost-optimization.md §3](./gcp-cost-optimization.md) 참고).
- Cloud Run WS의 **60분 타임아웃 + 연결 중 CPU 과금**은 설계 전제이므로 재연결/resync를 P5~P6에서 반드시 구현.
- e2-micro 무료등급은 **US 리전 한정** — 도쿄 배포는 무료 대상 아님(턴제라 US 레이턴시 수용 가능).
- 게임서버 Docker 이미지는 기존 Artifact Registry(`rangu` repo) 재사용 + cleanup 정책 적용.
