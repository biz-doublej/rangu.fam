using Engine = Rangu.Tactics.Engine;

namespace Rangu.Tactics.Server.Game;

/// <summary>
/// 튜토리얼 전용 결정론 콘텐츠 — 고정 덱(셔플 X)으로 모든 유저가 동일한 예측가능 흐름을 학습한다.
///
/// 상대(고스트)는 GameConnection.DriveTutorialBotAsync 가 "젠틀"하게 운영(공격/블록 안 함) →
/// 초보가 압박 없이 소환→공격 루프를 익히고 자연히 이긴다(PvE GhostAi 의 휴리스틱 난이도 제거).
///
/// 카드 cardId 는 데모 메타(demo_1..demo_3)와 일치 → 클라가 이미지/이름을 정상 렌더(신규 메타 불필요).
/// 챔피언(demo_0)/주문은 의도적으로 제외 — 1단계는 소환·공격·패스의 기본 루프만. 단계 확장은
/// 덱 구성만 바꿔 자연히 토글(주문 추가 = 주문마나 학습, 챔피언 추가 = 각성 학습 — 엔진 룰 분기 불필요).
/// </summary>
public static class TutorialContent
{
    public const string Seed = "tutorial-v1"; // 고정 시드 — 셔플 스킵과 함께 완전 결정론(전 유저 동일).

    /// <summary>사람(P1) — 값싼 유닛 위주. 앞 4장(오프닝 핸드)은 즉시 소환 가능한 1코스트. 결정론 순서.</summary>
    public static List<Engine.BattleCard> HumanDeck(Engine.PlayerSlot owner)
    {
        var deck = new List<Engine.BattleCard>(16);
        for (int i = 0; i < 16; i++)
        {
            // 초반(오프닝 핸드 포함)은 1코스트 2/2, 이후는 2코스트 3/2 — 라운드가 갈수록 더 센 유닛.
            int cost = i < 6 ? 1 : 2;
            int power = i < 6 ? 2 : 3;
            deck.Add(Unit(owner, i, cost, power, health: 2, name: $"훈련병 {i + 1}"));
        }
        return deck;
    }

    /// <summary>상대(고스트, P2) — 약한 허수아비. 젠틀 봇은 내지 않지만 덱 무결성/피로(deck-out) 방지용.</summary>
    public static List<Engine.BattleCard> OpponentDeck(Engine.PlayerSlot owner)
    {
        var deck = new List<Engine.BattleCard>(16);
        for (int i = 0; i < 16; i++)
            deck.Add(Unit(owner, i, cost: 1, power: 1, health: 1, name: $"허수아비 {i + 1}"));
        return deck;
    }

    private static Engine.BattleCard Unit(Engine.PlayerSlot owner, int i, int cost, int power, int health, string name) => new()
    {
        InstanceId = $"{owner}-{i}",            // 매치 내 유일(소유자 접두). DeckPresets.Demo 와 동일 규약.
        CardId = $"demo_{1 + (i % 3)}",         // demo_1..demo_3 — 데모 메타와 일치(렌더 정상). 챔피언 demo_0 회피.
        Owner = owner,
        Name = name,
        Cost = cost,
        Kind = Engine.CardKind.Unit,
        Unit = new Engine.UnitSpec { Power = power, Health = health },
    };
}
