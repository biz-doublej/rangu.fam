using Rangu.Tactics.Engine;
using Xunit;

namespace Rangu.Tactics.Engine.Tests;

/// <summary>
/// 풀게임 통합 테스트 — CreateBattle → 멀리건 → 다라운드 시전/전투 → 넥서스 0 승리까지
/// 전체 흐름이 동일 seed 로 결정론적으로 재현되고 gameOver 이벤트가 찍히는지 검증.
/// 엔진을 공개 Apply API 로만 구동한다(완제품 신뢰도 최종 점검).
/// </summary>
public class IntegrationTests
{
    // p1: "정재원 챔피언" — 일격(Overwhelm)+흡혈(Lifesteal) 강유닛
    private static List<BattleCard> JaewonDeck() =>
        Enumerable.Range(0, 20).Select(i => new BattleCard
        {
            InstanceId = $"P1-{i}", CardId = "prestige_jaewon", Owner = PlayerSlot.P1, Name = "정재원 챔피언",
            Cost = 1, Kind = CardKind.Unit,
            Unit = new UnitSpec { Power = 6, Health = 5, IsChampion = true, Keywords = { Keyword.Overwhelm, Keyword.Lifesteal } },
        }).ToList();

    // p2: 약한 졸병
    private static List<BattleCard> GruntDeck() =>
        Enumerable.Range(0, 20).Select(i => new BattleCard
        {
            InstanceId = $"P2-{i}", CardId = "grunt", Owner = PlayerSlot.P2, Name = "졸병",
            Cost = 1, Kind = CardKind.Unit, Unit = new UnitSpec { Power = 1, Health = 1 },
        }).ToList();

    /// <summary>양쪽 공격적 시전·공격, 수비자는 블록 안 함(결정론 단순화). 종료까지 구동.</summary>
    private static (GameState State, int Steps) PlayToEnd(GameState start, int cap = 5000)
    {
        var s = start;
        int steps = 0;
        while (s.Phase != BattlePhase.Finished && steps < cap)
        {
            steps++;
            var me = s.Priority;
            var p = s.Player(me);
            BattleAction action;

            if (s.Phase == BattlePhase.Action)
            {
                bool canAttack = me == s.ActivePlayer && !s.AttackDeclaredThisRound && s.Stack.Count == 0;
                var attackers = canAttack
                    ? p.Board.Where(u => !u.HasAttacked && !u.IsStunned && u.SummonedRound < s.Round).Select(u => u.InstanceId).ToList()
                    : new List<string>();
                var unit = (s.Stack.Count == 0 && p.Board.Count < GameEngine.MaxBoard)
                    ? p.Hand.FirstOrDefault(c => c.Kind == CardKind.Unit && c.Cost <= p.Mana)
                    : null;

                if (attackers.Count > 0) action = new DeclareAttackAction(attackers);
                else if (unit is not null) action = new PlayUnitAction(unit.InstanceId);
                else action = new PassAction();
            }
            else // DeclareBlock: 패스(블록 안 함)
            {
                action = new PassAction();
            }

            (s, _) = GameEngine.Apply(s, me, action);
        }
        return (s, steps);
    }

    private static GameState StartAfterMulligan(string seed)
    {
        var (created, _) = GameEngine.CreateBattle(seed, new(null, JaewonDeck()), new(null, GruntDeck()));
        var (s1, _) = GameEngine.Apply(created, PlayerSlot.P1, new MulliganAction(Array.Empty<string>()));
        var (s2, _) = GameEngine.Apply(s1, PlayerSlot.P2, new MulliganAction(Array.Empty<string>())); // → BeginRound(1)
        return s2;
    }

    [Fact]
    public void FullGame_RunsToCompletion_P1Wins_WithGameOverEvent()
    {
        var start = StartAfterMulligan("integration-1");
        Assert.Equal(BattlePhase.Action, start.Phase);
        Assert.Equal(1, start.Round);

        var (final, steps) = PlayToEnd(start);

        Assert.True(steps < 5000, "게임이 cap 안에 종료되어야 함");
        Assert.Equal(BattlePhase.Finished, final.Phase);
        Assert.Equal(PlayerSlot.P1, final.Winner);               // 강한 정재원 덱이 승리
        Assert.True(final.Player(PlayerSlot.P2).NexusHealth <= 0); // 상대 넥서스 0 이하
        // 이벤트 로그에 승패 정보
        Assert.Contains(final.Log, e => e.Type == "gameOver");
        var over = final.Log.Last(e => e.Type == "gameOver");
        Assert.Equal("p1", over.Detail!["winner"]);
        // 흡혈로 p1 넥서스는 시작값 이상 유지
        Assert.True(final.Player(PlayerSlot.P1).NexusHealth >= GameEngine.StartingNexus);
    }

