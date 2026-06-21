using Rangu.Tactics.Proto.V1;          // proto snapshot
using Rangu.Tactics.Server.Mapping;
using Xunit;
using Engine = Rangu.Tactics.Engine;

namespace Rangu.Tactics.Server.Tests;

/// <summary>
/// 안개(fog-of-war) 마스킹 검증 — 보안 핵심: 상대 손패 정체가 절대 새지 않아야 한다.
/// </summary>
public class SnapshotMaskingTests
{
    private static Engine.BattleCard UnitCard(string id, Engine.PlayerSlot owner, int pow, int hp) => new()
    {
        InstanceId = id, CardId = $"def_{id}", Owner = owner, Name = id, Cost = 1, Kind = Engine.CardKind.Unit,
        Unit = new Engine.UnitSpec { Power = pow, Health = hp },
    };

    private static Engine.GameState TwoHandsState()
    {
        var s = new Engine.GameState
        {
            Seed = "secret-seed", Rng = 123456, Round = 2, Phase = Engine.BattlePhase.Action,
            ActivePlayer = Engine.PlayerSlot.P1, Priority = Engine.PlayerSlot.P1,
            Players =
            {
                [Engine.PlayerSlot.P1] = new Engine.PlayerState
                {
                    Slot = Engine.PlayerSlot.P1, UserId = "user-1", NexusHealth = 20, Mana = 2, MaxMana = 2,
                    Hand = { UnitCard("p1c1", Engine.PlayerSlot.P1, 3, 3) },
                    Board = { new Engine.BattleUnit { InstanceId = "p1u1", CardId = "def_p1u1", Owner = Engine.PlayerSlot.P1, Power = 4, BasePower = 4, Health = 2, MaxHealth = 3, BaseMaxHealth = 3 } },
                    Deck = { UnitCard("p1d1", Engine.PlayerSlot.P1, 1, 1), UnitCard("p1d2", Engine.PlayerSlot.P1, 1, 1) },
                },
                [Engine.PlayerSlot.P2] = new Engine.PlayerState
                {
                    Slot = Engine.PlayerSlot.P2, UserId = "user-2", NexusHealth = 18, Mana = 2, MaxMana = 2,
                    Hand = { UnitCard("p2c1", Engine.PlayerSlot.P2, 9, 9), UnitCard("p2c2", Engine.PlayerSlot.P2, 7, 7) },
                    Deck = { UnitCard("p2d1", Engine.PlayerSlot.P2, 1, 1) },
                },
            },
        };
        return s;
    }

    [Fact]
    public void OpponentHand_Hidden_OwnHand_Revealed_FromP1View()
    {
        var snap = SnapshotMapper.ToSnapshot(TwoHandsState(), Engine.PlayerSlot.P1, seq: 7, "m1", serverTimeMs: 0);

        // 내 손패(p1c1) → 공개 + 정의 노출
        var mine = snap.Cards.Single(c => c.InstanceId == "p1c1");
        Assert.Equal(CardView.VisibilityOneofCase.Revealed, mine.VisibilityCase);
        Assert.Equal("def_p1c1", mine.Revealed.DefinitionId);

        // 상대 손패(p2c1, p2c2) → 숨김(HiddenCard) — 정체/스탯 미노출
        foreach (var id in new[] { "p2c1", "p2c2" })
        {
            var oppCard = snap.Cards.Single(c => c.InstanceId == id);
            Assert.Equal(CardView.VisibilityOneofCase.Hidden, oppCard.VisibilityCase);
        }
        // 상대 손패의 definition_id 가 스냅샷 어디에도 새지 않아야
        Assert.DoesNotContain(snap.Cards, c => c.VisibilityCase == CardView.VisibilityOneofCase.Revealed
            && (c.Revealed.DefinitionId == "def_p2c1" || c.Revealed.DefinitionId == "def_p2c2"));

        // 보드 유닛은 양쪽 공개
        var oppBoardCount = snap.Cards.Count(c => c.Zone == Zone.Battlefield && c.Controller.Seat == 1);
        // (P2 보드는 비었으므로 0) — P1 보드 유닛은 공개
        var myUnit = snap.Cards.Single(c => c.InstanceId == "p1u1");
        Assert.Equal(CardView.VisibilityOneofCase.Revealed, myUnit.VisibilityCase);
        Assert.Equal(4, myUnit.Revealed.CurrentPower);
        Assert.Equal(1, myUnit.Revealed.Damage); // maxHealth 3 - health 2

        // 개수/공개 상태
        var p2 = snap.Players.Single(p => p.Player.Seat == 1);
        Assert.Equal(2, p2.HandCount); // 손패 장수는 공개
        Assert.Equal(1, p2.DeckCount);
        Assert.Equal(18, p2.NexusHealth);
        Assert.Equal(0, oppBoardCount);
    }

    [Fact]
    public void Symmetric_FromP2View_OpponentHandHidden()
    {
        var snap = SnapshotMapper.ToSnapshot(TwoHandsState(), Engine.PlayerSlot.P2, seq: 7, "m1", serverTimeMs: 0);

        // P2 시점: 내 손패(p2c1) 공개, 상대(p1c1) 숨김
        Assert.Equal(CardView.VisibilityOneofCase.Revealed, snap.Cards.Single(c => c.InstanceId == "p2c1").VisibilityCase);
        Assert.Equal(CardView.VisibilityOneofCase.Hidden, snap.Cards.Single(c => c.InstanceId == "p1c1").VisibilityCase);
        Assert.Equal(1u, snap.Viewer.Seat); // viewer = P2(seat 1)
    }

    [Fact]
    public void Snapshot_NeverLeaks_SeedOrRng()
    {
        // proto GameStateSnapshot 에는 seed/rng 필드 자체가 없다 → 직렬화해도 비밀 미포함.
        var snap = SnapshotMapper.ToSnapshot(TwoHandsState(), Engine.PlayerSlot.P1, 1, "m1", 0);
        var bytes = Google.Protobuf.MessageExtensions.ToByteArray(snap);
        var text = System.Text.Encoding.UTF8.GetString(bytes);
        Assert.DoesNotContain("secret-seed", text); // seed 문자열이 와이어에 없음
    }
}
