using Rangu.Tactics.Proto.V1;          // proto 타입은 unqualified
using Engine = Rangu.Tactics.Engine;   // 엔진 타입은 Engine. 로 한정 (충돌 회피)

namespace Rangu.Tactics.Server.Mapping;

/// <summary>
/// 엔진 GameState → proto GameStateSnapshot (수신자별 마스킹). redact.ts 규칙 C# 포팅.
///
/// 마스킹: 상대 손패 = HiddenCard(정체 숨김), 보드 유닛 = 항상 공개, 덱/소각/RNG/seed = 미노출
/// (proto 스냅샷에 해당 필드가 없어 자연히 안전 — 개수만 PlayerState 로).
/// </summary>
public static class SnapshotMapper
{
    public static GameStateSnapshot ToSnapshot(
        Engine.GameState s, Engine.PlayerSlot viewer, ulong seq, string matchId, long serverTimeMs, bool observer = false)
    {
        var snap = new GameStateSnapshot
        {
            MatchId = matchId,
            SequenceNumber = seq,
            Viewer = ToPlayerRef(s.Player(viewer)),
            Phase = MapPhase(s.Phase),
            PriorityPlayer = ToPlayerRef(s.Player(s.Priority)),
            ActivePlayer = ToPlayerRef(s.Player(s.ActivePlayer)),
            RoundNumber = (uint)Math.Max(0, s.Round),
            ServerTimeUnixMs = serverTimeMs,
        };

        foreach (var slot in new[] { Engine.PlayerSlot.P1, Engine.PlayerSlot.P2 })
        {
            var p = s.Player(slot);

            // 공개 상태 + 개수만 (손패/덱 "내용"은 cards 로, 마스킹 적용)
            snap.Players.Add(new PlayerState
            {
                Player = ToPlayerRef(p),
                NexusHealth = p.NexusHealth,
                Mana = p.Mana, ManaMax = p.MaxMana, SpellMana = p.SpellMana,
                DeckCount = p.Deck.Count, HandCount = p.Hand.Count,
                HasAttackToken = p.HasAttackToken, HasPassed = p.HasPassed,
            });

            // 보드 유닛 → 양쪽 모두 공개
            foreach (var u in p.Board) snap.Cards.Add(UnitToCardView(u));

            // 손패 → viewer 본인만 공개. 관전자(observer)는 양쪽 모두 숨김(라이브 공정성).
            foreach (var c in p.Hand) snap.Cards.Add(HandCardToCardView(c, revealed: !observer && slot == viewer));
            // 덱/소각/RNG/seed 는 노출하지 않음
        }

        foreach (var item in s.Stack) snap.Stack.Add(StackToProto(item));

        if (s.Combat is { } combat)
        {
            var pc = new CombatState { Attacker = SeatRef(s.ActivePlayer) };
            foreach (var aId in combat.Attackers)
                pc.Pairs.Add(new CombatPair
                {
                    AttackerInstanceId = aId,
                    BlockerInstanceId = combat.Blocks.TryGetValue(aId, out var b) ? b : "",
                });
            snap.Combat = pc;
        }

        return snap;
    }

    // ── 엔진 → proto 변환 헬퍼 ────────────────────────────────────
    public static PlayerRef ToPlayerRef(Engine.PlayerState p) =>
        new() { UserId = p.UserId ?? "", Seat = Seat(p.Slot) };

    private static PlayerRef SeatRef(Engine.PlayerSlot slot) => new() { Seat = Seat(slot) };
    private static uint Seat(Engine.PlayerSlot slot) => slot == Engine.PlayerSlot.P1 ? 0u : 1u;

    public static GamePhase MapPhase(Engine.BattlePhase ph) => ph switch
    {
        Engine.BattlePhase.Mulligan => GamePhase.PhaseMulligan,
        Engine.BattlePhase.Action => GamePhase.PhaseAction,
        Engine.BattlePhase.DeclareBlock => GamePhase.PhaseCombatDeclareBlock,
        Engine.BattlePhase.Finished => GamePhase.PhaseGameOver,
        _ => GamePhase.PhaseUnspecified,
    };

    public static Keyword MapKeyword(Engine.Keyword k) => k switch
    {
        Engine.Keyword.Overwhelm => Keyword.Overwhelm,
        Engine.Keyword.Elusive => Keyword.Elusive,
        Engine.Keyword.QuickAttack => Keyword.QuickAttack,
        Engine.Keyword.Lifesteal => Keyword.Lifesteal,
        Engine.Keyword.Tough => Keyword.Tough,
        Engine.Keyword.Barrier => Keyword.Barrier,
        Engine.Keyword.Fearsome => Keyword.Fearsome,
        Engine.Keyword.Challenger => Keyword.Challenger,
        Engine.Keyword.Regeneration => Keyword.Regeneration,
        Engine.Keyword.Taunt => Keyword.Taunt,
        _ => Keyword.Unspecified,
    };

    private static CardView UnitToCardView(Engine.BattleUnit u)
    {
        var rc = new RevealedCard
        {
            DefinitionId = u.CardId,
            BaseCost = u.Cost, CurrentCost = u.Cost,
            BasePower = u.BasePower, BaseHealth = u.BaseMaxHealth,
            CurrentPower = u.Power, CurrentHealth = u.Health,
            Damage = Math.Max(0, u.MaxHealth - u.Health),
            IsExhausted = u.HasAttacked,
        };
        foreach (var k in u.Keywords) rc.Keywords.Add(MapKeyword(k));
        return new CardView { InstanceId = u.InstanceId, Zone = Zone.Battlefield, Controller = SeatRef(u.Owner), Revealed = rc };
    }

    private static CardView HandCardToCardView(Engine.BattleCard c, bool revealed)
    {
        var cv = new CardView { InstanceId = c.InstanceId, Zone = Zone.Hand, Controller = SeatRef(c.Owner) };
        if (!revealed) { cv.Hidden = new HiddenCard(); return cv; } // ★ 상대 손패 = 정체 숨김

        var rc = new RevealedCard { DefinitionId = c.CardId, BaseCost = c.Cost, CurrentCost = c.Cost };
        if (c.Unit is { } unit)
        {
            rc.BasePower = unit.Power; rc.CurrentPower = unit.Power;
            rc.BaseHealth = unit.Health; rc.CurrentHealth = unit.Health;
            foreach (var k in unit.Keywords) rc.Keywords.Add(MapKeyword(k));
        }
        cv.Revealed = rc;
        return cv;
    }

    private static StackItem StackToProto(Engine.StackItem item)
    {
        var si = new StackItem
        {
            StackId = item.Id,
            SourceInstanceId = item.Card.InstanceId,
            Controller = SeatRef(item.Source),
            Card = HandCardToCardView(item.Card, revealed: true), // 시전된 주문은 공개
        };
        foreach (var t in item.Targets) si.Targets.Add(ToTarget(t));
        return si;
    }

    private static Target ToTarget(Engine.TargetRef t) => t.Kind == Engine.TargetKind.Unit
        ? new Target { CardInstanceId = t.InstanceId ?? "" }
        : new Target { Nexus = SeatRef(t.Slot ?? Engine.PlayerSlot.P1) };
}
