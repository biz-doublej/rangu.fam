namespace Rangu.Tactics.Engine;

/// <summary>매치 내 플레이어 자리.</summary>
public enum PlayerSlot { P1, P2 }

public static class PlayerSlotExtensions
{
    /// <summary>상대 슬롯.</summary>
    public static PlayerSlot Other(this PlayerSlot slot) => slot == PlayerSlot.P1 ? PlayerSlot.P2 : PlayerSlot.P1;
}

/// <summary>
/// 유닛 키워드 — 엔진이 실제로 해석하는 것만 (한글 표시명은 UI/메타데이터 매핑).
/// 기존 TS 9종 + 택틱스 신규 Taunt(하스스톤식 강제 유인).
/// </summary>
public enum Keyword
{
    Overwhelm,    // 일격: 막은 유닛 처치 후 잔여 피해 본진 관통
    Elusive,      // 잠행: 잠행 유닛으로만 블록 가능
    QuickAttack,  // 속공: 전투 시 먼저 타격
    Lifesteal,    // 흡혈: 가한 피해만큼 본진 회복
    Tough,        // 끈질김: 받는 피해 -1
    Barrier,      // 보호막: 다음 피해 1회 무효
    Fearsome,     // 위압: 파워 3 이상 유닛으로만 블록 가능
    Challenger,   // 도전: 공격 시 막을 적 유닛 1기 끌어냄 (LoR Challenger)
    Regeneration, // 재생: 라운드 종료 시 체력 전부 회복
    Taunt,        // ★신규 도발: 이 유닛이 있으면 상대는 이 유닛부터 막아야 함 (하스스톤식)
}

/// <summary>주문 속도 (반응 윈도우 규칙).</summary>
public enum SpellSpeed { Burst, Fast, Slow }

/// <summary>전투 단계.</summary>
public enum BattlePhase
{
    Mulligan,     // 양쪽 멀리건 제출 대기
    Action,       // 메인 액션 윈도우 — 우선권 핑퐁
    DeclareBlock, // 공격 선언됨 → 블록 배정 + 전투 반응 윈도우
    Finished,
}

/// <summary>주문/능력 효과 종류 — effect resolver 가 분기.</summary>
public enum SpellEffectKind
{
    BuffUnit,    // 단일 유닛 파워/체력 증감
    BuffTeam,    // 아군 전체 증감
    DamageUnit,  // 적 유닛 피해
    HealNexus,   // 본진 회복
    DamageNexus, // 적 본진 피해
    GrantKeyword,// 키워드 부여
    Stun,        // 1라운드 행동 봉인
    Draw,        // 카드 드로우
}

/// <summary>손패/덱 카드의 종류.</summary>
public enum CardKind { Unit, Spell }

/// <summary>이벤트 로그의 행위 주체.</summary>
public enum EventActor { P1, P2, System }

public static class EventActorExtensions
{
    public static EventActor ToActor(this PlayerSlot slot) => slot == PlayerSlot.P1 ? EventActor.P1 : EventActor.P2;
}
