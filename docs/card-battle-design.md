# 랑구 배틀 (RANGU BATTLE) — 설계서

> 레전드 오브 룬테라(LoR) 스타일 **풀 반응형** 카드 배틀.
> 작성 기준: 2026-06. 구현 진행형 문서 — 코드와 함께 갱신.
> 관련 코드: `src/lib/battle/*` (엔진), `src/db/schema/cardBattle.ts` (테이블).

---

## 0. 컨셉 한 줄

> **"누가 더 오버하는지 겨루는, 공격 토큰 교대 + 반응형 주문의 카드 배틀."**

벤치마크는 **레전드 오브 룬테라**. LoR은 *게임성은 극찬 / 상업적으론 고전*한 게임인데,
랑구팸은 **돈 벌 필요가 없는 친구 사이트**라 LoR의 약점(수익화)은 무시하고 강점(깊은 게임성)만 흡수한다.

## 1. 설계 원칙

1. **비파괴(Non-destructive)** — 배틀로 카드를 잃지 않는다(카드 강탈은 기존 heist 담당). 점수·재화만.
2. **서버 권위 + 결정론** — 판정은 서버에서만, seed 기반 RNG. 같은 (덱·seed·액션열) → 같은 결과 → 리플레이/검증/치트 방지.
3. **비동기 우선** — 상대 오프라인이어도 고스트/타이머로 성립. 실시간(Firestore)은 라이브 듀얼용 옵션.
4. **기존 데이터 재사용** — 카드 메타(member/type/rarity)와 도감 세트를 그대로 전투에 끌어온다. 카드 테이블 스키마 변경 없음.

---

## 2. 카드 → 배틀 유닛 (LoR 스케일)

파워/체력은 한 자리 정수, 본진(넥서스)은 20. 모든 값은 **기존 카드 메타 + 오버률**에서 계산한다. → `src/lib/battle/stats.ts`

### 2.1 오버률(텐션 지수) — `src/lib/battle/overRate.ts`

전투 파워의 핵심 변수이자 카드 상세에 표시할 재미 스탯. DB 컬럼 없이 결정론적으로 산출:

```
오버률 = clamp( 멤버기준선 + 시리즈/타입보정 + cardId해시지터(±5), 5, 100 )
```
- **멤버 기준선**: 재원 88 · 민석 78 · 진규 70 · 승찬 58 · 한울 42 (그 외 60)
- **보정**: prestige +30 · signature/SIG +8 · 야구(KIA/LG) +14 · RANGGU +10 · NG +6 · OL −25 · PF −18 · SC −8 · BACKNUM −3
- **OVERRIDES**: 특정 카드 핀포인트 (prestige_jaewon 100, SIG_JAE_25 99 등)

### 2.2 멤버 = 진영 아키타입

| 진영(멤버) | 역할 | 기본 P/H | 시그니처 키워드 |
|---|---|---|---|
| 정재원 🔥 | 어태커(글래스캐논) | 4 / 2 | 일격(overwhelm) |
| 강한울 🌿 | 탱커 | 1 / 5 | 끈질김(tough) |
| 정민석 ⭐ | 서포터 | 3 / 4 | 흡혈(lifesteal) |
| 이승찬 🌊 | 후반 캐리 | 3 / 4 | 잠행(elusive) |
| 정진규 🎐 | 트릭스터 | 3 / 3 | 속공(quickAttack) |

> 채팅에서 한울을 "도발"로 안내했지만, 구현 가능성을 위해 **한울 시그니처는 끈질김(tough)+높은 체력**으로 확정.
> "도발(challenger)"은 별도 키워드로 남겨 특정 카드(야구·이벤트 등)에 부여 가능.

### 2.3 스탯 공식

```
power  = clamp( round( (기본파워 + 오버보정) × 스케일 ), 0, 12 )
health = clamp( round( 기본체력 × 스케일 ), 1, 12 )
오버보정 = round( (오버률 - 60) / 18 )           # 대략 -3 ~ +2
스케일   = prestige 3.0 / signature 1.6 / legendary 2.2 / epic 1.8 / rare·special 1.3 / basic 1.0
코스트   = prestige 5 / signature 3 / legendary 4 / epic 3 / rare·special 2 / basic 1
```
예: SIG_JAE_25(오버99, signature) → P10/H3 (유리몸 폭딜), OL_HAN_V1(오버33, basic) → P0/H5 (벽).
야구 카드(KIA/LG)는 "직관 풀스윙" → 일격(overwhelm) 추가.

---

## 3. 진영 & 덱빌딩

