namespace Rangu.Tactics.Engine;

/// <summary>
/// 랑구 택틱스 결정론 룰 엔진 (서버 권위). src/lib/battle/engine.ts 의 C# 포팅.
///
/// 모든 상태 변화는 셋업(CreateBattle) 또는 Apply(state, actor, action) 한 곳을 통해서만.
/// ★ 입력 state 를 절대 변형하지 않고 Clone() 한 새 상태를 반환(순수 리듀서).
/// ★ 이벤트는 반환값(List&lt;GameEvent&gt;)으로 흘려보낸다(이벤트 버스) + state.Log 에도 누적.
/// ★ 룰 전이는 전부 엔진이 전담 — 멀리건 양쪽 완료 시 BeginRound(1)도 리듀서 안에서 일어난다
///   (오케스트레이터 인젝션 X → race 없음, 결정론/원자성 보장).
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

    // ── 셋업 ──────────────────────────────────────────────────────

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

    // ── 라운드 시작 ───────────────────────────────────────────────

    /// <summary>라운드 시작 (공개 진입점, clone 래퍼). 일반 흐름에선 리듀서가 호출하지만 셋업/테스트용으로 노출.</summary>
    public static (GameState State, List<GameEvent> Events) BeginRound(GameState state, int n)
    {
        var s = state.Clone();
        var events = new List<GameEvent>();
        BeginRoundInPlace(s, n, events);
        s.Log.AddRange(events);
        return (s, events);
    }

    /// <summary>
    /// 라운드 시작 로직 (in-place) — 마나 적립/충전(+1, 최대 10), 공격토큰 교대,
    /// 보드 리셋(재생/버프 만료), 1장 드로우. (engine.ts beginRound 포팅.)
    /// 이미 clone 된 s 위에서 동작한다(리듀서가 단일 clone 으로 연쇄 전이).
    /// </summary>
    private static void BeginRoundInPlace(GameState s, int n, List<GameEvent> events)
    {
        if (n > MaxRounds)
        {
            int h1 = s.Player(PlayerSlot.P1).NexusHealth;
            int h2 = s.Player(PlayerSlot.P2).NexusHealth;
            s.Winner = h1 == h2 ? null : (h1 > h2 ? PlayerSlot.P1 : PlayerSlot.P2);
            s.Phase = BattlePhase.Finished;
            EmitEvent(events, s, EventActor.System, "roundCapReached", new() { ["round"] = n });
            return;
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
            if (s.Phase == BattlePhase.Finished) return; // 피로사(deck-out)
        }

        s.Phase = BattlePhase.Action;
        s.Priority = s.ActivePlayer;
        s.PassStreak = 0;
        s.Combat = null;
        EmitEvent(events, s, EventActor.System, "roundStart", new() { ["round"] = n, ["active"] = Tag(s.ActivePlayer) });
        if (n >= 6) LevelUpRoundChampions(s, events); // R6+ : 보드의 챔피언 각성(Lv.1→2)
    }

    /// <summary>
    /// R6+ 라운드 시작 시 보드의 모든 미각성 챔피언을 각성(Lv.1→2). 영구·1회.
    /// 효과: +3/+3(Base+현재) + 풀힐 + 시그니처 키워드(Overwhelm). championAwakened 이벤트 발사.
    /// 결정론: P1→P2, 보드 순서 고정. 각성 상태의 단일 소스 = ChampionLevel(>=2).
    /// </summary>
    private static void LevelUpRoundChampions(GameState s, List<GameEvent> events)
    {
        const int awakenBonus = 3;
        const Keyword signature = Keyword.Overwhelm;
        foreach (var slot in new[] { PlayerSlot.P1, PlayerSlot.P2 })
        {
            foreach (var u in s.Player(slot).Board)
            {
                if (!u.IsChampion || u.ChampionLevel >= 2) continue;
                u.ChampionLevel = 2;
                u.BasePower += awakenBonus;
                u.Power += awakenBonus;
                u.BaseMaxHealth += awakenBonus;
                u.MaxHealth += awakenBonus;
                u.Health = u.MaxHealth;                                  // 각성 = 풀힐
                if (!u.BaseKeywords.Contains(signature)) u.BaseKeywords.Add(signature);
                if (!u.Keywords.Contains(signature)) u.Keywords.Add(signature);
                EmitEvent(events, s, EventActor.System, "championAwakened", new()
                {
                    ["instanceId"] = u.InstanceId,
                    ["name"] = u.Name,
                    ["owner"] = Tag(u.Owner),
                    ["power"] = u.Power,
                    ["health"] = u.Health,
                    ["level"] = u.ChampionLevel,
                    ["keyword"] = signature.ToString(),
                });
            }
        }
    }

    // ── 메인 리듀서 ───────────────────────────────────────────────

    /// <summary>
    /// 클라 액션을 검증·적용 후 (새 상태, 이벤트) 반환. 거부 시 원본 상태 그대로 + rejected 이벤트.
    /// 단일 Clone() 후 내부 핸들러가 그 위에서 연쇄 전이한다(engine.ts applyAction 구조).
    /// </summary>
    public static (GameState State, List<GameEvent> Events) Apply(GameState state, PlayerSlot actor, BattleAction action)
    {
        if (state.Phase == BattlePhase.Finished)
            return Reject(state, actor, "game_finished");

        var s = state.Clone();
        var events = new List<GameEvent>();

        string? error = action switch
        {
            MulliganAction m => DoMulligan(s, actor, m.Replace, events),
            PlayUnitAction a => DoPlayUnit(s, actor, a.InstanceId, events),
            PlaySpellAction a => DoPlaySpell(s, actor, a.InstanceId, a.Targets, events),
            DeclareAttackAction a => DoDeclareAttack(s, actor, a.Attackers, a.Challenges, events),
            DeclareBlockAction a => DoDeclareBlock(s, actor, a.Blocks, events),
            PassAction => DoPass(s, actor, events),
            _ => "unknown_action",
        };

        if (error is not null)
            return Reject(state, actor, error); // 원본 그대로 (클론/부분변경 누수 방지)

        s.Log.AddRange(events);
        return (s, events);
    }

    // ── 멀리건 (2단계) ────────────────────────────────────────────

    /// <summary>
    /// 멀리건 — 선택 카드(instanceId)를 핸드에서 제거→덱 반환→플레이어 RNG 셔플→같은 수 재드로우.
    /// 양쪽 완료 시 BeginRound(1) 자동 전이. 성공 시 null, 실패 시 사유 문자열 반환.
    /// </summary>
    private static string? DoMulligan(GameState s, PlayerSlot slot, IReadOnlyList<string> replace, List<GameEvent> events)
    {
        if (s.Phase != BattlePhase.Mulligan) return "wrong_phase:not_mulligan";
        var p = s.Player(slot);
        if (p.MulliganDone) return "already_mulliganed";

        var replaceSet = new HashSet<string>(replace);
        var toReplace = p.Hand.Where(c => replaceSet.Contains(c.InstanceId)).ToList(); // 핸드 순서 보존
        p.Hand = p.Hand.Where(c => !replaceSet.Contains(c.InstanceId)).ToList();
        p.Deck.AddRange(toReplace);              // 덱 끝에 되돌림
        ShuffleDeck(p);                          // 플레이어 전용 RNG 셔플
        DrawN(s, slot, toReplace.Count, events); // 제거한 수만큼 재드로우
        p.MulliganDone = true;
        EmitEvent(events, s, slot.ToActor(), "mulligan", new() { ["replaced"] = toReplace.Count });

        // ★ 양쪽 완료 → 리듀서가 라운드 1 로 단일 전이 (순수성/원자성)
        if (s.Player(PlayerSlot.P1).MulliganDone && s.Player(PlayerSlot.P2).MulliganDone)
            BeginRoundInPlace(s, 1, events);

        return null;
    }

    // ── 거부 ──────────────────────────────────────────────────────

    private static (GameState State, List<GameEvent> Events) Reject(GameState state, PlayerSlot actor, string reason)
    {
        var events = new List<GameEvent>();
        EmitReject(events, state, actor, reason);
        return (state, events);
    }
}
