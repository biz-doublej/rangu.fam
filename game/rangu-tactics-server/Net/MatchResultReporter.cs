using System.Net.Http;
using System.Text;
using System.Text.Json;

namespace Rangu.Tactics.Server.Net;

/// <summary>
/// 매치 종료 결과를 Next /api/game/match-result 로 POST(서버 권위 랭크 집계). PvP 종료 시 1회.
/// DeckOptions 의 Url 기반("/deck"→"/match-result") + Secret(X-Game-Server-Secret) 재사용.
/// 절대 throw 안 함 — 실패는 로그만(게임 흐름 비차단). 5s 타임아웃.
/// </summary>
public sealed class MatchResultReporter
{
    private static readonly JsonSerializerOptions JsonOpts = new() { PropertyNamingPolicy = JsonNamingPolicy.CamelCase };
    private readonly IHttpClientFactory _factory;
    private readonly DeckOptions _opt;
    private readonly ILogger<MatchResultReporter> _log;

    public MatchResultReporter(IHttpClientFactory factory, DeckOptions opt, ILogger<MatchResultReporter> log)
    {
        _factory = factory;
        _opt = opt;
        _log = log;
    }

    private string ResultUrl =>
        _opt.Url.EndsWith("/deck") ? _opt.Url[..^"/deck".Length] + "/match-result" : _opt.Url.TrimEnd('/') + "/match-result";

    public async Task ReportAsync(string matchId, string winnerUserId, string loserUserId, CancellationToken ct)
    {
        if (string.IsNullOrEmpty(_opt.Url) || string.IsNullOrEmpty(_opt.Secret)) return;
        try
        {
            var http = _factory.CreateClient();
            http.Timeout = TimeSpan.FromSeconds(5);
            var payload = JsonSerializer.Serialize(new { matchId, winnerUserId, loserUserId }, JsonOpts);
            using var req = new HttpRequestMessage(HttpMethod.Post, ResultUrl)
            {
                Content = new StringContent(payload, Encoding.UTF8, "application/json"),
            };
            req.Headers.Add("X-Game-Server-Secret", _opt.Secret);
            using var res = await http.SendAsync(req, ct);
            if (res.IsSuccessStatusCode)
                _log.LogInformation("[rank] 매치 결과 보고 OK match={Match} winner={Winner}", matchId, winnerUserId);
            else
                _log.LogWarning("[rank] 매치 결과 보고 실패 {Status} match={Match}", res.StatusCode, matchId);
        }
        catch (Exception ex)
        {
            _log.LogWarning(ex, "[rank] 매치 결과 보고 예외 match={Match}", matchId);
        }
    }
}