- **덱 = 진영 2명**(LoR의 2-region). 예) 재원+승찬 = 도감 *"시간을 넘어서"* 아키타입.
- 카드 풀 = 그 두 멤버의 카드 + 중립(랑구/그룹/조커).
- **가상 카피**: 카드를 1장이라도 **보유 = 덱에 쓸 자격 해금**. 실제 카드는 소모 안 함(비파괴). 카드당 최대 3장, 챔피언 최대 2장.
- 덱 크기: 권장 **20~30장** (친구 그룹 컬렉션 규모 고려, 운영하며 조정).

## 4. 챔피언 = 프레스티지 카드 (각성)

| 챔피언 | 각성 조건 | 각성 효과 | 구현 |
|---|---|---|---|
| prestige_jaewon 🔥 | 누적 본진 피해 10+ | Power+3, 일격 | ✅ |
| prestige_seungchan 🌊 | 라운드 6 도달 | Power 2배 + 잠행 | ✅ |
| prestige_hanul 🌿 | 아군 블록 6회 | 광역 도발 + 피해 경감 | ⬜ TODO |
| prestige_minseok ⭐ | 본진 8 회복 | 아군 전체 흡혈 | ⬜ TODO |
| prestige_jinkyu 🎐 | 주문 4회 시전 | 주문 시전 시 적 침묵 | ⬜ TODO |
| prestige_group_special 👑 | 5인 전원 편성시만 | 게임당 1회 "우주 대오버" | ⬜ TODO |

---

## 5. 풀 반응형 전투 흐름

### 5.1 라운드

```
beginRound: 마나 적립(미사용분 ≤3 → 스펠마나) + 충전(maxMana=min(10,라운드)) → 드로우 1
            → phase 'action', 우선권 = 공격토큰 보유자 (라운드 홀수 p1 / 짝수 p2)
action:     우선권 핑퐁. 유닛/주문 플레이 또는 공격 선언. 양쪽 연속 패스(스택 빔) → 라운드 종료
```

### 5.2 우선권 / 스택 (반응형 핵심)

- 행동(유닛·주문)을 하면 **우선권이 상대로 넘어간다**(대응 윈도우).
- **즉발(Burst)**: 우선권 안 넘기고 즉시 해결. **순간(Fast)**: 스택에 올리고 우선권 양보. **지연(Slow)**: 스택 빈 액션 단계에서만.
- 양쪽이 **연속 패스**하면: 스택이 있으면 **LIFO로 전부 해결**, 없으면 라운드 종료.

### 5.3 공격 → 블록 → 전투

```
declareAttack (토큰 보유자): 공격 유닛 선언 (도발 유닛은 끌어낼 적 지정 가능)
  → phase 'declareBlock', 우선권 = 수비자
declareBlock (수비자): 블록 배정 (또는 패스 = 노블록)
  → 전투 반응 윈도우(양쪽 Fast 주문) → 양쪽 패스 → 전투 해결
전투 해결: 동시 타격(속공은 선타) / 일격 관통 / 흡혈 회복 → 사망 정리 → 승패 판정 → phase 'action'
```

승패: 본진 ≤ 0. 동시 0 = 무승부.

---

## 6. 키워드 카탈로그 (구현됨)

| 키워드 | 효과 |
|---|---|
| 일격 overwhelm | 막은 유닛을 죽이고 남은 피해 본진 관통 |
| 잠행 elusive | 잠행 유닛으로만 블록 가능 |
| 속공 quickAttack | 전투 시 먼저 타격(상대 먼저 죽으면 반격 안 받음) |
| 흡혈 lifesteal | 가한 피해만큼 본진 회복 |
| 끈질김 tough | 받는 피해 −1 |
| 보호막 barrier | 다음 피해 1회 무효(전투 후 소멸) |
| 위압 fearsome | 파워 3 이상으로만 블록 가능 |
| 도발 challenger | 공격 시 막을 적 1기 지정해 끌어냄 |
| 재생 regeneration | 라운드 종료 시 체력 전부 회복 |

## 7. 주문 시스템

- 사진 유닛카드와 **별개의 가벼운 주문 카드 클래스**(`BattleCard.kind === 'spell'`). 타입/엔진은 이미 지원.
- **주문 카탈로그는 Phase 2 콘텐츠 작업** — 현재 보유 카드는 전부 유닛으로 빌드됨. 인사이드 조크/그룹 카드로 확장.
- 예) 재원 *풀악셀*(지연, 팀 P+2) · 한울 *무념무상*(순간, 피해 1회 무효) · 진규 *예측불가*(즉발, 적 −1 P).

---

## 8. 보상 & 경제 (악용 방지)

