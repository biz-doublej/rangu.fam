namespace Rangu.Tactics.Engine;

/// <summary>효과/공격의 대상 종류.</summary>
public enum TargetKind { Unit, Nexus }

/// <summary>
/// 효과/공격 대상 (값 타입, 불변). 유닛(instanceId) 또는 넥서스(slot).
/// TS: { type:'unit', instanceId } | { type:'nexus', slot }.
/// </summary>
public readonly record struct TargetRef
{
    public TargetKind Kind { get; }
    public string? InstanceId { get; }
    public PlayerSlot? Slot { get; }

    private TargetRef(TargetKind kind, string? instanceId, PlayerSlot? slot)
    {
        Kind = kind;
        InstanceId = instanceId;
        Slot = slot;
    }

    public static TargetRef Unit(string instanceId) => new(TargetKind.Unit, instanceId, null);
    public static TargetRef Nexus(PlayerSlot slot) => new(TargetKind.Nexus, null, slot);
}

/// <summary>주문/능력 효과 서술자 — effect resolver 가 Kind 로 해석.</summary>
public sealed class SpellEffect
{
    public SpellEffectKind Kind { get; set; }
    public int? Amount { get; set; }          // 파워 증감 또는 피해/회복량
    public int? Health { get; set; }          // 체력 증감
    public Keyword? GrantedKeyword { get; set; } // GrantKeyword 전용 (TS: keyword)
    public int? Duration { get; set; }        // null = 영구, n = 남은 라운드 수

    public SpellEffect Clone() => new()
    {
        Kind = Kind, Amount = Amount, Health = Health, GrantedKeyword = GrantedKeyword, Duration = Duration,
    };
}

/// <summary>일시 효과(버프/디버프) — 라운드 경과로 만료.</summary>
public sealed class StatBuff
{
    public int? Power { get; set; }
    public int? Health { get; set; }
    public List<Keyword> KeywordsAdded { get; set; } = new();
    public int? Duration { get; set; } // null = 영구
    public string Source { get; set; } = "";

    public StatBuff Clone() => new()
    {
        Power = Power, Health = Health, KeywordsAdded = new(KeywordsAdded), Duration = Duration, Source = Source,
    };
}

/// <summary>유닛 카드의 고유 스펙 (BattleCard.Kind == Unit).</summary>
public sealed class UnitSpec
{
    public int Power { get; set; }
    public int Health { get; set; }
    public List<Keyword> Keywords { get; set; } = new();
    public bool IsChampion { get; set; }

    public UnitSpec Clone() => new()
    {
        Power = Power, Health = Health, Keywords = new(Keywords), IsChampion = IsChampion,
    };
}

/// <summary>주문 카드의 고유 스펙 (BattleCard.Kind == Spell).</summary>
public sealed class SpellSpec
{
    public SpellSpeed Speed { get; set; }
    public SpellEffect Effect { get; set; } = new();
    public bool NeedsTarget { get; set; }

    public SpellSpec Clone() => new()
    {
        Speed = Speed, Effect = Effect.Clone(), NeedsTarget = NeedsTarget,
    };
}

/// <summary>손패/덱에 있는 카드 (유닛 또는 주문).</summary>
public sealed class BattleCard
{
    public string InstanceId { get; set; } = "";
    public string CardId { get; set; } = "";
    public PlayerSlot Owner { get; set; }
    public string Name { get; set; } = "";
    public string? Member { get; set; }  // 표시용(진영 색) — 엔진 로직엔 영향 없음
    public int Cost { get; set; }
    public CardKind Kind { get; set; }
    public UnitSpec? Unit { get; set; }   // Kind == Unit 일 때
    public SpellSpec? Spell { get; set; } // Kind == Spell 일 때

    public BattleCard Clone() => new()
    {
        InstanceId = InstanceId, CardId = CardId, Owner = Owner, Name = Name, Member = Member,
        Cost = Cost, Kind = Kind, Unit = Unit?.Clone(), Spell = Spell?.Clone(),
    };
}

/// <summary>보드 위의 유닛 인스턴스.</summary>
public sealed class BattleUnit
{
    public string InstanceId { get; set; } = "";
    public string CardId { get; set; } = "";
    public PlayerSlot Owner { get; set; }
    public string Name { get; set; } = "";
    public string? Member { get; set; }

    public int Power { get; set; }          // 버프 포함 현재 파워
    public int BasePower { get; set; }
    public int Health { get; set; }         // 현재 체력
    public int MaxHealth { get; set; }      // 버프 포함 현재 최대 체력
    public int BaseMaxHealth { get; set; }  // 카드 고유 최대 체력 (버프 만료 복원 기준)

    public List<Keyword> Keywords { get; set; } = new();      // 버프 포함 현재 키워드
    public List<Keyword> BaseKeywords { get; set; } = new();  // 카드 고유 키워드 (복원 기준)
    public int Cost { get; set; }

    public bool IsChampion { get; set; }
    public int ChampionLevel { get; set; } = 1;  // 1 | 2
    public int ChampionProgress { get; set; }

    public int SummonedRound { get; set; }
    public bool HasAttacked { get; set; }
    public bool IsStunned { get; set; }
    public bool HasBarrier { get; set; }
    public List<StatBuff> Buffs { get; set; } = new();

    public BattleUnit Clone() => new()
    {
        InstanceId = InstanceId, CardId = CardId, Owner = Owner, Name = Name, Member = Member,
        Power = Power, BasePower = BasePower, Health = Health, MaxHealth = MaxHealth, BaseMaxHealth = BaseMaxHealth,
        Keywords = new(Keywords), BaseKeywords = new(BaseKeywords), Cost = Cost,
        IsChampion = IsChampion, ChampionLevel = ChampionLevel, ChampionProgress = ChampionProgress,
        SummonedRound = SummonedRound, HasAttacked = HasAttacked, IsStunned = IsStunned, HasBarrier = HasBarrier,
        Buffs = Buffs.Select(b => b.Clone()).ToList(),
    };
}
