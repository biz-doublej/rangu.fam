using Rangu.Tactics.Proto.V1;
using Rangu.Tactics.Server.Mapping;
using Rangu.Tactics.Server.Match;
using Xunit;
using Engine = Rangu.Tactics.Engine;

namespace Rangu.Tactics.Server.Tests;

/// <summary>
/// EventMapper(엔진 GameEvent → proto Event, 마스킹) 검증.
/// ① 아이솔레이션 매핑  ② 실제 전투를 돌려 엔진이 per-unit 피해/사망을 emit하는지(체인).
/// </summary>
public class EventMapperTests
{
    private const string Ghost = "pve-ghost";

    // ── 아이솔레이션: GameEvent → proto ──────────────────────────────
    [Fact]
    public void UnitDamaged_MapsTo_DamageDealt()
    {
        var ev = new Engine.GameEvent { Type = "unitDamaged", Detail = new() { ["target"] = "P2-1", ["amount"] = 3, ["lethal"] = true } };
        var proto = EventMapper.ToProto(ev, Engine.PlayerSlot.P1, 5, 0)!;
        Assert.NotNull(proto.DamageDealt);
        var inst = proto.DamageDealt.Instances[0];
        Assert.Equal("P2-1", inst.Target.CardInstanceId);
        Assert.Equal(3, inst.Amount);
        Assert.True(inst.IsLethal);
        Assert.Equal(5ul, proto.SequenceNumber);
    }

    [Fact]
    public void UnitDied_MapsTo_UnitDied_Graveyard()
    {
        var ev = new Engine.GameEvent { Type = "unitDied", Detail = new() { ["ids"] = new List<string> { "P1-0", "P2-1" } } };
        var proto = EventMapper.ToProto(ev, Engine.PlayerSlot.P1, 1, 0)!;
        Assert.Equal(new[] { "P1-0", "P2-1" }, proto.UnitDied.InstanceIds);
        Assert.Equal(Zone.Graveyard, proto.UnitDied.MovedTo);
    }

    [Fact]
    public void NexusDamaged_MapsSeat_Amount_Health()
    {
        var ev = new Engine.GameEvent { Type = "nexusDamaged", Detail = new() { ["slot"] = "p2", ["amount"] = 4, ["health"] = 16 } };
        var proto = EventMapper.ToProto(ev, Engine.PlayerSlot.P1, 1, 0)!;
        Assert.Equal(1u, proto.NexusDamaged.Player.Seat);
        Assert.Equal(4, proto.NexusDamaged.Amount);
        Assert.Equal(16, proto.NexusDamaged.NewNexusHealth);
    }

    [Fact]
    public void GameOver_ViewerResult_IsPerViewer()
    {
        var ev = new Engine.GameEvent { Type = "gameOver", Detail = new() { ["winner"] = "p1" } };
        Assert.Equal(GameOverEvent.Types.Result.Win, EventMapper.ToProto(ev, Engine.PlayerSlot.P1, 1, 0)!.GameOver.ViewerResult);
        Assert.Equal(GameOverEvent.Types.Result.Loss, EventMapper.ToProto(ev, Engine.PlayerSlot.P2, 1, 0)!.GameOver.ViewerResult);

        var draw = new Engine.GameEvent { Type = "gameOver", Detail = new() { ["winner"] = null } };
        Assert.Equal(GameOverEvent.Types.Result.Draw, EventMapper.ToProto(draw, Engine.PlayerSlot.P1, 1, 0)!.GameOver.ViewerResult);
    }

    [Fact]
    public void CardRevealEvents_AreNotMapped_NoLeak()
    {
        // draw/cardBurned 등 카드 공개성 이벤트는 매핑 안 함 → 상대 패 누출 원천 차단
        Assert.Null(EventMapper.ToProto(new Engine.GameEvent { Type = "draw", Detail = new() { ["card"] = "secret" } }, Engine.PlayerSlot.P2, 1, 0));
        Assert.Null(EventMapper.ToProto(new Engine.GameEvent { Type = "combatResolved" }, Engine.PlayerSlot.P1, 1, 0));
    }