- 승리 → **배틀 포인트(BP)** + ELO 레이팅. **카드는 안 걸림**.
- BP 상점에서 **기존 `user_perks`의 `bonus_drops`(뽑기권)/`craft_protections`(보호권)** 교환 — 새 재화 안 만듦.
- **일일 보상 캡**(`dailyRewardedWins`) — 친구끼리 짜고 파밍 차단.
- **담합 탐지** — 동일 IP/반복 일방승 로깅 → BP 무효(기존 dupe-accounts 인프라 활용).
- 시즌 종료 → 상위 랭커 칭호/한정 보상.

## 9. 기술 / 인프라

| 레이어 | 저장소 | 비용 |
|---|---|---|
| 영구(전적·레이팅·BP·덱) | 기존 Cloud SQL | 증분 ≈ ₩0 |
| 휘발성 매치 상태 | Phase 1~2: Postgres `card_battles.state`(폴링) / Phase 3: Firestore | 무료등급 |
| 판정 | Cloud Run API + `src/lib/battle` 결정론 엔진 | 무료등급 |
| 실시간 | Firestore onSnapshot (fan-out 위임, 자체 WS·Redis 안 씀) | 무료등급 |

Cloud Run **min-instances=0 유지**. 비용 결론: 무료~무료등급 내. *진짜 비용은 돈이 아니라 엔진 복잡도.*

## 10. 데이터 모델 — `src/db/schema/cardBattle.ts`

- `card_battle_decks` — 저장된 덱(진영 2 + cards[{cardId,count}])
- `card_battles` — 전투(상태머신 state jsonb, seed, 덱 스냅샷, 승자)
- `card_battle_stats` — 유저별 시즌 전적/ELO/BP (unique: user+season)
- `card_battle_log` — 전투 로그/리플레이(rounds jsonb)

> ⚠️ 배포 전 필요: `npx drizzle-kit generate` → 마이그레이션 적용. 운영에선 시드/시즌 초기화용
> maintenance 라우트(`/api/admin/maintenance/battle-init?confirm=1`, 예정)로 부트스트랩.

## 11. 엔진 아키텍처 — `src/lib/battle/`

| 파일 | 역할 |
|---|---|
| `types.ts` | GameState/Unit/Spell/Action 타입 (스키마 jsonb가 참조) |
| `rng.ts` | 결정론 RNG(mulberry32) + seed 셔플 |
| `overRate.ts` | 오버률 산출 |
| `stats.ts` | 카드 → 유닛 스탯 변환 |
| `engine.ts` | `createBattle` / `applyAction`(리듀서) / 스택·전투·챔피언 해결 |

**구현 완료**: 셋업/멀리건, 마나 곡선+스펠마나 적립, 우선권/패스/스택, 전투(일격/잠행/속공/흡혈/끈질김/보호막/위압/도발), 챔피언 각성(재원·승찬).
**TODO**: 주문 카탈로그, 나머지 챔피언 조건(한울·민석·진규·단체), AI(고스트/PvE).

### 11.1 엔진 하드닝 (v0.2.1 — 적대적 버그 헌트 18건 → 수정)

다차원 적대적 리뷰로 발견·검증한 결함을 수정. `scripts/battle-sim.ts`에 회귀 시나리오로 고정.

- **결정론(critical)**: 멀리건/셔플을 **플레이어별 독립 RNG 스트림**(`seed:p1`/`seed:p2`)으로 분리 → 제출 순서·상대 행동과 무관하게 동일 결과.
- **종료 보장(high)**: 덱 소진 시 **누적 피로 피해**, 그리고 엔진 자체 **`MAX_ROUNDS=50` 하드 캡**(도달 시 잔여 본진으로 판정). (이전엔 시뮬 캡에만 의존 → 운영 경로 무한게임 위험.)
- **전투 정밀화**: 일격 스필 = `실제 가한 피해 − 블로커 체력`(끈질김 경감 반영); 전투 전 블로커 사망 시 일격은 전부 관통; **기절/부적격 블로커는 전투 해결 시 재검증**(미차단 처리); 흡혈은 흡수된 피해만큼만 회복(오버킬 제외).
- **챔피언 진행도**: 본진 피해를 **가한 유닛 본인**에게만 누적(보드 전체 X), 오버킬 제외.
- **버프**: 체력 버프 실제 적용(`baseMaxHealth` 도입, 피해 delta 보존); duration은 **본인 턴 기준** 진행(off-by-one 제거).
- **규칙/하드닝**: 토큰 보유자 **공격 라운드당 1회**; 멀리건 단계 `pass` 거부; 거부된 액션은 **원본 state 그대로 반환**(부분변경 누수 방지); **핸드 상한 10**(초과분 소각).
- **Phase 2 재검토(잠재·현재 무해)**: 버스트 주문 연쇄 스톨 — 현재 핸드 상한으로 자연히 bound, 주문 카탈로그 도입 시 우선권 모델 정밀화. 승찬 각성은 "라운드 6 이상" 의미로 확정.

