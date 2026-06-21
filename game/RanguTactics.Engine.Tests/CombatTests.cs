using Rangu.Tactics.Engine;
using Xunit;

namespace Rangu.Tactics.Engine.Tests;

/// <summary>4단계 — 전투: 공격/블록 선언, 도전·Taunt 강제, 키워드 전투 해결.</summary>
public class CombatTests
{
    private static BattleUnit BU(string id, PlayerSlot owner, int pow, int hp, params Keyword[] kw) => new()
    {
        InstanceId = id, CardId = id, Owner = owner, Name = id,
        Power = pow, BasePower = pow, Health = hp, MaxHealth = hp, BaseMaxHealth = hp,
        Keywords = kw.ToList(), BaseKeywords = kw.ToList(),
        SummonedRound = 0, HasAttacked = false,
    };

    /// <summary>round 2, 액션 단계, p1 공격측(우선권/토큰). 보드는 테스트가 채운다.</summary>
    private static GameState CombatReady() => new()
    {
        Seed = "t", Rng = 1, Round = 2, Phase = BattlePhase.Action,
        ActivePlayer = PlayerSlot.P1, Priority = PlayerSlot.P1, PassStreak = 0,
        Players =
        {
            [PlayerSlot.P1] = new PlayerState { Slot = PlayerSlot.P1, NexusHealth = 20, MulliganDone = true, HasAttackToken = true },
            [PlayerSlot.P2] = new PlayerState { Slot = PlayerSlot.P2, NexusHealth = 20, MulliganDone = true },
        },
    };

    private static Dictionary<string, string> Block(string attacker, string blocker) => new() { [attacker] = blocker };

    /// <summary>blocksDeclared 이후 양쪽 패스로 전투를 해결시킨다.</summary>
    private static (GameState, List<GameEvent>) ResolveByPasses(GameState afterBlock)
    {
        var (a, _) = GameEngine.Apply(afterBlock, PlayerSlot.P1, new PassAction()); // 공격자 패스
        return GameEngine.Apply(a, PlayerSlot.P2, new PassAction());                 // 수비자 패스 → 전투 해결
    }

    [Fact]
    public void Taunt_ForcesDefenderToBlockWithTauntUnit()
    {
        var s0 = CombatReady();
        s0.Player(PlayerSlot.P1).Board.Add(BU("atk", PlayerSlot.P1, 2, 2, Keyword.QuickAttack));
        s0.Player(PlayerSlot.P2).Board.Add(BU("taunt", PlayerSlot.P2, 1, 3, Keyword.Taunt));
        s0.Player(PlayerSlot.P2).Board.Add(BU("norm", PlayerSlot.P2, 1, 1));

        var (s1, _) = GameEngine.Apply(s0, PlayerSlot.P1, new DeclareAttackAction(new[] { "atk" }));
        Assert.Equal(BattlePhase.DeclareBlock, s1.Phase);
        Assert.Equal(PlayerSlot.P2, s1.Priority);

        // 비-Taunt(norm)로 막으려 하면 거부
        var (sBad, evBad) = GameEngine.Apply(s1, PlayerSlot.P2, new DeclareBlockAction(Block("atk", "norm")));
        Assert.Same(s1, sBad);
        Assert.Contains(evBad, e => e.Type == "rejected" && (e.Detail!["reason"] as string) == "taunt_must_block_first");

        // Taunt 유닛으로 막으면 허용
        var (sOk, _) = GameEngine.Apply(s1, PlayerSlot.P2, new DeclareBlockAction(Block("atk", "taunt")));
        Assert.True(sOk.Combat!.BlocksDeclared);
        Assert.Equal("taunt", sOk.Combat.Blocks["atk"]);
    }

    [Fact]
    public void Tough_SurvivesAnd_Lifesteal_HealsNexus()
    {
        var s0 = CombatReady();
        s0.Player(PlayerSlot.P1).Board.Add(BU("atk", PlayerSlot.P1, 2, 3, Keyword.Lifesteal)); // 파워2, 흡혈
        s0.Player(PlayerSlot.P2).Board.Add(BU("def", PlayerSlot.P2, 1, 4, Keyword.Tough));      // 파워1, 끈질김, 체4

        var (s1, _) = GameEngine.Apply(s0, PlayerSlot.P1, new DeclareAttackAction(new[] { "atk" }));
        var (s2, _) = GameEngine.Apply(s1, PlayerSlot.P2, new DeclareBlockAction(Block("atk", "def")));
        var (s3, ev) = ResolveByPasses(s2);

        var p1 = s3.Player(PlayerSlot.P1);
        var p2 = s3.Player(PlayerSlot.P2);
        // 끈질김: 파워2 피해 → 1 경감 → 1 피해 → def 체력 4-1=3 (생존)
        Assert.Single(p2.Board);
        Assert.Equal(3, p2.Board[0].Health);
        // 반격: def 파워1 → atk 체력 3-1=2 (생존)
        Assert.Single(p1.Board);
        Assert.Equal(2, p1.Board[0].Health);
        // 흡혈: atk 가 실제로 가한 피해(1)만큼 본진 회복 → 20+1=21
        Assert.Equal(21, p1.NexusHealth);
        Assert.Equal(BattlePhase.Action, s3.Phase);
        Assert.Contains(ev, e => e.Type == "combatResolved");
    }

