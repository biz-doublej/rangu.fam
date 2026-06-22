using System.Text.Json;

namespace Rangu.Tactics.Server.Game;

// ── JSON 과 1:1 매핑 (System.Text.Json, camelCase) ───────────────────────────
// rangu.fam /api/game/metadata/export 의 TacticsMetadataDocument 와 동일 구조.

public sealed record TacticsMetadataDocument(
    int SchemaVersion,
    string ContentVersion,
    string GeneratedAt,
    int CardCount,
    IReadOnlyList<string> Keywords,
    IReadOnlyList<CardMeta> Cards);

public sealed record CardMeta(
    string CardId, string Name, string Faction, string Type, string Rarity,
    int Cost, int? Attack, int? Health,
    IReadOnlyList<string> Keywords, string? SpellSpeed,
    IReadOnlyList<CardEffect> Effects, ChampionSpec? Champion, string? ImageUrl, bool Derived);

public sealed record CardEffect(
    string Trigger, string Kind, int? Amount, int? Health,
    string? Keyword, int? Duration, EffectTarget? Target, TokenSpec? Token);

public sealed record EffectTarget(string Select, int? Count);
public sealed record TokenSpec(string CardId, int Count);
public sealed record ChampionSpec(
    string LevelUpCondition, int? Attack, int? Health,
    IReadOnlyList<string>? AddKeywords, IReadOnlyList<CardEffect>? AddEffects);

// ── 엔진이 아는 어휘 (proto/battle 과 동일). JSON string → enum 매핑의 기준. ──
//
// ★ Q3 답: 키워드는 "단순 enum"(파라미터 없는 태그), 효과는 "파라미터 포함 객체"(CardEffect).
//   - 키워드 추가 = 양쪽 엔진 enum + 동작 코드 필요 (evergreen 메커니즘에만).
//   - 효과의 새 파라미터 조합 = 데이터만으로 추가(코드 불필요). 새 Kind 만 resolver 코드 필요.
public enum Keyword
{
    Overwhelm, Elusive, QuickAttack, Lifesteal, Tough, Barrier, Fearsome, Challenger, Regeneration,
}

public enum EffectKind
{
    BuffUnit, BuffTeam, DamageUnit, DamageNexus, HealNexus, GrantKeyword, Stun, Draw, SummonToken,
}

public sealed class CardMetadataException(string reason) : Exception(reason);

/// <summary>
/// export JSON 을 받아 파싱 + 검증(스키마 버전 / 키워드 사전)하고 cardId → CardMeta 카탈로그를 만든다.
/// 부팅 시 1회 로드, contentVersion 을 핀(클라 연결 시 VERSION_MISMATCH 판정 기준).
/// </summary>
public sealed class CardCatalog
{
    private const int SupportedSchemaVersion = 1;

    private static readonly JsonSerializerOptions JsonOpts = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        PropertyNameCaseInsensitive = true,
    };

    public string ContentVersion { get; }
    private readonly IReadOnlyDictionary<string, CardMeta> _byId;

    private CardCatalog(string contentVersion, IReadOnlyDictionary<string, CardMeta> byId)
    {
        ContentVersion = contentVersion;
        _byId = byId;
    }

    public int Count => _byId.Count;

    public CardMeta Get(string cardId) =>
        _byId.TryGetValue(cardId, out var card)
            ? card
            : throw new CardMetadataException($"unknown_card:{cardId}");

    public bool TryGet(string cardId, out CardMeta? card) => _byId.TryGetValue(cardId, out card);

    public static async Task<CardCatalog> LoadAsync(HttpClient http, string exportUrl, CancellationToken ct = default)
    {
        var json = await http.GetStringAsync(exportUrl, ct);
        var doc = JsonSerializer.Deserialize<TacticsMetadataDocument>(json, JsonOpts)
                  ?? throw new CardMetadataException("empty_metadata");

        // 1) 파서 호환성 — 구조가 깨지는 변경이면 부팅 실패(조용한 오작동 방지).
        if (doc.SchemaVersion != SupportedSchemaVersion)
            throw new CardMetadataException($"schema_mismatch:{doc.SchemaVersion}!={SupportedSchemaVersion}");

        // 2) 키워드 사전 검증 — JSON 이 엔진이 모르는 키워드를 쓰면 부팅 실패
        //    (버전 불일치를 매치 중이 아니라 부팅 시점에 조기 검출).
        foreach (var kw in doc.Keywords)
            if (!Enum.TryParse<Keyword>(kw, ignoreCase: true, out _))
                throw new CardMetadataException($"unknown_keyword:{kw}");

        return new CardCatalog(doc.ContentVersion, doc.Cards.ToDictionary(c => c.CardId));
    }

    /// <summary>
    /// HTTP 메타데이터 도달 불가 시 부팅 폴백(ALLOW_DEMO_FALLBACK 일 때만 사용).
    /// DeckPresets.Demo 의 cardId(demo_0..3 / spell_dmg / spell_heal)와 정합 — 검증/오프라인 기동용.
    /// </summary>
    public static CardCatalog Demo()
    {
        CardMeta Unit(string id, string name, string type, int atk, int hp) =>
            new(id, name, "neutral", type, "common", 1, atk, hp, Array.Empty<string>(), null, Array.Empty<CardEffect>(), null, null, false);
        CardMeta Spell(string id, string name, string speed) =>
            new(id, name, "neutral", "spell", "common", 1, null, null, Array.Empty<string>(), speed, Array.Empty<CardEffect>(), null, null, false);
        var cards = new List<CardMeta>
        {
            Unit("demo_0", "데모 챔피언", "champion", 3, 4),
            Unit("demo_1", "데모1", "unit", 2, 3),
            Unit("demo_2", "데모2", "unit", 3, 2),
            Unit("demo_3", "데모3", "unit", 1, 4),
            Spell("spell_dmg", "데모 화염", "fast"),
            Spell("spell_heal", "데모 치유", "burst"),
        };
        return new CardCatalog("embedded-demo", cards.ToDictionary(c => c.CardId));
    }
}

// ── 효과 resolver 매핑 패턴 (룰 엔진 구현 시) ────────────────────────────────
//
// 효과는 "파라미터 포함 객체"이므로, kind → resolver 의 딕셔너리/스위치로 해석한다:
//
//   public interface IEffectResolver { void Apply(CardEffect e, GameContext ctx); }
//
//   private static readonly Dictionary<EffectKind, IEffectResolver> Resolvers = new()
//   {
//       [EffectKind.BuffTeam]    = new BuffTeamResolver(),
//       [EffectKind.DamageUnit]  = new DamageUnitResolver(),
//       [EffectKind.GrantKeyword]= new GrantKeywordResolver(),
//       // ... kind 추가 시 여기에만 등록
//   };
//
//   void Resolve(CardEffect e, GameContext ctx)
//   {
//       var kind = Enum.Parse<EffectKind>(e.Kind, ignoreCase: true);
//       Resolvers[kind].Apply(e, ctx);   // e.Amount / e.Health / e.Keyword / e.Target 를 소비
//   }
//
// trigger(cast/summon/attack/strike/death/roundStart/roundEnd)는 엔진이 해당 시점에
// 카드의 effects 를 필터링해 위 Resolve 를 호출한다. → 카드 동작 = 100% 데이터 주도.