    [Fact]
    public void FullGame_IsDeterministic_SameSeedSameOutcome()
    {
        var start = StartAfterMulligan("integration-1"); // Apply 는 순수 → start 재사용 가능
        var (a, _) = PlayToEnd(start);
        var (b, _) = PlayToEnd(start);

        Assert.Equal(a.Round, b.Round);
        Assert.Equal(a.Winner, b.Winner);
        Assert.Equal(a.Player(PlayerSlot.P1).NexusHealth, b.Player(PlayerSlot.P1).NexusHealth);
        Assert.Equal(a.Player(PlayerSlot.P2).NexusHealth, b.Player(PlayerSlot.P2).NexusHealth);
        Assert.Equal(a.Log.Count, b.Log.Count); // 이벤트 시퀀스 길이까지 동일
    }

    [Fact]
    public void JaewonChampion_OverwhelmLifesteal_ThroughApiFlow()
    {
        // round 3, p1 활성. 정재원 챔피언(일격+흡혈, 파워6/체5, 1라운드 소환)이 졸병(파워2/체2)을 공격.
        var s0 = new GameState
        {
            Seed = "champ", Rng = 1, Round = 3, Phase = BattlePhase.Action,
            ActivePlayer = PlayerSlot.P1, Priority = PlayerSlot.P1,
            Players =
            {
                [PlayerSlot.P1] = new PlayerState { Slot = PlayerSlot.P1, NexusHealth = 20, MulliganDone = true, HasAttackToken = true },
                [PlayerSlot.P2] = new PlayerState { Slot = PlayerSlot.P2, NexusHealth = 20, MulliganDone = true },
            },
        };
        s0.Player(PlayerSlot.P1).Board.Add(new BattleUnit
        {
            InstanceId = "jw", CardId = "prestige_jaewon", Owner = PlayerSlot.P1, Name = "정재원 챔피언",
            Power = 6, BasePower = 6, Health = 5, MaxHealth = 5, BaseMaxHealth = 5,
            Keywords = { Keyword.Overwhelm, Keyword.Lifesteal }, BaseKeywords = { Keyword.Overwhelm, Keyword.Lifesteal },
            IsChampion = true, SummonedRound = 1,
        });
        s0.Player(PlayerSlot.P2).Board.Add(new BattleUnit
        {
            InstanceId = "g", CardId = "grunt", Owner = PlayerSlot.P2, Name = "졸병",
            Power = 2, BasePower = 2, Health = 2, MaxHealth = 2, BaseMaxHealth = 2,
        });

        var (s1, _) = GameEngine.Apply(s0, PlayerSlot.P1, new DeclareAttackAction(new[] { "jw" }));
        var (s2, _) = GameEngine.Apply(s1, PlayerSlot.P2, new DeclareBlockAction(new Dictionary<string, string> { ["jw"] = "g" }));
        var (a, _) = GameEngine.Apply(s2, PlayerSlot.P1, new PassAction());
        var (s3, ev) = GameEngine.Apply(a, PlayerSlot.P2, new PassAction()); // → 전투 해결

        // 졸병(체2) 처치 → 일격 관통 spill = 6-2 = 4 → p2 넥서스 20-4 = 16
        Assert.Empty(s3.Player(PlayerSlot.P2).Board);
        Assert.Equal(16, s3.Player(PlayerSlot.P2).NexusHealth);
        // 흡혈: 유닛 타격 흡수분 min(6,2)=2 + 관통 넥서스 피해 4 → 총 6 회복 → p1 넥서스 20+6 = 26
        Assert.Equal(26, s3.Player(PlayerSlot.P1).NexusHealth);
        // 챔피언은 반격(파워2) 받아 체5-2=3 생존
        Assert.Single(s3.Player(PlayerSlot.P1).Board);
        Assert.Equal(3, s3.Player(PlayerSlot.P1).Board[0].Health);
        Assert.Contains(ev, e => e.Type == "combatResolved");
    }

