using Rangu.Tactics.Proto.V1;          // proto 타입 unqualified
using Engine = Rangu.Tactics.Engine;   // 엔진 타입은 Engine. 한정

namespace Rangu.Tactics.Server.Mapping;

/// <summary>
/// proto Intent → 엔진 BattleAction 변환.
/// play_card 는 단일 intent 지만 엔진은 유닛/주문이 갈리므로, 현재 state 의 손패에서 카드 종류를 판별해 분기.
/// 매핑 불가(엔진 미지원: select_targets/concede 등)면 null.
/// </summary>
public static class IntentMapper
{
    public static Engine.BattleAction? ToAction(Intent intent, Engine.GameState state, Engine.PlayerSlot actor)
    {
        switch (intent.ActionCase)
        {
            case Intent.ActionOneofCase.Mulligan:
                return new Engine.MulliganAction(intent.Mulligan.ReplaceCardInstanceIds.ToList());

            case Intent.ActionOneofCase.PlayCard:
            {
                var id = intent.PlayCard.CardInstanceId;
                var card = state.Player(actor).Hand.FirstOrDefault(c => c.InstanceId == id);
                var targets = intent.PlayCard.Targets.Select(ToTargetRef).ToList();
                // 손패에 없으면(혹은 유닛이면) PlayUnit, 주문이면 PlaySpell — 최종 합법성은 엔진이 재검증.
                return card is { Kind: Engine.CardKind.Spell }
                    ? new Engine.PlaySpellAction(id, targets.Count > 0 ? targets : null)
                    : new Engine.PlayUnitAction(id);
            }

            case Intent.ActionOneofCase.DeclareAttack:
            {
                var attackers = intent.DeclareAttack.AttackerInstanceIds.ToList();
                var challenges = intent.DeclareAttack.Pulls
                    .ToDictionary(p => p.AttackerInstanceId, p => p.TargetBlockerInstanceId);
                return new Engine.DeclareAttackAction(attackers, challenges.Count > 0 ? challenges : null);
            }

            case Intent.ActionOneofCase.DeclareBlock:
            {
                // proto BlockAssignment{blocker, attacker} → 엔진 dict[attacker] = blocker
                var blocks = new Dictionary<string, string>();
                foreach (var b in intent.DeclareBlock.Blocks) blocks[b.AttackerInstanceId] = b.BlockerInstanceId;
                return new Engine.DeclareBlockAction(blocks);
            }

            case Intent.ActionOneofCase.Pass:
            case Intent.ActionOneofCase.ResolveStack: // 스택 비대응 = 패스로 해결 진행
                return new Engine.PassAction();

            // select_targets(서버 프롬프트 타겟팅)·concede 는 엔진 v1 미지원 → 매핑 안 함
            default:
                return null;
        }
    }

    private static Engine.TargetRef ToTargetRef(Target t) => t.TargetCase switch
    {
        Target.TargetOneofCase.CardInstanceId => Engine.TargetRef.Unit(t.CardInstanceId),
        Target.TargetOneofCase.Nexus => Engine.TargetRef.Nexus(SlotOf(t.Nexus.Seat)),
        _ => Engine.TargetRef.Nexus(Engine.PlayerSlot.P1),
    };

    public static Engine.PlayerSlot SlotOf(uint seat) => seat == 0 ? Engine.PlayerSlot.P1 : Engine.PlayerSlot.P2;
}
