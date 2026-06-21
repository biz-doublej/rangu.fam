using System.Net.WebSockets;
using Google.Protobuf;
using Microsoft.Extensions.Caching.Memory;
using Rangu.Tactics.Proto.V1;
using Rangu.Tactics.Server.Auth;
using Rangu.Tactics.Server.Game;

// 랑구 택틱스 — 인증 seam E2E 스모크 서버 (Protobuf 바이너리 프레이밍).
// 검증 대상: ① 라이브 JWKS 티켓 검증 ② 카드 메타데이터 로드/파싱 ③ proto WS 핸드셰이크/에코.

var builder = WebApplication.CreateBuilder(args);
var cfg = builder.Configuration;

builder.Services.AddMemoryCache();
builder.Services.AddHttpClient();
builder.Services.AddSingleton(new GameTicketOptions
{
    JwksUrl = cfg["GameTicket:JwksUrl"] ?? "http://localhost:3000/api/game/jwks",
    Issuer = cfg["GameTicket:Issuer"] ?? "https://rangu.fam",
    Audience = cfg["GameTicket:Audience"] ?? "rangu-tactics",
});
builder.Services.AddSingleton(sp => new GameTicketValidator(
    sp.GetRequiredService<IHttpClientFactory>().CreateClient(),
    sp.GetRequiredService<GameTicketOptions>(),
    sp.GetRequiredService<IMemoryCache>()));

var app = builder.Build();

// ── Boot: 카드 메타데이터 1회 로드 (실패 시 부팅 중단 = fail fast) ──
var metadataUrl = cfg["Metadata:ExportUrl"] ?? "http://localhost:3000/api/game/metadata/export";
CardCatalog catalog;
try
{
    var http = app.Services.GetRequiredService<IHttpClientFactory>().CreateClient();
    catalog = await CardCatalog.LoadAsync(http, metadataUrl);
    app.Logger.LogInformation("[metadata] loaded {Count} cards, contentVersion={Version}",
        catalog.Count, catalog.ContentVersion);
}
catch (Exception ex)
{
    app.Logger.LogCritical(ex, "[metadata] load failed from {Url} — aborting boot.", metadataUrl);
    return;
}

app.UseWebSockets();

app.MapGet("/healthz", () => Results.Ok(new { ok = true, contentVersion = catalog.ContentVersion, cards = catalog.Count }));

app.Map("/ws/tactics", async (HttpContext ctx, GameTicketValidator validator) =>
{
    if (!ctx.WebSockets.IsWebSocketRequest)
    {
        ctx.Response.StatusCode = StatusCodes.Status400BadRequest;
        return;
    }
    using var socket = await ctx.WebSockets.AcceptWebSocketAsync();
    await SmokeConnection.HandleAsync(socket, validator, catalog, app.Logger, ctx.RequestAborted);
});

app.Logger.LogInformation("[boot] rangu-tactics smoke server (protobuf) → ws://localhost:5080/ws/tactics");
app.Run("http://localhost:5080");


// ── proto 바이너리 연결 핸들러 ───────────────────────────────────────────────
// 모든 프레임 = service.proto 의 ClientMessage / ServerMessage (바이너리).
static class SmokeConnection
{
    public static async Task HandleAsync(
        WebSocket socket, GameTicketValidator validator, CardCatalog catalog,
        ILogger log, CancellationToken ct)
    {
        // 첫 프레임 = ClientMessage.connect
        var firstBytes = await ReceiveBinaryAsync(socket, ct);
        if (firstBytes is null) return;

        ClientMessage first;
        try { first = ClientMessage.Parser.ParseFrom(firstBytes); }
        catch { await RejectAsync(socket, ConnectRejected.Types.Reason.Unspecified, "bad_frame", ct); return; }

        if (first.MsgCase != ClientMessage.MsgOneofCase.Connect)
        {
            await RejectAsync(socket, ConnectRejected.Types.Reason.Unspecified, "expected_connect", ct);
            return;
        }
        var connect = first.Connect;

        // ① 라이브 JWKS 로 티켓 검증
        GameTicketPrincipal principal;
        try
        {
            principal = await validator.ValidateAsync(connect.GameTicket, ct);
        }
        catch (GameTicketValidationException ex)
        {
            await RejectAsync(socket, ConnectRejected.Types.Reason.InvalidTicket, ex.Reason, ct);
            return;
        }

        // ② 메타데이터 버전 일치 (proto VERSION_MISMATCH). 스모크에선 client_version 에 contentVersion 을 실어보냄.
        if (!string.IsNullOrEmpty(connect.ClientVersion) && connect.ClientVersion != catalog.ContentVersion)
        {
            await RejectAsync(socket, ConnectRejected.Types.Reason.VersionMismatch, catalog.ContentVersion, ct);
            return;
        }

        // ③ 수락 + 최소 스냅샷 (수신자 관점)
        log.LogInformation("[ws] accepted user={User} match={Match}", principal.UserId, principal.MatchId ?? "-");
        var you = new PlayerRef { UserId = principal.UserId, Seat = 0 };
        await SendAsync(socket, new ServerMessage
        {
            ConnectAccepted = new ConnectAccepted
            {
                You = you,
                Snapshot = new GameStateSnapshot
                {
                    MatchId = string.IsNullOrEmpty(connect.MatchId) ? "smoke-1" : connect.MatchId,
                    SequenceNumber = 0,
                    Viewer = you,
                    Phase = GamePhase.PhaseMulligan,
                    RoundNumber = 0,
                },
            },
        }, ct);

        // ④ 에코 루프: Intent → IntentAck Event 로 응답 (proto 왕복 증명)
        ulong seq = 0;
        while (socket.State == WebSocketState.Open)
        {
            var bytes = await ReceiveBinaryAsync(socket, ct);
            if (bytes is null) break;

            ClientMessage msg;
            try { msg = ClientMessage.Parser.ParseFrom(bytes); }
            catch { continue; }

            switch (msg.MsgCase)
            {
                case ClientMessage.MsgOneofCase.Intent:
                    await SendAsync(socket, new ServerMessage
                    {
                        Event = new Event
                        {
                            SequenceNumber = ++seq,
                            IntentAck = new IntentAckEvent { ClientIntentId = msg.Intent.ClientIntentId },
                        },
                    }, ct);
                    break;
                case ClientMessage.MsgOneofCase.Heartbeat:
                    await SendAsync(socket, new ServerMessage { Heartbeat = msg.Heartbeat }, ct);
                    break;
            }
        }
    }

    static Task RejectAsync(WebSocket socket, ConnectRejected.Types.Reason reason, string detail, CancellationToken ct) =>
        SendAsync(socket, new ServerMessage
        {
            ConnectRejected = new ConnectRejected { Reason = reason, Detail = detail },
        }, ct);

    static async Task SendAsync(WebSocket socket, ServerMessage msg, CancellationToken ct)
    {
        await socket.SendAsync(msg.ToByteArray(), WebSocketMessageType.Binary, endOfMessage: true, ct);
    }

    static async Task<byte[]?> ReceiveBinaryAsync(WebSocket socket, CancellationToken ct)
    {
        var buffer = new byte[8192];
        using var ms = new MemoryStream();
        while (true)
        {
            var result = await socket.ReceiveAsync(buffer.AsMemory(), ct);
            if (result.MessageType == WebSocketMessageType.Close)
            {
                await socket.CloseAsync(WebSocketCloseStatus.NormalClosure, "bye", ct);
                return null;
            }
            ms.Write(buffer, 0, result.Count);
            if (result.EndOfMessage) break;
        }
        return ms.ToArray();
    }
}
