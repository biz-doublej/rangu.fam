using System.Net.WebSockets;
using System.Text.Json;
using Google.Protobuf;
using Rangu.Tactics.Proto.V1;

// 개발 전용 — 라이브 E2E 클라이언트.
// 연결 → ConnectAccepted 마스킹 검증(상대 손패 Hidden) → 멀리건 → 유닛 소환 → 상태 검증(내 보드 반영).
// 실행: dotnet run --project game/rangu-tactics-smoke-client -- "<ticket>"

var wsUrl = Environment.GetEnvironmentVariable("WS_URL") ?? "ws://localhost:5080/ws/tactics";
var metadataUrl = Environment.GetEnvironmentVariable("METADATA_URL") ?? "http://localhost:3000/api/game/metadata/export";
var ticket = args.Length > 0 ? args[0] : Environment.GetEnvironmentVariable("GAME_TICKET");
if (string.IsNullOrWhiteSpace(ticket)) { Console.Error.WriteLine("usage: dotnet run -- \"<ticket>\""); return 1; }

var contentVersion = "";
try
{
    using var http = new HttpClient();
    using var doc = JsonDocument.Parse(await http.GetStringAsync(metadataUrl));
    contentVersion = doc.RootElement.GetProperty("contentVersion").GetString() ?? "";
    Console.WriteLine($"metadata contentVersion = {contentVersion}");
}
catch (Exception ex) { Console.WriteLine($"(metadata fetch skipped: {ex.Message})"); }

using var ws = new ClientWebSocket();
await ws.ConnectAsync(new Uri(wsUrl), CancellationToken.None);
Console.WriteLine("→ connect");
await Send(ws, new ClientMessage { Connect = new ConnectRequest { GameTicket = ticket, MatchId = "e2e-1", ClientVersion = contentVersion } });

uint mySeat = 0;
bool mulliganed = false, played = false;
string playedUnit = "";
int exit = 0;

while (ws.State == WebSocketState.Open)
{
    var bytes = await Receive(ws);
    if (bytes is null) break;
    var msg = ServerMessage.Parser.ParseFrom(bytes);

    switch (msg.MsgCase)
    {
        case ServerMessage.MsgOneofCase.ConnectAccepted:
            mySeat = msg.ConnectAccepted.You.Seat;
            Console.WriteLine($"← ConnectAccepted (you=seat {mySeat})");
            CheckMasking(msg.ConnectAccepted.Snapshot, mySeat);
            Console.WriteLine("→ mulligan (keep all)");
            await Send(ws, new ClientMessage { Intent = new Intent { ClientIntentId = "mull", Mulligan = new MulliganIntent() } });
            mulliganed = true;
            break;

        case ServerMessage.MsgOneofCase.Event when msg.Event.PayloadCase == Event.PayloadOneofCase.IntentAck:
            Console.WriteLine($"← IntentAck({msg.Event.IntentAck.ClientIntentId})");
            break;
        case ServerMessage.MsgOneofCase.Event when msg.Event.PayloadCase == Event.PayloadOneofCase.IntentRejected:
            Console.Error.WriteLine($"❌ IntentRejected({msg.Event.IntentRejected.ClientIntentId}): {msg.Event.IntentRejected.Detail}");
            exit = 1; goto done;

        case ServerMessage.MsgOneofCase.Snapshot:
            var s = msg.Snapshot;
            var myMana = s.Players.FirstOrDefault(p => p.Player.Seat == mySeat)?.Mana ?? 0;
            Console.WriteLine($"← Snapshot (phase={s.Phase}, round={s.RoundNumber}, myMana={myMana}, seq={s.SequenceNumber})");

            // 내 유닛이 보드에 반영됐는지 = 상태 검증 성공
            if (played && s.Cards.Any(c => c.Controller.Seat == mySeat && c.Zone == Zone.Battlefield && c.InstanceId == playedUnit))
            {
                Console.WriteLine($"✅ STATE 검증: 내 유닛 {playedUnit} 이(가) 보드에 반영됨");
                SaveSnapshot(bytes);
                await ws.CloseAsync(WebSocketCloseStatus.NormalClosure, "done", CancellationToken.None);
                goto done;
            }

            // 액션 단계 + 내 우선권 + 아직 안 냄 → 소환 가능한 유닛 1장 플레이
            if (mulliganed && !played && s.Phase == GamePhase.PhaseAction && s.PriorityPlayer.Seat == mySeat)
            {
                var unit = s.Cards.FirstOrDefault(c =>
                    c.Controller.Seat == mySeat && c.Zone == Zone.Hand
                    && c.VisibilityCase == CardView.VisibilityOneofCase.Revealed
                    && c.Revealed.CurrentCost <= myMana);
                if (unit is not null)
                {
                    Console.WriteLine($"→ PlayCard({unit.InstanceId}, def={unit.Revealed.DefinitionId}, cost={unit.Revealed.CurrentCost})");
                    playedUnit = unit.InstanceId;
                    played = true;
                    await Send(ws, new ClientMessage { Intent = new Intent { ClientIntentId = "play1", PlayCard = new PlayCardIntent { CardInstanceId = unit.InstanceId } } });
                }
                else
                {
                    Console.WriteLine("→ pass (소환 가능한 유닛 없음)");
                    await Send(ws, new ClientMessage { Intent = new Intent { ClientIntentId = "pass", Pass = new PassIntent() } });
                }
            }
            break;
    }
}
done:
return exit;

