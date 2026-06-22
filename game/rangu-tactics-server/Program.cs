using Microsoft.Extensions.Caching.Memory;
using Rangu.Tactics.Server.Auth;
using Rangu.Tactics.Server.Game;
using Rangu.Tactics.Server.Match;
using Rangu.Tactics.Server.Net;

// 랑구 택틱스 게임 서버 — 실시간 매치 루프.
// ① 부팅: 카드 메타데이터 로드  ② JWKS 티켓 검증  ③ MatchRegistry/ApplyAsync + 마스킹 스냅샷 브로드캐스트.

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
builder.Services.AddSingleton<MatchRegistry>();
builder.Services.AddSingleton<ConnectionHub>();
builder.Services.AddSingleton(new DeckOptions
{
    Url = cfg["Deck:Url"] ?? "http://localhost:3000/api/game/deck",
    Secret = cfg["Deck:Secret"] ?? Environment.GetEnvironmentVariable("GAME_SERVER_SECRET") ?? "",
});
builder.Services.AddSingleton<DeckFetcher>();   // 서버간 덱 페치(PvE/PvP 공용)
builder.Services.AddSingleton<Matchmaker>();    // 1:1 PvP 매치메이킹 큐

var app = builder.Build();

// ── Boot: 카드 메타데이터 1회 로드 (실패 시 부팅 중단) ──
var metadataUrl = cfg["Metadata:ExportUrl"] ?? "http://localhost:3000/api/game/metadata/export";
CardCatalog catalog;
try
{
    var http = app.Services.GetRequiredService<IHttpClientFactory>().CreateClient();
    catalog = await CardCatalog.LoadAsync(http, metadataUrl);
    app.Logger.LogInformation("[metadata] loaded {Count} cards, contentVersion={Version}", catalog.Count, catalog.ContentVersion);
}
catch (Exception ex)
{
    // 기본: 부팅 중단(조용한 오작동 방지). ALLOW_DEMO_FALLBACK=true 일 때만 내장 데모 카탈로그로 자립 기동(검증/오프라인용).
    var allowDemo = (Environment.GetEnvironmentVariable("ALLOW_DEMO_FALLBACK") ?? cfg["Metadata:AllowDemoFallback"]) is "true" or "1";
    if (!allowDemo)
    {
        app.Logger.LogCritical(ex, "[metadata] load failed from {Url} — aborting boot (검증/오프라인이면 ALLOW_DEMO_FALLBACK=true).", metadataUrl);
        return;
    }
    catalog = CardCatalog.Demo();
    app.Logger.LogWarning(ex, "[metadata] load failed from {Url} — ALLOW_DEMO_FALLBACK → 내장 데모 카탈로그({Count} cards, {Version}).", metadataUrl, catalog.Count, catalog.ContentVersion);
}

app.UseWebSockets();

app.MapGet("/healthz", (MatchRegistry reg) =>
    Results.Ok(new { ok = true, contentVersion = catalog.ContentVersion, cards = catalog.Count, matches = reg.Count }));

app.Map("/ws/tactics", async (HttpContext ctx, GameTicketValidator validator, MatchRegistry registry, ConnectionHub hub, DeckFetcher deckFetcher, Matchmaker matchmaker) =>
{
    if (!ctx.WebSockets.IsWebSocketRequest)
    {
        ctx.Response.StatusCode = StatusCodes.Status400BadRequest;
        return;
    }
    using var socket = await ctx.WebSockets.AcceptWebSocketAsync();
    await GameConnection.HandleAsync(socket, validator, registry, hub, catalog, deckFetcher, matchmaker, app.Logger, ctx.RequestAborted);
});

// Cloud Run 은 $PORT(기본 8080)로 0.0.0.0 바인딩을 요구. 로컬은 PORT 미설정 → 5080.
var port = Environment.GetEnvironmentVariable("PORT") ?? "5080";
app.Logger.LogInformation("[boot] rangu-tactics game server → http://0.0.0.0:{Port}/ws/tactics", port);
app.Run($"http://0.0.0.0:{port}");
