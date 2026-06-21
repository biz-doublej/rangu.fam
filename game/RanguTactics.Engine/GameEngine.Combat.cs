namespace Rangu.Tactics.Engine;

/// <summary>
/// 4단계 — 전투. 공격 선언 → 블록 선언(도전 강제/Taunt 강제/적법성) → 전투 해결.
/// (engine.ts doDeclareAttack/doDeclareBlock/resolveCombat/canBlock 포팅 + 신규 Taunt.)
///
/// 타격 순서는 전역 정렬이 아니라 per-pair: 같은 쌍 안에서 속공이 선타를 결정(StrikePair).
/// </summary>
public static partial class GameEngine
{
    // ── 공격 선언 ─────────────────────────────────────────────────
    private static string? DoDeclareAttack(
        GameState s, PlayerSlot slot, IReadOnlyList<string> attackers,
        IReadOnlyDictionary<string, string>? challenges, List<GameEvent> events)
    {
        if (s.Phase != BattlePhase.Action) return "wrong_phase:not_action";
        if (slot != s.ActivePlayer) return "no_attack_token";
        if (s.Priority != slot) return "no_priority";
        if (s.AttackDeclaredThisRound) return "already_attacked_this_round";
        if (s.Stack.Count > 0) return "stack_not_empty";
        if (attackers.Count == 0) return "no_attackers";

        var ch = challenges ?? new Dictionary<string, string>();
        var seen = new HashSet<string>();
        var challenged = new Dictionary<string, string>();
        foreach (var aId in attackers)
        {
            if (!seen.Add(aId)) return "duplicate_attacker";
            var a = FindUnit(s, slot, aId);
            if (a is null) return "not_your_unit";
            if (a.HasAttacked) return "already_attacked";
            if (a.IsStunned) return "stunned_cannot_attack";
            if (a.SummonedRound >= s.Round) return "summoning_sickness"; // 이번 라운드 소환은 공격 불가
            if (ch.TryGetValue(aId, out var target) && !string.IsNullOrEmpty(target))
            {
                if (!a.Keywords.Contains(Keyword.Challenger)) return "no_challenger_keyword";
                if (FindUnit(s, slot.Other(), target) is null) return "challenge_target_missing";
                challenged[aId] = target;
            }
        }
        foreach (var aId in attackers) FindUnit(s, slot, aId)!.HasAttacked = true;

        s.AttackDeclaredThisRound = true;
        s.Combat = new CombatState { Attackers = attackers.ToList(), Blocks = new(), Challenged = challenged, BlocksDeclared = false };
        s.Phase = BattlePhase.DeclareBlock;
        s.Priority = slot.Other(); // 수비자 차례
        s.PassStreak = 0;
        EmitEvent(events, s, slot.ToActor(), "declareAttack", new() { ["attackers"] = attackers.Count });
        return null;
    }

    // ── 블록 선언 ─────────────────────────────────────────────────
    private static string? DoDeclareBlock(
        GameState s, PlayerSlot slot, IReadOnlyDictionary<string, string> blocks, List<GameEvent> events)
    {
        if (s.Phase != BattlePhase.DeclareBlock || s.Combat is null) return "not_block_phase";
        if (slot != s.ActivePlayer.Other()) return "only_defender_can_block";
        if (s.Combat.BlocksDeclared) return "blocks_already_declared";
        var atk = s.ActivePlayer;

        var usedBlockers = new HashSet<string>();
        foreach (var (aId, bId) in blocks) // 키 = 공격자, 값 = 블로커
        {
            if (!s.Combat.Attackers.Contains(aId)) return "not_an_attacker";
            var a = FindUnit(s, atk, aId);
            var b = FindUnit(s, slot, bId);
            if (a is null || b is null) return "invalid_block_target";
            if (!usedBlockers.Add(bId)) return "blocker_reused"; // 한 유닛은 한 번만
            var reason = CanBlock(a, b);
            if (reason != null) return reason;
        }

        // 도전(Challenger) 강제: 끌려온 유닛은 반드시 해당 공격자를 막아야
        foreach (var (aId, forcedBId) in s.Combat.Challenged)
        {
            if (FindUnit(s, slot, forcedBId) is not null &&
                (!blocks.TryGetValue(aId, out var assigned) || assigned != forcedBId))
                return "challenged_must_block";
        }

        // ★ Taunt(도발) 강제 — 신규 키워드
        var tauntError = CheckTauntBlocks(s, slot, atk, blocks);
        if (tauntError != null) return tauntError;

        s.Combat.Blocks = new Dictionary<string, string>(blocks);
        s.Combat.BlocksDeclared = true;
        s.Priority = s.ActivePlayer; // 전투 반응 윈도우 (공격자부터)
        s.PassStreak = 0;
        EmitEvent(events, s, slot.ToActor(), "declareBlock", new() { ["count"] = blocks.Count });
        return null;
    }

