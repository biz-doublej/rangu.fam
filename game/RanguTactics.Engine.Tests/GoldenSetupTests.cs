using Rangu.Tactics.Engine;
using Xunit;

namespace Rangu.Tactics.Engine.Tests;

/// <summary>
/// 1단계 골든 테스트 — 매치 셋업/드로우/마나가 TS 엔진(engine.ts createBattle/beginRound)과 일치하는지.
/// 기준 셔플 순열은 seed "match-1" 로 node 에서 rng.ts 를 돌려 산출:
///   p1 seededShuffle([0..7]) = [4,0,6,7,2,5,1,3], p2 = [2,6,3,7,4,0,1,5].
/// </summary>
public class GoldenSetupTests
{
    private static List<BattleCard> Deck(PlayerSlot owner) =>
        Enumerable.Range(0, 8).Select(i => new BattleCard
        {
            InstanceId = $"{owner}-{i}", CardId = $"c{i}", Owner = owner, Name = $"c{i}",
            Cost = 1, Kind = CardKind.Unit, Unit = new UnitSpec { Power = 1, Health = 1 },
        }).ToList();

    private static string[] Ids(IEnumerable<BattleCard> cards) => cards.Select(c => c.CardId).ToArray();

    [Fact]
    public void CreateBattle_ShufflesAndDrawsOpeningHand_MatchesTsGolden()
    {
        var (s, events) = GameEngine.CreateBattle("match-1",
            new(null, Deck(PlayerSlot.P1)), new(null, Deck(PlayerSlot.P2)));

        Assert.Equal(BattlePhase.Mulligan, s.Phase);
        Assert.Equal(0, s.Round);

        var p1 = s.Player(PlayerSlot.P1);
        var p2 = s.Player(PlayerSlot.P2);

        // p1 셔플 [4,0,6,7,2,5,1,3] → 앞 4장 = 오프닝 핸드, 나머지 = 덱
        Assert.Equal(new[] { "c4", "c0", "c6", "c7" }, Ids(p1.Hand));
        Assert.Equal(new[] { "c2", "c5", "c1", "c3" }, Ids(p1.Deck));
        // p2 셔플 [2,6,3,7,4,0,1,5]
        Assert.Equal(new[] { "c2", "c6", "c3", "c7" }, Ids(p2.Hand));
        Assert.Equal(new[] { "c4", "c0", "c1", "c5" }, Ids(p2.Deck));

        Assert.Equal(8, p1.Hand.Count + p1.Deck.Count); // 카드 보존

        Assert.Equal((0, 0), (p1.Mana, p1.MaxMana)); // 마나는 BeginRound 전까지 0/0
        Assert.Equal(20, p1.NexusHealth);
        Assert.True(p1.HasAttackToken);
        Assert.False(p2.HasAttackToken);

        // RNG 상태 = TS 와 동일 (셔플 후)
        Assert.Equal(960083351u, s.Rng);       // 공유 seedToInt("match-1")
        Assert.Equal(28977417u, p1.Rng);       // p1 셔플 후
        Assert.Equal(2517812169u, p2.Rng);     // p2 셔플 후

        Assert.Contains(events, e => e.Type == "battleCreated");
        Assert.Equal(8, events.Count(e => e.Type == "draw")); // 4 + 4
    }

    [Fact]
    public void BeginRound1_GivesMana1AndDrawsOne_MatchesTsGolden()
    {
        var (created, _) = GameEngine.CreateBattle("match-1",
            new(null, Deck(PlayerSlot.P1)), new(null, Deck(PlayerSlot.P2)));

        var (s, events) = GameEngine.BeginRound(created, 1);

        Assert.Equal(BattlePhase.Action, s.Phase);
        Assert.Equal(1, s.Round);
        Assert.Equal(PlayerSlot.P1, s.ActivePlayer);
        Assert.Equal(PlayerSlot.P1, s.Priority);

        var p1 = s.Player(PlayerSlot.P1);
        var p2 = s.Player(PlayerSlot.P2);

        Assert.Equal((1, 1), (p1.Mana, p1.MaxMana)); // 1라운드 마나 1/1
        Assert.Equal((1, 1), (p2.Mana, p2.MaxMana));

        // 1장 추가 드로우: p1 hand 5, 새 카드 = c2 (deckAfterOpen[0]); deck 3
        Assert.Equal(5, p1.Hand.Count);
        Assert.Equal("c2", p1.Hand[^1].CardId);
        Assert.Equal(new[] { "c5", "c1", "c3" }, Ids(p1.Deck));

        Assert.Equal(5, p2.Hand.Count);
        Assert.Equal("c4", p2.Hand[^1].CardId);

        Assert.True(p1.HasAttackToken);
        Assert.False(p2.HasAttackToken);
        Assert.Contains(events, e => e.Type == "roundStart");

        // ★ 입력 불변성: BeginRound 는 created 를 변형하지 않는다 (Clone 검증)
        Assert.Equal(0, created.Round);
        Assert.Equal(4, created.Player(PlayerSlot.P1).Hand.Count);
    }

    [Fact]
    public void Apply_OnUnimplementedAction_RejectsWithoutMutating()
    {
        var (created, _) = GameEngine.CreateBattle("match-1",
            new(null, Deck(PlayerSlot.P1)), new(null, Deck(PlayerSlot.P2)));

        var (s, events) = GameEngine.Apply(created, PlayerSlot.P1, new PassAction());

        Assert.Same(created, s); // 거부 시 원본 그대로
        Assert.Contains(events, e => e.Type == "rejected");
    }
}
