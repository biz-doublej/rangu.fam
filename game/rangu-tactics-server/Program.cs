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
    app.Logger.LogCritical(ex, "[metadata] load failed from {Url} — aborting boot.", metadataUrl);
    return;
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

app.Logger.LogInformation("[boot] rangu-tactics game server → ws://localhost:5080/ws/tactics");
app.Run("http://localhost:5080");
