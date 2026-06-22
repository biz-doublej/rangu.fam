using Engine = Rangu.Tactics.Engine;

namespace Rangu.Tactics.Server.Game;

/// <summary>기본 덱 프리셋 — 활성 덱 없음(폴백) / PvE 고스트 / PvP 무덱 유저용.</summary>
public static class DeckPresets
{
    // 데모 덱: 코스트 1 유닛 12(챔피언 1 포함) + 주문 4(단일타겟 화염 ×2[Fast→스택], 비타겟 치유 ×2[Burst→즉발]).
    // 주문은 metadata/demo 의 spell_dmg/spell_heal 과 cardId 일치. i==0 은 챔피언(R6+ 각성 시연용).
    public static List<Engine.BattleCard> Demo(Engine.PlayerSlot owner)
    {
        var deck = new List<Engine.BattleCard>(16);
        for (int i = 0; i < 16; i++)
        {
            var inst = $"{owner}-{i}";
            if (i == 0) // 데모 챔피언 — 보드 생존 시 R6+ 황금 각성(+3/+3·풀힐·Overwhelm)
                deck.Add(new Engine.BattleCard
                {
                    InstanceId = inst, CardId = "demo_0", Owner = owner, Name = "데모 챔피언", Cost = 1, Kind = Engine.CardKind.Unit,
                    Unit = new Engine.UnitSpec { Power = 3, Health = 4, IsChampion = true },
                });
            else if (i is 3 or 9) // 단일 타겟 피해 주문(Fast → 스택)
                deck.Add(new Engine.BattleCard
                {
                    InstanceId = inst, CardId = "spell_dmg", Owner = owner, Name = "데모 화염", Cost = 1, Kind = Engine.CardKind.Spell,
                    Spell = new Engine.SpellSpec { Speed = Engine.SpellSpeed.Fast, NeedsTarget = true, Effect = new Engine.SpellEffect { Kind = Engine.SpellEffectKind.DamageUnit, Amount = 2 } },
                });
            else if (i is 6 or 13) // 비타겟 본진 회복(Burst → 즉발)
                deck.Add(new Engine.BattleCard
                {
                    InstanceId = inst, CardId = "spell_heal", Owner = owner, Name = "데모 치유", Cost = 1, Kind = Engine.CardKind.Spell,
                    Spell = new Engine.SpellSpec { Speed = Engine.SpellSpeed.Burst, NeedsTarget = false, Effect = new Engine.SpellEffect { Kind = Engine.SpellEffectKind.HealNexus, Amount = 3 } },
                });
            else
                deck.Add(new Engine.BattleCard
                {
                    InstanceId = inst, CardId = $"demo_{i % 4}", Owner = owner, Name = $"데모{i}", Cost = 1, Kind = Engine.CardKind.Unit,
                    Unit = new Engine.UnitSpec { Power = (i % 3) + 1, Health = (i % 2) + 2 },
                });
        }
        return deck;
    }
}
