using Rangu.Tactics.Server.Game;
using Rangu.Tactics.Server.Match;
using Engine = Rangu.Tactics.Engine;

namespace Rangu.Tactics.Server.Net;

/// <summary>
/// 1:1 PvP 매치메이킹 — 인메모리 단일-슬롯 대기열(TaskCompletionSource).
/// JoinQueueAsync 는 상대가 모일 때까지 대기(연결이 그동안 보류) → 페어링 시 양쪽에 Assignment 완료.
/// 페어링은 양쪽 활성 덱(DeckFetcher, 없으면 DeckPresets.Demo)으로 CreateBattle → MatchRegistry 등록.
///
/// V1: 단일 서버 인스턴스 가정(인메모리). 다중 인스턴스 확장 시 Redis 공유 큐 + sticky 라우팅 필요.
/// </summary>
public sealed class Matchmaker
{
    public readonly record struct Assignment(string MatchId, Engine.PlayerSlot Seat);

    private sealed class Waiter
    {
        public required string UserId { get; init; }
        public required TaskCompletionSource<Assignment> Tcs { get; init; }
        public required CancellationToken Ct { get; init; }
    }

    private readonly MatchRegistry _registry;
    private readonly DeckFetcher _decks;
    private readonly ILogger<Matchmaker> _log;
    private readonly object _gate = new();
    private Waiter? _waiting; // 대기 중인 단일 상대(1:1)

    public Matchmaker(MatchRegistry registry, DeckFetcher decks, ILogger<Matchmaker> log)
    {
        _registry = registry;
        _decks = decks;
        _log = log;
    }

    /// <summary>큐 입장 — 매칭될 때까지 대기. 연결 종료(ct 취소) 시 큐에서 빠지고 취소됨.</summary>
    public Task<Assignment> JoinQueueAsync(string userId, CancellationToken ct)
    {
        var tcs = new TaskCompletionSource<Assignment>(TaskCreationOptions.RunContinuationsAsynchronously);
        var me = new Waiter { UserId = userId, Tcs = tcs, Ct = ct };

        Waiter? opponent = null;
        lock (_gate)
        {
            if (_waiting is { } w && w.UserId != userId && !w.Tcs.Task.IsCompleted)
            {
                opponent = w; // 대기자 발견 → 페어링
                _waiting = null;
            }
            else
            {
                _waiting = me; // 내가 대기
            }
        }

        if (opponent is not null)
        {
            _ = PairAsync(opponent, me); // 비동기 페어링(양쪽 TCS 완료)
        }
        else
        {
            // 대기 중 연결 종료 → 큐에서 제거 + 취소
            ct.Register(() =>
            {
                lock (_gate)
                {
                    if (ReferenceEquals(_waiting, me)) _waiting = null;
                }
                tcs.TrySetCanceled(ct);
            });
        }
        return tcs.Task;
    }

    private async Task PairAsync(Waiter p1, Waiter p2)
    {
        var matchId = $"pvp-{Guid.NewGuid():N}";
        try
        {
            var d1 = await _decks.FetchAsync(p1.UserId, Engine.PlayerSlot.P1, p1.Ct);
            var d2 = await _decks.FetchAsync(p2.UserId, Engine.PlayerSlot.P2, p2.Ct);
            var (state, events) = Engine.GameEngine.CreateBattle(
                matchId,
                new(p1.UserId, d1 is { Count: > 0 } ? d1 : DeckPresets.Demo(Engine.PlayerSlot.P1)),
                new(p2.UserId, d2 is { Count: > 0 } ? d2 : DeckPresets.Demo(Engine.PlayerSlot.P2)));
            _registry.GetOrCreate(matchId, _ => new GameMatch(matchId, state, (ulong)events.Count));

            p1.Tcs.TrySetResult(new Assignment(matchId, Engine.PlayerSlot.P1));
            p2.Tcs.TrySetResult(new Assignment(matchId, Engine.PlayerSlot.P2));
            _log.LogInformation("[pvp] matched {U1} vs {U2} → {Match}", p1.UserId, p2.UserId, matchId);
        }
        catch (Exception ex)
        {
            _log.LogError(ex, "[pvp] 페어링 실패 {Match}", matchId);
            p1.Tcs.TrySetException(ex);
            p2.Tcs.TrySetException(ex);
        }
    }
}
