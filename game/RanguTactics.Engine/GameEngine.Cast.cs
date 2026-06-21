namespace Rangu.Tactics.Engine;

/// <summary>
/// 3단계 — 시전(유닛/주문) + 우선권 핑퐁 + 스택 LIFO 해결 + 효과 resolver.
/// (engine.ts doPlayUnit/doPlaySpell/doPass/resolveStack/resolveSpellEffect 포팅)
///
/// 효과 분기는 IEffectResolver 객체 대신 switch→private 메서드 (닫힌 enum + 순수 정적 엔진 +
/// 내부 mutator 접근 → 가장 단순/순수). 런타임 데이터 스크립트로 진화 시 인터프리터로 교체.
/// </summary>
public static partial class GameEngine
{
    // ── 유닛 소환 ─────────────────────────────────────────────────
    private static string? DoPlayUnit(GameState s, PlayerSlot slot, string instanceId, List<GameEvent> events)
    {
        if (s.Phase != BattlePhase.Action) return "wrong_phase:not_action";
        if (s.Priority != slot) return "no_priority";
        if (s.Stack.Count > 0) return "stack_not_empty"; // 스택 비었을 때만 유닛
        var p = s.Player(slot);
        var card = p.Hand.FirstOrDefault(c => c.InstanceId == instanceId);
        if (card is null || card.Kind != CardKind.Unit || card.Unit is null) return "not_a_unit_in_hand";
        if (p.Mana < card.Cost) return "insufficient_mana";
        if (p.Board.Count >= MaxBoard) return "board_full";

        p.Mana -= card.Cost;
        p.Hand = p.Hand.Where(c => c.InstanceId != instanceId).ToList();
        var u = card.Unit;
        p.Board.Add(new BattleUnit
        {
            InstanceId = card.InstanceId, CardId = card.CardId, Owner = slot, Name = card.Name, Member = card.Member,
            Power = u.Power, BasePower = u.Power,
            Health = u.Health, MaxHealth = u.Health, BaseMaxHealth = u.Health,
            Keywords = new(u.Keywords), BaseKeywords = new(u.Keywords), Cost = card.Cost,
            IsChampion = u.IsChampion, ChampionLevel = 1, ChampionProgress = 0,
            SummonedRound = s.Round, HasAttacked = false, IsStunned = false, HasBarrier = false,
        });
        EmitEvent(events, s, slot.ToActor(), "playUnit", new() { ["card"] = card.CardId });
        s.PassStreak = 0;
        s.Priority = slot.Other(); // 상대 대응 윈도우
        return null;
    }

    // ── 주문 시전 ─────────────────────────────────────────────────
    private static string? DoPlaySpell(
        GameState s, PlayerSlot slot, string instanceId, IReadOnlyList<TargetRef>? targets, List<GameEvent> events)
    {
        if (s.Priority != slot) return "no_priority";
        var p = s.Player(slot);
        var card = p.Hand.FirstOrDefault(c => c.InstanceId == instanceId);
        if (card is null || card.Kind != CardKind.Spell || card.Spell is null) return "not_a_spell_in_hand";

        var speed = card.Spell.Speed;
        if (speed == SpellSpeed.Slow && (s.Stack.Count > 0 || s.Phase != BattlePhase.Action))
            return "slow_requires_empty_stack_in_action";
        if (s.Phase != BattlePhase.Action && s.Phase != BattlePhase.DeclareBlock) return "cannot_cast_now";
        var tgts = targets ?? Array.Empty<TargetRef>();
        if (card.Spell.NeedsTarget && tgts.Count == 0) return "target_required";

        // 코스트: 일반 마나 우선, 부족분은 주문 마나로
        int fromMana = Math.Min(p.Mana, card.Cost);
        int fromSpell = card.Cost - fromMana;
        if (fromSpell > p.SpellMana) return "insufficient_mana";
        p.Mana -= fromMana;
        p.SpellMana -= fromSpell;
        p.Hand = p.Hand.Where(c => c.InstanceId != instanceId).ToList();

        var item = new StackItem
        {
            Id = $"stk-{s.Round}-{s.Stack.Count}-{card.InstanceId}",
            Source = slot, Card = card, Effect = card.Spell.Effect, Speed = speed, Targets = tgts.ToList(),
        };

        if (speed == SpellSpeed.Burst)
        {
            ResolveSpellEffect(s, item, events); // 즉발 — 우선권 양보 없이 즉시 해결
            s.PassStreak = 0;
            EmitEvent(events, s, slot.ToActor(), "playSpell", new() { ["card"] = card.CardId, ["speed"] = "burst" });
            return null;
        }

        s.Stack.Add(item); // fast/slow → 스택에 올리고 우선권 양보
        s.PassStreak = 0;
        s.Priority = slot.Other();
        EmitEvent(events, s, slot.ToActor(), "playSpell", new() { ["card"] = card.CardId, ["speed"] = speed.ToString() });
        return null;
    }

