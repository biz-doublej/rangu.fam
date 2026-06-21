namespace Rangu.Tactics.Engine;

/// <summary>
/// 플레이어 입력 액션 (강타입 discriminated union).
/// 리듀서는 패턴 매칭으로 분기: switch (action) { case PlayUnitAction a => ... }.
/// </summary>
public abstract record BattleAction;

/// <summary>멀리건 — 교체할 카드 instanceId 목록.</summary>
public sealed record MulliganAction(IReadOnlyList<string> Replace) : BattleAction;

/// <summary>유닛 소환.</summary>
public sealed record PlayUnitAction(string InstanceId) : BattleAction;

/// <summary>주문 시전 (필요 시 타깃).</summary>
public sealed record PlaySpellAction(string InstanceId, IReadOnlyList<TargetRef>? Targets = null) : BattleAction;

/// <summary>공격 선언. Challenges: challenger 유닛이 끌어낼 대상 (attacker → enemyUnit).</summary>
public sealed record DeclareAttackAction(
    IReadOnlyList<string> Attackers,
    IReadOnlyDictionary<string, string>? Challenges = null) : BattleAction;

/// <summary>블록 배정 (blocker → attacker, 또는 attacker → blocker 매핑은 엔진 규약 따름).</summary>
public sealed record DeclareBlockAction(IReadOnlyDictionary<string, string> Blocks) : BattleAction;

/// <summary>행동권/우선권 넘김.</summary>
public sealed record PassAction : BattleAction;

/// <summary>리듀서 결과 — 성공 시 새 상태, 실패 시 사유(상태 불변).</summary>
public sealed record ActionResult(bool Ok, GameState State, string? Error = null)
{
    public static ActionResult Success(GameState state) => new(true, state);
    public static ActionResult Fail(GameState state, string error) => new(false, state, error);
}
