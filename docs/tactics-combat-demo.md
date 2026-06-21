# 랑구 택틱스 — 라이브 전투 데모 (VFX 점화)

멀티라운드 전투(멀리건 → 소환 → 공격 → **블록 → 피격 수치 → 사망**)를 브라우저에서 자동 반복 발생시켜
VFX 에셋·타격감(Hit-stop, Camera Shake)을 얹고 튜닝하기 위한 오케스트레이션 가이드.

## 무엇이 바뀌었나 (이 데모를 가능케 한 변경)

| 변경 | 파일 | 이유 |
|---|---|---|
| **스파링 고스트** | `game/rangu-tactics-server/Net/GameConnection.cs` | 기존 PvE 고스트는 멀리건+패스만 → 보드가 비어 인간 공격이 **넥서스 직격**만 발생(블록·사망 불가). 고스트가 **블로커 1기를 유지하며 블록**하도록 최소 봇으로 업그레이드 → 유닛 전투·사망 발생 |
| **오토파일럿** | `src/lib/tactics/useAutoPilot.ts` | `?auto=1` 로 인간 좌석을 자동 운전(멀리건→소환→R3+ 공격 반복). VFX를 손 안 대고 반복 관람·튜닝 |
| 메타데이터 URL | `game/rangu-tactics-server/appsettings.json` | `/api/game/metadata/export`(DB) → `/api/game/metadata/demo`(정적, DB 불필요) |

> **공격권 규칙상 인간의 최단 공격은 라운드 3**입니다. (공격권은 홀수 라운드=P1, R1 소환 유닛은 R1엔 소환멀미 → R3에 첫 공격.) "멀티라운드"는 엔진 규칙상 필연입니다.

---

## 1. 부팅 (터미널 2개)

```powershell
# ── 터미널 A: Next.js (포트 3000 고정 — 서버가 localhost:3000 의 JWKS/메타데이터를 봄) ──
npm run dev
```

```powershell
# ── 터미널 B: .NET 게임 서버 (포트 5080) ──
dotnet run --project game/rangu-tactics-server
```

서버 정상 부팅 로그:
```
[metadata] loaded 4 cards, contentVersion=demo-live-20260622
[boot] rangu-tactics game server → ws://localhost:5080/ws/tactics
```

헬스체크:
```powershell
Invoke-RestMethod http://localhost:5080/healthz
# ok=true, contentVersion=demo-live-20260622, cards=4, matches=0
```

## 2. 티켓 발급 (로그인 후 브라우저 콘솔)

`http://localhost:3000` 에서 **로그인** → F12 콘솔:

```js
const d = await (await fetch('/api/game/ticket', {
  method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}',
})).json()
copy(d.ticket)            // 클립보드로 복사 (또는 console.log(d.ticket))
console.log('expires_in', d.expires_in)
```

> 티켓 수명은 **60초**입니다. 발급 즉시 아래 URL에 붙여 이동하세요(WS 연결 시점에만 검증 → 연결 후엔 만료 무관).

## 3. 오토파일럿으로 전투 관람

```
http://localhost:3000/play/vfx-demo?ticket=<붙여넣기>&auto=1
```

- `matchId`(`vfx-demo`)는 아무 값이나 가능 — 해당 유저의 PvE 매치가 새로 생성됩니다.
- 우상단 **🤖 AUTO** 배지 = 오토파일럿 동작 중.
- **관전 포인트** (약 ~15초 후 R3부터):
  1. 내 유닛 소환(R1~R2) → 라운드 자동 진행
  2. **R3 공격 선언** → 서버 스파링 고스트가 **블록**
  3. `DamageDealt`/`UnitDied` 이벤트 → `combatFx` 큐 → **FloatingNumbers 점화**(슬롯 위 −N)
  4. 스냅샷 갱신 → 죽은 유닛 소멸 ("피격 수치 → 사망"의 자연스러운 순서)
  5. 이후 2라운드마다 전투 반복(넥서스 0 도달 시 게임 종료)

## 4. VFX·타격감 (구현됨)

연출은 **`combatFx` 큐**(`packages/battle-core` `battleStore`)에서 흘러나와 `useCombatFx`(`src/lib/tactics/`)가
좌표를 부여하고 framer-motion 으로 렌더됩니다. 에셋은 `public/assets/fx/`.

| 신호 | 구현 | 연출 |
|---|---|---|
| `kind:'damage'` (유닛 피격) | `FxSlot`(play 페이지) `animate` + `CombatFxOverlay` | **히트스톱**(0.1s scale 홀드)+쉐이크 / 슬래시 스프라이트(`fx_combat_fire_slash`) / −N 수치 |
| `kind:'death'` (사망) | `<AnimatePresence>` `exit` + 먼지 스프라이트 | 스냅샷 제거 **전** 0.3s 페이드+blur / 먼지(`fx_combat_unit_death`) |
| `kind:'nexus'` (넥서스 피해) | `useAnimation` `camera` 컨트롤 | **카메라 쉐이크**(±8px) / 임팩트(`fx_combat_water_strike`) / −N 수치 |

> **렌더 순서**(이벤트 선행 프레임 → 스냅샷)가 death 페이드의 핵심: death 이벤트가 스냅샷보다 먼저 와
> 유닛이 **아직 DOM 에 있을 때** 먼지 위치를 잡고, 직후 스냅샷이 유닛을 보드에서 빼면 `AnimatePresence`가
> 0.3s 페이드아웃을 재생한 뒤 언마운트. (`packages/ui` 는 순수 유지 — 애니메이션은 전부 앱 레이어.)
>
> 타이밍 조절: `useCombatFx.ts` 의 `HIT_MS`/`DEATH_MS` 등 상수, `FxSlot` 의 `transition.duration`.

`FloatingNumbersLayer`가 `combatFx`를 드레인하며 `data-instance-id`/`data-nexus-seat`로 DOM 좌표를 찾아 띄웁니다.
화면 흔들림 같은 전역 연출은 이 드레인 지점에서 `kind`별로 트리거하면 됩니다.

## 5. 손수 운전 (오토파일럿 없이)

`&auto=1` 을 빼면 수동 조작:
- **멀리건: 전부 킵** → (R1~R2) 손패 카드 클릭 = 소환 → **패스** 반복
- **R3**: 내 유닛 클릭으로 공격 선택 → **공격 선언** → (고스트가 자동 블록) → **패스**로 전투 해결

> 튜닝 팁: 진행 속도는 `useAutoPilot(auto, stepMs)` 의 `stepMs`(기본 1100ms). 더 느린 슬로모 관람은 페이지에서 값을 올리세요.

## 6. 검증 근거 (헤드리스)

- 서버 18/18 — 신규 `SparringGhost_BlocksHumanAttack_EmitsDamageAndDeath`: 스파링 고스트+인간 오토파일럿을
  핑퐁 구동해 `unitDamaged`/`unitDied` 발생을 **결정론 검증**(글래스 덱 → 상호 전사 보장).
- 엔진 31/31 — `RealCombat_…` 체인 테스트가 실제 전투의 `unitDamaged` emit을 증명.
