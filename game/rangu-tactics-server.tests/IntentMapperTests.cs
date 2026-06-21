using Rangu.Tactics.Proto.V1;
using Rangu.Tactics.Server.Mapping;
using Xunit;
using Engine = Rangu.Tactics.Engine;

namespace Rangu.Tactics.Server.Tests;

/// <summary>proto Intent → 엔진 BattleAction 매핑 검증 (play_card 유닛/주문 분기 포함).</summary>
public class IntentMapperTests
{
    private static Engine.GameState StateWithHand()
    {
        return new Engine.GameState
        {
            Phase = Engine.BattlePhase.Action, ActivePlayer = Engine.PlayerSlot.P1, Priority = Engine.PlayerSlot.P1,
            Players =
            {
                [Engine.PlayerSlot.P1] = new Engine.PlayerState
                {
                    Slot = Engine.PlayerSlot.P1,
                    Hand =
                    {
                        new Engine.BattleCard { InstanceId = "u1", CardId = "u", Owner = Engine.PlayerSlot.P1, Kind = Engine.CardKind.Unit, Unit = new() { Power = 1, Health = 1 } },
                        new Engine.BattleCard { InstanceId = "s1", CardId = "s", Owner = Engine.PlayerSlot.P1, Kind = Engine.CardKind.Spell, Spell = new() { Speed = Engine.SpellSpeed.Fast, Effect = new() { Kind = Engine.SpellEffectKind.DamageNexus, Amount = 1 } } },
                    },
                },
                [Engine.PlayerSlot.P2] = new Engine.PlayerState { Slot = Engine.PlayerSlot.P2 },
            },
        };
    }

    [Fact]
    public void PlayCard_Unit_MapsToPlayUnit()
    {
        var act = IntentMapper.ToAction(new Intent { PlayCard = new PlayCardIntent { CardInstanceId = "u1" } }, StateWithHand(), Engine.PlayerSlot.P1);
        Assert.Equal("u1", Assert.IsType<Engine.PlayUnitAction>(act).InstanceId);
    }

    [Fact]
    public void PlayCard_Spell_MapsToPlaySpell_WithTargets()
    {
        var intent = new Intent { PlayCard = new PlayCardIntent { CardInstanceId = "s1" } };
        intent.PlayCard.Targets.Add(new Target { CardInstanceId = "x9" });
        var ps = Assert.IsType<Engine.PlaySpellAction>(IntentMapper.ToAction(intent, StateWithHand(), Engine.PlayerSlot.P1));
        Assert.Equal("s1", ps.InstanceId);
        Assert.Equal("x9", Assert.Single(ps.Targets!).InstanceId);
    }

    [Fact]
    public void Mulligan_MapsIds()
    {
        var intent = new Intent { Mulligan = new MulliganIntent() };
        intent.Mulligan.ReplaceCardInstanceIds.AddRange(new[] { "u1", "s1" });
        var m = Assert.IsType<Engine.MulliganAction>(IntentMapper.ToAction(intent, StateWithHand(), Engine.PlayerSlot.P1));
        Assert.Equal(new[] { "u1", "s1" }, m.Replace);
    }

    [Fact]
    public void DeclareAttack_MapsAttackersAndChallenges()
    {
        var intent = new Intent { DeclareAttack = new DeclareAttackIntent() };
        intent.DeclareAttack.AttackerInstanceIds.Add("a1");
        intent.DeclareAttack.Pulls.Add(new ChallengerPull { AttackerInstanceId = "a1", TargetBlockerInstanceId = "b1" });
        var da = Assert.IsType<Engine.DeclareAttackAction>(IntentMapper.ToAction(intent, StateWithHand(), Engine.PlayerSlot.P1));
        Assert.Equal(new[] { "a1" }, da.Attackers);
        Assert.Equal("b1", da.Challenges!["a1"]);
    }

    [Fact]
    public void DeclareBlock_MapsAttackerToBlocker()
    {
        var intent = new Intent { DeclareBlock = new DeclareBlockIntent() };
        intent.DeclareBlock.Blocks.Add(new BlockAssignment { AttackerInstanceId = "a1", BlockerInstanceId = "b1" });
        var db = Assert.IsType<Engine.DeclareBlockAction>(IntentMapper.ToAction(intent, StateWithHand(), Engine.PlayerSlot.P1));
        Assert.Equal("b1", db.Blocks["a1"]);
    }

    [Fact]
    public void Pass_Maps_And_Concede_IsUnmapped()
    {
        Assert.IsType<Engine.PassAction>(IntentMapper.ToAction(new Intent { Pass = new PassIntent() }, StateWithHand(), Engine.PlayerSlot.P1));
        Assert.Null(IntentMapper.ToAction(new Intent { Concede = new ConcedeIntent() }, StateWithHand(), Engine.PlayerSlot.P1));
    }
}