### 11.2 API 레이어 + 하드닝 (적대적 리뷰 23건 → 수정)

서비스/라우트 — `src/lib/battle/{service,bot,redact,apiHelpers}.ts`, `src/app/api/cards/battle/**`.

| 엔드포인트 | 역할 |
|---|---|
| `POST /api/cards/battle` | 전투 생성 (mode pve/pvp, deck) |
| `GET /api/cards/battle` | 내 전투 목록 |
| `GET /api/cards/battle/[id]` | 상태 폴링 (요청자 시점 안개) |
| `POST /api/cards/battle/[id]/action` | 액션 제출(멀리건/유닛/주문/공격/블록/패스) |
| `GET·POST /api/cards/battle/decks` | 덱 목록/저장 |

API 리뷰로 잡은 결함 수정(`scripts/battle-sim.ts`에 순수 함수 회귀 고정):

- **동시성(high)**: `applyUserAction`을 **트랜잭션 + `FOR UPDATE` 행 잠금**으로 직렬화, 잠금 후 상태 재확인, **정산을 같은 트랜잭션에서** 수행 → lost update·이중 정산·종료 후 재오픈 방지. `card_battle_log(battle_id,user_id)` **유니크**로 멱등.
- **권한(high)**: `saveDeck`가 PK 충돌 upsert로 **남의 덱을 덮어쓰는 IDOR** → 본인 소유(`id`+`userId`) 행만 수정, 생성은 서버 발급 id.
- **안개(med)**: 소각 카드 식별자가 로그/무덤으로 누출 → **server-only `burned`** 더미로 분리(로그에 cardId 미기록), `redact.ts`가 상대 손패/덱/소각 + **RNG/seed**까지 가림.
- **밸런스/검증**: `MAX_COPIES`는 cardId 합산(분할 우회 차단); 활성 덱 **유저당 1개 부분 유니크**; 비참가자에겐 **404로 존재 숨김**; 액션 페이로드 정규화(잘못된 입력 → 500 대신 400); NPC 덱 챔피언 데이터 구동 + 폴백; PvP 상대 멤버 검증 + 상대 카드 식별자 비노출.
- **유지(설계상)**: 카드 1장 보유=가상 3장(비파괴); maintenance `detail` 응답은 admin 전용+레포 관례.

## 12. 로드맵 — (가) 풀 반응형 확정

| 단계 | 범위 |
|---|---|
| **Phase 1 (진행 중)** | 엔진 코어 ✅ → 결정론 시뮬 테스트 → 덱 빌더 + 전투 API + battle-init 라우트 → 비동기 1:1 |
| **Phase 2** | 주문 카탈로그 + 나머지 챔피언 각성 + BP 상점(user_perks) + ELO 랭크/시즌 |
| **Phase 3** | Firestore 라이브 듀얼 + 리플레이 뷰어 + PvE 보스 + 생일 이벤트전 |

## 13. 다음 작업

1. ✅ `scripts/battle-sim.ts` — 엔진 결정론/규칙 검증 시뮬 + 회귀 (하드닝 §11.1)
2. ✅ 전투 API + 서비스 + 덱 CRUD + 적대적 리뷰 23건 수정 (§11.2)
3. ✅ maintenance `battle-init` 라우트 (`CREATE TABLE IF NOT EXISTS` ×4 — 레포는 drizzle generate 대신 이 패턴)
4. ✅ 배틀 UI — `/cards` "배틀" 탭 (`src/components/cards/battle/*`). **클라이언트에서 엔진 직접 구동하는 연습(PvE) 모드** — DB/계정 불필요, 즉시 반응. 멀리건·소환·주문(타겟팅)·공격·블록·전투·승패 전부 동작. 프리뷰 라이브 검증 완료(데스크톱+모바일).
5. ✅ 엔진 업그레이드 — `CardDef.spell` + `buildBattleCards` 주문 분기 → 반응형 스택이 실제 플레이에 들어옴. 프리셋 덱에 멤버별 주문(풀악셀/무념무상/예측불가/쇼미더머니/파도타기) 포함. `BattleCard/BattleUnit`에 `member`(표시색).
6. ⏭️ **배포**: `/api/admin/maintenance/battle-init?confirm=1` 1회 실행 → 표 생성 (서버 영속/랭크/PvP용)
7. ⏭️ 컬렉션 기반 덱 빌더(보유 카드) + 서버 연동 랭크/PvP + PvP 턴 알림
