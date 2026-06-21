namespace Rangu.Tactics.Engine;

/// <summary>스택에 올라간 주문/능력 (반응형 — 우선권 양보 후 LIFO 해결).</summary>
public sealed class StackItem
{
    public string Id { get; set; } = "";
    public PlayerSlot Source { get; set; }
    public BattleCard Card { get; set; } = new();
    public SpellEffect Effect { get; set; } = new();
    public SpellSpeed Speed { get; set; }
    public List<TargetRef> Targets { get; set; } = new();

    public StackItem Clone() => new()
    {
        Id = Id, Source = Source, Card = Card.Clone(), Effect = Effect.Clone(), Speed = Speed,
        Targets = new(Targets), // TargetRef = 값 타입 → 얕은 복사로 충분
    };
}

/// <summary>전투 상태.</summary>
public sealed class CombatState
{
    public List<string> Attackers { get; set; } = new();             // 공격 유닛 instanceId (선언 순서)
    public Dictionary<string, string> Blocks { get; set; } = new();  // attacker → blocker
    public Dictionary<string, string> Challenged { get; set; } = new(); // 강제 블록: attacker → 끌려온 blocker
    public bool BlocksDeclared { get; set; }

    public CombatState Clone() => new()
    {
        Attackers = new(Attackers), Blocks = new(Blocks), Challenged = new(Challenged), BlocksDeclared = BlocksDeclared,
    };
}

/// <summary>한 플레이어의 상태.</summary>
public sealed class PlayerState
{
    public PlayerSlot Slot { get; set; }
    public string? UserId { get; set; }   // null = AI/고스트
    public uint Rng { get; set; }          // 플레이어 전용 RNG (셔플/멀리건 — 상대와 독립)

    public int NexusHealth { get; set; } = 20;
    public int Mana { get; set; }
    public int MaxMana { get; set; }       // 라운드마다 +1 (최대 10)
    public int SpellMana { get; set; }     // 적립 마나 (≤3, 주문 전용)

    public List<BattleCard> Deck { get; set; } = new();   // 드로우 더미 (seed 셔플 순서)
    public List<BattleCard> Hand { get; set; } = new();
    public List<BattleUnit> Board { get; set; } = new();
    public List<string> Graveyard { get; set; } = new();  // 사망 유닛 cardId (공개)
    public List<string> Burned { get; set; } = new();     // 핸드 상한 초과 소각 (비공개 — 마스킹 대상)

    public int FatigueCount { get; set; }  // 덱 소진 후 누적 피로 피해
    public bool HasAttackToken { get; set; }
    public bool HasPassed { get; set; }
    public bool MulliganDone { get; set; }

    public PlayerState Clone() => new()
    {
        Slot = Slot, UserId = UserId, Rng = Rng,
        NexusHealth = NexusHealth, Mana = Mana, MaxMana = MaxMana, SpellMana = SpellMana,
        Deck = Deck.Select(c => c.Clone()).ToList(),
        Hand = Hand.Select(c => c.Clone()).ToList(),
        Board = Board.Select(u => u.Clone()).ToList(),
        Graveyard = new(Graveyard), Burned = new(Burned),
        FatigueCount = FatigueCount, HasAttackToken = HasAttackToken, HasPassed = HasPassed, MulliganDone = MulliganDone,
    };
}

/// <summary>이벤트 로그 1건 (리플레이/피드용).</summary>
public sealed class GameEvent
{
    public int Round { get; set; }
    public BattlePhase Phase { get; set; }
    public EventActor Actor { get; set; }
    public string Type { get; set; } = "";
    public Dictionary<string, object?>? Detail { get; set; }

    public GameEvent Clone() => new()
    {
        Round = Round, Phase = Phase, Actor = Actor, Type = Type,
        Detail = Detail is null ? null : new Dictionary<string, object?>(Detail),
    };
}

/// <summary>
/// 전체 게임 상태 — 서버 권위 + 결정론(seed 기반).
/// 같은 (초기 상태, Rng, 액션 시퀀스) → 항상 같은 결과. 리듀서는 Clone 후 새 상태 반환.
/// </summary>
public sealed class GameState
{
    public int Version { get; set; } = 1;
    public string Seed { get; set; } = "";
    public uint Rng { get; set; }            // 결정론 RNG 현재 상태
    public int Round { get; set; }
    public BattlePhase Phase { get; set; }
    public PlayerSlot ActivePlayer { get; set; }  // 이번 라운드 공격 토큰 보유자
    public PlayerSlot Priority { get; set; }       // 지금 행동/대응할 차례
    public bool AttackDeclaredThisRound { get; set; }
    public int PassStreak { get; set; }            // 연속 패스 (2 = 양쪽 패스)
    public Dictionary<PlayerSlot, PlayerState> Players { get; set; } = new();
    public List<StackItem> Stack { get; set; } = new();
    public CombatState? Combat { get; set; }
    public PlayerSlot? Winner { get; set; }
    public List<GameEvent> Log { get; set; } = new();

    public PlayerState Player(PlayerSlot slot) => Players[slot];
    public PlayerState Opponent(PlayerSlot slot) => Players[slot.Other()];

    public GameState Clone()
    {
        var players = new Dictionary<PlayerSlot, PlayerState>(Players.Count);
        foreach (var kv in Players) players[kv.Key] = kv.Value.Clone();
        return new GameState
        {
            Version = Version, Seed = Seed, Rng = Rng, Round = Round, Phase = Phase,
            ActivePlayer = ActivePlayer, Priority = Priority,
            AttackDeclaredThisRound = AttackDeclaredThisRound, PassStreak = PassStreak,
            Players = players,
            Stack = Stack.Select(s => s.Clone()).ToList(),
            Combat = Combat?.Clone(),
            Winner = Winner,
            Log = Log.Select(e => e.Clone()).ToList(),
        };
    }
}
