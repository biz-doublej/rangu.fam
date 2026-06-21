using Rangu.Tactics.Engine;
using Xunit;

namespace Rangu.Tactics.Engine.Tests;

/// <summary>
/// 결정론 RNG 검증 — 특히 TS(src/lib/battle/rng.ts)와 **비트 단위 동일**한지.
/// 기준 벡터는 seed "rangu-tactics" 로 node 에서 rng.ts 를 돌려 산출했다.
/// 이 패리티가 깨지면 TS 엔진과 C# 엔진의 리플레이/검증 호환이 깨진 것이다.
/// </summary>
public class DeterministicRngTests
{
    private const string Seed = "rangu-tactics";

    [Fact]
    public void SeedToInt_MatchesTsReference()
    {
        Assert.Equal(2320967921u, DeterministicRng.SeedToInt(Seed));
    }

    [Fact]
    public void NextRandom_StateChain_MatchesTsReference()
    {
        uint s0 = DeterministicRng.SeedToInt(Seed);
        var (s1, v1) = DeterministicRng.NextRandom(s0);
        var (s2, v2) = DeterministicRng.NextRandom(s1);
        var (s3, v3) = DeterministicRng.NextRandom(s2);

        Assert.Equal(303293566u, s1);
        Assert.Equal(4006105728u, s2);
        Assert.Equal(706118363u, s3);

        Assert.Equal(0.0706126803997904, v1, 12);
        Assert.Equal(0.9327989595476538, v2, 12);
        Assert.Equal(0.1644007267896086, v3, 12);
    }

    [Fact]
    public void SeededShuffle_MatchesTsReference_AndDoesNotMutateInput()
    {
        uint s0 = DeterministicRng.SeedToInt(Seed);
        var input = new[] { 0, 1, 2, 3, 4, 5, 6, 7, 8, 9 };

        var (state, result) = DeterministicRng.SeededShuffle(s0, input);

        Assert.Equal(new[] { 7, 3, 9, 2, 4, 6, 5, 1, 8, 0 }, result); // TS 동일 순열
        Assert.Equal(1757113403u, state);
        Assert.Equal(new[] { 0, 1, 2, 3, 4, 5, 6, 7, 8, 9 }, input);  // 입력 비변형(순수)
    }

    [Fact]
    public void NextRandom_IsPure_SameStateSameResult()
    {
        Assert.Equal(DeterministicRng.NextRandom(12345u), DeterministicRng.NextRandom(12345u));
    }

    [Fact]
    public void NextInt_StaysInRange()
    {
        uint s = DeterministicRng.SeedToInt(Seed);
        for (int i = 0; i < 200; i++)
        {
            var (next, v) = DeterministicRng.NextInt(s, 6);
            Assert.InRange(v, 0, 5);
            s = next;
        }
    }
}