    [Fact]
    public void QuickAttack_StrikesFirst_NoCounterIfBlockerDies()
    {
        var s0 = CombatReady();
        s0.Player(PlayerSlot.P1).Board.Add(BU("atk", PlayerSlot.P1, 3, 2, Keyword.QuickAttack)); // 파워3 속공
        s0.Player(PlayerSlot.P2).Board.Add(BU("def", PlayerSlot.P2, 3, 2));                       // 파워3 체2

        var (s1, _) = GameEngine.Apply(s0, PlayerSlot.P1, new DeclareAttackAction(new[] { "atk" }));
        var (s2, _) = GameEngine.Apply(s1, PlayerSlot.P2, new DeclareBlockAction(Block("atk", "def")));
        var (s3, _) = ResolveByPasses(s2);

        // 속공: atk 가 먼저 3딜 → def(체2) 사망 → 반격 없음 → atk 무손상 생존
        Assert.Empty(s3.Player(PlayerSlot.P2).Board);              // def 사망
        Assert.Single(s3.Player(PlayerSlot.P1).Board);
        Assert.Equal(2, s3.Player(PlayerSlot.P1).Board[0].Health); // atk 풀피
    }

    [Fact]
    public void Overwhelm_SpillsExcessToNexus()
    {
        var s0 = CombatReady();
        s0.Player(PlayerSlot.P1).Board.Add(BU("atk", PlayerSlot.P1, 4, 3, Keyword.Overwhelm)); // 파워4 일격
        s0.Player(PlayerSlot.P2).Board.Add(BU("def", PlayerSlot.P2, 1, 2));                     // 체2

        var (s1, _) = GameEngine.Apply(s0, PlayerSlot.P1, new DeclareAttackAction(new[] { "atk" }));
        var (s2, _) = GameEngine.Apply(s1, PlayerSlot.P2, new DeclareBlockAction(Block("atk", "def")));
        var (s3, _) = ResolveByPasses(s2);

        // 일격: def(체2) 처치 후 초과분 4-2=2 본진 관통 → 20-2=18
        Assert.Empty(s3.Player(PlayerSlot.P2).Board);
        Assert.Equal(18, s3.Player(PlayerSlot.P2).NexusHealth);
    }

    [Fact]
    public void Challenger_ForcesPulledUnitToBlock()
    {
        var s0 = CombatReady();
        s0.Player(PlayerSlot.P1).Board.Add(BU("atk", PlayerSlot.P1, 2, 2, Keyword.Challenger));
        s0.Player(PlayerSlot.P2).Board.Add(BU("target", PlayerSlot.P2, 1, 3));
        s0.Player(PlayerSlot.P2).Board.Add(BU("other", PlayerSlot.P2, 1, 3));

        // atk 가 target 을 끌어냄
        var (s1, _) = GameEngine.Apply(s0, PlayerSlot.P1,
            new DeclareAttackAction(new[] { "atk" }, new Dictionary<string, string> { ["atk"] = "target" }));

        // 끌려온 target 이 아닌 other 로 막으려 하면 거부
        var (sBad, evBad) = GameEngine.Apply(s1, PlayerSlot.P2, new DeclareBlockAction(Block("atk", "other")));
        Assert.Same(s1, sBad);
        Assert.Contains(evBad, e => e.Type == "rejected" && (e.Detail!["reason"] as string) == "challenged_must_block");

        // target 으로 막으면 허용
        var (sOk, _) = GameEngine.Apply(s1, PlayerSlot.P2, new DeclareBlockAction(Block("atk", "target")));
        Assert.True(sOk.Combat!.BlocksDeclared);
    }

    [Fact]
    public void UnblockedAttacker_HitsNexusDirectly()
    {
        var s0 = CombatReady();
        s0.Player(PlayerSlot.P1).Board.Add(BU("atk", PlayerSlot.P1, 3, 2));

        var (s1, _) = GameEngine.Apply(s0, PlayerSlot.P1, new DeclareAttackAction(new[] { "atk" }));
        var (s2, _) = GameEngine.Apply(s1, PlayerSlot.P2, new PassAction()); // 수비자 블록 안 함
        var (s3, _) = ResolveByPasses(s2);

        Assert.Equal(17, s3.Player(PlayerSlot.P2).NexusHealth); // 20 - 3
        Assert.Equal(BattlePhase.Action, s3.Phase);
    }
}
