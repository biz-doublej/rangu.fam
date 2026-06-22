using System.Net.Http;
using System.Net.WebSockets;
using System.Text.Json;
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
        ConnectionHub hub, CardCatalog catalog, IHttpClientFactory httpFactory, DeckOptions deckOptions,
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

        // 4) 매치 입장 — 유저 활성 덱 페치(없거나 실패 시 null → DemoDeck 폴백), 생성 시 P1 으로 주입
        var matchId = string.IsNullOrEmpty(connect.MatchId) ? $"pve-{principal.UserId}" : connect.MatchId;
        var humanDeck = await FetchHumanDeckAsync(httpFactory, deckOptions, principal.UserId, log, ct);
        var match = registry.GetOrCreate(matchId, id => CreateMatch(id, principal.UserId, humanDeck));
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

    // ── PvE 매치 — 유저 활성 덱 주입(없으면 DemoDeck 폴백). 고스트는 항상 DemoDeck ──
    private static GameMatch CreateMatch(string matchId, string humanUserId, List<Engine.BattleCard>? humanDeck)
    {
        var p1 = humanDeck is { Count: > 0 } ? humanDeck : DemoDeck(Engine.PlayerSlot.P1);
        var (state, events) = Engine.GameEngine.CreateBattle(
            matchId, new(humanUserId, p1), new(PveGhost, DemoDeck(Engine.PlayerSlot.P2)));
        return new GameMatch(matchId, state, (ulong)events.Count);
    }

    private static readonly JsonSerializerOptions DeckJsonOpts = new() { PropertyNameCaseInsensitive = true };

    /// <summary>
    /// Next /api/game/deck 서버간 페치 → P1 BattleCard[] (count 만큼 복제). 카드 스탯은 응답에 포함됨.
    /// 활성 덱 없음/통신 실패/secret 미설정 → null 반환(호출측이 DemoDeck 폴백). 절대 throw 하지 않음.
    /// </summary>
    private static async Task<List<Engine.BattleCard>?> FetchHumanDeckAsync(
        IHttpClientFactory factory, DeckOptions opt, string userId, ILogger log, CancellationToken ct)
    {
        if (string.IsNullOrEmpty(opt.Url) || string.IsNullOrEmpty(opt.Secret)) return null;
        try
        {
            var http = factory.CreateClient();
            using var req = new HttpRequestMessage(HttpMethod.Get, $"{opt.Url}?userId={Uri.EscapeDataString(userId)}");
            req.Headers.Add("X-Game-Server-Secret", opt.Secret);
            using var res = await http.SendAsync(req, ct);
            if (!res.IsSuccessStatusCode) return null;

            var body = await res.Content.ReadAsStringAsync(ct);
            var parsed = JsonSerializer.Deserialize<DeckResponse>(body, DeckJsonOpts);
            if (parsed?.Deck is not { Count: > 0 } entries) return null; // 활성 덱 없음 → 폴백

            var cards = new List<Engine.BattleCard>();
            int idx = 0;
            foreach (var d in entries)
            {
                if (string.IsNullOrEmpty(d.CardId)) continue;
                var kind = d.CardType == "spell" ? Engine.CardKind.Spell : Engine.CardKind.Unit;
                for (int i = 0; i < Math.Max(1, d.Count); i++)
                {
                    cards.Add(new Engine.BattleCard
                    {
                        InstanceId = $"{Engine.PlayerSlot.P1}-{idx++}",
                        CardId = d.CardId, Owner = Engine.PlayerSlot.P1, Name = d.Name ?? d.CardId, Cost = d.Cost, Kind = kind,
                        Unit = kind == Engine.CardKind.Unit ? MapUnit(d) : null,
                        Spell = kind == Engine.CardKind.Spell ? MapSpell(d) : null,
                    });
                }
            }
            if (cards.Count == 0) return null;
            log.LogInformation("[deck] {User} 활성 덱 주입: {N}장", userId, cards.Count);
            return cards;
        }
        catch (Exception ex)
        {
            log.LogWarning(ex, "[deck] {User} 페치 실패 — DemoDeck 폴백", userId);
            return null;
        }
    }

    private static Engine.UnitSpec MapUnit(DeckCardDto d) => new()
    {
        Power = d.Attack ?? 0,
        Health = d.Health ?? 1,
        Keywords = MapKeywords(d.Keywords),
        IsChampion = d.CardType == "champion",
    };

    private static Engine.SpellSpec MapSpell(DeckCardDto d)
    {
        var eff = d.Effects?.FirstOrDefault(e => e.Trigger == "cast") ?? d.Effects?.FirstOrDefault();
        return new Engine.SpellSpec
        {
            Speed = Enum.TryParse<Engine.SpellSpeed>(d.SpellSpeed, true, out var sp) ? sp : Engine.SpellSpeed.Fast,
            NeedsTarget = eff?.Target?.Select?.StartsWith("choose") == true,
            Effect = new Engine.SpellEffect
            {
                Kind = Enum.TryParse<Engine.SpellEffectKind>(eff?.Kind, true, out var k) ? k : Engine.SpellEffectKind.DamageUnit,
                Amount = eff?.Amount,
                Health = eff?.Health,
                GrantedKeyword = Enum.TryParse<Engine.Keyword>(eff?.Keyword, true, out var gk) ? gk : (Engine.Keyword?)null,
                Duration = eff?.Duration,
            },
        };
    }

    private static List<Engine.Keyword> MapKeywords(List<string>? kws)
    {
        var list = new List<Engine.Keyword>();
        if (kws is null) return list;
        foreach (var k in kws)
            if (Enum.TryParse<Engine.Keyword>(k, true, out var kw)) list.Add(kw);
        return list;
    }

    // Next /api/game/deck 응답 DTO (camelCase, 대소문자 무시 역직렬화)
    private sealed record DeckResponse(bool Success, List<DeckCardDto>? Deck);
    private sealed record DeckCardDto(
        string CardId, int Count, string? Name, string? CardType, int Cost,
        int? Attack, int? Health, List<string>? Keywords, string? SpellSpeed, List<EffectDto>? Effects);
    private sealed record EffectDto(
        string? Trigger, string? Kind, int? Amount, int? Health, string? Keyword, int? Duration, EffectTargetDto? Target);
    private sealed record EffectTargetDto(string? Select);

    // 데모 덱: 코스트 1 유닛 12 + 주문 4(단일타겟 화염 ×2[Fast→스택], 비타겟 치유 ×2[Burst→즉발]).
    // 주문은 metadata/demo 의 spell_dmg/spell_heal 과 cardId 일치. (스파링 고스트 봇은 유닛만 플레이→주문 무시.)
    private static List<Engine.BattleCard> DemoDeck(Engine.PlayerSlot owner)
    {
        var deck = new List<Engine.BattleCard>(16);
        for (int i = 0; i < 16; i++)
        {
            var inst = $"{owner}-{i}";
            if (i is 3 or 9) // 단일 타겟 피해 주문(Fast → 스택에 쌓여 체인 UI 노출)
                deck.Add(new Engine.BattleCard
                {
                    InstanceId = inst, CardId = "spell_dmg", Owner = owner, Name = "데모 화염", Cost = 1, Kind = Engine.CardKind.Spell,
                    Spell = new Engine.SpellSpec { Speed = Engine.SpellSpeed.Fast, NeedsTarget = true, Effect = new Engine.SpellEffect { Kind = Engine.SpellEffectKind.DamageUnit, Amount = 2 } },
                });
            else if (i is 6 or 13) // 비타겟 본진 회복 주문(Burst → 즉발)
                deck.Add(new Engine.BattleCard
                {
                    InstanceId = inst, CardId = "spell_heal", Owner = owner, Name = "데모 치유", Cost = 1, Kind = Engine.CardKind.Spell,
                    Spell = new Engine.SpellSpec { Speed = Engine.SpellSpeed.Burst, NeedsTarget = false, Effect = new Engine.SpellEffect { Kind = Engine.SpellEffectKind.HealNexus, Amount = 3 } },
                });
            else
                deck.Add(new Engine.BattleCard
                {
                    InstanceId = inst, CardId = $"demo_{i % 4}", Owner = owner, Name = $"데모{i}", Cost = 1, Kind = Engine.CardKind.Unit,
                    Unit = new Engine.UnitSpec { Power = (i % 3) + 1, Health = (i % 2) + 2 },
                });
        }
        return deck;
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
