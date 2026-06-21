using Rangu.Tactics.Proto.V1;          // proto 타입은 unqualified
using Rangu.Tactics.Server.Mapping;
using Engine = Rangu.Tactics.Engine;   // 엔진 타입은 Engine. 로 한정

namespace Rangu.Tactics.Server.Match;

/// <summary>
/// 한 매치의 격리 단위 — GameState 보유 + intent 직렬 적용 + 수신자별 스냅샷.
///
/// 동시성: per-match SemaphoreSlim(1,1) 비동기 게이트로 ApplyAsync 직렬화.
/// GameState 는 GameEngine.Apply 가 항상 새 인스턴스를 반환(불변 발행)하므로,
/// 게이트 안에서 참조만 원자 교체(_state = next). 스냅샷은 그 시점 참조를 읽어 일관성 보장.
/// (동접 매치 폭증 시엔 actor/Channel 모델로 교체 — 지금은 턴제라 불필요.)
/// </summary>
public sealed class GameMatch
{
    public string MatchId { get; }
    private readonly SemaphoreSlim _gate = new(1, 1);
    private Engine.GameState _state;
    private ulong _seq;

    public GameMatch(string matchId, Engine.GameState initial, ulong startSeq = 0)
    {
        MatchId = matchId;
        _state = initial;
        _seq = startSeq;
    }

    public Engine.GameState Current => _state; // 불변 발행 → 원자 읽기
    public ulong Sequence => _seq;

    /// <summary>userId 의 매치 내 자리. 참가자가 아니면 null.</summary>
    public Engine.PlayerSlot? SeatOf(string userId)
    {
        if (_state.Player(Engine.PlayerSlot.P1).UserId == userId) return Engine.PlayerSlot.P1;
        if (_state.Player(Engine.PlayerSlot.P2).UserId == userId) return Engine.PlayerSlot.P2;
        return null;
    }

    /// <summary>intent 직렬 적용. 반환 = (다음 상태, 이번 행동의 이벤트, 갱신된 seq).</summary>
    public async Task<ApplyResult> ApplyAsync(Engine.PlayerSlot actor, Engine.BattleAction action, CancellationToken ct = default)
    {
        await _gate.WaitAsync(ct);
        try
        {
            var (next, events) = Engine.GameEngine.Apply(_state, actor, action);
            _state = next;                 // 원자 참조 교체
            _seq += (ulong)events.Count;    // 이벤트 시퀀스 진행
            return new ApplyResult(next, events, _seq);
        }
        finally
        {
            _gate.Release();
        }
    }

    /// <summary>현재 상태의 수신자별 마스킹 스냅샷.</summary>
    public GameStateSnapshot SnapshotFor(Engine.PlayerSlot viewer, long serverTimeMs)
        => SnapshotMapper.ToSnapshot(_state, viewer, _seq, MatchId, serverTimeMs);
}

public readonly record struct ApplyResult(
    Engine.GameState State, List<Engine.GameEvent> Events, ulong Seq);
