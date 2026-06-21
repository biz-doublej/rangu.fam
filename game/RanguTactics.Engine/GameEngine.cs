namespace Rangu.Tactics.Engine;

/// <summary>
/// 랑구 택틱스 결정론 룰 엔진 (서버 권위). src/lib/battle/engine.ts 의 C# 포팅.
///
/// 모든 상태 변화는 셋업(CreateBattle/BeginRound) 또는 Apply(state, actor, action) 한 곳을 통해서만.
/// ★ 입력 state 를 절대 변형하지 않고 Clone() 한 새 상태를 반환(순수 리듀서).
/// ★ 이벤트는 반환값(List&lt;GameEvent&gt;)으로 흘려보낸다(이벤트 버스) + state.Log 에도 누적.
/// </summary>
public static partial class GameEngine
{
    public const int StartingNexus = 20;
    public const int OpeningHand = 4;
    public const int MaxHand = 10;
    public const int MaxBoard = 6;
    public const int MaxMana = 10;
    public const int MaxSpellMana = 3;
    public const int MaxRounds = 50;

    /// <summary>매치 생성 입력 — 이미 BattleCard 로 빌드된 덱(스탯 파생은 호출측/메타데이터 책임 → 엔진은 순수).</summary>
    public sealed record PlayerSetup(string? UserId, IReadOnlyList<BattleCard> Deck);

    /// <summary>
    /// 매치 생성 — 플레이어별 독립 RNG 로 셔플 + 오프닝 핸드(4장) 드로우.
    /// 결과: round 0, phase Mulligan, mana 0/0, p1 공격토큰. (마나 1/1 은 멀리건 완료 후 BeginRound)
    /// </summary>
    public static (GameState State, List<GameEvent> Events) CreateBattle(string seed, PlayerSetup p1, PlayerSetup p2)
    {
        var events = new List<GameEvent>();
        var state = new GameState
        {
            Version = 1,
            Seed = seed,
            Rng = DeterministicRng.SeedToInt(seed), // 공유 RNG (향후 상호작용용; 현재 미사용)
            Round = 0,
            Phase = BattlePhase.Mulligan,
            ActivePlayer = PlayerSlot.P1,
            Priority = PlayerSlot.P1,
            AttackDeclaredThisRound = false,
            PassStreak = 0,
            Players = new()
            {
                [PlayerSlot.P1] = NewPlayer(PlayerSlot.P1, seed, p1),
                [PlayerSlot.P2] = NewPlayer(PlayerSlot.P2, seed, p2),
            },
        };

        ShuffleDeck(state.Player(PlayerSlot.P1));
        ShuffleDeck(state.Player(PlayerSlot.P2));
        DrawN(state, PlayerSlot.P1, OpeningHand, events);
        DrawN(state, PlayerSlot.P2, OpeningHand, events);
        EmitEvent(events, state, EventActor.System, "battleCreated", new() { ["seed"] = seed });

        state.Log.AddRange(events);
        return (state, events);
    }

    private static PlayerState NewPlayer(PlayerSlot slot, string seed, PlayerSetup setup) => new()
    {
        Slot = slot,
        UserId = setup.UserId,
        // 플레이어별 독립 RNG 스트림 — 셔플/멀리건이 상대·제출순서와 무관 (engine.ts 와 동일 시드 규약)
        Rng = DeterministicRng.SeedToInt($"{seed}:{Tag(slot)}"),
        NexusHealth = StartingNexus,
        Mana = 0,
        MaxMana = 0,
        SpellMana = 0,
        Deck = setup.Deck.Select(c => c.Clone()).ToList(),
        HasAttackToken = slot == PlayerSlot.P1,
    };

    private static string Tag(PlayerSlot slot) => slot == PlayerSlot.P1 ? "p1" : "p2";