    // ── 체인: 실제 전투 → 엔진 emit → 매핑 ───────────────────────────
    [Fact]
    public async Task RealCombat_EngineEmitsUnitDamaged_AndMaps()
    {
        var (st, ev) = Engine.GameEngine.CreateBattle("fx", new("human", Deck(Engine.PlayerSlot.P1)), new(Ghost, Deck(Engine.PlayerSlot.P2)));
        var m = new GameMatch("fx", st, (ulong)ev.Count);
        var human = m.SeatOf("human")!.Value;
        var ghost = m.SeatOf(Ghost)!.Value;
        await m.ApplyAsync(human, new Engine.MulliganAction(Array.Empty<string>()));
        await m.ApplyAsync(ghost, new Engine.MulliganAction(Array.Empty<string>()));

        var all = new List<Engine.GameEvent>();
        for (int step = 0; step < 400 && m.Current.Phase != Engine.BattlePhase.Finished; step++)
        {
            var s = m.Current;
            all.AddRange((await m.ApplyAsync(s.Priority, ChooseAction(s, s.Priority))).Events);
        }

        // 전투가 실제로 일어나 엔진이 per-unit 피해를 emit했는가 → 매핑 가능
        Assert.Contains(all, e => e.Type == "unitDamaged");
        var proto = EventMapper.ToProto(all.First(e => e.Type == "unitDamaged"), human, 1, 0)!;
        Assert.NotNull(proto.DamageDealt);
        Assert.True(proto.DamageDealt.Instances[0].Amount > 0);
    }

    // 간단 정책 봇: 공격권+비-소환멀미 유닛이면 공격, 수비면 첫 유닛으로 블록, 아니면 유닛 소환/패스.
    private static Engine.BattleAction ChooseAction(Engine.GameState s, Engine.PlayerSlot p)
    {
        var me = s.Player(p);
        var defender = s.ActivePlayer == Engine.PlayerSlot.P1 ? Engine.PlayerSlot.P2 : Engine.PlayerSlot.P1;
        if (s.Phase == Engine.BattlePhase.DeclareBlock)
        {
            // 수비자만, 블록 선언 전에만 블록. 그 외(공격자 반응창/블록 후)는 패스 → 전투 해결로 진행.
            if (s.Combat is { BlocksDeclared: false } c && p == defender
                && c.Attackers.Count > 0 && me.Board.Count > 0)
                return new Engine.DeclareBlockAction(new Dictionary<string, string> { [c.Attackers[0]] = me.Board[0].InstanceId });
            return new Engine.PassAction();
        }
        if (s.Phase == Engine.BattlePhase.Action)
        {
            if (p == s.ActivePlayer && !s.AttackDeclaredThisRound)
            {
                var atk = me.Board.FirstOrDefault(u => u.SummonedRound < s.Round && !u.HasAttacked && !u.IsStunned);
                if (atk is not null) return new Engine.DeclareAttackAction(new List<string> { atk.InstanceId }, null);
            }
            var card = me.Hand.FirstOrDefault(c => c.Kind == Engine.CardKind.Unit && c.Cost <= me.Mana);
            if (card is not null) return new Engine.PlayUnitAction(card.InstanceId);
        }
        return new Engine.PassAction();
    }

    private static List<Engine.BattleCard> Deck(Engine.PlayerSlot owner) =>
        Enumerable.Range(0, 16).Select(i => new Engine.BattleCard
        {
            InstanceId = $"{owner}-{i}", CardId = $"demo_{i % 4}", Owner = owner, Name = $"데모{i}",
            Cost = 1, Kind = Engine.CardKind.Unit, Unit = new() { Power = (i % 3) + 1, Health = (i % 2) + 2 },
        }).ToList();
}
