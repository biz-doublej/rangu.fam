# 랑구 택틱스 — 작업 핸드오프 (2026-07-17)

> 게임 진행 · 튜토리얼 · 휴리스틱 AI · 경제 시스템의 현재 상태 + 이어서 할 일.
> 새 대화에서 이 문서만 보고 이어갈 수 있도록 정리. **3개 코드베이스**에 걸침:
> - **`rangu.fam`** (이 repo, Next.js) — API 백엔드(덱/티켓/매치결과/랭크/경제) + OAuth. Cloud Run `rangu-fam`.
> - **`../rangu-tactics-heavy`** (Tauri, git 밖) — 게임 클라이언트(전투 UI). `@rangu/battle-core`(TS 상태복제)·`@rangu/proto-ts`(프로토콜) 사용.
> - **`game/rangu-tactics-server`** (C#, .NET 8) — **권위 게임 루프**. Cloud Run `rangu-tactics-server`. 규칙엔진 = `game/RanguTactics.Engine`(순수 결정론 리듀서 `GameEngine.Apply`).
> - 배포 계정/프로젝트: `doublej.biz01@gmail.com` / `doublej-platform` / `asia-northeast1`.

---

## 🔄 2026-07-17 (세션 3) — 스테일 항목 정리 + 덱 저장 연동 + AI 폴백 + 런처 자동업데이트

**프로덕션 로그로 확인한 스테일 정정** (아래 원문 경고들은 해소됨):
- **경제 마이그레이션 ✅ 실행됨** — 6/25 09:04 `tactics-economy?confirm=1` → 200 (Cloud Run 요청 로그). 직후 `/api/game/economy` 200 = 지갑 하이드레이션 정상. `tactics-decks`(6/22)·`tactics-rankings`(6/23) 테이블도 생성 완료.
- **튜토리얼 E2E ✅ 실플레이됨** — 6/25 09:11(최종 exe 업로드 09:03 직후) `tutorial-{userId}` 매치 접속 → 7라운드+ 인텐트 정상 처리 로그.
- **카드 카탈로그 121종 이미 라이브** — 7/16 rev 00027(야구단 배포)에 워킹트리 WIP가 함께 나가 `/api/game/metadata/export`가 `cardCount:121` 서빙 중이었음. 이번 세션에서 **git 정합화 커밋**(`93e4b59`) 완료. 썸네일 webp 120장도 GCS `card-thumbs/` 업로드돼 있음.

**이번 세션 구현**:
1. **덱 빌더 저장/로드 연동 ✅** (클라 `rangu-tactics-heavy`) — `src/lib/tactics/deckApi.ts` 신규(GET/POST `/api/game/tactics-deck`, nativeFetch 쿠키 인증). `DeckBuilderView` 진입 시 활성 덱 로드, "저장 및 나가기" = 서버 저장(+활성화) 성공 시에만 복귀. 16장 미만 저장 버튼 비활성+안내, 저장 중/완료/실패 상태 표시. **저장 성공 = 다음 판부터 내 덱**(게임서버가 활성 덱 페치, 없으면 DemoDeck).
2. **GhostAi 예외 폴백 ✅** (게임서버) — `GameConnection.DriveGhostAsync`의 `ChooseAction`/`ChooseBlocks` 호출을 try/catch(OperationCanceled 제외)로 격리, 예외 시 경고 로그 + 패스 폴백 → AI 버그가 매치 연결을 못 끊음. 서버 테스트 19/19·엔진 33/33 통과.
3. **런처 자동 업데이트 ✅** (rangu-client-service) — GCS `x-goog-generation`을 버전 마커(`RanguTactics.exe.version`)로 저장, 플레이 시 HEAD(5초 타임아웃) 비교 → 다르면 자동 재다운로드("업데이트 중…" UI). 오프라인/조회 실패 시 기존 버전으로 그대로 실행. 관리 설치본이 없으면 레거시 수동 배치본이 있어도 **최신 다운로드가 정본**(다운로드 실패 시에만 레거시 폴백) → 원문 §6 함정 4(스테일 설치본) 해소.

**이번 세션 배포**:
- 게임서버 **rev 00010**(GhostAi 폴백) — Cloud Build SUCCESS, `/ws/tactics`→400 헬스 정상, 부팅 로그 `[metadata] loaded 121 cards, contentVersion=7f1b71dcd0337538`.
- 게임 클라 exe GCS 갱신(2026-07-17, generation `1784249529069868`) — 덱 저장 UI 포함. 구 런처 사용자는 여전히 스테일 exe 수동 삭제 필요(§5), **새 런처부터는 자동 업데이트**.
- 런처 Setup(NSIS) GCS 갱신 — 자동 업데이트 탑재. 기존 설치 런처는 자가 업데이트가 없으므로 Setup 재설치 1회 필요(이후부터는 게임이 자동 갱신).

**여전히 남은 것**: PvP 1판으로 경제 적립 실검증(30일 로그에 match-result 0건), 스펠 10종(`SP_*`) 카드 아트, UNIV 마스코트 7종 스탯 확정(엑셀 "추후"), exe 코드서명, 튜토리얼 4단계 키워드 퍼즐 캠페인.

---

## 🔄 2026-06-25 (세션 2) — 경제 배포 + 튜토리얼 Phase 2 구현/배포

이 세션에서 §4 경제와 §2 Phase 2 를 **구현·배포**했다(아래 원문 §2/§4/§7 의 "미배포/미착수"는 본 블록이 갱신).

- **경제 배포 ✅** — rangu.fam rev `rangu-fam-00026` 서빙. 커밋 `fcc9323`(경제 8파일) + `5cebe5e`(배포 시 게임 시크릿 보존).
  - ⚠ **남은 1스텝(관리자 액션)**: 브라우저(rangu-fam.com 로그인)에서 `https://rangu-fam.com/api/admin/maintenance/tactics-economy?confirm=1` (4표 생성). 미실행 시 빈 지갑.
  - 안전 리팩터: 매치 경제 지급을 **LP 트랜잭션 밖 best-effort 별도 트랜잭션**으로 분리 → 경제 테이블 부재/버그가 나도 랭크 LP 불변(마이그레이션 전 매치도 안전). `src/app/api/game/match-result/route.ts`.
- **튜토리얼 Phase 2(핵심) ✅** — 커밋 `5f1b370`. 게임서버 rev `rangu-tactics-server-00009`, 클라 exe GCS 갱신(`gs://rangu-tactics-dist/RanguTactics.exe`, 2026-06-25).
  - 결정론: `GameEngine.CreateBattle(shuffle:false)` + `GameState.NoShuffle`(기본값 유지 → PvP/일반 PvE 동작 불변). 멀리건 재셔플도 스킵.
  - 서버: `matchId="tutorial"` sentinel → `tutorial-{userId}` 매핑(proto 변경 0). `TutorialContent`(고정 덱 16장, `demo_*` 메타 재사용으로 렌더 정상) + `DriveTutorialBotAsync`(자동 멀리건 후 **항상 패스** = 공격/블록 안 함, 완전 결정론). 고스트 좌석이라 랭크/경제 미보고.
  - 클라: `PlayFlow` 튜토리얼 시 sentinel matchId 전송. (런처 stale 설치본 3곳 모두 부재 → GCS 자동 페치, 수동 삭제 불필요였음.)
  - **입력 마스킹 ✅**: `BattleBoard`(`guide` prop) — 현재 단계의 지정 영역만 활성, 나머지 흐림+`pointer-events-none`. 단계 판정은 `TutorialOverlay.deriveStep` 와 동일 기준(코칭 문구↔허용 영역 일치). **액션 버튼은 항상 활성=페일세이프**(마스킹 어긋나도 [패스]로 진행). 코칭 오버레이 X가 코칭+마스킹 동시 해제(자유플레이 탈출구). `guide=coach` 를 PlayFlow→MatchSession→Connected→BattleBoard 로 드릴.
  - **연기(명시)**: 4단계 키워드퍼즐 캠페인(오답 롤백). `DriveTutorialBotAsync` 를 라운드별 스크립트 액션 큐로 확장하면 블록/주문 학습 단계 추가 가능(기반 완비).
  - ⚠ **E2E 미검증**: 컴파일/배포/헬스체크(`/ws/tactics`→400, rev 00009)는 ✅ 확인. **실제 튜토리얼 플레이는 런처 재실행→튜토리얼 한 판으로 확인 필요**.

---

## 0. 아키텍처 한눈에

```
[런처 rangu-client-service] --GCS 다운로드--> RanguTactics.exe(게임 클라)
   게임 클라 --로그인 토큰(doublej-token, env 핸드오프)--> rangu.fam API
   게임 클라 --POST /api/game/ticket(쿠키)--> RS256 단명 티켓(aud=rangu-tactics)
   게임 클라 --wss /ws/tactics (티켓 첫 프레임)--> [C# 게임서버] ← 권위 루프
        게임서버 --GET /api/game/jwks--> 티켓 검증
        게임서버 --GET /api/game/deck (X-Game-Server-Secret)--> 유저 덱(없으면 데모)
        게임서버 --POST /api/game/match-result (X-Game-Server-Secret)--> LP + 경제 지급
```

- 권위 = **C# 엔진**(`RanguTactics.Engine`). `GameEngine.Apply(state, actor, action)` = 순수 리듀서(내부 `state.Clone()` 후 적용, 거부 시 원본+`rejected` 이벤트). TS `battle-core`는 **읽기전용 복제**(UI VM).
- 게임서버는 매 인텐트마다 전체 마스킹 스냅샷을 양쪽에 브로드캐스트(V1 동기화).

---

## 1. 게임 진행 (✅ 정상화 완료)

이번 세션에서 "매치 접속은 되나 진행이 안 됨"을 추적해 **3가지 근본 원인**을 잡음:

| 원인 | 수정 | 파일 |
|---|---|---|
| `GAME_SERVER_SECRET` 값에 **trailing 개행** → .NET이 `X-Game-Server-Secret` 헤더 설정을 거부(throw) → 덱 페치·매치결과 통째 실패 | 시크릿을 **개행 없는 값으로 로테이션**(Secret Manager **v2**) + 양 서비스 리비전 갱신. 추가로 `.Trim()` 방어 | `game/rangu-tactics-server/Program.cs:30` |
| **배포된 게임서버가 옛 빌드**(에코/초기 루프) → 인텐트 처리 안 됨 | **현재 소스로 재배포**(rev `00008`) | (배포만) |
| 클라 UI 갭: 공격 선언 → 상대 블록 → **공격자에게 우선권**이 돌아오는 DeclareBlock 윈도우를 처리 안 해 "대기"로 멈춤(패스 불가) → 전투 영원히 안 풀림 | `else if (vm.priorityIsMine)` → **패스 버튼** 추가(우선권 있으면 항상 패스 가능) | `rangu-tactics-heavy/src/components/battle/battle-board.tsx` |

- 진단용 **인텐트 로깅** 추가: `GameConnection.HandleIntentAsync` → `[intent] seat=.. case=.. → OK/REJECTED/UNMAPPABLE (phase/prio/round)`. (고스트 액션은 `DriveGhostAsync`가 `match.ApplyAsync`를 직접 호출 → 이 로그엔 안 남음.)
- ⚠ **`deploy/03-deploy.ps1`의 `--set-secrets`가 전체 교체**라, 거기 없던 `GAME_TICKET_PRIVATE_KEY`·`GAME_SERVER_SECRET`가 OAuth 배포 때 **지워졌었음**. 스크립트에 **두 시크릿 추가 완료**(재발 방지).

---

## 2. 튜토리얼 (Phase 1 ✅ / Phase 2 미착수)

### Phase 1 — 가이드 코칭 오버레이 (완료, 클라 전용)
- `rangu-tactics-heavy/src/components/tactics/TutorialOverlay.tsx` — 전투 스냅샷(`selectBattle`)을 읽어 현재 상황(멀리건/소환/패스/공격/방어/전투해결)에 맞는 한 줄 코칭을 **실시간** 표시. 논블로킹, 닫기 버튼.
- 배선: `PlayFlow`(tutorial prop) ← `App.tsx`(tutorial state) ← `PlayModeView`(`selectedMode === "tutorial"`). "튜토리얼" 모드는 PvE로 접속 + 오버레이.
- ⚠ 현재 튜토리얼 상대 = **휴리스틱 AI 고스트**(PvE라서) → 초보엔 다소 어려움. Phase 2에서 스크립트 상대로 교체 필요.

### Phase 2 — 결정론 스크립트 샌드박스 (미착수, 사용자 풀스펙)
구현 목표(LoR 튜토리얼 아키텍처):
1. **결정론 상태 주입** — 셔플 X, 고정 덱/패/보드(서버: 튜토리얼 매치 모드 + 고정 시드/덱 프리셋).
2. **스크립트 상대(Actor)** — 휴리스틱 AI가 아니라 **명령 큐**(턴별 고정 행동). 패시브/예측가능.
3. **입력 마스킹** — 지정 액션 외 클릭 차단(클라 오버레이 레이어).
4. **기능 토글** — 단계별 룰 on/off(주문마나/챔피언/넥서스 등).
5. **4단계 파이프라인** — 기초전투 → 스택/우선권 → 키워드 퍼즐(오답 롤백) → 풀룰.
- 손댈 곳: C# 엔진(상태 주입/기능 토글), 게임서버(튜토리얼 모드/스크립트 봇), 클라(마스킹/단계 UI).

---

## 3. 휴리스틱 PvE AI (✅ 완료, rev 00008)

- `game/rangu-tactics-server/Game/GhostAi.cs` — 패시브 더미 봇을 대체.
  - `ChooseAction`: 후보수(유닛 소환 / 주문[무타겟·적유닛·적넥서스·내유닛] / 공격 / 패스) 생성 → 각 수를 `GameEngine.Apply(s, g, c)`로 **1-ply 시뮬레이션**(순수라 라이브 불변) → `rejected`면 제외 → **유틸리티 평가** → 최고점 + RNG 노이즈 선택.
  - `Evaluate`: `(내넥서스-적넥서스)*1.5 + 보드가치(power+0.9*health+0.5*keywords) + 핸드차*0.5`, 승/패 ±100000.
  - `ChooseBlocks`: 공격력 큰 공격자부터 **유리한 교환/생존 블로커** 그리디 배정.
- 배선: `GameConnection.DriveGhostAsync`가 패시브 로직 대신 `GhostAi.ChooseAction/ChooseBlocks` 호출. `_ghostRng` 필드. 우선권 핑퐁이 자연히 멀티턴(윈도우당 1수).
- ⚠ **`HandleIntentAsync`에 try/catch 없음** → GhostAi가 예외 던지면 매치 연결이 끊김. (위험 낮음 — Apply는 예외 대신 거부 반환.) **권장: GhostAi 호출을 try/catch로 감싸 예외 시 Pass 폴백.**
- 향후: 난이도 티어(noise 크기), 더 나은 주문 타겟팅, 2-ply 탐색, 반응형 트리거.

---

## 4. 경제 시스템 (✅ 코드 완성 / ❌ 미배포 — 파킹)

재화·상점·퀘스트·배틀패스 풀빌드. **서버 권위 지급**(클라가 보상 못 우김 — `match-result`에서 매치당 1회 멱등 지급).

### 서버 (rangu.fam) — 작성 완료, 미배포·미마이그레이션
| 파일 | 역할 |
|---|---|
| `src/db/schema/tacticsEconomy.ts` | 4표: `tactics_wallets`·`tactics_owned_items`·`tactics_quest_progress`·`tactics_pass_progress` |
| `src/lib/tactics/economyRules.ts` | 카탈로그/규칙 정본: `MATCH_REWARD`(승 30코인/100xp, 패 12/40)·`STORE_ITEMS`(6종)·`QUEST_DEFS`(5종 일일/주간)·`PASS_TIERS`(12티어)·기간키(KST) |
| `src/lib/tactics/economyService.ts` | `grantMatchEconomy`(승패→코인/패스XP/퀘스트), `loadEconomySnapshot`, `addCurrency`, `grantItem`, `getWallet` |
| `src/app/api/game/match-result/route.ts` | **경제 지급 추가**(기존 LP 멱등 트랜잭션 안 `grantMatchEconomy` 호출) |
| `src/app/api/game/economy/route.ts` | `GET` — 지갑+상점(카탈로그+보유)+퀘스트+패스 1회 하이드레이션(쿠키 인증) |
| `src/app/api/game/economy/purchase/route.ts` | `POST {itemId}` — 원자적 차감+보유 지급 |
| `src/app/api/game/economy/claim/route.ts` | `POST {kind:'quest'\|'pass', id}` — 검증 후 보상 지급 |
| `src/app/api/admin/maintenance/tactics-economy/route.ts` | DDL 마이그레이션 라우트(4표 생성) |

### 클라 (rangu-tactics-heavy) — 작성 완료, **이미 라이브 빌드에 포함**
| 파일 | 역할 |
|---|---|
| `src/lib/tactics/economy.ts` | zustand 공유 스토어 + `useEconomy()` + `purchase`/`claim` |
| `src/components/home/top-nav.tsx` | 재화 = 실 지갑 |
| `src/components/home/quests-panel.tsx` | 실 퀘스트 + 수령 |
| `src/components/store/StoreView.tsx` (+ store-data 타입화, featured-banner 삭제) | 실 카탈로그/지갑/보유/구매 |
| `src/components/pass/BattlePassView.tsx` (+ reward-track props화, rewards 타입화) | 실 패스(XP/티어/수령) |
- 클라는 이미 배포돼 있어 **경제 API 호출이 404로 graceful 실패**(지갑 0/빈 목록). 서버 배포+마이그레이션만 하면 즉시 동작(클라 재빌드 불필요).

### 배포 절차 (파킹 해제 시)
1. 경제 서버 코드 **커밋**(택틱스 WIP와 분리 — §6 참고).
2. **rangu.fam 배포**(§5): 택틱스 WIP는 `git stash`로 분리 → 배포 → `pop`.
3. **마이그레이션 1회**: 관리자 로그인 상태로 `GET https://rangu-fam.com/api/admin/maintenance/tactics-economy?confirm=1` (4표 생성).
4. 게임 한 판 → 코인/패스XP/퀘스트 진행 적립 확인.

---

## 5. 배포 플레이북 (정확한 명령)

### rangu.fam (Next.js → Cloud Run)
```powershell
pwsh ./deploy/03-deploy.ps1 -Project doublej-platform
```
- ⚠ **워킹트리를 그대로** Cloud Build로 빌드(git 커밋 기준 아님) → 무관한 WIP는 배포 전 stash.
- env/secrets는 스크립트가 `--set-env-vars`/`--set-secrets`로 **전체 설정**(이제 게임 시크릿 2개 포함).
- 스키마 변경 = `/api/admin/maintenance/<name>?confirm=1`(관리자 인증) 패턴.

### 게임서버 (C# → Cloud Run)
```powershell
gcloud builds submit --config game/cloudbuild.yaml game/ `
  --substitutions=_NEXT_BASE=https://rangu-fam.com --project=doublej-platform
```
- `--max-instances=1`(인메모리 매치메이커/레지스트리). `_NEXT_BASE` = 부팅 시 메타데이터/JWKS/덱 호출 대상.
- 확인: `gcloud run services describe rangu-tactics-server ...`, `/ws/tactics`가 **HTTP 400**(앱 응답=정상). `/healthz`는 Google 404 quirk(무시).

### 게임 클라 (Tauri → GCS)
```powershell
cd ../rangu-tactics-heavy
npm run tauri build   # → src-tauri/target/release/rangu-tactics-heavy.exe (58MB)
gcloud storage cp src-tauri\target\release\rangu-tactics-heavy.exe `
  gs://rangu-tactics-dist/RanguTactics.exe --cache-control="no-cache, max-age=0"
```
- ⚠ **런처에 버전체크 없음** → 새 빌드 받으려면 stale 설치본 **수동 삭제**:
  `%LOCALAPPDATA%\fam.rangu.launcher\RanguTactics.exe`, `../rangu-client-service/src-tauri/RanguTactics.exe`, `../rangu-client-service/RanguTactics.exe`. (런처 legacy_paths가 기존 exe를 우선 실행해서.)

### 카드 썸네일 (덱 그리드 성능 — 원본 1.5MB→12KB webp)
```powershell
node scripts/gen-card-thumbs.mjs   # → ../card-thumbs-build/**
gcloud storage cp -r "..\card-thumbs-build\*" "gs://rangu-tactics-dist/card-thumbs/" --content-type=image/webp
```
(클라 `cardMetaToGameCard`가 `gs://rangu-tactics-dist/card-thumbs/...webp` 사용.)

### 시크릿 (Secret Manager, doublej-platform)
- `GAME_SERVER_SECRET` — **v2(개행 없음)** 게임서버↔rangu.fam 서버간 인증.
- `GAME_TICKET_PRIVATE_KEY` — RS256 PEM(티켓 서명). `OIDC_CLIENT_SECRET` — v5(OAuth).
- ⚠ 시크릿 **항상 개행 없이** 저장(`echo` 금지 — `[IO.File]::WriteAllText(tmp, val)` 후 `gcloud secrets versions add --data-file=tmp`).
- prod 시크릿/서비스 변경은 분류기가 **명시 승인** 요구.

---

## 6. 핵심 함정 (반복해서 물렸던 것)

1. **시크릿 개행** — `echo`로 만든 시크릿의 `\n`이 헤더 설정(.NET)·정확비교를 깨뜨림. 저장은 개행 없이, 읽기는 `.trim()`.
2. **deploy/03 `--set-secrets`=전체 교체** — 스크립트에 없는 시크릿은 매 배포마다 사라짐.
3. **rangu.fam은 워킹트리 배포** — 무관한 WIP(현재 `src/lib/tactics/cardDefsSeed.ts`, `deckService.ts`, `metadata.ts`, `deck/route.ts`, public xlsx 등)는 stash로 분리.
4. **런처 버전체크 없음** — 재다운로드하려면 stale 설치본 삭제 필수.
5. **배포 ≠ 소스** — 게임서버·클라 모두 옛 빌드가 떠 있을 수 있음. 소스 고친 뒤 반드시 재배포/재다운로드.
6. OAuth 코드(`/auth/desktop/*`)는 **prod 배포됨 + 커밋됨**(commit 2157464). 경제 코드는 **미커밋·미배포**.

---

## 7. 현재 라이브 상태 요약

| 영역 | 코드 | 배포 |
|---|---|---|
| 게임 진행(루프/전투) | ✅ | ✅ (서버 rev 00008, 클라 GCS 최신) |
| 튜토리얼 Phase 1(코칭) | ✅ | ✅ (클라 GCS) |
| 휴리스틱 AI | ✅ | ✅ (서버 rev 00008) |
| 경제(재화/상점/퀘/패스) | ✅ | ❌ **미배포·미마이그레이션** (클라 UI는 라이브, API 404 graceful) |
| 데스크톱 OAuth 로그인 | ✅ | ✅ (커밋 2157464) |

---

## 8. 다음 할 일 (우선순위 제안)

1. **경제 배포** — 커밋 → rangu.fam 배포(WIP stash) → 마이그레이션 `?confirm=1` → 매치 적립 확인. (가장 빨리 가치, §4)
2. **AI 안전 폴백** — `GhostAi` 호출 try/catch(예외 시 Pass) — 매치 끊김 방지. (작음, §3)
3. **튜토리얼 Phase 2** — 결정론 덱 + 스크립트 상대 + 입력 마스킹 + 기능토글 + 4단계. (대형, §2)
4. **덱 빌더 저장 → `tactics_decks`** — 현재 저장된 덱이 없어 PvE가 데모 덱으로 시작됨. 덱빌더의 저장을 서버에 반영하면 내 덱으로 플레이.
5. **런처 버전체크** — 게임 자동 갱신(재다운로드 삽질 제거).
6. exe 코드서명(SmartScreen 경고 제거).

---

## 9. 관련 메모리/문서
- 메모리: `feature_rangu_tactics_engine`, `feature_rangu_tactics_heavy`, `feature_rangu_launcher`, `feature_native_oauth_login`, `feature_card_game_defs`.
- 아키텍처: `docs/rangu-universe-architecture.md`, 게임서버 README `game/rangu-tactics-server/README.md`.
