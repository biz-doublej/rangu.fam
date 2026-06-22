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
        ConnectionHub hub, CardCatalog catalog, DeckFetcher deckFetcher, Matchmaker matchmaker,
        ILogger log, CancellationToken ct)
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

        // 4) 연결 의도 분기: 재접속 / PvP 매칭 / PvE(기본). OBSERVE 는 C3.
        GameMatch match;
        Engine.PlayerSlot? seat;

        var rejoin = string.IsNullOrEmpty(connect.MatchId) ? null : registry.Find(connect.MatchId);
        if (rejoin is not null && rejoin.SeatOf(principal.UserId) is { } reseat)
        {
            match = rejoin; // 기존 매치 재접속 → 현재 스냅샷 재싱크
            seat = reseat;
        }
        else if (connect.Mode == ConnectMode.Observe)
        {
            var target = string.IsNullOrEmpty(connect.MatchId) ? null : registry.Find(connect.MatchId);
            if (target is null)
            {
                await RejectAsync(socket, ConnectRejected.Types.Reason.MatchNotFound, connect.MatchId, ct);
                return;
            }
            await RunObserverAsync(target, hub, socket, log, ct); // 읽기전용 관전(중립 마스킹)
            return;
        }
        else if (connect.Mode == ConnectMode.Pvp)
        {
            Matchmaker.Assignment a;
            try { a = await matchmaker.JoinQueueAsync(principal.UserId, ct); }
            catch (OperationCanceledException) { return; } // 큐 대기 중 연결 종료
            var paired = registry.Find(a.MatchId);
            if (paired is null)
            {
                await RejectAsync(socket, ConnectRejected.Types.Reason.MatchNotFound, a.MatchId, ct);
                return;
            }
            match = paired;
            seat = a.Seat;
        }
        else
        {
            // PvE — 유저 활성 덱(없으면 DeckPresets.Demo), 고스트 P2
            var pveId = string.IsNullOrEmpty(connect.MatchId) ? $"pve-{principal.UserId}" : connect.MatchId;
            var humanDeck = await deckFetcher.FetchAsync(principal.UserId, Engine.PlayerSlot.P1, ct);
            match = registry.GetOrCreate(pveId, id => CreatePveMatch(id, principal.UserId, humanDeck));
            seat = match.SeatOf(principal.UserId);
        }

        var matchId = match.MatchId;
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

    /// <summary>관전 연결 — 읽기전용. observer 리스트 등록 → 중립 마스킹 스냅샷 수신만. Intent 는 원천 무시.</summary>
    private static async Task RunObserverAsync(GameMatch match, ConnectionHub hub, WebSocket socket, ILogger log, CancellationToken ct)
    {
        var conn = hub.AddObserver(match.MatchId, socket);
        log.LogInformation("[match {Match}] observer joined", match.MatchId);
        try
        {
            await ConnectionHub.SendAsync(conn, new ServerMessage
            {
                ConnectAccepted = new ConnectAccepted
                {
                    You = SnapshotMapper.ToPlayerRef(match.Current.Player(Engine.PlayerSlot.P1)),
                    Snapshot = match.ObserverSnapshot(NowMs()),
                },
            }, ct);

            while (socket.State == WebSocketState.Open)
            {
                var bytes = await ReceiveAsync(socket, ct);
                if (bytes is null) break;
                ClientMessage cm;
                try { cm = ClientMessage.Parser.ParseFrom(bytes); }
                catch { continue; }
                // 읽기전용 — Intent 는 무시(원천 차단). Resync/Heartbeat 만 응답.
                if (cm.MsgCase == ClientMessage.MsgOneofCase.Resync)
                    await ConnectionHub.SendAsync(conn, new ServerMessage { Snapshot = match.ObserverSnapshot(NowMs()) }, ct);
                else if (cm.MsgCase == ClientMessage.MsgOneofCase.Heartbeat)
                    await ConnectionHub.SendAsync(conn, new ServerMessage { Heartbeat = cm.Heartbeat }, ct);
            }
        }
        finally
        {
            hub.RemoveObserver(match.MatchId, conn);
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

        // 성공: IntentAck → 고스트 자동진행 → (연출 이벤트 먼저) → 양쪽 마스킹 스냅샷
        await SendToActorAsync(match, actor, hub,
            new ServerMessage { Event = new Event { IntentAck = new IntentAckEvent { ClientIntentId = intent.ClientIntentId } } }, ct);
        var fxEvents = new List<Engine.GameEvent>(result.Events);
        fxEvents.AddRange(await DriveGhostAsync(match, ct));
        await BroadcastEventsAsync(match, hub, fxEvents, ct); // 연출(피해/사망) 먼저
        await BroadcastSnapshotsAsync(match, hub, ct);          // 그 다음 정본 스냅샷
    }

    /// <summary>
    /// PvE 스파링 고스트 자동진행 — 블로커를 유지하고, 자기 차례엔 공격해 인간을 수비자로 만든다(블록 연출 유발).
    /// 정책: 멀리건 → 수비 시 블록 → 내 공격턴엔 비-소환멀미 유닛 전부로 공격 → 보드 비면 최저코스트 소환 → 그 외 패스.
    /// (V1 패시브에서 블록·소환·공격을 더한 최소 봇. 주문/전략은 후속.) 발생 이벤트(전투 해결 등)를 모아 반환.
    /// </summary>
    private static async Task<List<Engine.GameEvent>> DriveGhostAsync(GameMatch match, CancellationToken ct)
    {
        var collected = new List<Engine.GameEvent>();
        var ghost = match.SeatOf(PveGhost);
        if (ghost is null) return collected; // PvP(고스트 없음)
        var g = ghost.Value;

        for (int guard = 0; guard < 500; guard++)
        {
            var s = match.Current;
            if (s.Phase == Engine.BattlePhase.Finished) break;

            // 멀리건은 우선권과 무관(양쪽 독립)
            if (s.Phase == Engine.BattlePhase.Mulligan && !s.Player(g).MulliganDone)
            {
                collected.AddRange((await match.ApplyAsync(g, new Engine.MulliganAction(Array.Empty<string>()), ct)).Events);
                continue;
            }

            if (s.Priority != g) break; // 고스트 차례가 아니면 인간에게 넘김

            // 수비 차례: 첫 공격자를 살아있는 첫 유닛으로 블록(거부 시 폴백 패스 = 블록 없음)
            var defender = s.ActivePlayer == Engine.PlayerSlot.P1 ? Engine.PlayerSlot.P2 : Engine.PlayerSlot.P1;
            if (s.Phase == Engine.BattlePhase.DeclareBlock && g == defender
                && s.Combat is { BlocksDeclared: false } c && c.Attackers.Count > 0)
            {
                var blocker = s.Player(g).Board.FirstOrDefault(u => !u.IsStunned);
                if (blocker is not null && await TryApplyAsync(match, g,
                        new Engine.DeclareBlockAction(new Dictionary<string, string> { [c.Attackers[0]] = blocker.InstanceId }),
                        collected, ct))
                    continue;
                collected.AddRange((await match.ApplyAsync(g, new Engine.PassAction(), ct)).Events); // 블록 없이 진행
                continue;
            }

            if (s.Phase == Engine.BattlePhase.Action)
            {
                var p = s.Player(g);

                // 1) 내 공격턴(공격토큰 보유) + 미선언 → 비-소환멀미 유닛 전부로 공격 선언(인간을 수비자로 만들어 블록 유발)
                if (s.ActivePlayer == g && !s.AttackDeclaredThisRound)
                {
                    var attackers = p.Board
                        .Where(u => u.SummonedRound < s.Round && !u.HasAttacked && !u.IsStunned)
                        .Select(u => u.InstanceId).ToList();
                    if (attackers.Count > 0
                        && await TryApplyAsync(match, g, new Engine.DeclareAttackAction(attackers, null), collected, ct))
                        continue;
                }

                // 2) 보드 비면 최저코스트 유닛 1기 소환(블로커/미래 공격수 확보)
                if (p.Board.Count == 0)
                {
                    var unit = p.Hand
                        .Where(card => card.Kind == Engine.CardKind.Unit && card.Cost <= p.Mana)
                        .OrderBy(card => card.Cost).FirstOrDefault();
                    if (unit is not null && await TryApplyAsync(match, g, new Engine.PlayUnitAction(unit.InstanceId), collected, ct))
                        continue;
                }
            }

            // 그 외(반응 윈도우/소환·공격 불가 등) → 패스로 진행
            collected.AddRange((await match.ApplyAsync(g, new Engine.PassAction(), ct)).Events);
        }
        return collected;
    }

    /// <summary>액션 적용 시도. 거부면 이벤트를 담지 않고 false(호출측이 패스로 폴백 → 무한루프 방지).</summary>
    private static async Task<bool> TryApplyAsync(
        GameMatch match, Engine.PlayerSlot actor, Engine.BattleAction action, List<Engine.GameEvent> collected, CancellationToken ct)
    {
        var r = await match.ApplyAsync(actor, action, ct);
        if (r.Events.Any(e => e.Type == "rejected")) return false; // 상태 불변
        collected.AddRange(r.Events);
        return true;
    }

    private static async Task BroadcastSnapshotsAsync(GameMatch match, ConnectionHub hub, CancellationToken ct)
    {
        long now = NowMs();
        foreach (var (seat, conn) in hub.Participants(match.MatchId))
            await ConnectionHub.SendAsync(conn, new ServerMessage { Snapshot = match.SnapshotFor(seat, now) }, ct);
        // 관전자 — 중립 마스킹(양손 숨김) 스냅샷
        var observers = hub.Observers(match.MatchId);
        if (observers.Count > 0)
        {
            var obsSnap = new ServerMessage { Snapshot = match.ObserverSnapshot(now) };
            foreach (var o in observers) await ConnectionHub.SendAsync(o, obsSnap, ct);
        }
    }

    /// <summary>연출 이벤트(피해/사망/넥서스/게임오버)를 수신자별 마스킹 매핑해 스냅샷 전에 전송.</summary>
    private static async Task BroadcastEventsAsync(GameMatch match, ConnectionHub hub, List<Engine.GameEvent> events, CancellationToken ct)
    {
        if (events.Count == 0) return;
        long now = NowMs();
        foreach (var (seat, conn) in hub.Participants(match.MatchId))
            foreach (var ev in events)
            {
                var proto = EventMapper.ToProto(ev, seat, match.Sequence, now);
                if (proto is not null)
                    await ConnectionHub.SendAsync(conn, new ServerMessage { Event = proto }, ct);
            }
        // 관전자 — P1 시점으로 연출 이벤트(보드/넥서스 공개 정보라 동일)
        foreach (var o in hub.Observers(match.MatchId))
            foreach (var ev in events)
            {
                var proto = EventMapper.ToProto(ev, Engine.PlayerSlot.P1, match.Sequence, now);
                if (proto is not null)
                    await ConnectionHub.SendAsync(o, new ServerMessage { Event = proto }, ct);
            }
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

    // ── PvE 매치 — 유저 활성 덱(없으면 DeckPresets.Demo). 고스트 P2 = DeckPresets.Demo ──
    private static GameMatch CreatePveMatch(string matchId, string humanUserId, List<Engine.BattleCard>? humanDeck)
    {
        var p1 = humanDeck is { Count: > 0 } ? humanDeck : DeckPresets.Demo(Engine.PlayerSlot.P1);
        var (state, events) = Engine.GameEngine.CreateBattle(
            matchId, new(humanUserId, p1), new(PveGhost, DeckPresets.Demo(Engine.PlayerSlot.P2)));
        return new GameMatch(matchId, state, (ulong)events.Count);
    }


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
