using System.Net.WebSockets;
using System.Text.Json;
using Google.Protobuf;
using Rangu.Tactics.Proto.V1;

// 개발 전용 — proto 바이너리 WS 스모크 클라이언트.
// 메타데이터 contentVersion 을 읽어 connect → connect_accepted → Intent → IntentAck 왕복 확인.
//
// 실행: dotnet run --project game/rangu-tactics-smoke-client -- "<ticket>"
//   (ticket 은 game/rangu-tactics-server/mint-test-ticket.mjs 로 발급)

var wsUrl = Environment.GetEnvironmentVariable("WS_URL") ?? "ws://localhost:5080/ws/tactics";
var metadataUrl = Environment.GetEnvironmentVariable("METADATA_URL") ?? "http://localhost:3000/api/game/metadata/export";
var ticket = args.Length > 0 ? args[0] : Environment.GetEnvironmentVariable("GAME_TICKET");

if (string.IsNullOrWhiteSpace(ticket))
{
    Console.Error.WriteLine("usage: dotnet run --project game/rangu-tactics-smoke-client -- \"<ticket>\"");
    return 1;
}

// 메타데이터 contentVersion 조회 (없으면 빈 문자열 → 서버가 버전체크 생략)
var contentVersion = "";
try
{
    using var http = new HttpClient();
    using var doc = JsonDocument.Parse(await http.GetStringAsync(metadataUrl));
    contentVersion = doc.RootElement.GetProperty("contentVersion").GetString() ?? "";
    Console.WriteLine($"metadata contentVersion = {contentVersion}");
}
catch (Exception ex)
{
    Console.WriteLine($"(metadata fetch skipped: {ex.Message})");
}

using var ws = new ClientWebSocket();
await ws.ConnectAsync(new Uri(wsUrl), CancellationToken.None);

Console.WriteLine("→ connect");
await SendAsync(ws, new ClientMessage
{
    Connect = new ConnectRequest { GameTicket = ticket, MatchId = "smoke-1", ClientVersion = contentVersion },
});

while (ws.State == WebSocketState.Open)
{
    var bytes = await ReceiveAsync(ws);
    if (bytes is null) break;

    var msg = ServerMessage.Parser.ParseFrom(bytes);
    Console.WriteLine($"← {msg.MsgCase}");

    switch (msg.MsgCase)
    {
        case ServerMessage.MsgOneofCase.ConnectAccepted:
            Console.WriteLine($"   you={msg.ConnectAccepted.You.UserId}, snapshot.match={msg.ConnectAccepted.Snapshot.MatchId}");
            Console.WriteLine("→ intent (pass)");
            await SendAsync(ws, new ClientMessage
            {
                Intent = new Intent { ClientIntentId = "t1", Pass = new PassIntent() },
            });
            break;

        case ServerMessage.MsgOneofCase.Event when msg.Event.PayloadCase == Event.PayloadOneofCase.IntentAck:
            Console.WriteLine($"✅ proto round-trip OK — IntentAck(client_intent_id={msg.Event.IntentAck.ClientIntentId})");
            await ws.CloseAsync(WebSocketCloseStatus.NormalClosure, "done", CancellationToken.None);
            return 0;

        case ServerMessage.MsgOneofCase.ConnectRejected:
            Console.Error.WriteLine($"❌ rejected: {msg.ConnectRejected.Reason} {msg.ConnectRejected.Detail}");
            return 1;
    }
}

return 0;

static async Task SendAsync(ClientWebSocket ws, ClientMessage msg) =>
    await ws.SendAsync(msg.ToByteArray(), WebSocketMessageType.Binary, true, CancellationToken.None);

static async Task<byte[]?> ReceiveAsync(ClientWebSocket ws)
{
    var buffer = new byte[8192];
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