    /// <summary>
    /// 라운드 시작 — 마나 적립/충전(+1, 최대 10), 공격토큰 교대, 보드 리셋(재생/버프 만료), 1장 드로우.
    /// (engine.ts beginRound 포팅. 라운드 6+ 챔피언 각성은 후속 단계 TODO.)
    /// </summary>
    public static (GameState State, List<GameEvent> Events) BeginRound(GameState state, int n)
    {
        var s = state.Clone();
        var events = new List<GameEvent>();

        if (n > MaxRounds)
        {
            int h1 = s.Player(PlayerSlot.P1).NexusHealth;
            int h2 = s.Player(PlayerSlot.P2).NexusHealth;
            s.Winner = h1 == h2 ? null : (h1 > h2 ? PlayerSlot.P1 : PlayerSlot.P2);
            s.Phase = BattlePhase.Finished;
            EmitEvent(events, s, EventActor.System, "roundCapReached", new() { ["round"] = n });
            s.Log.AddRange(events);
            return (s, events);
        }

        s.Round = n;
        s.ActivePlayer = n % 2 == 1 ? PlayerSlot.P1 : PlayerSlot.P2;
        s.AttackDeclaredThisRound = false;

        foreach (var slot in new[] { PlayerSlot.P1, PlayerSlot.P2 })
        {
            var p = s.Player(slot);
            p.HasAttackToken = slot == s.ActivePlayer;
            int bankable = Math.Max(0, Math.Min(MaxSpellMana - p.SpellMana, p.Mana)); // 미사용 마나 적립(≤3)
            p.SpellMana = Math.Min(MaxSpellMana, p.SpellMana + bankable);
            p.MaxMana = Math.Min(MaxMana, n);
            p.Mana = p.MaxMana;
            p.HasPassed = false;
            foreach (var u in p.Board)
            {
                u.HasAttacked = false;
                u.IsStunned = false;
                if (u.Keywords.Contains(Keyword.Regeneration)) u.Health = u.MaxHealth;
                if (slot == s.ActivePlayer) TickBuffs(u); // 버프 만료는 "본인 턴" 기준
            }
            DrawN(s, slot, 1, events);
            if (s.Phase == BattlePhase.Finished) { s.Log.AddRange(events); return (s, events); } // 피로사
        }

        s.Phase = BattlePhase.Action;
        s.Priority = s.ActivePlayer;
        s.PassStreak = 0;
        s.Combat = null;
        // TODO(후속 단계): if (n >= 6) LevelUpRoundChampions(s, events);
        EmitEvent(events, s, EventActor.System, "roundStart", new() { ["round"] = n, ["active"] = Tag(s.ActivePlayer) });

        s.Log.AddRange(events);
        return (s, events);
    }

    /// <summary>
    /// 메인 리듀서 — 클라 액션을 검증·적용 후 (새 상태, 이벤트) 반환. 거부 시 원본 상태 + rejected 이벤트.
    /// (1단계: 스캐폴딩. 각 액션 핸들러는 후속 단계에서 채운다 — 멀리건(2) / 시전(3) / 전투(4~5).)
    /// </summary>
    public static (GameState State, List<GameEvent> Events) Apply(GameState state, PlayerSlot actor, BattleAction action)
    {
        if (state.Phase == BattlePhase.Finished)
            return Reject(state, actor, "game_finished");

        return action switch
        {
            MulliganAction => NotImplemented(state, actor, "mulligan"),
            PlayUnitAction => NotImplemented(state, actor, "playUnit"),
            PlaySpellAction => NotImplemented(state, actor, "playSpell"),
            DeclareAttackAction => NotImplemented(state, actor, "declareAttack"),
            DeclareBlockAction => NotImplemented(state, actor, "declareBlock"),
            PassAction => NotImplemented(state, actor, "pass"),
            _ => Reject(state, actor, "unknown_action"),
        };
    }

    private static (GameState, List<GameEvent>) NotImplemented(GameState state, PlayerSlot actor, string what)
        => Reject(state, actor, $"not_implemented:{what}");

    private static (GameState State, List<GameEvent> Events) Reject(GameState state, PlayerSlot actor, string reason)
    {
        var events = new List<GameEvent>();
        EmitReject(events, state, actor, reason);
        return (state, events); // 원본 state 그대로(클론/부분변경 누수 방지)
    }
}
