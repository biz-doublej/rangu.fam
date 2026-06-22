using System.Net.Http;
using System.Text.Json;
using Engine = Rangu.Tactics.Engine;

namespace Rangu.Tactics.Server.Net;

/// <summary>
/// Next /api/game/deck 서버간 페치 → 유저 활성 덱을 BattleCard[] 로(스탯 응답 포함). PvE/PvP 공용.
/// 활성 덱 없음/통신 실패/secret 미설정 → null(호출측이 DeckPresets.Demo 폴백). 절대 throw 안 함.
/// </summary>
public sealed class DeckFetcher
{
    private static readonly JsonSerializerOptions JsonOpts = new() { PropertyNameCaseInsensitive = true };
    private readonly IHttpClientFactory _factory;
    private readonly DeckOptions _opt;
    private readonly ILogger<DeckFetcher> _log;

    public DeckFetcher(IHttpClientFactory factory, DeckOptions opt, ILogger<DeckFetcher> log)
    {
        _factory = factory;
        _opt = opt;
        _log = log;
    }

    public async Task<List<Engine.BattleCard>?> FetchAsync(string userId, Engine.PlayerSlot owner, CancellationToken ct)
    {
        if (string.IsNullOrEmpty(_opt.Url) || string.IsNullOrEmpty(_opt.Secret)) return null;
        try
        {
            var http = _factory.CreateClient();
            using var req = new HttpRequestMessage(HttpMethod.Get, $"{_opt.Url}?userId={Uri.EscapeDataString(userId)}");
            req.Headers.Add("X-Game-Server-Secret", _opt.Secret);
            using var res = await http.SendAsync(req, ct);
            if (!res.IsSuccessStatusCode) return null;

            var body = await res.Content.ReadAsStringAsync(ct);
            var parsed = JsonSerializer.Deserialize<DeckResponse>(body, JsonOpts);
            if (parsed?.Deck is not { Count: > 0 } entries) return null; // 활성 덱 없음 → 폴백

            var cards = new List<Engine.BattleCard>();
            int idx = 0;
            foreach (var d in entries)
            {
                if (string.IsNullOrEmpty(d.CardId)) continue;
                var kind = d.CardType == "spell" ? Engine.CardKind.Spell : Engine.CardKind.Unit;
                for (int i = 0; i < Math.Max(1, d.Count); i++)
                {
                    cards.Add(new Engine.BattleCard
                    {
                        InstanceId = $"{owner}-{idx++}",
                        CardId = d.CardId, Owner = owner, Name = d.Name ?? d.CardId, Cost = d.Cost, Kind = kind,
                        Unit = kind == Engine.CardKind.Unit ? MapUnit(d) : null,
                        Spell = kind == Engine.CardKind.Spell ? MapSpell(d) : null,
                    });
                }
            }
            if (cards.Count == 0) return null;
            _log.LogInformation("[deck] {User} 활성 덱 주입({Seat}): {N}장", userId, owner, cards.Count);
            return cards;
        }
        catch (Exception ex)
        {
            _log.LogWarning(ex, "[deck] {User} 페치 실패 — 기본 덱 폴백", userId);
            return null;
        }
    }

    private static Engine.UnitSpec MapUnit(DeckCardDto d) => new()
    {
        Power = d.Attack ?? 0,
        Health = d.Health ?? 1,
        Keywords = MapKeywords(d.Keywords),
        IsChampion = d.CardType == "champion",
    };

    private static Engine.SpellSpec MapSpell(DeckCardDto d)
    {
        var eff = d.Effects?.FirstOrDefault(e => e.Trigger == "cast") ?? d.Effects?.FirstOrDefault();
        return new Engine.SpellSpec
        {
            Speed = Enum.TryParse<Engine.SpellSpeed>(d.SpellSpeed, true, out var sp) ? sp : Engine.SpellSpeed.Fast,
            NeedsTarget = eff?.Target?.Select?.StartsWith("choose") == true,
            Effect = new Engine.SpellEffect
            {
                Kind = Enum.TryParse<Engine.SpellEffectKind>(eff?.Kind, true, out var k) ? k : Engine.SpellEffectKind.DamageUnit,
                Amount = eff?.Amount,
                Health = eff?.Health,
                GrantedKeyword = Enum.TryParse<Engine.Keyword>(eff?.Keyword, true, out var gk) ? gk : (Engine.Keyword?)null,
                Duration = eff?.Duration,
            },
        };
    }

    private static List<Engine.Keyword> MapKeywords(List<string>? kws)
    {
        var list = new List<Engine.Keyword>();
        if (kws is null) return list;
        foreach (var k in kws)
            if (Enum.TryParse<Engine.Keyword>(k, true, out var kw)) list.Add(kw);
        return list;
    }

    // Next /api/game/deck 응답 DTO (camelCase, 대소문자 무시)
    private sealed record DeckResponse(bool Success, List<DeckCardDto>? Deck);
    private sealed record DeckCardDto(
        string CardId, int Count, string? Name, string? CardType, int Cost,
        int? Attack, int? Health, List<string>? Keywords, string? SpellSpeed, List<EffectDto>? Effects);
    private sealed record EffectDto(
        string? Trigger, string? Kind, int? Amount, int? Health, string? Keyword, int? Duration, EffectTargetDto? Target);
    private sealed record EffectTargetDto(string? Select);
}
