using System.Collections.Concurrent;
using System.Net.WebSockets;
using Google.Protobuf;
using Rangu.Tactics.Proto.V1;
using Engine = Rangu.Tactics.Engine;

namespace Rangu.Tactics.Server.Net;

/// <summary>
/// 매치별 연결 소켓 레지스트리 + 스레드 안전 송신/브로드캐스트.
/// (WS SendAsync 는 동시 호출 불가 → 소켓별 SendGate 로 직렬화.)
/// </summary>
public sealed class ConnectionHub
{
    public sealed class Conn
    {
        public required WebSocket Socket { get; init; }
        public SemaphoreSlim SendGate { get; } = new(1, 1);
    }

    private readonly ConcurrentDictionary<string, ConcurrentDictionary<Engine.PlayerSlot, Conn>> _byMatch = new();
    // 관전자 — 석 없는 읽기전용 연결(매치별 집합).
    private readonly ConcurrentDictionary<string, ConcurrentDictionary<Conn, byte>> _observers = new();

    public Conn Add(string matchId, Engine.PlayerSlot seat, WebSocket socket)
    {
        var conn = new Conn { Socket = socket };
        _byMatch.GetOrAdd(matchId, _ => new()).AddOrUpdate(seat, conn, (_, _) => conn);
        return conn;
    }

    public Conn AddObserver(string matchId, WebSocket socket)
    {
        var conn = new Conn { Socket = socket };
        _observers.GetOrAdd(matchId, _ => new()).TryAdd(conn, 0);
        return conn;
    }

    public void RemoveObserver(string matchId, Conn conn)
    {
        if (_observers.TryGetValue(matchId, out var set))
        {
            set.TryRemove(conn, out _);
            if (set.IsEmpty) _observers.TryRemove(matchId, out _);
        }
    }

    public IReadOnlyList<Conn> Observers(string matchId) =>
        _observers.TryGetValue(matchId, out var set) ? set.Keys.ToList() : Array.Empty<Conn>();

    public void Remove(string matchId, Engine.PlayerSlot seat)
    {
        if (_byMatch.TryGetValue(matchId, out var seats))
        {
            seats.TryRemove(seat, out _);
            if (seats.IsEmpty) _byMatch.TryRemove(matchId, out _);
        }
    }

    public IReadOnlyList<(Engine.PlayerSlot Seat, Conn Conn)> Participants(string matchId) =>
        _byMatch.TryGetValue(matchId, out var seats)
            ? seats.Select(kv => (kv.Key, kv.Value)).ToList()
            : Array.Empty<(Engine.PlayerSlot, Conn)>();

    public static async Task SendAsync(Conn conn, ServerMessage msg, CancellationToken ct)
    {
        var bytes = msg.ToByteArray();
        await conn.SendGate.WaitAsync(ct);
        try
        {
            if (conn.Socket.State == WebSocketState.Open)
                await conn.Socket.SendAsync(bytes, WebSocketMessageType.Binary, endOfMessage: true, ct);
        }
        finally
        {
            conn.SendGate.Release();
        }
    }
}
