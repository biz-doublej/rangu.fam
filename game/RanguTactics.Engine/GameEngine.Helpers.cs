namespace Rangu.Tactics.Engine;

/// <summary>GameEngine 의 내부 헬퍼 — 이벤트/셔플/드로우/데미지/스탯 재계산. (engine.ts 포팅)</summary>
public static partial class GameEngine
{
    // ── 이벤트 ────────────────────────────────────────────────────
    private static void EmitEvent(
        List<GameEvent> events, GameState state, EventActor actor, string type,
        Dictionary<string, object?>? data = null)
    {
        events.Add(new GameEvent { Round = state.Round, Phase = state.Phase, Actor = actor, Type = type, Detail = data });
    }

    private static void EmitReject(List<GameEvent> events, GameState state, PlayerSlot actor, string reason)
        => EmitEvent(events, state, actor.ToActor(), "rejected", new() { ["reason"] = reason });

    // ── 셔플 / 드로우 ─────────────────────────────────────────────
    /// <summary>플레이어 전용 RNG 로 덱 셔플 (상대와 독립). player.Rng 를 다음 상태로 갱신.</summary>
    private static void ShuffleDeck(PlayerState player)
    {
        var (next, shuffled) = DeterministicRng.SeededShuffle(player.Rng, player.Deck);
        player.Rng = next;
        player.Deck = shuffled;
    }

    /// <summary>n장 드로우. 덱 소진 시 누적 피로 피해, 핸드 상한 초과분은 소각(비공개 burned).</summary>
    private static void DrawN(GameState s, PlayerSlot slot, int n, List<GameEvent> events)
    {
        var p = s.Player(slot);
        for (int i = 0; i < n; i++)
        {
            if (p.Deck.Count == 0)
            {
                // 덱 소진 → 누적 피로 피해 (LoR deck-out 대응)
                p.FatigueCount += 1;
                DealNexusDamage(s, slot, p.FatigueCount, events);
                CheckWin(s, events);
                if (s.Phase == BattlePhase.Finished) return;
                continue;
            }

            var card = p.Deck[0];
            p.Deck.RemoveAt(0); // deck.shift() — 앞에서 뽑기

            if (p.Hand.Count >= MaxHand)
            {
                // 핸드 상한 초과 → 소각. cardId 는 로그에 남기지 않음(상대 정보 누출 방지).
                p.Burned.Add(card.CardId);
                EmitEvent(events, s, slot.ToActor(), "cardBurned");
                continue;
            }

            p.Hand.Add(card);
            EmitEvent(events, s, slot.ToActor(), "draw", new() { ["card"] = card.CardId });
        }
    }

    private static void DrawCard(GameState s, PlayerSlot slot, List<GameEvent> events) => DrawN(s, slot, 1, events);

    // ── 데미지 / 회복 / 승패 ──────────────────────────────────────
    private static void DealNexusDamage(GameState s, PlayerSlot slot, int amount, List<GameEvent> events, BattleUnit? source = null)
    {
        if (amount <= 0) return;
        var p = s.Player(slot);
        int before = Math.Max(0, p.NexusHealth);
        int dealt = Math.Min(amount, before); // 오버킬 제외한 실제 피해
        p.NexusHealth -= amount;
        if (source is not null && source.Keywords.Contains(Keyword.Lifesteal)) HealNexus(s, source.Owner, dealt);
        // TODO(후속): prestige_jaewon 등 챔피언 진행도 누적 (source 기준)
        EmitEvent(events, s, EventActor.System, "nexusDamaged",
            new() { ["slot"] = Tag(slot), ["amount"] = amount, ["health"] = p.NexusHealth });
    }

    private static void HealNexus(GameState s, PlayerSlot slot, int amount)
    {
        if (amount > 0) s.Player(slot).NexusHealth += amount;
    }

    private static void CheckWin(GameState s, List<GameEvent> events)
    {
        bool d1 = s.Player(PlayerSlot.P1).NexusHealth <= 0;
        bool d2 = s.Player(PlayerSlot.P2).NexusHealth <= 0;
        if (!d1 && !d2) return;
        s.Phase = BattlePhase.Finished;
        s.Winner = d1 && d2 ? null : (d1 ? PlayerSlot.P2 : PlayerSlot.P1); // 동시 = 무승부(null)
        EmitEvent(events, s, EventActor.System, "gameOver", new() { ["winner"] = s.Winner is null ? null : Tag(s.Winner.Value) });
    }

    // ── 스탯 재계산 / 버프 (기반 — 시전/전투 단계에서 활용) ─────────
    private static void RecomputeStats(BattleUnit u)
    {
        int power = u.BasePower;
        int healthBonus = 0;
        var kw = new HashSet<Keyword>(u.BaseKeywords);
        foreach (var b in u.Buffs)
        {
            if (b.Power is int bp) power += bp;
            if (b.Health is int bh) healthBonus += bh;
            foreach (var k in b.KeywordsAdded) kw.Add(k);
        }
        u.Power = Math.Max(0, power);
        u.Keywords = kw.ToList();

        int newMax = Math.Max(1, u.BaseMaxHealth + healthBonus);
        if (newMax != u.MaxHealth)
        {
            int damage = u.MaxHealth - u.Health; // 이미 받은 피해 보존
            u.MaxHealth = newMax;
            u.Health = Math.Min(newMax, Math.Max(0, newMax - damage));
        }
    }

    private static void TickBuffs(BattleUnit u)
    {
        bool changed = false;
        var kept = new List<StatBuff>(u.Buffs.Count);
        foreach (var b in u.Buffs)
        {
            if (b.Duration is null) { kept.Add(b); continue; } // 영구
            b.Duration -= 1;
            if (b.Duration <= 0) { changed = true; continue; }
            kept.Add(b);
        }
        u.Buffs = kept;
        if (changed) RecomputeStats(u);
    }

    private static void AddBuff(BattleUnit u, StatBuff buff)
    {
        u.Buffs.Add(buff);
        RecomputeStats(u);
    }

    private static BattleUnit? FindUnit(GameState s, PlayerSlot slot, string instanceId)
        => s.Player(slot).Board.FirstOrDefault(u => u.InstanceId == instanceId);
}
