using Rangu.Tactics.Engine;
using Xunit;

namespace Rangu.Tactics.Engine.Tests;

/// <summary>3단계 — 시전(유닛/주문) + 우선권 핑퐁 + 스택 LIFO 해결.</summary>
public class CastTests
{
    private static BattleCard Unit(string id, PlayerSlot owner, int cost, int pow, int hp, params Keyword[] kw) => new()
    {
        InstanceId = id, CardId = id, Owner = owner, Name = id, Cost = cost, Kind = CardKind.Unit,
        Unit = new UnitSpec { Power = pow, Health = hp, Keywords = kw.ToList() },
    };

    private static BattleCard Spell(string id, PlayerSlot owner, int cost, SpellSpeed speed, SpellEffect eff, bool needsTarget = false) => new()
    {
        InstanceId = id, CardId = id, Owner = owner, Name = id, Cost = cost, Kind = CardKind.Spell,
        Spell = new SpellSpec { Speed = speed, Effect = eff, NeedsTarget = needsTarget },
    };

    /// <summary>액션 단계, round 1, 양쪽 마나 1/1, p1 우선권/공격토큰인 상태.</summary>
    private static GameState ActionState()
    {
        return new GameState
        {
            Seed = "t", Rng = 1, Round = 1, Phase = BattlePhase.Action,
            ActivePlayer = PlayerSlot.P1, Priority = PlayerSlot.P1, PassStreak = 0,
            Players =
            {
                [PlayerSlot.P1] = new PlayerState { Slot = PlayerSlot.P1, NexusHealth = 20, Mana = 3, MaxMana = 3, MulliganDone = true, HasAttackToken = true },
                [PlayerSlot.P2] = new PlayerState { Slot = PlayerSlot.P2, NexusHealth = 20, Mana = 3, MaxMana = 3, MulliganDone = true },
            },
        };
    }

    [Fact]
    public void PlayUnit_PlacesOnBoard_DeductsMana_YieldsPriority()
    {
        var s0 = ActionState();
        s0.Player(PlayerSlot.P1).Hand.Add(Unit("u1", PlayerSlot.P1, cost: 2, pow: 2, hp: 3));

        var (s, ev) = GameEngine.Apply(s0, PlayerSlot.P1, new PlayUnitAction("u1"));

        var p1 = s.Player(PlayerSlot.P1);
        Assert.Single(p1.Board);
        Assert.Equal("u1", p1.Board[0].CardId);
        Assert.Equal(2, p1.Board[0].Power);
        Assert.Equal(1, p1.Mana);              // 3 - 2
        Assert.Empty(p1.Hand);
        Assert.Equal(PlayerSlot.P2, s.Priority); // 상대 대응 윈도우로 양도
        Assert.Contains(ev, e => e.Type == "playUnit");

        Assert.Empty(s0.Player(PlayerSlot.P1).Board); // 입력 불변성
    }

    [Fact]
    public void PlaySpell_Fast_PushesToStack_AndYieldsPriority()
    {
        var s0 = ActionState();
        s0.Player(PlayerSlot.P1).Hand.Add(Spell("s1", PlayerSlot.P1, 1, SpellSpeed.Fast,
            new SpellEffect { Kind = SpellEffectKind.DamageNexus, Amount = 3 }));

        var (s, ev) = GameEngine.Apply(s0, PlayerSlot.P1, new PlaySpellAction("s1"));

        Assert.Single(s.Stack);
        Assert.Equal(SpellEffectKind.DamageNexus, s.Stack[0].Effect.Kind);
        Assert.Equal(PlayerSlot.P2, s.Priority);
        Assert.Equal(20, s.Player(PlayerSlot.P2).NexusHealth); // 아직 해결 전
        Assert.Contains(ev, e => e.Type == "playSpell");
    }

