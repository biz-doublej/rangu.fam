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
    private static readonly Random _ghostRng = new(); // PvE 휴리스틱 봇의 결정 노이즈(게임 상태와 무관 — 결정론 엔진 불침범).

    public static async Task HandleAsync(
        WebSocket socket, GameTicketValidator validator, MatchRegistry registry,
        ConnectionHub hub, CardCatalog catalog, DeckFetcher deckFetcher, Matchmaker matchmaker,
        MatchResultReporter reporter, ILogger log, CancellationToken ct)
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
        catch (Exception ex) when (ex is not OperationCanceledException)
        {
            // 방어: 검증기에서 새는 예기치 못한 예외(malformed 토큰의 SecurityTokenMalformedException 등)도
            // 연결 크래시(1006) 대신 graceful 거부. 연결 단위 격리라 서버 자체는 영향 없음.
            await RejectAsync(socket, ConnectRejected.Types.Reason.InvalidTicket, $"validate_error:{ex.GetType().Name}", ct);
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
        else if (connect.MatchId == "tutorial")
        {
            // 튜토리얼 — sentinel matchId "tutorial" → 유저별 결정론 매치(고정 덱·셔플 X·젠틀 봇).
            // mode 는 PvE(기본)로 오지만 matchId 로 분기 → proto 변경 불필요. 재접속도 GetOrCreate 로 흡수.
            match = registry.GetOrCreate($"tutorial-{principal.UserId}", id => CreateTutorialMatch(id, principal.UserId));
            seat = match.SeatOf(principal.UserId);
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
                        await HandleIntentAsync(match, seat.Value, cm.Intent, hub, reporter, log, ct);
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
        GameMatch match, Engine.PlayerSlot actor, Intent intent, ConnectionHub hub, MatchResultReporter reporter, ILogger log, CancellationToken ct)
    {
        var pre = match.Current;
        var action = IntentMapper.ToAction(intent, pre, actor);
        if (action is null)
        {
            log.LogInformation("[intent] seat={Seat} case={Case} → UNMAPPABLE (phase={Phase} prio={Prio} round={Round})",
                actor, intent.ActionCase, pre.Phase, pre.Priority, pre.Round);
            await SendToActorAsync(match, actor, hub, Reject(intent.ClientIntentId, "unmappable_intent"), ct);
            return;
        }

        var result = await match.ApplyAsync(actor, action, ct);
        bool rejected = result.Events.Any(e => e.Type == "rejected");
        if (rejected)
        {
            var reason = result.Events.First(e => e.Type == "rejected").Detail?["reason"]?.ToString() ?? "rejected";
            log.LogInformation("[intent] seat={Seat} case={Case} → REJECTED:{Reason} (phase={Phase} prio={Prio} round={Round})",
                actor, intent.ActionCase, reason, pre.Phase, pre.Priority, pre.Round);
            await SendToActorAsync(match, actor, hub, Reject(intent.ClientIntentId, reason), ct);
            return; // 거부 = 상태 불변 → 브로드캐스트 불필요
        }
        log.LogInformation("[intent] seat={Seat} case={Case} → OK ({Phase} prio={Prio} round={Round})",
            actor, intent.ActionCase, match.Current.Phase, match.Current.Priority, match.Current.Round);

        // 성공: IntentAck → 고스트 자동진행 → (연출 이벤트 먼저) → 양쪽 마스킹 스냅샷
        await SendToActorAsync(match, actor, hub,
            new ServerMessage { Event = new Event { IntentAck = new IntentAckEvent { ClientIntentId = intent.ClientIntentId } } }, ct);
        var fxEvents = new List<Engine.GameEvent>(result.Events);
        fxEvents.AddRange(await DriveGhostAsync(match, ct));
        await BroadcastEventsAsync(match, hub, fxEvents, ct); // 연출(피해/사망) 먼저
        await BroadcastSnapshotsAsync(match, hub, ct);          // 그 다음 정본 스냅샷
        await TryReportMatchResultAsync(match, reporter);       // 종료 시 1회 랭크 보고(PvP만)
    }

    /// <summary>매치 종료 시 1회만, PvP(고스트 없음) + 승자 확정이면 Next 로 결과 보고(서버 권위 랭크).</summary>
    private static async Task TryReportMatchResultAsync(GameMatch match, MatchResultReporter reporter)
    {
        var s = match.Current;
        if (s.Phase != Engine.BattlePhase.Finished || s.Winner is null) return; // 진행중/무승부 제외
        if (match.SeatOf(PveGhost) is not null) return;                          // PvE(고스트) 제외 — PvP만 집계
        if (!match.TryClaimResultReport()) return;                               // 1회만
        var winnerSlot = s.Winner.Value;
        var loserSlot = winnerSlot == Engine.PlayerSlot.P1 ? Engine.PlayerSlot.P2 : Engine.PlayerSlot.P1;
        var winner = s.Player(winnerSlot).UserId;
        var loser = s.Player(loserSlot).UserId;
        if (string.IsNullOrEmpty(winner) || string.IsNullOrEmpty(loser)) return;
        // 연결 ct 와 분리(CancellationToken.None) — 종료로 소켓이 닫혀도 보고는 완료. reporter 는 never-throw.
        await reporter.ReportAsync(match.MatchId, winner, loser, CancellationToken.None);
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

        // 튜토리얼 매치는 휴리스틱 GhostAi 대신 젠틀 스크립트 봇(예측가능·비공격)으로 운영.
        if (match.MatchId.StartsWith("tutorial-", StringComparison.Ordinal))
            return await DriveTutorialBotAsync(match, g, ct);

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

            // 수비 차례: 휴리스틱 블록 배정(유리한 교환/생존 우선). 막을 게 없으면 패스(블록 없음).
            var defender = s.ActivePlayer == Engine.PlayerSlot.P1 ? Engine.PlayerSlot.P2 : Engine.PlayerSlot.P1;
            if (s.Phase == Engine.BattlePhase.DeclareBlock && g == defender
                && s.Combat is { BlocksDeclared: false } c && c.Attackers.Count > 0)
            {
                var blockAction = GhostAi.ChooseBlocks(s, g);
                if (blockAction.Blocks.Count > 0 && await TryApplyAsync(match, g, blockAction, collected, ct))
                    continue;
                collected.AddRange((await match.ApplyAsync(g, new Engine.PassAction(), ct)).Events); // 막을 거 없음 → 진행
                continue;
            }

            // 행동 페이즈: 휴리스틱 최적수(후보 시뮬레이션 평가). 우선권 윈도우당 1수 — 핑퐁이 멀티턴을 만든다.
            if (s.Phase == Engine.BattlePhase.Action)
            {
                var action = GhostAi.ChooseAction(s, g, _ghostRng);
                if (await TryApplyAsync(match, g, action, collected, ct)) continue;
            }

            // 그 외(반응 윈도우/적용 실패) → 패스로 진행
            collected.AddRange((await match.ApplyAsync(g, new Engine.PassAction(), ct)).Events);
        }
        return collected;
    }

    /// <summary>
    /// 튜토리얼 젠틀 봇 — 자동 멀리건(전부 킵) 후 항상 패스. 공격/블록을 하지 않아 초보가 압박 없이
    /// 소환→공격 루프를 익히고 자연히 이긴다. RNG 없음(완전 결정론). 우선권 핑퐁은 패스로 진행시킨다.
    /// (후속 단계: 라운드별 스크립트 액션 큐로 확장 → 블록/주문 학습.)
    /// </summary>
    private static async Task<List<Engine.GameEvent>> DriveTutorialBotAsync(GameMatch match, Engine.PlayerSlot g, CancellationToken ct)
    {
        var collected = new List<Engine.GameEvent>();
        for (int guard = 0; guard < 500; guard++)
        {
            var s = match.Current;
            if (s.Phase == Engine.BattlePhase.Finished) break;
            if (s.Phase == Engine.BattlePhase.Mulligan && !s.Player(g).MulliganDone)
            {
                collected.AddRange((await match.ApplyAsync(g, new Engine.MulliganAction(Array.Empty<string>()), ct)).Events);
                continue;
            }
            if (s.Priority != g) break;   // 봇 차례 아님 → 인간에게 우선권
            // 항상 패스(소환/공격/블록 안 함). 양쪽 패스가 라운드를 진행시킨다.
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

    // ── 튜토리얼 매치 — 고정 덱(셔플 X) + 고스트 P2. 젠틀 봇이 운영. 고스트 좌석이라 랭크/경제 보고 제외(=PvE). ──
    private static GameMatch CreateTutorialMatch(string matchId, string humanUserId)
    {
        var (state, events) = Engine.GameEngine.CreateBattle(
            TutorialContent.Seed,
            new(humanUserId, TutorialContent.HumanDeck(Engine.PlayerSlot.P1)),
            new(PveGhost, TutorialContent.OpponentDeck(Engine.PlayerSlot.P2)),
            shuffle: false);
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
