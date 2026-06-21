# 랑구 택틱스 게임서버 (.NET 8, Authoritative)

> 설계: [docs/rangu-universe-architecture.md](../../docs/rangu-universe-architecture.md) Q4 · 통신 계약: [game/proto](../proto/README.md)

## 인증 seam (2순위)

```
Tauri 셸 ──OIDC access_token──► rangu.fam /api/session/exchange  → 웹뷰 쿠키(doublej-token/wiki-token)
Tauri 셸 ──(쿠키 or Bearer)───► rangu.fam /api/game/ticket       → RS256 단명 JWT(aud=rangu-tactics, exp=60s)
Tauri 셸 ──127.0.0.1 루프백────► Unity (1회용 티켓 전달)
Unity ──ConnectRequest.game_ticket──► .NET 게임서버
.NET ──GET /api/game/jwks(캐시)──► rangu.fam → 서명/iss/aud/exp 검증 → 매치 입장
```

티켓 서명/JWKS 권한은 **rangu.fam** 이 보유(`auth.doublej.app` 아님). 근거: 세션·매치 권한이 rangu.fam 에 있고 IdP token-exchange 의존을 피함. 자세한 이유는 아키텍처 문서 Q4-인증.

## 검증 핵심: `Auth/GameTicketValidator.cs`

stateless 검증(서명·iss·aud·exp) + 선택적 jti 재사용 방지. JWKS 는 메모리 캐시·주기 갱신.

### 필요 NuGet
```
dotnet add package System.IdentityModel.Tokens.Jwt
dotnet add package Microsoft.IdentityModel.Tokens
dotnet add package Microsoft.Extensions.Caching.Memory
```

### DI 등록 (Program.cs)
```csharp
builder.Services.AddMemoryCache();
builder.Services.AddHttpClient();
builder.Services.AddSingleton(new GameTicketOptions
{
    JwksUrl  = builder.Configuration["GameTicket:JwksUrl"]  ?? "https://rangu.fam/api/game/jwks",
    Issuer   = builder.Configuration["GameTicket:Issuer"]   ?? "https://rangu.fam",
    Audience = builder.Configuration["GameTicket:Audience"] ?? "rangu-tactics",
});
builder.Services.AddSingleton<GameTicketValidator>();
```

### WS 연결 핸들러에서 사용 (service.proto 의 ConnectRequest 처리)
```csharp
// 첫 프레임은 반드시 connect.
var first = await ReceiveClientMessageAsync(socket, ct);
if (first.MsgCase != ClientMessage.MsgOneofCase.Connect)
{
    await SendRejectAsync(socket, ConnectRejected.Types.Reason.Unspecified, "expected_connect");
    return;
}
var conn = first.Connect;

GameTicketPrincipal principal;
try
{
    principal = await _ticketValidator.ValidateAsync(conn.GameTicket, ct);
}
catch (GameTicketValidationException ex)
{
    await SendRejectAsync(socket, ConnectRejected.Types.Reason.InvalidTicket, ex.Reason);
    return;
}

// 매치 ↔ user 매핑은 권위 서버가 보유(매칭 단계에서 등록).
var match = _matchRegistry.Find(conn.MatchId);
if (match is null)
{
    await SendRejectAsync(socket, ConnectRejected.Types.Reason.MatchNotFound, conn.MatchId);
    return;
}
if (!match.HasParticipant(principal.UserId))
{
    await SendRejectAsync(socket, ConnectRejected.Types.Reason.NotAParticipant, principal.UserId);
    return;
}

// 입장 허가 → 현재 스냅샷 동봉(★ 수신자 관점으로 상대 손패 마스킹).
await SendAsync(socket, new ServerMessage
{
    ConnectAccepted = new ConnectAccepted
    {
        You = new PlayerRef { UserId = principal.UserId, Seat = match.SeatOf(principal.UserId) },
        Snapshot = match.BuildSnapshotFor(principal.UserId),
    },
});
```

## 키 생성 / env

