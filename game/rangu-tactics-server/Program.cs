using System.Net.WebSockets;
using System.Text;
using System.Text.Json;
using Microsoft.Extensions.Caching.Memory;
using Rangu.Tactics.Server.Auth;
using Rangu.Tactics.Server.Game;

// 랑구 택틱스 — 인증 seam E2E 스모크 서버.
// 검증 대상: ① 라이브 JWKS 티켓 검증 ② 카드 메타데이터 로드/파싱 ③ WS 핸드셰이크/에코.

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
// HttpClient 를 직접 받는 싱글톤이라 팩토리로 명시 생성.
builder.Services.AddSingleton(sp => new GameTicketValidator(
    sp.GetRequiredService<IHttpClientFactory>().CreateClient(),
    sp.GetRequiredService<GameTicketOptions>(),
    sp.GetRequiredService<IMemoryCache>()));

var app = builder.Build();
var json = new JsonSerializerOptions
{
    PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
    PropertyNameCaseInsensitive = true,
};

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
    await SmokeConnection.HandleAsync(socket, validator, catalog, json, app.Logger, ctx.RequestAborted);
});

app.Logger.LogInformation("[boot] rangu-tactics smoke server → ws://localhost:5080/ws/tactics");
app.Run("http://localhost:5080");


// ── 스모크 연결 핸들러 ───────────────────────────────────────────────────────
// NOTE: 디버그 편의를 위해 JSON 프레임 사용(스모크 = seam 검증이 목적).
//       실제 서버는 이 메시지를 proto ClientMessage/ServerMessage(바이너리)로 교체한다.
static class SmokeConnection
{
    public static async Task HandleAsync(
        WebSocket socket, GameTicketValidator validator, CardCatalog catalog,
        JsonSerializerOptions json, ILogger log, CancellationToken ct)
    {
        var first = await ReceiveTextAsync(socket, ct);
        if (first is null) return;

        SmokeConnect? conn;
        try { conn = JsonSerializer.Deserialize<SmokeConnect>(first, json); }
        catch { await SendAsync(socket, new { type = "connect_rejected", reason = "bad_json" }, json, ct); return; }

        if (string.IsNullOrWhiteSpace(conn?.GameTicket))
        {
            await SendAsync(socket, new { type = "connect_rejected", reason = "missing_ticket" }, json, ct);
            return;
        }

        // ① 라이브 JWKS 로 티켓 검증
        GameTicketPrincipal principal;
        try
        {
            principal = await validator.ValidateAsync(conn.GameTicket, ct);
        }
        catch (GameTicketValidationException ex)
        {
            await SendAsync(socket, new { type = "connect_rejected", reason = "invalid_ticket", detail = ex.Reason }, json, ct);
            return;
        }

        // ② 메타데이터 버전 일치 (proto VERSION_MISMATCH 모사)
        if (!string.IsNullOrEmpty(conn.MetadataVersion) && conn.MetadataVersion != catalog.ContentVersion)
        {
            await SendAsync(socket, new { type = "connect_rejected", reason = "version_mismatch", current = catalog.ContentVersion }, json, ct);
            return;
        }

        // ③ 수락 + 더미 이벤트
        log.LogInformation("[ws] accepted user={User} match={Match}", principal.UserId, principal.MatchId ?? "-");
        await SendAsync(socket, new
        {
            type = "connect_accepted",
            you = new { userId = principal.UserId, username = principal.Username },
            contentVersion = catalog.ContentVersion,
            cardCount = catalog.Count,
        }, json, ct);
        await SendAsync(socket, new { type = "event", sequenceNumber = 1, payload = "match_started(dummy)" }, json, ct);

        // ④ 에코 루프
        ulong seq = 1;
        while (socket.State == WebSocketState.Open)
        {
            var msg = await ReceiveTextAsync(socket, ct);
            if (msg is null) break;
            await SendAsync(socket, new { type = "echo", sequenceNumber = ++seq, received = msg }, json, ct);
        }
    }

    static async Task<string?> ReceiveTextAsync(WebSocket socket, CancellationToken ct)
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
        return Encoding.UTF8.GetString(ms.ToArray());
    }

    static async Task SendAsync(WebSocket socket, object payload, JsonSerializerOptions json, CancellationToken ct)
    {
        var bytes = JsonSerializer.SerializeToUtf8Bytes(payload, json);
        await socket.SendAsync(bytes, WebSocketMessageType.Text, endOfMessage: true, ct);
    }
}

// 스모크용 connect 프레임 (JSON). 실제 서버는 proto ConnectRequest 로 교체.
record SmokeConnect(string? GameTicket, string? MatchId, string? MetadataVersion);
