# 랑구 택틱스 — 클라-서버 통신 계약 (Protobuf v1)

> Unity(Dumb Client) ↔ .NET 8(Authoritative Server) 간 **WSS 메시지 계약**.
> 설계 근거: [docs/rangu-universe-architecture.md](../../docs/rangu-universe-architecture.md) Q4.
> 이 디렉터리가 클라·서버 두 팀의 **단일 진실 공급원(API First)** 이다. 스키마 확정 후 양 팀 병렬 개발.

## 파일 구조 (`package rangu.tactics.v1`)

| 파일 | 역할 |
|---|---|
| `common.proto` | 공용: `PlayerRef`, `Target`, `Zone`, `Keyword` |
| `card.proto` | `CardView`(마스킹 단위), `RevealedCard` / `HiddenCard`, `CardModifier` |
| `state.proto` | `GameStateSnapshot`(재접속 기준점), `PlayerState`, `StackItem`, `CombatState`, `GamePhase` |
| `intent.proto` | **클라 → 서버** 요청: `Intent` + 카드 사용/패스/공격·방어 선언/타겟 선택/항복 |
| `event.proto` | **서버 → 클라** 사실: `Event` + 스택 처리/피해 판정/턴 종료/거부 등 |
| `service.proto` | 전송 봉투: `ClientMessage` / `ServerMessage`, 연결·핸드셰이크·하트비트 |

## 세 가지 설계 기둥 (요구사항 직결)

1. **Intent ↔ Event 분리 (권위 서버 / Dumb Client)**
   - 클라는 `Intent`(요청)만 보낸다. 결과는 **단정하지 않는다**.
   - 서버가 검증·판정 후 `Event`(사실)를 되돌린다. 모든 상태 변화는 Event 로만 일어난다.
   - `client_intent_id` 로 ACK(`IntentAckEvent`)/거부(`IntentRejectedEvent`)를 매칭 → 낙관적 UI 의 확정/롤백.

2. **정보 마스킹 (숨김 정보)**
   - 마스킹 단위는 `CardView.visibility` oneof: 공개=`RevealedCard`, 비공개=`HiddenCard`.
   - 서버는 **수신자별로 다르게 직렬화**한다. 상대 손패/덱은 `HiddenCard`(존재만), 본인 손패는 `RevealedCard`.
   - 같은 논리적 이벤트(예: 카드 뽑기)도 소유자에겐 revealed, 상대에겐 hidden 으로 나간다 (`CardDrawnEvent` 주석 참고).
   - 클라는 절대 숨김 정보를 받지 못하므로 **메모리핵으로 상대 패를 볼 수 없다**.

3. **시퀀싱 + 재접속 스냅샷 (상태 복구)**
   - 모든 `Event` 에 매치 전역 단조 증가 `sequence_number`. 클라는 순서대로 적용.
   - 재접속: `ConnectRequest.last_known_sequence` 전송 → 서버가 `ConnectAccepted` 에 **현재 `GameStateSnapshot`** 동봉.
   - 클라는 스냅샷으로 상태를 **재구성**하고, `snapshot.sequence_number` 이후 Event 만 이어서 적용.
   - 세션 중 누락 의심 시 `ResyncRequest` → 서버가 스냅샷으로 응답.
   - (운영) 서버가 Event 로그를 Cloud SQL 에 적재하면 인스턴스 재시작에도 복구 가능.

## 코드 생성 (구현 완료)

생성은 **공유 라이브러리 1곳** `RanguTactics.Proto.csproj` 에서만 일어난다 → DTO 드리프트/중복 코드젠 없음.
네임스페이스 `Rangu.Tactics.Proto.V1` (`option csharp_namespace`).

### .NET (서버 + 스모크 클라이언트)
`RanguTactics.Proto.csproj` 가 `Grpc.Tools` 로 빌드 시 자동 생성. 서버/클라는 ProjectReference 로 공유:
```xml
<ProjectReference Include="..\proto\RanguTactics.Proto.csproj" />
```
```bash
dotnet build game/rangu-tactics-server/RanguTactics.Server.csproj   # proto 포함 빌드
```

### Unity 클라이언트
번들 protoc(Grpc.Tools)로 `.cs` emit — **별도 protoc 설치 불필요**:
```bash
pwsh game/proto/gen-csharp.ps1
# → game/proto/gen/csharp/*.cs 를 Assets/Scripts/Generated/Proto 로 복사 + Google.Protobuf 런타임 추가
```
(직접 호출: `protoc -I game/proto --csharp_out <UnityAssets> game/proto/rangu/tactics/v1/*.proto`)

### CI 권장
`buf lint` / `buf breaking` 으로 스키마 하위호환 깨짐 자동 검출.

## 버전·호환 규칙
- 패키지는 `rangu.tactics.v1`. **파괴적 변경은 `v2` 신설** (필드 의미 변경/삭제 금지).
- **필드 번호 재사용 금지.** 폐기 시 `reserved` 처리.
- 새 기능은 새 필드/새 oneof 분기 추가로(하위호환). `buf breaking` 으로 CI 검증.
