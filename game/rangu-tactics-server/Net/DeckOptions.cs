namespace Rangu.Tactics.Server.Net;

/// <summary>
/// C# 게임서버 → Next /api/game/deck 서버간 호출 설정.
/// Url=엔드포인트, Secret=X-Game-Server-Secret 헤더(= Next env GAME_SERVER_SECRET).
/// Secret 비면 페치 비활성 → 항상 DemoDeck 폴백.
/// </summary>
public sealed class DeckOptions
{
    public string Url { get; init; } = "";
    public string Secret { get; init; } = "";
}
