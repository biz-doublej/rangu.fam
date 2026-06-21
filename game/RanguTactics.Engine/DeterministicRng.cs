namespace Rangu.Tactics.Engine;

/// <summary>
/// 결정론 RNG — src/lib/battle/rng.ts 의 C# 포팅 (xmur3 seed + mulberry32).
///
/// 같은 seed/state → TS 엔진과 비트 단위 동일 결과. Math.imul/>>>(unsigned) 을
/// uint 연산 + unchecked 로 1:1 재현한다. 절대 System.Random 을 쓰지 않는다.
///
/// 상태(uint)를 명시적으로 주고받는 무상태 함수 → GameState 가 rng 를 들고 진행(리플레이/검증).
/// </summary>
public static class DeterministicRng
{
    // Math.imul(a,b): 32bit 곱의 하위 32bit. uint 곱 + unchecked 로 동일 비트.
    private static uint Imul(uint a, uint b) => unchecked(a * b);

    /// <summary>문자열 seed → 32bit 정수 (xmur3).</summary>
    public static uint SeedToInt(string seed)
    {
        uint h = 1779033703u ^ (uint)seed.Length;
        foreach (char c in seed)
        {
            h = Imul(h ^ c, 3432918353u);
            h = (h << 13) | (h >> 19);
        }
        h = Imul(h ^ (h >> 16), 2246822507u);
        h = Imul(h ^ (h >> 13), 3266489909u);
        h ^= h >> 16;
        return h;
    }

    /// <summary>mulberry32: state → (다음 state, [0,1) 난수).</summary>
    public static (uint State, double Value) NextRandom(uint state)
    {
        uint t = unchecked(state + 0x6d2b79f5u);
        t = Imul(t ^ (t >> 15), t | 1u);
        t = unchecked(t ^ (t + Imul(t ^ (t >> 7), t | 61u)));
        uint bits = t ^ (t >> 14);
        return (t, bits / 4294967296.0);
    }

    /// <summary>[0, n) 정수 — state 1회 소비.</summary>
    public static (uint State, int Value) NextInt(uint state, int n)
    {
        var (s, v) = NextRandom(state);
        return (s, (int)Math.Floor(v * n));
    }

    /// <summary>
    /// Fisher–Yates 결정론 셔플. 입력은 변형하지 않고 새 리스트 반환.
    /// 반환: (다음 state, 셔플된 리스트).
    /// </summary>
    public static (uint State, List<T> Result) SeededShuffle<T>(uint state, IReadOnlyList<T> arr)
    {
        var result = new List<T>(arr);
        uint s = state;
        for (int i = result.Count - 1; i > 0; i--)
        {
            int j;
            (s, j) = NextInt(s, i + 1);
            (result[i], result[j]) = (result[j], result[i]);
        }
        return (s, result);
    }
}