    /// <summary>
    /// Taunt(도발) v1 규칙: 방어자가 "동원 가능한"(살아있고 기절X) Taunt 유닛을 가지면,
    /// 비-Taunt 유닛으로 블록하기 전에 막을 수 있는 Taunt 유닛부터 블록에 동원해야 한다.
    /// (도발 = 벽이 먼저 막는다. 신규 키워드라 TS 엔진엔 없음 — 추후 정밀화 가능.)
    /// </summary>
    private static string? CheckTauntBlocks(
        GameState s, PlayerSlot defender, PlayerSlot attacker, IReadOnlyDictionary<string, string> blocks)
    {
        var ableTaunts = s.Player(defender).Board
            .Where(u => !u.IsStunned && u.Keywords.Contains(Keyword.Taunt)).ToList();
        if (ableTaunts.Count == 0) return null;

        var blockerIds = new HashSet<string>(blocks.Values);
        int assignedTaunts = ableTaunts.Count(t => blockerIds.Contains(t.InstanceId));
        int nonTauntBlockers = blocks.Values.Count(bId =>
            FindUnit(s, defender, bId) is { } b && !b.Keywords.Contains(Keyword.Taunt));

        // Taunt 가 적법하게 막을 수 있는 공격자가 있는 경우만 강제 (elusive 등으로 못 막으면 면제 → softlock 방지)
        int blockableTaunts = ableTaunts.Count(t =>
            s.Combat!.Attackers.Any(aId => FindUnit(s, attacker, aId) is { } a && CanBlock(a, t) == null));
        int required = Math.Min(blockableTaunts, s.Combat!.Attackers.Count);

        if (nonTauntBlockers > 0 && assignedTaunts < required) return "taunt_must_block_first";
        return null;
    }

    // ── 블록 적법성 ───────────────────────────────────────────────
    private static string? CanBlock(BattleUnit attacker, BattleUnit blocker)
    {
        if (blocker.IsStunned) return "blocker_stunned";
        if (attacker.Keywords.Contains(Keyword.Elusive) && !blocker.Keywords.Contains(Keyword.Elusive))
            return "elusive_needs_elusive_blocker";
        if (attacker.Keywords.Contains(Keyword.Fearsome) && blocker.Power < 3)
            return "fearsome_needs_power3_blocker";
        return null;
    }

    // ── 전투 해결 ─────────────────────────────────────────────────
    private static void ResolveCombat(GameState s, List<GameEvent> events)
    {
        if (s.Combat is null) return;
        var atk = s.ActivePlayer;
        var def = atk.Other();

        foreach (var aId in s.Combat.Attackers)
        {
            var a = FindUnit(s, atk, aId);
            if (a is null || a.Health <= 0) continue;

            if (!s.Combat.Blocks.TryGetValue(aId, out var bId) || string.IsNullOrEmpty(bId))
            {
                DealNexusDamage(s, def, a.Power, events, a); // 미차단 → 본진 직격
                if (s.Phase == BattlePhase.Finished) return;
                continue;
            }

            var b = FindUnit(s, def, bId);
            if (b is null || b.Health <= 0)
            {
                // 블로커가 전투 전 제거됨 → 막은 것으로 처리. 일격은 전부 관통.
                if (a.Keywords.Contains(Keyword.Overwhelm))
                {
                    DealNexusDamage(s, def, a.Power, events, a);
                    if (s.Phase == BattlePhase.Finished) return;
                }
                continue;
            }
            if (b.IsStunned || CanBlock(a, b) != null)
            {
                // 블로커 무력화/부적격 → 미차단 취급
                DealNexusDamage(s, def, a.Power, events, a);
                if (s.Phase == BattlePhase.Finished) return;
                continue;
            }

            int bHealthBefore = b.Health;
            int dealtToBlocker = StrikePair(s, a, b);

            // 일격: 막은 유닛에 실제 들어간 피해 중 초과분만 본진 관통
            if (a.Keywords.Contains(Keyword.Overwhelm) && b.Health <= 0)
            {
                int spill = dealtToBlocker - bHealthBefore;
                if (spill > 0)
                {
                    DealNexusDamage(s, def, spill, events, a);
                    if (s.Phase == BattlePhase.Finished) return;
                }
            }
        }

        CleanupDead(s);
        CheckWin(s, events);
        s.Combat = null;
        if (s.Phase != BattlePhase.Finished)
        {
            s.Phase = BattlePhase.Action;
            s.Priority = s.ActivePlayer;
            s.PassStreak = 0;
        }
        EmitEvent(events, s, EventActor.System, "combatResolved");
    }

    /// <summary>한 쌍의 타격. 속공이면 공격자 선타(상대 죽으면 반격 없음), 아니면 동시. 반환 = 블로커에 실제 적용된 피해.</summary>
    private static int StrikePair(GameState s, BattleUnit a, BattleUnit b)
    {
        bool aFirst = a.Keywords.Contains(Keyword.QuickAttack) && !b.Keywords.Contains(Keyword.QuickAttack);
        int dealtToBlocker;
        if (aFirst)
        {
            dealtToBlocker = DealDamageToUnit(s, b, a.Power, a);
            if (b.Health > 0) DealDamageToUnit(s, a, b.Power, b); // 상대 생존 시에만 반격
        }
        else
        {
            int bPow = b.Power; // 동시 타격 — b 파워 먼저 고정
            dealtToBlocker = DealDamageToUnit(s, b, a.Power, a);
            DealDamageToUnit(s, a, bPow, b);
        }
        return dealtToBlocker;
    }
}
