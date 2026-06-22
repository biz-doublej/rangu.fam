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

    // ── 스파링 고스트: 블록 → 유닛 피해/사망(전투 연출 점화) ───────────────
    //    프로덕션 GameConnection.DriveGhostAsync 정책 미러 + 인간 오토파일럿 미러로
    //    멀티라운드 전투를 돌려 unitDamaged/unitDied 가 실제로 발생함을 결정론 검증.
    //    power2/health1 덱 → 어떤 블록도 상호 전사 → 사망 보장(시드 무관).
    private static List<Engine.BattleCard> GlassDeck(Engine.PlayerSlot owner) =>
        Enumerable.Range(0, 16).Select(i => new Engine.BattleCard
        {
            InstanceId = $"{owner}-{i}", CardId = $"glass_{i}", Owner = owner, Name = $"유리{i}",
            Cost = 1, Kind = Engine.CardKind.Unit, Unit = new() { Power = 2, Health = 1 },
        }).ToList();

    /// <summary>스파링 고스트 미러 — 수비 시 블록, 보드 비면 소환, 그 외 패스(거부 시 패스 폴백).
    /// ★ 발생 이벤트를 수집해 반환(전투 해결은 고스트의 패스에서 일어남 — 프로덕션 DriveGhostAsync 와 동일).</summary>
    private static async Task<List<Engine.GameEvent>> DriveSparringGhostAsync(GameMatch m)
    {
        var collected = new List<Engine.GameEvent>();
        var g = m.SeatOf(Ghost)!.Value;
        for (int i = 0; i < 500; i++)
        {
            var s = m.Current;
            if (s.Phase == Engine.BattlePhase.Finished) break;
            if (s.Phase == Engine.BattlePhase.Mulligan && !s.Player(g).MulliganDone)
            { collected.AddRange((await m.ApplyAsync(g, new Engine.MulliganAction(Array.Empty<string>()))).Events); continue; }
            if (s.Priority != g) break;

            var defender = s.ActivePlayer == Engine.PlayerSlot.P1 ? Engine.PlayerSlot.P2 : Engine.PlayerSlot.P1;
            if (s.Phase == Engine.BattlePhase.DeclareBlock && g == defender
                && s.Combat is { BlocksDeclared: false } c && c.Attackers.Count > 0)
            {
                var blocker = s.Player(g).Board.FirstOrDefault(u => !u.IsStunned);
                if (blocker is not null)
                {
                    var r = await m.ApplyAsync(g, new Engine.DeclareBlockAction(
                        new Dictionary<string, string> { [c.Attackers[0]] = blocker.InstanceId }));
                    if (!r.Events.Any(e => e.Type == "rejected")) { collected.AddRange(r.Events); continue; }
                }
                collected.AddRange((await m.ApplyAsync(g, new Engine.PassAction())).Events); continue;
            }
            if (s.Phase == Engine.BattlePhase.Action)
            {
                var p = s.Player(g);
                if (s.ActivePlayer == g && !s.AttackDeclaredThisRound)
                {
                    var attackers = p.Board.Where(u => u.SummonedRound < s.Round && !u.HasAttacked && !u.IsStunned)
                        .Select(u => u.InstanceId).ToList();
                    if (attackers.Count > 0)
                    {
                        var r = await m.ApplyAsync(g, new Engine.DeclareAttackAction(attackers, null));
                        if (!r.Events.Any(e => e.Type == "rejected")) { collected.AddRange(r.Events); continue; }
                    }
                }
                if (p.Board.Count == 0)
                {
                    var unit = p.Hand.Where(card => card.Kind == Engine.CardKind.Unit && card.Cost <= p.Mana)
                        .OrderBy(card => card.Cost).FirstOrDefault();
                    if (unit is not null)
                    {
                        var r = await m.ApplyAsync(g, new Engine.PlayUnitAction(unit.InstanceId));
                        if (!r.Events.Any(e => e.Type == "rejected")) { collected.AddRange(r.Events); continue; }
                    }
                }
            }
            collected.AddRange((await m.ApplyAsync(g, new Engine.PassAction())).Events);
        }
        return collected;
    }

    [Fact]
    public async Task SparringGhost_AttacksAndBlocks_HumanDefends_EmitsDamageDeath()
    {
        var (st, _) = Engine.GameEngine.CreateBattle("fx", new("human", GlassDeck(Engine.PlayerSlot.P1)), new(Ghost, GlassDeck(Engine.PlayerSlot.P2)));
        var m = new GameMatch("fx", st);
        var human = m.SeatOf("human")!.Value;

        var seen = new Dictionary<string, int>();
        int lastAttack = 0;
        bool humanDefended = false; // 고스트가 공격 → 인간이 수비자로 블록했는가
        var all = new List<Engine.GameEvent>();

        // 인간 오토파일럿 미러(useAutoPilot 정책) + 스파링 고스트를 핑퐁으로 구동
        for (int step = 0; step < 200 && m.Current.Phase != Engine.BattlePhase.Finished; step++)
        {
            all.AddRange(await DriveSparringGhostAsync(m));
            var s = m.Current;
            if (s.Phase == Engine.BattlePhase.Finished) break;
            if (s.Priority != human) continue;

            foreach (var u in s.Player(human).Board)
                if (!seen.ContainsKey(u.InstanceId)) seen[u.InstanceId] = s.Round;

            if (s.Phase == Engine.BattlePhase.Mulligan)
            { all.AddRange((await m.ApplyAsync(human, new Engine.MulliganAction(Array.Empty<string>()))).Events); continue; }

            if (s.Phase == Engine.BattlePhase.Action)
            {
                var p = s.Player(human);
                if (p.HasAttackToken && s.Round > lastAttack && s.Combat is null)
                {
                    var ready = p.Board.Where(u => !u.HasAttacked && seen.GetValueOrDefault(u.InstanceId, s.Round) < s.Round)
                        .Select(u => u.InstanceId).ToList();
                    if (ready.Count > 0)
                    { all.AddRange((await m.ApplyAsync(human, new Engine.DeclareAttackAction(ready, null))).Events); lastAttack = s.Round; continue; }
                }
                var card = p.Hand.Where(c => c.Kind == Engine.CardKind.Unit && c.Cost <= p.Mana).OrderBy(c => c.Cost).FirstOrDefault();
                if (card is not null && p.Board.Count < Engine.GameEngine.MaxBoard)
                { all.AddRange((await m.ApplyAsync(human, new Engine.PlayUnitAction(card.InstanceId))).Events); continue; }
                all.AddRange((await m.ApplyAsync(human, new Engine.PassAction())).Events); continue;
            }
            // 수비자면 첫 공격자를 블록(인간 블록 경로 검증) — 그 외(반응 윈도우/이미 선언됨)는 패스 → 전투 해결
            if (s.Phase == Engine.BattlePhase.DeclareBlock && s.ActivePlayer != human
                && s.Combat is { BlocksDeclared: false } hc && hc.Attackers.Count > 0)
            {
                var hb = s.Player(human).Board.FirstOrDefault(u => !u.IsStunned);
                if (hb is not null)
                {
                    var r = await m.ApplyAsync(human, new Engine.DeclareBlockAction(
                        new Dictionary<string, string> { [hc.Attackers[0]] = hb.InstanceId }));
                    if (!r.Events.Any(e => e.Type == "rejected")) { all.AddRange(r.Events); humanDefended = true; continue; }
                }
            }
            all.AddRange((await m.ApplyAsync(human, new Engine.PassAction())).Events);
        }

        Assert.Contains(all, e => e.Type == "unitDamaged"); // 전투(공/수 양방향) → 유닛 피해
        Assert.Contains(all, e => e.Type == "unitDied");      // 상호 전사 → 사망(FloatingNumbers 점화 신호)
        Assert.True(humanDefended, "고스트가 공격 선언해 인간이 수비자로 블록할 수 있어야 함");
    }
}
