using System.Linq;
using Engine = Rangu.Tactics.Engine;

namespace Rangu.Tactics.Server.Game;

/// <summary>
/// PvE 휴리스틱 봇 — 패시브 더미를 대체. [AI]
///
/// 알고리즘: 후보수 생성 → 각 수를 GameEngine.Apply(순수 리듀서)로 1-ply 시뮬레이션 →
/// 유틸리티 평가 → 최고점 선택(+난이도별 RNG 노이즈). 우선권 핑퐁이 자연히 멀티턴을 만든다
/// (한 번에 한 수, 다음 우선권 윈도우에 다음 수). 게임트리 깊이=1(경량). 방어는 그리디 배정.
/// </summary>
public static class GhostAi
{
    /// <summary>행동 페이즈: 최적 단일 액션(유닛/주문/공격/패스) 선택. 시뮬레이션으로 합법성·가치 평가.</summary>
    public static Engine.BattleAction ChooseAction(Engine.GameState s, Engine.PlayerSlot g, Random rng, double noise = 6.0)
    {
        var p = s.Player(g);
        var oppSlot = g == Engine.PlayerSlot.P1 ? Engine.PlayerSlot.P2 : Engine.PlayerSlot.P1;
        var candidates = new List<Engine.BattleAction> { new Engine.PassAction() };

        // 유닛 소환 — 마나 충분분만(보드 한도/세부 합법성은 시뮬레이션이 거른다).
        foreach (var c in p.Hand)
            if (c.Kind == Engine.CardKind.Unit && c.Cost <= p.Mana)
                candidates.Add(new Engine.PlayUnitAction(c.InstanceId));

        // 주문 시전 — 무타겟 / 적 유닛 / 적 넥서스 / 내 유닛(버프·힐). 부적합 타겟은 시뮬레이션이 거부.
        foreach (var c in p.Hand)
        {
            if (c.Kind != Engine.CardKind.Spell) continue;
            candidates.Add(new Engine.PlaySpellAction(c.InstanceId, null));
            foreach (var u in s.Player(oppSlot).Board)
                candidates.Add(new Engine.PlaySpellAction(c.InstanceId, new[] { Engine.TargetRef.Unit(u.InstanceId) }));
            candidates.Add(new Engine.PlaySpellAction(c.InstanceId, new[] { Engine.TargetRef.Nexus(oppSlot) }));
            foreach (var u in p.Board)
                candidates.Add(new Engine.PlaySpellAction(c.InstanceId, new[] { Engine.TargetRef.Unit(u.InstanceId) }));
        }

        // 공격 — 토큰 보유 + 미선언이면 "준비된 유닛 전부 공격"(소환멀미·기공격·스턴 제외).
        if (s.ActivePlayer == g && !s.AttackDeclaredThisRound)
        {
            var ready = p.Board
                .Where(u => u.SummonedRound < s.Round && !u.HasAttacked && !u.IsStunned)
                .Select(u => u.InstanceId).ToList();
            if (ready.Count > 0) candidates.Add(new Engine.DeclareAttackAction(ready, null));
        }

        return PickBest(s, g, candidates, rng, noise) ?? new Engine.PassAction();
    }

    /// <summary>방어: 공격력 큰 공격자부터 유리한 교환/생존 블로커를 그리디 배정(없으면 빈 배정→호출측 패스).</summary>
    public static Engine.DeclareBlockAction ChooseBlocks(Engine.GameState s, Engine.PlayerSlot g)
    {
        var blocks = new Dictionary<string, string>();
        if (s.Combat is null) return new Engine.DeclareBlockAction(blocks);

        var attackerSlot = g == Engine.PlayerSlot.P1 ? Engine.PlayerSlot.P2 : Engine.PlayerSlot.P1;
        var atkBoard = s.Player(attackerSlot).Board;
        var myUnits = s.Player(g).Board.Where(u => !u.IsStunned).ToList();
        var used = new HashSet<string>();

        foreach (var aId in s.Combat.Attackers.OrderByDescending(id => atkBoard.FirstOrDefault(u => u.InstanceId == id)?.Power ?? 0))
        {
            var atk = atkBoard.FirstOrDefault(u => u.InstanceId == aId);
            if (atk is null) continue;
            // 1순위: 공격자를 처치하고 살아남는 블로커(유리한 교환). 2순위: 생존만(넥서스 피해 차단).
            var killer = myUnits.FirstOrDefault(u => !used.Contains(u.InstanceId) && u.Power >= atk.Health && u.Health > atk.Power);
            var pick = killer ?? myUnits
                .Where(u => !used.Contains(u.InstanceId) && u.Health > atk.Power)
                .OrderBy(u => u.Power + u.Health).FirstOrDefault();
            if (pick is not null) { blocks[aId] = pick.InstanceId; used.Add(pick.InstanceId); }
        }
        return new Engine.DeclareBlockAction(blocks);
    }

    private static Engine.BattleAction? PickBest(
        Engine.GameState s, Engine.PlayerSlot g, List<Engine.BattleAction> candidates, Random rng, double noise)
    {
        Engine.BattleAction? best = null;
        double bestScore = double.NegativeInfinity;
        foreach (var c in candidates)
        {
            var (ns, ev) = Engine.GameEngine.Apply(s, g, c); // 순수 — s 불변
            if (ev.Any(e => e.Type == "rejected")) continue; // 불법수 제외
            double score = Evaluate(ns, g) + (rng.NextDouble() - 0.5) * 2 * noise;
            if (c is Engine.PassAction) score -= 1.0; // 동점이면 행동 선호(손해수는 평가가 이미 거름)
            if (score > bestScore) { bestScore = score; best = c; }
        }
        return best;
    }

    /// <summary>유틸리티 — 넥서스 차 + 보드 가치 + 핸드 우위. 승패는 압도적 가중.</summary>
    public static double Evaluate(Engine.GameState s, Engine.PlayerSlot g)
    {
        var oppSlot = g == Engine.PlayerSlot.P1 ? Engine.PlayerSlot.P2 : Engine.PlayerSlot.P1;
        if (s.Winner == g) return 100000;
        if (s.Winner == oppSlot) return -100000;
        var me = s.Player(g);
        var opp = s.Player(oppSlot);
        double score = 0;
        score += (me.NexusHealth - opp.NexusHealth) * 1.5;
        score += BoardValue(me) - BoardValue(opp);
        score += (me.Hand.Count - opp.Hand.Count) * 0.5;
        return score;
    }

    private static double BoardValue(Engine.PlayerState p)
    {
        double v = 0;
        foreach (var u in p.Board)
            v += u.Power * 1.0 + u.Health * 0.9 + u.Keywords.Count * 0.5;
        return v;
    }
}
