using System.Net.WebSockets;
using Google.Protobuf;
using Rangu.Tactics.Proto.V1;
using Rangu.Tactics.Server.Auth;
using Rangu.Tactics.Server.Game;
using Rangu.Tactics.Server.Mapping;
using Rangu.Tactics.Server.Match;
using Engine = Rangu.Tactics.Engine;

namespace Rangu.Tactics.Server.Net;

/// <summary>
/// 실제 게임 루프 — 에코를 대체. connect(티켓검증) → 매치 입장 → 마스킹 스냅샷 →
/// Intent 루프(IntentMapper → Match.ApplyAsync) → 매 액션 후 양쪽에 마스킹 스냅샷 브로드캐스트.
///
/// V1: 상태 동기화는 "매 액션 후 전체 스냅샷 재전송"(정합성 100% 보장). 이벤트 매퍼(애니메이션용)는 후속.
/// V1 상대: PvE 패시브 고스트(자동 멀리건/패스) — 단일 인간이 끝까지 플레이 가능. 실제 봇/매칭/PvP 는 후속.
/// </summary>
public static class GameConnection
{
    private const string PveGhost = "pve-ghost";

    public static async Task HandleAsync(
        WebSocket socket, GameTicketValidator validator, MatchRegistry registry,
        ConnectionHub hub, CardCatalog catalog, ILogger log, CancellationToken ct)
    {
        // 1) 첫 프레임 = connect
        var firstBytes = await ReceiveAsync(socket, ct);
        if (firstBytes is null) return;
        ClientMessage first;
        try { first = ClientMessage.Parser.ParseFrom(firstBytes); }
        catch { await RejectAsync(socket, ConnectRejected.Types.Reason.Unspecified, "bad_frame", ct); return; }
        if (first.MsgCase != ClientMessage.MsgOneofCase.Connect)
        {
            await RejectAsync(socket, ConnectRejected.Types.Reason.Unspecified, "expected_connect", ct);
            return;
        }
        var connect = first.Connect;

        // 2) 라이브 JWKS 티켓 검증
        GameTicketPrincipal principal;
        try { principal = await validator.ValidateAsync(connect.GameTicket, ct); }
        catch (GameTicketValidationException ex)
        {
            await RejectAsync(socket, ConnectRejected.Types.Reason.InvalidTicket, ex.Reason, ct);
            return;
        }

        // 3) 메타데이터 버전 일치 (proto VERSION_MISMATCH)
        if (!string.IsNullOrEmpty(connect.ClientVersion) && connect.ClientVersion != catalog.ContentVersion)
        {
            await RejectAsync(socket, ConnectRejected.Types.Reason.VersionMismatch, catalog.ContentVersion, ct);
            return;
        }

        // 4) 매치 입장 (없으면 PvE 데모 매치 생성 — 실제 매칭은 후속 단계)
        var matchId = string.IsNullOrEmpty(connect.MatchId) ? $"pve-{principal.UserId}" : connect.MatchId;
        var match = registry.GetOrCreate(matchId, id => CreateDemoMatch(id, principal.UserId));
        var seat = match.SeatOf(principal.UserId);
        if (seat is null)
        {
            await RejectAsync(socket, ConnectRejected.Types.Reason.NotAParticipant, principal.UserId, ct);
            return;
        }

        var conn = hub.Add(matchId, seat.Value, socket);
        log.LogInformation("[match {Match}] {User} joined seat {Seat}", matchId, principal.UserId, seat);
        try
        {
            // 5) ConnectAccepted — 현재 마스킹 스냅샷 즉시 전송(재접속 복구 포함)
            await ConnectionHub.SendAsync(conn, new ServerMessage
            {
                ConnectAccepted = new ConnectAccepted
                {
                    You = SnapshotMapper.ToPlayerRef(match.Current.Player(seat.Value)),
                    Snapshot = match.SnapshotFor(seat.Value, NowMs()),
                },
            }, ct);

            // 6) Intent 루프
            while (socket.State == WebSocketState.Open)
            {
                var bytes = await ReceiveAsync(socket, ct);
                if (bytes is null) break;
                ClientMessage cm;
                try { cm = ClientMessage.Parser.ParseFrom(bytes); }
                catch { continue; }

                switch (cm.MsgCase)
                {
                    case ClientMessage.MsgOneofCase.Intent:
                        await HandleIntentAsync(match, seat.Value, cm.Intent, hub, ct);
                        break;
                    case ClientMessage.MsgOneofCase.Resync:
                        await ConnectionHub.SendAsync(conn,
                            new ServerMessage { Snapshot = match.SnapshotFor(seat.Value, NowMs()) }, ct);
                        break;
                    case ClientMessage.MsgOneofCase.Heartbeat:
                        await ConnectionHub.SendAsync(conn, new ServerMessage { Heartbeat = cm.Heartbeat }, ct);
                        break;
                }
            }
        }
        finally
        {
            hub.Remove(matchId, seat.Value);
        }
    }