    // ── 패스 / 우선권 핑퐁 / 스택 해결 ────────────────────────────
    private static string? DoPass(GameState s, PlayerSlot slot, List<GameEvent> events)
    {
        if (s.Phase != BattlePhase.Action && s.Phase != BattlePhase.DeclareBlock) return "cannot_pass_now";
        if (s.Priority != slot) return "no_priority";
        if (s.Phase == BattlePhase.DeclareBlock) return "not_implemented:combat_pass"; // 4단계(전투)

        s.PassStreak += 1;
        EmitEvent(events, s, slot.ToActor(), "pass", new() { ["streak"] = s.PassStreak });

        if (s.PassStreak < 2)
        {
            s.Priority = slot.Other();
            return null;
        }

        // 양쪽 연속 패스
        if (s.Stack.Count > 0)
        {
            ResolveStack(s, events);
            if (s.Phase != BattlePhase.Finished)
            {
                s.PassStreak = 0;
                s.Priority = s.ActivePlayer; // 해결 후 능동 플레이어가 다시 행동
            }
            return null;
        }

        // 액션 단계 + 스택 없음 → 다음 라운드
        BeginRoundInPlace(s, s.Round + 1, events);
        return null;
    }

    // ── 스택 해결 (LIFO) ──────────────────────────────────────────
    private static void ResolveStack(GameState s, List<GameEvent> events)
    {
        while (s.Stack.Count > 0)
        {
            var item = s.Stack[^1];
            s.Stack.RemoveAt(s.Stack.Count - 1); // pop — Last-In-First-Out
            ResolveSpellEffect(s, item, events);
            if (s.Phase == BattlePhase.Finished) break;
        }
        CleanupDead(s);
        CheckWin(s, events);
    }

    // ── 효과 해석 (kind 분기) ─────────────────────────────────────
    private static void ResolveSpellEffect(GameState s, StackItem item, List<GameEvent> events)
    {
        var eff = item.Effect;
        var src = item.Source;
        int amount = eff.Amount ?? 0;
        TargetRef? first = item.Targets.Count > 0 ? item.Targets[0] : null;

        switch (eff.Kind)
        {
            case SpellEffectKind.BuffUnit:
                if (TargetUnit(s, first) is { } bu) AddBuff(bu, MakeBuff(eff, item.Card.CardId));
                break;
            case SpellEffectKind.BuffTeam:
                foreach (var u in s.Player(src).Board) AddBuff(u, MakeBuff(eff, item.Card.CardId));
                break;
            case SpellEffectKind.GrantKeyword:
                if (TargetUnit(s, first) is { } gu && eff.GrantedKeyword is Keyword k)
                    AddBuff(gu, new StatBuff { KeywordsAdded = { k }, Duration = eff.Duration, Source = item.Card.CardId });
                break;
            case SpellEffectKind.DamageUnit:
                if (TargetUnit(s, first) is { } du) DealDamageToUnit(s, du, amount);
                break;
            case SpellEffectKind.DamageNexus:
                DealNexusDamage(s, src.Other(), amount, events);
                break;
            case SpellEffectKind.HealNexus:
                HealNexus(s, src, amount);
                break;
            case SpellEffectKind.Stun:
                if (TargetUnit(s, first) is { } su) su.IsStunned = true;
                break;
            case SpellEffectKind.Draw:
                DrawN(s, src, Math.Max(1, amount), events);
                break;
        }

        CleanupDead(s);
        CheckWin(s, events);
        EmitEvent(events, s, src.ToActor(), "spellResolved",
            new() { ["card"] = item.Card.CardId, ["kind"] = eff.Kind.ToString() });
    }

    private static StatBuff MakeBuff(SpellEffect eff, string source) => new()
    {
        Power = eff.Amount,
        Health = eff.Health,
        KeywordsAdded = eff.GrantedKeyword is Keyword k ? new List<Keyword> { k } : new(),
        Duration = eff.Duration,
        Source = source,
    };

    // ── 데미지 / 조회 ─────────────────────────────────────────────
    /// <summary>유닛 피해. 끈질김(-1)/보호막(무효) 적용. 흡혈 source 본진 회복. 반환 = 실제 적용 피해.</summary>
    private static int DealDamageToUnit(GameState s, BattleUnit target, int amount, BattleUnit? source = null)
    {
        int amt = amount;
        if (target.Keywords.Contains(Keyword.Tough)) amt = Math.Max(0, amt - 1);
        if (target.HasBarrier && amt > 0) { target.HasBarrier = false; amt = 0; }
        int healthBefore = Math.Max(0, target.Health);
        target.Health -= amt;
        if (amt > 0 && source is not null && source.Keywords.Contains(Keyword.Lifesteal))
            HealNexus(s, source.Owner, Math.Min(amt, healthBefore)); // 오버킬 제외
        return amt;
    }

    private static void CleanupDead(GameState s)
    {
        foreach (var slot in new[] { PlayerSlot.P1, PlayerSlot.P2 })
        {
            var p = s.Player(slot);
            var alive = new List<BattleUnit>(p.Board.Count);
            foreach (var u in p.Board)
            {
                if (u.Health <= 0) p.Graveyard.Add(u.CardId);
                else alive.Add(u);
            }
            p.Board = alive;
        }
    }

    private static BattleUnit? FindAnyUnit(GameState s, string instanceId)
        => FindUnit(s, PlayerSlot.P1, instanceId) ?? FindUnit(s, PlayerSlot.P2, instanceId);

    private static BattleUnit? TargetUnit(GameState s, TargetRef? r)
        => r is { Kind: TargetKind.Unit, InstanceId: { } id } ? FindAnyUnit(s, id) : null;
}
