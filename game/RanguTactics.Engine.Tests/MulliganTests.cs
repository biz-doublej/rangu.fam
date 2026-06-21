using Rangu.Tactics.Engine;
using Xunit;

namespace Rangu.Tactics.Engine.Tests;

/// <summary>
/// 2단계 골든 테스트 — 멀리건이 TS 엔진(engine.ts doMulligan)과 일치하는지 + 상태머신 전이.
/// 기준: p1.Rng=28977417 에서 c4·c6 교체 → 덱 [2,5,1,3,4,6] 셔플 = [6,5,4,1,3,2]
///       (node rng.ts). 재드로우 2 → 핸드 [c0,c7,c6,c5], 덱 [c4,c1,c3,c2], rngAfter=2757777043.
/// </summary>
public class MulliganTests
{
    private static List<BattleCard> Deck(PlayerSlot owner) =>
        Enumerable.Range(0, 8).Select(i => new BattleCard
        {
            InstanceId = $"{owner}-{i}", CardId = $"c{i}", Owner = owner, Name = $"c{i}",
            Cost = 1, Kind = CardKind.Unit, Unit = new UnitSpec { Power = 1, Health = 1 },
        }).ToList();

    private static string[] Ids(IEnumerable<BattleCard> cards) => cards.Select(c => c.CardId).ToArray();

    private static (GameState State, List<GameEvent> Events) NewMatch() =>
        GameEngine.CreateBattle("match-1", new(null, Deck(PlayerSlot.P1)), new(null, Deck(PlayerSlot.P2)));

    [Fact]
    public void DoMulligan_ReplaceTwo_ReshufflesAndRedraws_MatchesTsGolden()
    {
        var (created, _) = NewMatch();
        // p1 핸드 = [c4,c0,c6,c7]. c4(P1-4)·c6(P1-6) 교체.
        var (s, events) = GameEngine.Apply(created, PlayerSlot.P1, new MulliganAction(new[] { "P1-4", "P1-6" }));

        var p1 = s.Player(PlayerSlot.P1);
        Assert.Equal(new[] { "c0", "c7", "c6", "c5" }, Ids(p1.Hand));   // 재드로우 후 핸드
        Assert.Equal(new[] { "c4", "c1", "c3", "c2" }, Ids(p1.Deck));   // 남은 덱
        Assert.Equal(2757777043u, p1.Rng);                              // TS 셔플 후 RNG 일치
        Assert.True(p1.MulliganDone);
        Assert.Equal(4, p1.Hand.Count); // 교체 2 → 재드로우 2 → 핸드 수 유지

        // 아직 p2 미완료 → 멀리건 단계 유지
        Assert.Equal(BattlePhase.Mulligan, s.Phase);
        Assert.False(s.Player(PlayerSlot.P2).MulliganDone);
        Assert.Contains(events, e => e.Type == "mulligan");

        // 입력 불변성
        Assert.Equal(4, created.Player(PlayerSlot.P1).Hand.Count);
        Assert.False(created.Player(PlayerSlot.P1).MulliganDone);
    }

    [Fact]
    public void BothComplete_AutoTriggersBeginRound1()
    {
        var (created, _) = NewMatch();
        var (s1, _) = GameEngine.Apply(created, PlayerSlot.P1, new MulliganAction(new[] { "P1-4", "P1-6" }));
        Assert.Equal(BattlePhase.Mulligan, s1.Phase); // p1만 완료

        var (s2, ev) = GameEngine.Apply(s1, PlayerSlot.P2, new MulliganAction(Array.Empty<string>())); // p2 패스(0장)

        // ★ 양쪽 완료 → 리듀서가 BeginRound(1) 자동 전이
        Assert.Equal(BattlePhase.Action, s2.Phase);
        Assert.Equal(1, s2.Round);
        Assert.True(s2.Player(PlayerSlot.P1).MulliganDone);
        Assert.True(s2.Player(PlayerSlot.P2).MulliganDone);
        Assert.Equal((1, 1), (s2.Player(PlayerSlot.P1).Mana, s2.Player(PlayerSlot.P1).MaxMana));
        Assert.Equal((1, 1), (s2.Player(PlayerSlot.P2).Mana, s2.Player(PlayerSlot.P2).MaxMana));
        Assert.True(s2.Player(PlayerSlot.P1).HasAttackToken);
        Assert.Contains(ev, e => e.Type == "roundStart");

        // 입력 불변성: s1 은 그대로 (멀리건 단계, round 0)
        Assert.Equal(BattlePhase.Mulligan, s1.Phase);
        Assert.Equal(0, s1.Round);
    }

    [Fact]
    public void Mulligan_AfterRoundStart_IsRejected()
    {
        var (created, _) = NewMatch();
        var (s1, _) = GameEngine.Apply(created, PlayerSlot.P1, new MulliganAction(Array.Empty<string>()));
        var (s2, _) = GameEngine.Apply(s1, PlayerSlot.P2, new MulliganAction(Array.Empty<string>())); // → Action 전이

        var (s3, ev) = GameEngine.Apply(s2, PlayerSlot.P1, new MulliganAction(Array.Empty<string>()));
        Assert.Same(s2, s3); // 거부 → 원본 그대로
        Assert.Contains(ev, e => e.Type == "rejected");
    }

    [Fact]
    public void Mulligan_Twice_SamePlayer_IsRejected()
    {
        var (created, _) = NewMatch();
        var (s1, _) = GameEngine.Apply(created, PlayerSlot.P1, new MulliganAction(Array.Empty<string>()));
        var (s2, ev) = GameEngine.Apply(s1, PlayerSlot.P1, new MulliganAction(Array.Empty<string>())); // 두 번째
        Assert.Same(s1, s2);
        Assert.Contains(ev, e => e.Type == "rejected" && (e.Detail!["reason"] as string) == "already_mulliganed");
    }
}