    [Fact]
    public void TwoConsecutivePasses_ResolvesStack_LIFO()
    {
        // p1 가 fast 주문(상대 본진 3딜) 시전 → 스택. p2 패스 → p1 패스 → 해결.
        var s0 = ActionState();
        s0.Player(PlayerSlot.P1).Hand.Add(Spell("s1", PlayerSlot.P1, 1, SpellSpeed.Fast,
            new SpellEffect { Kind = SpellEffectKind.DamageNexus, Amount = 3 }));

        var (s1, _) = GameEngine.Apply(s0, PlayerSlot.P1, new PlaySpellAction("s1")); // 스택, 우선권 p2
        var (s2, _) = GameEngine.Apply(s1, PlayerSlot.P2, new PassAction());           // passStreak 1, 우선권 p1
        Assert.Single(s2.Stack);
        Assert.Equal(PlayerSlot.P1, s2.Priority);

        var (s3, ev) = GameEngine.Apply(s2, PlayerSlot.P1, new PassAction());           // passStreak 2 → 해결

        Assert.Empty(s3.Stack);                                  // 스택 해결됨
        Assert.Equal(17, s3.Player(PlayerSlot.P2).NexusHealth);  // 본진 20 - 3
        Assert.Equal(PlayerSlot.P1, s3.Priority);                // 해결 후 능동 플레이어
        Assert.Equal(0, s3.PassStreak);
        Assert.Contains(ev, e => e.Type == "spellResolved");
    }

    [Fact]
    public void PlaySpell_Burst_ResolvesImmediately_NoStack_KeepsPriority()
    {
        var s0 = ActionState();
        s0.Player(PlayerSlot.P1).NexusHealth = 15;
        s0.Player(PlayerSlot.P1).Hand.Add(Spell("heal", PlayerSlot.P1, 1, SpellSpeed.Burst,
            new SpellEffect { Kind = SpellEffectKind.HealNexus, Amount = 2 }));

        var (s, ev) = GameEngine.Apply(s0, PlayerSlot.P1, new PlaySpellAction("heal"));

        Assert.Empty(s.Stack);                                 // 즉발 — 스택 안 쌓임
        Assert.Equal(17, s.Player(PlayerSlot.P1).NexusHealth); // 15 + 2
        Assert.Equal(PlayerSlot.P1, s.Priority);               // 우선권 유지(양보 X)
        Assert.Contains(ev, e => e.Type == "spellResolved");
    }

    [Fact]
    public void BuffTeam_Burst_BuffsAllAllyUnits()
    {
        var s0 = ActionState();
        var p1 = s0.Player(PlayerSlot.P1);
        // 보드에 유닛 2기 (BattleUnit 직접 배치)
        p1.Board.Add(new BattleUnit { InstanceId = "a", CardId = "a", Owner = PlayerSlot.P1, Power = 1, BasePower = 1, Health = 2, MaxHealth = 2, BaseMaxHealth = 2 });
        p1.Board.Add(new BattleUnit { InstanceId = "b", CardId = "b", Owner = PlayerSlot.P1, Power = 3, BasePower = 3, Health = 1, MaxHealth = 1, BaseMaxHealth = 1 });
        p1.Hand.Add(Spell("rally", PlayerSlot.P1, 1, SpellSpeed.Burst,
            new SpellEffect { Kind = SpellEffectKind.BuffTeam, Amount = 1, Duration = null }));

        var (s, _) = GameEngine.Apply(s0, PlayerSlot.P1, new PlaySpellAction("rally"));

        var board = s.Player(PlayerSlot.P1).Board;
        Assert.Equal(2, board[0].Power); // 1 + 1
        Assert.Equal(4, board[1].Power); // 3 + 1
    }

    [Fact]
    public void PlayUnit_WithoutPriority_IsRejected()
    {
        var s0 = ActionState();
        s0.Priority = PlayerSlot.P2; // p1 차례 아님
        s0.Player(PlayerSlot.P1).Hand.Add(Unit("u1", PlayerSlot.P1, 1, 1, 1));

        var (s, ev) = GameEngine.Apply(s0, PlayerSlot.P1, new PlayUnitAction("u1"));

        Assert.Same(s0, s); // 거부 → 원본
        Assert.Contains(ev, e => e.Type == "rejected" && (e.Detail!["reason"] as string) == "no_priority");
    }
}