// ── 검증/헬퍼 ────────────────────────────────────────────────────
static void CheckMasking(GameStateSnapshot snap, uint mySeat)
{
    var oppHand = snap.Cards.Where(c => c.Controller.Seat != mySeat && c.Zone == Zone.Hand).ToList();
    var oppHidden = oppHand.All(c => c.VisibilityCase == CardView.VisibilityOneofCase.Hidden);
    var myHand = snap.Cards.Where(c => c.Controller.Seat == mySeat && c.Zone == Zone.Hand).ToList();
    var myRevealed = myHand.Count > 0 && myHand.All(c => c.VisibilityCase == CardView.VisibilityOneofCase.Revealed);

    Console.WriteLine($"   상대 손패 {oppHand.Count}장: {(oppHidden ? "✅ 전부 HiddenCard(마스킹)" : "❌ 노출됨!")}");
    Console.WriteLine($"   내 손패 {myHand.Count}장: {(myRevealed ? "✅ 공개(Revealed)" : "⚠️ 미공개")}");
    if (!oppHidden) { Console.Error.WriteLine("❌ 보안 실패: 상대 손패가 마스킹되지 않음"); Environment.Exit(2); }
    // 상대 카드 definition_id 누출 점검
    var leaked = snap.Cards.Any(c => c.Controller.Seat != mySeat && c.VisibilityCase == CardView.VisibilityOneofCase.Revealed && c.Zone == Zone.Hand);
    if (leaked) { Console.Error.WriteLine("❌ 보안 실패: 상대 손패 정의 누출"); Environment.Exit(2); }
    Console.WriteLine("   🔒 마스킹(최종 보스) 통과");
}

static void SaveSnapshot(byte[] bytes)
{
    var path = Path.Combine(AppContext.BaseDirectory, "last-snapshot.bin");
    File.WriteAllBytes(path, bytes);
    Console.WriteLine($"   💾 스냅샷 저장(FE MessageMapper 사전검증용): {path} ({bytes.Length} bytes)");
}

static async Task Send(ClientWebSocket ws, ClientMessage msg) =>
    await ws.SendAsync(msg.ToByteArray(), WebSocketMessageType.Binary, true, CancellationToken.None);

static async Task<byte[]?> Receive(ClientWebSocket ws)
{
    var buffer = new byte[16384];
    using var ms = new MemoryStream();
    while (true)
    {
        var result = await ws.ReceiveAsync(buffer.AsMemory(), CancellationToken.None);
        if (result.MessageType == WebSocketMessageType.Close) return null;
        ms.Write(buffer, 0, result.Count);
        if (result.EndOfMessage) break;
    }
    return ms.ToArray();
}
