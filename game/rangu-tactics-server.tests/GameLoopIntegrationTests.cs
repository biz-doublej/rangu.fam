using Rangu.Tactics.Proto.V1;
using Rangu.Tactics.Server.Mapping;
using Rangu.Tactics.Server.Match;
using Xunit;
using Engine = Rangu.Tactics.Engine;

namespace Rangu.Tactics.Server.Tests;

/// <summary>
/// 게임 루프 핵심 결합 검증 (WS/티켓 없이): PvE 매치 생성 → IntentMapper 로 human 멀리건 →
/// 고스트 자동진행 → 라운드1 action 도달 + 수신자 마스킹. (GameConnection 의 DriveGhost 로직 미러.)
/// </summary>
public class GameLoopIntegrationTests
{
    private const string Ghost = "pve-ghost";

    private static List<Engine.BattleCard> Deck(Engine.PlayerSlot owner) =>
        Enumerable.Range(0, 16).Select(i => new Engine.BattleCard
        {
            InstanceId = $"{owner}-{i}", CardId = $"demo_{i % 4}", Owner = owner, Name = $"데모{i}",
            Cost = (i % 3) + 1, Kind = Engine.CardKind.Unit, Unit = new() { Power = (i % 3) + 1, Health = (i % 2) + 2 },
        }).ToList();

    private static GameMatch CreatePve(string id, string human)
    {
        var (st, ev) = Engine.GameEngine.CreateBattle(id, new(human, Deck(Engine.PlayerSlot.P1)), new(Ghost, Deck(Engine.PlayerSlot.P2)));
        return new GameMatch(id, st, (ulong)ev.Count);
    }

    private static async Task DriveGhostAsync(GameMatch m)
    {
        var g = m.SeatOf(Ghost)!.Value;
        for (int i = 0; i < 500; i++)
        {
            var s = m.Current;
            if (s.Phase == Engine.BattlePhase.Finished) return;
            if (s.Phase == Engine.BattlePhase.Mulligan && !s.Player(g).MulliganDone)
            { await m.ApplyAsync(g, new Engine.MulliganAction(Array.Empty<string>())); continue; }
            if ((s.Phase == Engine.BattlePhase.Action || s.Phase == Engine.BattlePhase.DeclareBlock) && s.Priority == g)
            { await m.ApplyAsync(g, new Engine.PassAction()); continue; }
            return;
        }
    }

    [Fact]
    public async Task HumanMulligan_GhostAutoDrives_ReachesRound1Action_WithMasking()
    {
        var m = CreatePve("t1", "human");
        var human = m.SeatOf("human")!.Value; // P1

        // human 멀리건(0장)을 proto Intent → IntentMapper → ApplyAsync 경로로
        var action = IntentMapper.ToAction(new Intent { Mulligan = new MulliganIntent() }, m.Current, human)!;
        await m.ApplyAsync(human, action);
        await DriveGhostAsync(m); // 고스트 자동 멀리건 → 양쪽 완료 → BeginRound(1)

        var s = m.Current;
        Assert.Equal(Engine.BattlePhase.Action, s.Phase);
        Assert.Equal(1, s.Round);
        Assert.True(s.Player(human).MulliganDone);
        Assert.True(s.Player(m.SeatOf(Ghost)!.Value).MulliganDone);
        Assert.Equal((1, 1), (s.Player(human).Mana, s.Player(human).MaxMana));

        // 수신자(human) 마스킹: 내 손패 공개, 고스트(P2 seat1) 손패 숨김
        var snap = m.SnapshotFor(human, serverTimeMs: 0);
        Assert.All(snap.Cards.Where(c => c.Controller.Seat == 1 && c.Zone == Zone.Hand),
            c => Assert.Equal(CardView.VisibilityOneofCase.Hidden, c.VisibilityCase));
        Assert.Contains(snap.Cards, c => c.Controller.Seat == 0 && c.Zone == Zone.Hand
            && c.VisibilityCase == CardView.VisibilityOneofCase.Revealed);
    }

    [Fact]
    public async Task RejectedIntent_LeavesStateUnchanged()
    {
        var m = CreatePve("t2", "human");
        var human = m.SeatOf("human")!.Value;
        var before = m.Current;

        // 멀리건 단계에서 Pass = 불법 → 거부, 상태 불변
        var action = IntentMapper.ToAction(new Intent { Pass = new PassIntent() }, m.Current, human)!;
        var result = await m.ApplyAsync(human, action);

        Assert.Contains(result.Events, e => e.Type == "rejected");
        Assert.Same(before, m.Current); // 원본 상태 그대로(불변)
    }
}