### rangu.fam (Next.js) — 서명 키 (비밀)
```bash
# RS256 PKCS8 private key (PEM). 운영에선 Secret Manager 로 주입(줄바꿈 보존 주의).
openssl genpkey -algorithm RSA -pkeyopt rsa_keygen_bits:2048 -out game-ticket.key
```
| env | 설명 |
|---|---|
| `GAME_TICKET_PRIVATE_KEY` | 위 PEM 전체(필수). 공개키/JWKS 는 여기서 자동 파생 |
| `GAME_TICKET_ISSUER` | 기본 `https://rangu.fam` |
| `GAME_TICKET_AUDIENCE` | 기본 `rangu-tactics` |

### .NET 게임서버 — 검증 (공개 정보만)
| 설정 | 값 |
|---|---|
| `GameTicket:JwksUrl` | `https://rangu.fam/api/game/jwks` |
| `GameTicket:Issuer` | `https://rangu.fam` |
| `GameTicket:Audience` | `rangu-tactics` |

> 게임서버는 **비밀키를 보유하지 않는다.** 공개 JWKS 만으로 검증 → 핵/위조 방지 + 키 회전 시 .NET 무중단(JWKS 재조회).

## 스캐폴딩된 구성 요소

| 파일 | 역할 |
|---|---|
| `RanguTactics.Server.csproj` | net8.0 Web SDK + IdentityModel 8.x + proto lib 참조 |
| `Program.cs` | 부팅 시 메타데이터 로드 → WS 서버(`/ws/tactics`) + **proto 바이너리** connect/echo |
| `Auth/GameTicketValidator.cs` | 라이브 JWKS 티켓 검증(서명·iss·aud·exp·jti) |
| `Game/CardMetadata.cs` | export JSON 로드/파싱/사전검증 카탈로그 |
| `appsettings.json` | JWKS/Issuer/Audience/Metadata URL |
| `mint-test-ticket.mjs` | (dev) 로그인 없이 단명 티켓 발급 |
| `../rangu-tactics-smoke-client/` | (dev) **proto 바이너리** WS 클라이언트 — connect→IntentAck 왕복 |

> 메시지 프레임 = [proto](../proto/README.md) `ClientMessage`/`ServerMessage` **바이너리**.
> 생성 클래스는 공유 lib `RanguTactics.Proto`(서버·클라가 ProjectReference 공유)에서 온다.

## 로컬 스모크 테스트 실행 (인증 seam E2E)

전제: **리포 루트**에서 RSA 키 생성(위 "키 생성") 후 env 주입하고 `next dev`(:3000) 기동.
```bash
export GAME_TICKET_PRIVATE_KEY="$(cat game-ticket.key)"   # next dev 와 동일 env
```

```bash
# 1) 엔드포인트 확인 (next dev)
curl -s localhost:3000/api/game/jwks            | head -c 200   # 공개키(JWKS)
curl -s localhost:3000/api/game/metadata/export | head -c 200   # 버전드 메타데이터

# 2) .NET 서버 기동 — 메타데이터 로드 후 WS 서버 (ws://localhost:5080)
cd game/rangu-tactics-server && dotnet run
#   → [metadata] loaded N cards, contentVersion=...

# 3) 테스트 티켓 발급 (60초 단명·1회용). 리포 루트에서, next dev 와 같은 env.
node game/rangu-tactics-server/mint-test-ticket.mjs

# 4) (proto 바이너리) WS 클라이언트 연결 → connect_accepted + IntentAck 왕복
dotnet run --project game/rangu-tactics-smoke-client -- "<3에서 출력된 티켓>"
#   → ✅ proto round-trip OK  (seam 통과)
```

검증되는 것: **라이브 JWKS 티켓 검증 + 메타데이터 로드/파싱 + 버전 일치 + proto WS 핸드셰이크/에코.**
주의: 티켓은 60초 단명 + jti 1회용 → 재실행 시 3)에서 새 티켓 발급. 통과되면 룰 엔진/스택 구현으로 확장.