    private static async Task HandleIntentAsync(
        GameMatch match, Engine.PlayerSlot actor, Intent intent, ConnectionHub hub, CancellationToken ct)
    {
        var action = IntentMapper.ToAction(intent, match.Current, actor);
        if (action is null)
        {
            await SendToActorAsync(match, actor, hub, Reject(intent.ClientIntentId, "unmappable_intent"), ct);
            return;
        }

        var result = await match.ApplyAsync(actor, action, ct);
        bool rejected = result.Events.Any(e => e.Type == "rejected");
        if (rejected)
        {
            var reason = result.Events.First(e => e.Type == "rejected").Detail?["reason"]?.ToString() ?? "rejected";
            await SendToActorAsync(match, actor, hub, Reject(intent.ClientIntentId, reason), ct);
            return; // 거부 = 상태 불변 → 브로드캐스트 불필요
        }

        // 성공: actor 에게 IntentAck(같은 순서 스트림) → 고스트 자동진행 → 양쪽 마스킹 스냅샷 브로드캐스트
        await SendToActorAsync(match, actor, hub,
            new ServerMessage { Event = new Event { IntentAck = new IntentAckEvent { ClientIntentId = intent.ClientIntentId } } }, ct);
        await DriveGhostAsync(match, ct);
        await BroadcastSnapshotsAsync(match, hub, ct);
    }

    /// <summary>PvE 패시브 고스트 자동진행: 멀리건(0장)/우선권 패스 — 인간에게 차례가 돌아오거나 종료까지.</summary>
    private static async Task DriveGhostAsync(GameMatch match, CancellationToken ct)
    {
        var ghost = match.SeatOf(PveGhost);
        if (ghost is null) return; // PvP(고스트 없음) → 아무것도 안 함
        for (int guard = 0; guard < 500; guard++)
        {
            var s = match.Current;
            if (s.Phase == Engine.BattlePhase.Finished) return;
            if (s.Phase == Engine.BattlePhase.Mulligan && !s.Player(ghost.Value).MulliganDone)
            {
                await match.ApplyAsync(ghost.Value, new Engine.MulliganAction(Array.Empty<string>()), ct);
                continue;
            }
            if ((s.Phase == Engine.BattlePhase.Action || s.Phase == Engine.BattlePhase.DeclareBlock)
                && s.Priority == ghost.Value)
            {
                await match.ApplyAsync(ghost.Value, new Engine.PassAction(), ct);
                continue;
            }
            return; // 고스트가 행동할 게 없음
        }
    }

    private static async Task BroadcastSnapshotsAsync(GameMatch match, ConnectionHub hub, CancellationToken ct)
    {
        long now = NowMs();
        foreach (var (seat, conn) in hub.Participants(match.MatchId))
            await ConnectionHub.SendAsync(conn, new ServerMessage { Snapshot = match.SnapshotFor(seat, now) }, ct);
    }

    private static async Task SendToActorAsync(GameMatch match, Engine.PlayerSlot actor, ConnectionHub hub, ServerMessage msg, CancellationToken ct)
    {
        var target = hub.Participants(match.MatchId).FirstOrDefault(p => p.Seat == actor);
        if (target.Conn is not null) await ConnectionHub.SendAsync(target.Conn, msg, ct);
    }

    private static ServerMessage Reject(string clientIntentId, string reason) => new()
    {
        Event = new Event
        {
            IntentRejected = new IntentRejectedEvent { ClientIntentId = clientIntentId, Detail = reason },
        },
    };

    // ── PvE 데모 매치 (실제 매칭/덱 로딩은 후속) ──────────────────
    private static GameMatch CreateDemoMatch(string matchId, string humanUserId)
    {
        var (state, events) = Engine.GameEngine.CreateBattle(
            matchId, new(humanUserId, DemoDeck(Engine.PlayerSlot.P1)), new(PveGhost, DemoDeck(Engine.PlayerSlot.P2)));
        return new GameMatch(matchId, state, (ulong)events.Count);
    }

    private static List<Engine.BattleCard> DemoDeck(Engine.PlayerSlot owner) =>
        Enumerable.Range(0, 16).Select(i => new Engine.BattleCard
        {
            InstanceId = $"{owner}-{i}", CardId = $"demo_{i % 4}", Owner = owner, Name = $"데모{i}",
            Cost = 1, Kind = Engine.CardKind.Unit, // 코스트 1 → 1라운드 즉시 소환 가능(데모)
            Unit = new Engine.UnitSpec { Power = (i % 3) + 1, Health = (i % 2) + 2 },
        }).ToList();

    // ── 저수준 WS ─────────────────────────────────────────────────
    private static Task RejectAsync(WebSocket socket, ConnectRejected.Types.Reason reason, string detail, CancellationToken ct)
    {
        var msg = new ServerMessage { ConnectRejected = new ConnectRejected { Reason = reason, Detail = detail } };
        return socket.SendAsync(msg.ToByteArray(), WebSocketMessageType.Binary, true, ct);
    }

    private static async Task<byte[]?> ReceiveAsync(WebSocket socket, CancellationToken ct)
    {
        var buffer = new byte[8192];
        using var ms = new MemoryStream();
        while (true)
        {
            var result = await socket.ReceiveAsync(buffer.AsMemory(), ct);
            if (result.MessageType == WebSocketMessageType.Close)
            {
                await socket.CloseAsync(WebSocketCloseStatus.NormalClosure, "bye", ct);
                return null;
            }
            ms.Write(buffer, 0, result.Count);
            if (result.EndOfMessage) break;
        }
        return ms.ToArray();
    }

    private static long NowMs() => DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();
}
