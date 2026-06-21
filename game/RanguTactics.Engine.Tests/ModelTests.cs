using Rangu.Tactics.Engine;
using Xunit;

namespace Rangu.Tactics.Engine.Tests;

/// <summary>도메인 모델의 강타입 헬퍼 + Clone 독립성(리듀서 입력 비변형의 토대).</summary>
public class ModelTests
{
    [Fact]
    public void PlayerSlot_Other_Flips()
    {
        Assert.Equal(PlayerSlot.P2, PlayerSlot.P1.Other());
        Assert.Equal(PlayerSlot.P1, PlayerSlot.P2.Other());
    }

    [Fact]
    public void TargetRef_Factories_Discriminate()
    {
        var unit = TargetRef.Unit("u-1");
        Assert.Equal(TargetKind.Unit, unit.Kind);
        Assert.Equal("u-1", unit.InstanceId);
        Assert.Null(unit.Slot);

        var nexus = TargetRef.Nexus(PlayerSlot.P2);
        Assert.Equal(TargetKind.Nexus, nexus.Kind);
        Assert.Equal(PlayerSlot.P2, nexus.Slot);
        Assert.Null(nexus.InstanceId);
    }

    [Fact]
    public void GameStateClone_IsDeep_MutatingCloneDoesNotTouchOriginal()
    {
        var state = new GameState
        {
            Seed = "s", Rng = 42u, Round = 1, Phase = BattlePhase.Action,
            Players =
            {
                [PlayerSlot.P1] = new PlayerState
                {
                    Slot = PlayerSlot.P1, NexusHealth = 20,
                    Board = { new BattleUnit { InstanceId = "u1", Power = 2, Health = 3, Keywords = { Keyword.Overwhelm } } },
                },
                [PlayerSlot.P2] = new PlayerState { Slot = PlayerSlot.P2, NexusHealth = 20 },
            },
        };

        var clone = state.Clone();
        clone.Players[PlayerSlot.P1].NexusHealth = 5;
        clone.Players[PlayerSlot.P1].Board[0].Power = 99;
        clone.Players[PlayerSlot.P1].Board[0].Keywords.Add(Keyword.Taunt);

        // 원본은 그대로여야 한다 (깊은 복사 = 리듀서가 입력을 변형하지 않을 토대)
        Assert.Equal(20, state.Players[PlayerSlot.P1].NexusHealth);
        Assert.Equal(2, state.Players[PlayerSlot.P1].Board[0].Power);
        Assert.Single(state.Players[PlayerSlot.P1].Board[0].Keywords);
    }

    [Fact]
    public void BattleAction_PatternMatches()
    {
        BattleAction action = new PlaySpellAction("c1", new[] { TargetRef.Unit("u1") });
        var described = action switch
        {
            MulliganAction => "mulligan",
            PlayUnitAction => "unit",
            PlaySpellAction s => $"spell:{s.InstanceId}:{s.Targets!.Count}",
            DeclareAttackAction => "attack",
            DeclareBlockAction => "block",
            PassAction => "pass",
            _ => "?",
        };
        Assert.Equal("spell:c1:1", described);
    }
}