    [Fact]
    public void Champion_AwakensAtRound6_StatsBoosted_KeywordGranted_EventEmitted()
    {
        // Round 5 Action(P1 활성). P1 보드에 미각성 챔피언(4/4). 양쪽 패스 → 라운드 6 시작 → 각성.
        var s0 = new GameState
        {
            Seed = "awaken", Rng = 1, Round = 5, Phase = BattlePhase.Action,
            ActivePlayer = PlayerSlot.P1, Priority = PlayerSlot.P1,
            Players =
            {
                [PlayerSlot.P1] = new PlayerState { Slot = PlayerSlot.P1, NexusHealth = 20, MulliganDone = true, HasAttackToken = true },
                [PlayerSlot.P2] = new PlayerState { Slot = PlayerSlot.P2, NexusHealth = 20, MulliganDone = true },
            },
        };
        // R6 시작의 드로우가 피로사로 끝나지 않도록 양쪽 덱을 채움
        for (int i = 0; i < 5; i++)
        {
            s0.Player(PlayerSlot.P1).Deck.Add(new BattleCard { InstanceId = $"p1d{i}", CardId = "c", Owner = PlayerSlot.P1, Name = "덱", Cost = 1, Kind = CardKind.Unit, Unit = new UnitSpec { Power = 1, Health = 1 } });
            s0.Player(PlayerSlot.P2).Deck.Add(new BattleCard { InstanceId = $"p2d{i}", CardId = "c", Owner = PlayerSlot.P2, Name = "덱", Cost = 1, Kind = CardKind.Unit, Unit = new UnitSpec { Power = 1, Health = 1 } });
        }
        s0.Player(PlayerSlot.P1).Board.Add(new BattleUnit
        {
            InstanceId = "champ", CardId = "prestige_jaewon", Owner = PlayerSlot.P1, Name = "정재원 챔피언",
            Power = 4, BasePower = 4, Health = 4, MaxHealth = 4, BaseMaxHealth = 4,
            IsChampion = true, ChampionLevel = 1, SummonedRound = 1,
        });

        var (a, _) = GameEngine.Apply(s0, PlayerSlot.P1, new PassAction());
        var (s1, ev) = GameEngine.Apply(a, PlayerSlot.P2, new PassAction()); // 양쪽 패스 → 라운드 6 시작

        Assert.Equal(6, s1.Round);
        Assert.NotEqual(BattlePhase.Finished, s1.Phase); // 피로사 아님
        var champ = s1.Player(PlayerSlot.P1).Board.Single(u => u.InstanceId == "champ");
        Assert.Equal(2, champ.ChampionLevel);                 // Lv.1 → 2 각성
        Assert.Equal(7, champ.Power);                         // 4 + 3
        Assert.Equal(7, champ.MaxHealth);                     // 4 + 3
        Assert.Equal(7, champ.Health);                        // 풀힐
        Assert.Contains(Keyword.Overwhelm, champ.Keywords);   // 시그니처 키워드
        Assert.Contains(Keyword.Overwhelm, champ.BaseKeywords); // 영구(복원 기준에도)
        Assert.Contains(ev, e => e.Type == "championAwakened");
    }

    [Fact]
    public void Champion_AwakensOnlyOnce_NoDoubleBoost()
    {
        // 이미 각성(Lv.2)한 챔피언은 R7 진입에도 재각성/재부스트되지 않아야.
        var s0 = new GameState
        {
            Seed = "awaken2", Rng = 1, Round = 6, Phase = BattlePhase.Action,
            ActivePlayer = PlayerSlot.P2, Priority = PlayerSlot.P2,
            Players =
            {
                [PlayerSlot.P1] = new PlayerState { Slot = PlayerSlot.P1, NexusHealth = 20, MulliganDone = true },
                [PlayerSlot.P2] = new PlayerState { Slot = PlayerSlot.P2, NexusHealth = 20, MulliganDone = true, HasAttackToken = true },
            },
        };
        for (int i = 0; i < 5; i++)
        {
            s0.Player(PlayerSlot.P1).Deck.Add(new BattleCard { InstanceId = $"p1e{i}", CardId = "c", Owner = PlayerSlot.P1, Name = "덱", Cost = 1, Kind = CardKind.Unit, Unit = new UnitSpec { Power = 1, Health = 1 } });
            s0.Player(PlayerSlot.P2).Deck.Add(new BattleCard { InstanceId = $"p2e{i}", CardId = "c", Owner = PlayerSlot.P2, Name = "덱", Cost = 1, Kind = CardKind.Unit, Unit = new UnitSpec { Power = 1, Health = 1 } });
        }
        s0.Player(PlayerSlot.P1).Board.Add(new BattleUnit
        {
            InstanceId = "champ", CardId = "prestige_jaewon", Owner = PlayerSlot.P1, Name = "정재원 챔피언",
            Power = 7, BasePower = 7, Health = 7, MaxHealth = 7, BaseMaxHealth = 7,
            Keywords = { Keyword.Overwhelm }, BaseKeywords = { Keyword.Overwhelm },
            IsChampion = true, ChampionLevel = 2, SummonedRound = 1, // 이미 각성
        });

        var (a, _) = GameEngine.Apply(s0, PlayerSlot.P2, new PassAction());
        var (s1, ev) = GameEngine.Apply(a, PlayerSlot.P1, new PassAction()); // → 라운드 7

        Assert.Equal(7, s1.Round);
        var champ = s1.Player(PlayerSlot.P1).Board.Single(u => u.InstanceId == "champ");
        Assert.Equal(7, champ.Power);   // 재부스트 없음(여전히 7, 10 아님)
        Assert.Equal(7, champ.MaxHealth);
        Assert.Single(champ.Keywords, k => k == Keyword.Overwhelm); // 키워드 중복 추가 없음
        Assert.DoesNotContain(ev, e => e.Type == "championAwakened");
    }
}
