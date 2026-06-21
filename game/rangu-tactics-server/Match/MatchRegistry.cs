using System.Collections.Concurrent;

namespace Rangu.Tactics.Server.Match;

/// <summary>
/// matchId → GameMatch 레지스트리. ConcurrentDictionary 로 lock-free 조회/생성.
/// (단일 서버 인스턴스가 여러 매치를 동시 처리 — 매치 간 격리, 매치 내 직렬은 GameMatch 가 담당.)
/// </summary>
public sealed class MatchRegistry
{
    private readonly ConcurrentDictionary<string, GameMatch> _matches = new();

    public GameMatch? Find(string matchId) =>
        _matches.TryGetValue(matchId, out var m) ? m : null;

    /// <summary>없으면 factory 로 생성(원자적). 동시 connect 경쟁에서도 1개만 생성됨.</summary>
    public GameMatch GetOrCreate(string matchId, Func<string, GameMatch> factory) =>
        _matches.GetOrAdd(matchId, factory);

    public bool Remove(string matchId) => _matches.TryRemove(matchId, out _);

    public int Count => _matches.Count;
}
